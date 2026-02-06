import os
import random
import hashlib
import asyncio
import httpx
from math import ceil
from datetime import datetime
from bson import ObjectId
from fastapi import FastAPI, HTTPException, Request
from fastapi.responses import FileResponse
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

# Middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# Database Setup
try:
    client_db = MongoClient(MONGO_URI)
    db = client_db['riser_gacha']
    players = db['players']
    settings = db['settings']
    chats = db['chats'] # ✅ Collection ใหม่สำหรับเก็บห้องแชท
    
    # Create Indexes
    players.create_index("ip_hash", unique=True)
    chats.create_index("session_id", unique=True)
    
    # Initialize Settings
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

# --- Backup Messages (Fallback) ---
BACKUP_MESSAGES_TH = [
    "ขอบคุณที่มาร่วมสนุกกับโปรเจกต์เล็กๆ ของเรานะ! ดีใจที่ได้เจอกันในงาน Riser Concert ขอให้วันนี้เป็นวันที่ใจฟู ได้โมเมนต์กลับไปเยอะๆ และเดินทางกลับบ้านปลอดภัยนะ\n\n\"Music is the strongest form of magic.\"",
    "ฮัลโหลลล! ขอบคุณที่แวะมาเล่นกิจกรรม Fan Project นะคะ ดีใจมากที่เราชอบศิลปินคนเดียวกัน ขอให้วันนี้มีความสุขสุดๆ เก็บความทรงจำดีๆ กลับไปให้เต็มกระเป๋าเลย!\n\n\"Where words fail, music speaks.\"",
    "ยินดีต้อนรับสู่โปรเจกต์แฟนคลับของเราครับ! ดีใจที่ได้เป็นส่วนหนึ่งในวันสำคัญนี้ ขอให้สนุกกับคอนเสิร์ต ร้องเพลงให้สุดเสียง และกลับบ้านอย่างมีความสุขนะครับ\n\n\"Happiness is seeing your favorite artist live.\"",
    "ขอบคุณที่มาร่วมเป็นส่วนหนึ่งของความทรงจำนี้นะ! หวังว่าของขวัญเล็กๆ นี้จะทำให้เธอยิ้มได้ ขอให้วันนี้เป็นวันที่สดใสและเต็มไปด้วยพลังบวกนะ เดินทางปลอดภัยจ้า\n\n\"Life is short, buy the concert tickets.\"",
    "งู้ยยย ขอบคุณที่มาเล่นด้วยกันน้า! ดีใจที่ได้เจอคนรักศิลปินเหมือนกัน ขอให้วันนี้ได้รับพลังงานดีๆ กลับไปเต็มเปี่ยม ดูแลสุขภาพและเดินทางกลับดีๆ นะคะ\n\n\"Music binds our souls, hearts, and emotions.\""
]

BACKUP_MESSAGES_EN = [
    "Thanks for stopping by our Fan Project gacha! So happy we share the same love for the artist at Riser Concert. Hope your heart is full of joy today. Safe travels home!\n\n\"Music is the strongest form of magic.\"",
    "Hello fellow fan! Thank you for joining our small project. Wishing you the best moments and a wonderful time at the concert. Have a safe trip back!\n\n\"Where words fail, music speaks.\"",
    "Welcome to our Fan Project! It's amazing to see you here. Hope this little gift brings a smile to your face. Enjoy the music and have a safe journey!\n\n\"Happiness is seeing your favorite artist live.\"",
    "So glad you are here! Thank you for supporting our project. May your day be filled with happiness and great memories. Take care and stay safe!\n\n\"Life is short, buy the concert tickets.\"",
    "Thank you for being part of this memory! Sending you lots of love and positive energy. Hope you have an incredible time today. Safe travels!\n\n\"Music binds our souls, hearts, and emotions.\""
]

# --- 2. Background Tasks ---

@app.get("/api/health")
async def health_check():
    return {"status": "alive", "timestamp": datetime.now()}

