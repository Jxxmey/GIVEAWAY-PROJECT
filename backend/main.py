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
from fastapi import FastAPI, HTTPException, Request, Depends
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
    
    # Limit: 20 requests per minute for API calls
    if not rate_limiter.is_allowed(client_ip, limit=20, window=60):
        raise HTTPException(status_code=429, detail="Too Many Requests")
    return True

# --- Security: CORS ---
origins = [
    "http://localhost:5173",
    "http://localhost:4173",
    SELF_URL,
    "*" 
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
    # chats collection removed
    
    players.create_index("ip_hash", unique=True)
    
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

# --- 2. Background Tasks ---

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

# --- 3. Core Logic Helpers ---

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
    weights = []
    for f in files:
        fname = f.upper()
        if "SSR" in fname:
            weights.append(5)
        elif "SR" in fname:
            weights.append(15)
        else:
            weights.append(80)
            
    selected_file = random.choices(files, weights=weights, k=1)[0]
    
    # Determine Rarity for frontend badge
    rarity = "R"
    if "SSR" in selected_file.upper():
        rarity = "SSR"
    elif "SR" in selected_file.upper():
        rarity = "SR"
        
    return selected_file, rarity

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

# --- 4. API Routes ---

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
    total_pages = ceil(total_docs / limit) if limit > 0 else 1 
    
    cursor = players.find({}, {"_id": 0}).sort("played_at", -1).skip(skip).limit(limit)
    return {
        "status": "success",
        "data": list(cursor),
        "pagination": {
            "page": page, 
            "total_docs": total_docs,
            "total_pages": total_pages
        }
    }

@app.get("/api/admin/export")
async def get_export_data(request: Request):
    auth_header = request.headers.get("X-Admin-Key")
    if auth_header != ADMIN_SECRET:
        raise HTTPException(401, "Unauthorized")

    try:
        cursor = players.find({}, {"_id": 0}).sort("played_at", -1)
        logs = list(cursor)
        return {"status": "success", "data": logs}
    except Exception as e:
        raise HTTPException(500, str(e))

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

        old = players.find_one({"ip_hash": ip_hash})
        if old:
            return {
                "status": "already_played",
                "data": {
                    "image_url": f"/api/image/{old['gender']}/{old['image_file']}",
                    "blessing": old['blessing'],
                    "rarity": old.get("rarity", "R")
                }
            }

        selected_image, rarity = get_random_image(gender)
        blessing = await generate_blessing(name, gender, lang)

        players.insert_one({
            "ip_hash": ip_hash,
            "ip_address": client_ip,
            "gender": gender,
            "name": name,
            "image_file": selected_image,
            "rarity": rarity,
            "blessing": blessing,
            "played_at": datetime.now()
        })

        return {
            "status": "success",
            "data": {
                "image_url": f"/api/image/{gender}/{selected_image}",
                "blessing": blessing,
                "rarity": rarity
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