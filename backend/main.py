import os
import random
import hashlib
import asyncio
import requests
from datetime import datetime
from fastapi import FastAPI, HTTPException, Request
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles
from fastapi.middleware.cors import CORSMiddleware
from pymongo import MongoClient
from google import genai
from google.genai import types

# --- 1. Configuration & Setup ---

app = FastAPI()

# Config
MONGO_URI = os.getenv("MONGO_URI", "mongodb://localhost:27017")
GEMINI_KEY = os.getenv("GEMINI_API_KEY")
ADMIN_SECRET = os.getenv("ADMIN_SECRET", "my_super_secret")
SELF_URL = os.getenv("RENDER_EXTERNAL_URL", "http://127.0.0.1:8000")

# ใช้ค่าจาก .env ถ้าไม่มีให้ใช้ gemini-2.0-flash-exp
AI_MODEL_NAME = os.getenv("AI_MODEL_NAME", "gemini-flash-latest")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# Database
try:
    client_db = MongoClient(MONGO_URI)
    db = client_db['riser_gacha']
    players = db['players']
    settings = db['settings']
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

IMAGE_DIR = "/app/processed_images"
STATIC_DIR = "/app/static"

# --- 2. Background Tasks ---

@app.get("/health")
async def health_check():
    return {"status": "alive", "timestamp": datetime.now()}

async def keep_alive_ping():
    while True:
        await asyncio.sleep(300)
        try:
            response = requests.get(f"{SELF_URL}/health", timeout=10)
            print(f"💓 Self-Ping success: {response.status_code}")
        except Exception as e:
            print(f"⚠️ Self-Ping failed: {e}")

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

# ✅ ฟังก์ชัน AI (Fan Project Tone)
async def generate_blessing(name: str, gender: str, lang: str):
    error_msg_th = "ตอนนี้คนเล่นเยอะมาก ระบบขอพักจิบน้ำแป๊บ (AI Error) ลองกดใหม่นะเตง!"
    error_msg_en = "Too many fans joining! System needs a quick break (AI Error). Please try again!"
    
    if not client_ai:
        return error_msg_en if lang == 'en' else error_msg_th
    
    try:
        # --- PROMPT ภาษาไทย (ฉบับแฟนคลับ) ---
        prompt_th = f"""
        Role: คุณคือตัวแทนจาก "โปรเจกต์แฟนคลับ (@Jaiidees)" ที่ทำกิจกรรมแจกของที่ระลึกด้วยใจรัก
        Tone: อบอุ่น, ละมุน, เป็นกันเอง (เหมือนเพื่อนคุยกับเพื่อน), น่ารัก, ให้เกียรติ แต่ไม่ทางการ (Not Official)
        Language: ภาษาไทยที่อ่านแล้วยิ้มตาม (ความยาว 3-4 บรรทัด)

        Input: เพื่อนแฟนคลับชื่อ "{name}" เมนฝั่ง "{gender.upper()}"

        Task: เขียนข้อความขอบคุณที่มาร่วมสนุกกับโปรเจกต์เล็กๆ ของเรา:
        1. **ทักทาย:** ขอบคุณที่แวะมาเล่นกิจกรรม Fan Project ของเรานะ
        2. **ความเชื่อมโยง:** ดีใจที่เราได้มารักศิลปินคนเดียวกัน และได้เจอกันในงาน Riser Concert นี้
        3. **อวยพร:** ขอให้วันนี้เป็นวันที่ใจฟู ได้โมเมนต์กลับไปเยอะๆ และเดินทางกลับบ้านปลอดภัย
        4. **ปิดท้าย:** Quote ภาษาอังกฤษสั้นๆ เกี่ยวกับ Music หรือ Happiness 1 ประโยค

        *ไม่ต้องใส่หัวข้อ เขียนเป็นย่อหน้าน่ารักๆ ต่อกันเลย*
        """

        # --- PROMPT ภาษาอังกฤษ (Fan Project Ver.) ---
        prompt_en = f"""
        Role: You are a representative from the "Fan Project (@Jaiidees)", created with love by fans for fans.
        Tone: Warm, soft, friendly (Fan-to-Fan connection), sweet, and not corporate/official.
        Language: Heartwarming English (Length: 3-4 sentences).

        Input: Fellow fan named "{name}" supporting the "{gender.upper()}" side.

        Task: Write a thank you note for joining our small project:
        1. **Greeting:** Thanks for stopping by to play our Fan Project gacha.
        2. **Connection:** So happy we share the same love for the artist at Riser Concert.
        3. **Wish:** Hope your heart is full of joy today, wishing you the best moments and safe travels home.
        4. **Closing:** A short English Quote about Music or Happiness.

        *No headers. Just a beautiful, continuous paragraph.*
        """

        final_prompt = prompt_en if lang == 'en' else prompt_th

        response = await client_ai.aio.models.generate_content(
            model=AI_MODEL_NAME,
            contents=final_prompt,
            config=types.GenerateContentConfig(
                temperature=0.8, # เพิ่มความ Creative ให้ดูมีชีวิตชีวา
            )
        )
        return response.text.strip()

    except Exception as e:
        print(f"🔥 AI Error ({AI_MODEL_NAME}): {e}")
        return error_msg_en if lang == 'en' else error_msg_th

# --- 4. Routes ---

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
        
        client_ip = request.headers.get("X-Forwarded-For") or request.client.host
        if "," in client_ip: client_ip = client_ip.split(",")[0]
        ip_hash = get_ip_hash(client_ip)

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

        players.insert_one({
            "ip_hash": ip_hash,
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

@app.get("/api/admin/history")
async def get_history(request: Request):
    auth_header = request.headers.get("X-Admin-Key")
    if auth_header != ADMIN_SECRET:
        raise HTTPException(401, "Unauthorized")

    try:
        cursor = players.find({}, {"_id": 0}).sort("played_at", -1).limit(100)
        logs = list(cursor)
        return {"status": "success", "data": logs}
    except Exception as e:
        raise HTTPException(500, str(e))

@app.delete("/api/admin/delete/{ip_hash}")
async def delete_history(ip_hash: str, request: Request):
    auth_header = request.headers.get("X-Admin-Key")
    if auth_header != ADMIN_SECRET:
        raise HTTPException(401, "Unauthorized")
        
    result = players.delete_one({"ip_hash": ip_hash})
    if result.deleted_count == 1:
        return {"status": "deleted"}
    raise HTTPException(404, "Record not found")

# --- 5. Frontend Serve ---
if os.path.exists(os.path.join(STATIC_DIR, "assets")):
    app.mount("/assets", StaticFiles(directory=os.path.join(STATIC_DIR, "assets")), name="static")

@app.get("/{full_path:path}")
async def serve_spa(full_path: str):
    file_path = os.path.join(STATIC_DIR, full_path)
    if os.path.exists(file_path) and os.path.isfile(file_path):
        return FileResponse(file_path)
    return FileResponse(os.path.join(STATIC_DIR, "index.html"))