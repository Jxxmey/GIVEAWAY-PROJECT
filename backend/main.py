import os
import random
import hashlib
import asyncio
import httpx
import time
from math import ceil
from datetime import datetime
from typing import List, Dict
from bson import ObjectId
from fastapi import FastAPI, HTTPException, Request, WebSocket, WebSocketDisconnect, Depends
from fastapi.responses import FileResponse, JSONResponse
from fastapi.staticfiles import StaticFiles
from fastapi.middleware.cors import CORSMiddleware
from pymongo import MongoClient
from google import genai
from google.genai import types
from dotenv import load_dotenv

load_dotenv()

# --- 1. Configuration & Setup ---

app = FastAPI()

# Config Variables
MONGO_URI = os.getenv("MONGO_URI", "mongodb://localhost:27017")
GEMINI_KEY = os.getenv("GEMINI_API_KEY")
ADMIN_SECRET = os.getenv("ADMIN_SECRET", "my_super_secret")
SELF_URL = os.getenv("RENDER_EXTERNAL_URL", "http://127.0.0.1:8000")
AI_MODEL_NAME = os.getenv("AI_MODEL_NAME", "gemini-flash-latest")

# --- Security: Rate Limiter (Simple In-Memory) ---
class SimpleRateLimiter:
    def __init__(self):
        self.requests: Dict[str, List[float]] = {}
    
    def is_allowed(self, ip: str, limit: int = 5, window: int = 60) -> bool:
        """Allow 'limit' requests per 'window' seconds"""
        now = time.time()
        if ip not in self.requests:
            self.requests[ip] = []
        
        # Clean old requests
        self.requests[ip] = [t for t in self.requests[ip] if now - t < window]
        
        if len(self.requests[ip]) >= limit:
            return False
            
        self.requests[ip].append(now)
        return True

rate_limiter = SimpleRateLimiter()

async def check_rate_limit(request: Request):
    client_ip = request.headers.get("X-Forwarded-For") or request.client.host
    if "," in client_ip: client_ip = client_ip.split(",")[0].strip()
    
    # Limit: 10 requests per minute for API calls (Adjust as needed)
    if not rate_limiter.is_allowed(client_ip, limit=20, window=60):
        raise HTTPException(status_code=429, detail="Too Many Requests")
    return True