async def keep_alive_ping():
    """Ping own server every 5 mins to prevent sleeping"""
    await asyncio.sleep(10)
    print(f"🚀 Self-Ping system started. URL: {SELF_URL}/api/health")
    async with httpx.AsyncClient() as client:
        while True:
            try:
                response = await client.get(f"{SELF_URL}/api/health", timeout=10)
                # print(f"💓 Self-Ping success: {response.status_code}")
            except Exception as e:
                print(f"⚠️ Self-Ping failed: {e}")
            await asyncio.sleep(300)

@app.on_event("startup")
async def startup_event():
    asyncio.create_task(keep_alive_ping())

# --- 3. Helpers ---

def get_ip_hash(ip: str):
    return hashlib.sha256(ip.encode()).hexdigest()

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
    return random.choice(files)

async def generate_blessing(name: str, gender: str, lang: str):
    backup_list = BACKUP_MESSAGES_EN if lang == 'en' else BACKUP_MESSAGES_TH
    if not client_ai:
        return random.choice(backup_list)
    
    try:
        prompt_th = f"""
        Role: คุณคือตัวแทนจาก "โปรเจกต์แฟนคลับ (@Jaiidees)" ที่ทำกิจกรรมแจกของที่ระลึกด้วยใจรัก
        Tone: อบอุ่น, ละมุน, เป็นกันเอง, น่ารัก, ให้เกียรติ แต่ไม่ทางการ
        Language: ภาษาไทยที่อ่านแล้วยิ้มตาม (ความยาว 3-4 บรรทัด)
        Input: เพื่อนแฟนคลับชื่อ "{name}" เมนฝั่ง "{gender.upper()}"
        Task: เขียนข้อความขอบคุณที่มาร่วมสนุกกับโปรเจกต์แฟนคลับ: 1.ทักทาย 2.ความเชื่อมโยงที่รักศิลปินเหมือนกัน 3.อวยพรให้ใจฟูและเดินทางปลอดภัย 4.ปิดท้าย Quote ภาษาอังกฤษสั้นๆ
        """
        
        prompt_en = f"""
        Role: You are a representative from the "Fan Project (@Jaiidees)", created with love by fans for fans.
        Tone: Warm, soft, friendly, sweet, and not corporate/official.
        Language: Heartwarming English (Length: 3-4 sentences).
        Input: Fellow fan named "{name}" supporting the "{gender.upper()}" side.
        Task: Write a thank you note for joining our fan project gacha. Express joy in sharing the same love for the artist. Wish them joy and safe travels. End with a short English Quote.
        """
        
        final_prompt = prompt_en if lang == 'en' else prompt_th

        response = await asyncio.wait_for(
            client_ai.aio.models.generate_content(
                model=AI_MODEL_NAME,
                contents=final_prompt,
                config=types.GenerateContentConfig(temperature=0.8)
            ),
            timeout=5.0
        )
        return response.text.strip()
    except Exception as e:
        print(f"🔥 AI Error: {e} -> Using Manual Backup")
        return random.choice(backup_list)

# --- 4. Chat System Routes (NEW) ---

@app.post("/api/chat/send")
async def send_chat(request: Request):
    try:
        data = await request.json()
        session_id = data.get("session_id")
        message = data.get("message")
        name = data.get("name", "Fan")
        
        if not session_id or not message:
            raise HTTPException(400, "Missing data")

        # Prepare new message
        new_msg = {
            "sender": "user",
            "text": message,
            "timestamp": datetime.now()
        }

        # Check if chat exists
        chat_room = chats.find_one({"session_id": session_id})

        if chat_room:
            # Update existing chat
            chats.update_one(
                {"session_id": session_id}, 
                {
                    "$push": {"messages": new_msg},
                    "$set": {
                        "last_updated": datetime.now(), 
                        "is_read": False, 
                        "name": name
                    }
                }
            )
        else:
            # Create new chat
            chats.insert_one({
                "session_id": session_id,
                "name": name,
                "created_at": datetime.now(),
                "last_updated": datetime.now(),
                "is_read": False,
                "messages": [new_msg]
            })
            
        return {"status": "success"}
    except Exception as e:
        print(f"Chat Error: {e}")
        raise HTTPException(500, str(e))

@app.get("/api/chat/history/{session_id}")
async def get_chat_history(session_id: str):
    """API for User to poll chat history"""
    chat = chats.find_one({"session_id": session_id}, {"_id": 0})
    if chat:
        return {"status": "success", "data": chat["messages"]}
    return {"status": "empty", "data": []}

@app.post("/api/admin/reply")
async def admin_reply(request: Request):
    """API for Admin to reply"""
    auth_header = request.headers.get("X-Admin-Key")
    if auth_header != ADMIN_SECRET:
        raise HTTPException(401, "Unauthorized")
    
    try:
        data = await request.json()
        session_id = data.get("session_id")
        message = data.get("message")
        
        chats.update_one(
            {"session_id": session_id},
            {
                "$push": {
                    "messages": {
                        "sender": "admin",
                        "text": message,
                        "timestamp": datetime.now()
                    }
                },
                "$set": {"is_read": True}
            }
        )
        return {"status": "success"}
    except Exception as e:
        raise HTTPException(500, str(e))

@app.get("/api/admin/chats")
async def get_all_chats(request: Request):
    """API for Admin to list all chats"""
    auth_header = request.headers.get("X-Admin-Key")
    if auth_header != ADMIN_SECRET:
        raise HTTPException(401, "Unauthorized")
    
    try:
        # Get chats sorted by last update
        cursor = chats.find({}).sort("last_updated", -1).limit(50)
        chat_list = []
        for c in cursor:
            c["_id"] = str(c["_id"])
            last_msg = c["messages"][-1]["text"] if c["messages"] else ""
            
            chat_list.append({
                "session_id": c["session_id"],
                "name": c["name"],
                "last_message": last_msg,
                "last_updated": c["last_updated"],
                "is_read": c.get("is_read", True),
                "messages": c["messages"]
            })
        return {"status": "success", "data": chat_list}
    except Exception as e:
        raise HTTPException(500, str(e))

# --- 5. Main Game & Admin Routes ---

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

    try:
        skip = (page - 1) * limit
        total_docs = players.count_documents({})
        total_pages = ceil(total_docs / limit) if limit > 0 else 1
        
        cursor = players.find({}, {"_id": 0}).sort("played_at", -1).skip(skip).limit(limit)
        logs = list(cursor)
        return {
            "status": "success", 
            "data": logs, 
            "pagination": {
                "page": page,
                "limit": limit,
                "total_docs": total_docs,
                "total_pages": total_pages
            }
        }
    except Exception as e:
        raise HTTPException(500, str(e))

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

@app.post("/api/play")
async def play_gacha(request: Request):
    try:
        system_status = settings.find_one({"key": "system_status"})
        if not system_status.get("is_active", False):
            return {"status": "closed"}

        data = await request.json()
        gender = data.get("gender")
        name = data.get("name", "Fan")
        lang = data.get("lang", "th")
        
        # IP Checking
        client_ip = request.headers.get("X-Forwarded-For") or request.client.host
        if "," in client_ip: client_ip = client_ip.split(",")[0].strip()
        ip_hash = get_ip_hash(client_ip)

        # Check Duplicate
        if players.find_one({"ip_hash": ip_hash}):
            old = players.find_one({"ip_hash": ip_hash})
            return {
                "status": "already_played",
                "data": {
                    "image_url": f"/api/image/{old['gender']}/{old['image_file']}",
                    "blessing": old['blessing']
                }
            }

        selected_image = get_random_image(gender)
        blessing = await generate_blessing(name, gender, lang)

        # Insert Record
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
    result = players.delete_one({"ip_hash": ip_hash})
    if result.deleted_count == 1:
        return {"status": "deleted"}
    raise HTTPException(404, "Record not found")

# --- Frontend Serving ---
if os.path.exists(os.path.join(STATIC_DIR, "assets")):
    app.mount("/assets", StaticFiles(directory=os.path.join(STATIC_DIR, "assets")), name="static")

@app.get("/{full_path:path}")
async def serve_spa(full_path: str):
    file_path = os.path.join(STATIC_DIR, full_path)
    if os.path.exists(file_path) and os.path.isfile(file_path):
        return FileResponse(file_path)
    return FileResponse(os.path.join(STATIC_DIR, "index.html"))