# --- Security: CORS ---
# Production: Should restrict to your frontend domain
origins = [
    "http://localhost:5173",
    "http://localhost:4173",
    SELF_URL,
    "*" # Keep * for development, change to specific domains in production
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Database Setup
try:
    client_db = MongoClient(MONGO_URI)
    db = client_db['riser_gacha']
    players = db['players']
    settings = db['settings']
    chats = db['chats']
    
    players.create_index("ip_hash", unique=True)
    chats.create_index("session_id", unique=True)
    
    if not settings.find_one({"key": "system_status"}):
        settings.insert_one({"key": "system_status", "is_active": False})
        print("🔒 System initialized as CLOSED")
    
    print("✅ MongoDB Connected")
except Exception as e:
    print(f"❌ MongoDB Error: {e}")

# AI Setup
client_ai = None
if GEMINI_KEY:
    try:
        client_ai = genai.Client(api_key=GEMINI_KEY)
        print(f"✅ Google GenAI Client Ready (Model: {AI_MODEL_NAME})")
    except Exception as e:
        print(f"❌ Gemini Client Error: {e}")

# Directories
IMAGE_DIR = "/app/processed_images"
STATIC_DIR = "/app/static"

# Backup Messages
BACKUP_MESSAGES_TH = [
    "ขอบคุณที่มาร่วมสนุกกับโปรเจกต์เล็กๆ ของเรานะ! ดีใจที่ได้เจอกันในงาน Riser Concert ขอให้วันนี้เป็นวันที่ใจฟู ได้โมเมนต์กลับไปเยอะๆ และเดินทางกลับบ้านปลอดภัยนะ\n\n\"Music is the strongest form of magic.\"",
    "ฮัลโหลลล! ขอบคุณที่แวะมาเล่นกิจกรรม Fan Project นะคะ ดีใจมากที่เราชอบศิลปินคนเดียวกัน ขอให้วันนี้มีความสุขสุดๆ เก็บความทรงจำดีๆ กลับไปให้เต็มกระเป๋าเลย!\n\n\"Where words fail, music speaks.\""
]
BACKUP_MESSAGES_EN = [
    "Thanks for stopping by our Fan Project gacha! So happy we share the same love for the artist at Riser Concert. Hope your heart is full of joy today. Safe travels home!\n\n\"Music is the strongest form of magic.\"",
    "Hello fellow fan! Thank you for joining our small project. Wishing you the best moments. Have a safe trip back!\n\n\"Where words fail, music speaks.\""
]

# --- 2. WebSocket Connection Manager (Real-time Chat) ---
class ConnectionManager:
    def __init__(self):
        self.active_connections: List[WebSocket] = []

    async def connect(self, websocket: WebSocket):
        await websocket.accept()
        self.active_connections.append(websocket)

    def disconnect(self, websocket: WebSocket):
        if websocket in self.active_connections:
            self.active_connections.remove(websocket)

    async def broadcast(self, message: dict):
        for connection in self.active_connections:
            try:
                await connection.send_json(message)
            except:
                self.disconnect(connection)

manager = ConnectionManager()

# --- 3. Background Tasks ---

@app.get("/api/health")
async def health_check():
    return {"status": "alive", "timestamp": datetime.now()}

async def keep_alive_ping():
    await asyncio.sleep(10)
    print(f"🚀 Self-Ping system started. URL: {SELF_URL}/api/health")
    async with httpx.AsyncClient() as client:
        while True:
            try:
                await client.get(f"{SELF_URL}/api/health", timeout=10)
            except Exception as e:
                print(f"⚠️ Self-Ping failed: {e}")
            await asyncio.sleep(300)

@app.on_event("startup")
async def startup_event():
    asyncio.create_task(keep_alive_ping())

# --- 4. Core Logic Helpers ---

def get_ip_hash(ip: str):
    return hashlib.sha256(ip.encode()).hexdigest()

# --- FEATURE: Rarity System (Weighted Random) ---
def get_random_image(gender: str):
    target_dir = os.path.join(IMAGE_DIR, gender)
    if not os.path.exists(target_dir):
        fallback = os.path.join("/app/assets", gender)
        if os.path.exists(fallback):
            target_dir = fallback
        else:
            raise HTTPException(500, "Image assets missing")
            
    files = [f for f in os.listdir(target_dir) if f.lower().endswith(('.png', '.jpg', '.jpeg'))]
    if not files:
        raise HTTPException(500, "No images found")
    
    # Weight Logic: SSR (5%), SR (15%), Common (80%)
    # Checks filename for keywords. Default is Common.
    weights = []
    for f in files:
        fname = f.upper()
        if "SSR" in fname:
            weights.append(5)
        elif "SR" in fname:
            weights.append(15)
        else:
            weights.append(80)
            
    return random.choices(files, weights=weights, k=1)[0]

async def generate_blessing(name: str, gender: str, lang: str):
    backup_list = BACKUP_MESSAGES_EN if lang == 'en' else BACKUP_MESSAGES_TH
    if not client_ai:
        return random.choice(backup_list)
    
    try:
        prompt = f"""
        Role: Fan Project (@Jaiidees) Representative.
        Tone: Warm, friendly, sweet.
        Language: {'English' if lang == 'en' else 'Thai'}.
        Input: Fan name "{name}", Bias side "{gender}".
        Task: Write a short, heartwarming thank you note (3-4 lines) for joining the gacha. End with a short music quote.
        """
        response = await asyncio.wait_for(
            client_ai.aio.models.generate_content(
                model=AI_MODEL_NAME,
                contents=prompt,
                config=types.GenerateContentConfig(temperature=0.8)
            ),
            timeout=5.0
        )
        return response.text.strip()
    except Exception:
        return random.choice(backup_list)

# --- 5. WebSocket Endpoint (New Chat) ---

@app.websocket("/ws/chat")
async def websocket_endpoint(websocket: WebSocket):
    await manager.connect(websocket)
    try:
        while True:
            data = await websocket.receive_json()
            # Expected format: {"session_id": "...", "text": "...", "sender": "user", "name": "..."}
            
            session_id = data.get("session_id")
            text = data.get("text")
            sender = data.get("sender", "user")
            name = data.get("name", "Fan")
            
            if session_id and text:
                msg_obj = {
                    "sender": sender,
                    "text": text,
                    "timestamp": datetime.now().isoformat() # Send as string for JSON
                }
                
                # Save to DB
                existing = chats.find_one({"session_id": session_id})
                if existing:
                    chats.update_one(
                        {"session_id": session_id},
                        {
                            "$push": {"messages": msg_obj},
                            "$set": {"last_updated": datetime.now(), "is_read": False, "name": name}
                        }
                    )
                else:
                    chats.insert_one({
                        "session_id": session_id,
                        "name": name,
                        "created_at": datetime.now(),
                        "last_updated": datetime.now(),
                        "is_read": False,
                        "messages": [msg_obj]
                    })
                
                # Broadcast back to everyone (or filter logic if needed)
                # For simplicity in this project: Broadcast to all admins & the specific user
                # Here we simply broadcast to everyone connected to the socket to update UI
                # Real-world: You might want to filter by session_id, but for simple admin chat, this works.
                data["timestamp"] = msg_obj["timestamp"]
                await manager.broadcast(data)
                
    except WebSocketDisconnect:
        manager.disconnect(websocket)

# --- 6. API Routes ---

@app.get("/api/chat/history/{session_id}")
async def get_chat_history(session_id: str):
    chat = chats.find_one({"session_id": session_id}, {"_id": 0})
    if chat:
        # Convert datetime objects to string for JSON
        msgs = chat.get("messages", [])
        for m in msgs:
            if isinstance(m.get("timestamp"), datetime):
                m["timestamp"] = m["timestamp"].isoformat()
        return {"status": "success", "data": msgs}
    return {"status": "empty", "data": []}

# Deprecated: HTTP Send (Fallback)
@app.post("/api/chat/send", dependencies=[Depends(check_rate_limit)])
async def send_chat_http(request: Request):
    return {"status": "use_websocket_instead"}

@app.post("/api/admin/reply")
async def admin_reply(request: Request):
    auth_header = request.headers.get("X-Admin-Key")
    if auth_header != ADMIN_SECRET:
        raise HTTPException(401, "Unauthorized")
    
    try:
        data = await request.json()
        session_id = data.get("session_id")
        message = data.get("message")
        
        msg_obj = {
            "sender": "admin",
            "text": message,
            "timestamp": datetime.now().isoformat()
        }
        
        chats.update_one(
            {"session_id": session_id},
            {
                "$push": {"messages": msg_obj},
                "$set": {"is_read": True}
            }
        )
        
        # Broadcast via WebSocket so user sees it immediately
        await manager.broadcast({
            "session_id": session_id,
            "text": message,
            "sender": "admin",
            "timestamp": msg_obj["timestamp"]
        })
        
        return {"status": "success"}
    except Exception as e:
        raise HTTPException(500, str(e))

@app.get("/api/admin/chats")
async def get_all_chats(request: Request):
    auth_header = request.headers.get("X-Admin-Key")
    if auth_header != ADMIN_SECRET:
        raise HTTPException(401, "Unauthorized")
    
    cursor = chats.find({}).sort("last_updated", -1).limit(50)
    chat_list = []
    for c in cursor:
        last_msg = c["messages"][-1]["text"] if c["messages"] else ""
        chat_list.append({
            "session_id": c["session_id"],
            "name": c.get("name", "Unknown"),
            "last_message": last_msg,
            "is_read": c.get("is_read", True),
            # No full messages list to save bandwidth
        })
    return {"status": "success", "data": chat_list}

@app.get("/api/admin/system_status")
async def get_system_status(request: Request):
    auth_header = request.headers.get("X-Admin-Key")
    if auth_header != ADMIN_SECRET:
        raise HTTPException(401, "Unauthorized")
    status = settings.find_one({"key": "system_status"})
    return {"is_active": status.get("is_active", False)}

@app.post("/api/admin/toggle_system")
async def toggle_system(request: Request):
    auth_header = request.headers.get("X-Admin-Key")
    if auth_header != ADMIN_SECRET:
        raise HTTPException(401, "Unauthorized")
    current = settings.find_one({"key": "system_status"})
    new_status = not current.get("is_active", False)
    settings.update_one({"key": "system_status"}, {"$set": {"is_active": new_status}})
    return {"is_active": new_status}

@app.get("/api/admin/history")
async def get_history(request: Request, page: int = 1, limit: int = 100):
    auth_header = request.headers.get("X-Admin-Key")
    if auth_header != ADMIN_SECRET:
        raise HTTPException(401, "Unauthorized")
    
    skip = (page - 1) * limit
    total_docs = players.count_documents({})
    cursor = players.find({}, {"_id": 0}).sort("played_at", -1).skip(skip).limit(limit)
    return {
        "status": "success",
        "data": list(cursor),
        "pagination": {"page": page, "total": total_docs}
    }

@app.post("/api/play", dependencies=[Depends(check_rate_limit)])
async def play_gacha(request: Request):
    try:
        system_status = settings.find_one({"key": "system_status"})
        if not system_status.get("is_active", False):
            return {"status": "closed"}

        data = await request.json()
        gender = data.get("gender")
        name = data.get("name", "Fan")
        lang = data.get("lang", "th")
        
        client_ip = request.headers.get("X-Forwarded-For") or request.client.host
        if "," in client_ip: client_ip = client_ip.split(",")[0].strip()
        ip_hash = get_ip_hash(client_ip)

        # Check Duplicate
        old = players.find_one({"ip_hash": ip_hash})
        if old:
            return {
                "status": "already_played",
                "data": {
                    "image_url": f"/api/image/{old['gender']}/{old['image_file']}",
                    "blessing": old['blessing']
                }
            }

        selected_image = get_random_image(gender)
        blessing = await generate_blessing(name, gender, lang)

        players.insert_one({
            "ip_hash": ip_hash,
            "ip_address": client_ip,
            "gender": gender,
            "name": name,
            "image_file": selected_image,
            "blessing": blessing,
            "played_at": datetime.now()
        })

        return {
            "status": "success",
            "data": {
                "image_url": f"/api/image/{gender}/{selected_image}",
                "blessing": blessing
            }
        }
    except Exception as e:
        print(f"🔥 Error: {e}")
        raise HTTPException(500, str(e))

@app.get("/api/image/{gender}/{filename}")
def get_image(gender: str, filename: str):
    path = os.path.join(IMAGE_DIR, gender, filename)
    if not os.path.exists(path):
        path = os.path.join("/app/assets", gender, filename)
    if os.path.exists(path):
        return FileResponse(path)
    raise HTTPException(404)

@app.delete("/api/admin/delete/{ip_hash}")
async def delete_history(ip_hash: str, request: Request):
    auth_header = request.headers.get("X-Admin-Key")
    if auth_header != ADMIN_SECRET:
        raise HTTPException(401, "Unauthorized")
    players.delete_one({"ip_hash": ip_hash})
    return {"status": "deleted"}

# --- Frontend Serving ---
if os.path.exists(os.path.join(STATIC_DIR, "assets")):
    app.mount("/assets", StaticFiles(directory=os.path.join(STATIC_DIR, "assets")), name="static")

@app.get("/{full_path:path}")
async def serve_spa(full_path: str):
    file_path = os.path.join(STATIC_DIR, full_path)
    if os.path.exists(file_path) and os.path.isfile(file_path):
        return FileResponse(file_path)
    return FileResponse(os.path.join(STATIC_DIR, "index.html"))