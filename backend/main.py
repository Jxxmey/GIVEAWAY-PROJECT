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
from google import genai # ✅ ใช้ Library ตัวใหม่ (google-genai)
from google.genai import types

# --- 1. Configuration & Setup ---

app = FastAPI()

# Config
MONGO_URI = os.getenv("MONGO_URI", "mongodb://localhost:27017")
GEMINI_KEY = os.getenv("GEMINI_API_KEY")
ADMIN_SECRET = os.getenv("ADMIN_SECRET", "my_super_secret")
SELF_URL = os.getenv("RENDER_EXTERNAL_URL", "http://127.0.0.1:8000")

# ✅ กำหนดชื่อโมเดลที่นี่ (ถ้ามี gemini-3 ก็แก้ตรงนี้ได้เลย)
AI_MODEL_NAME = "gemini-flash-latest" 

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

# AI Setup (google-genai Client)
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

# ✅ ฟังก์ชัน AI (Updated for google-genai SDK)
async def generate_blessing(name: str, gender: str, lang: str):
    error_msg_th = "ขออภัยครับ ระบบกำลังส่งความรักให้ทุกคนอย่างหนักจนพักเหนื่อย (AI Error) กรุณาลองใหม่นะ!"
    error_msg_en = "Sorry! The system is overwhelmed with sending love (AI Error). Please try again!"
    
    if not client_ai:
        return error_msg_en if lang == 'en' else error_msg_th
    
    try:
        # Prompt Setup
        prompt_th = f"""
        Role: คุณคือ "ตัวแทนความสุข" ของงาน Riser Concert ที่คอยส่งจดหมายขอบคุณให้แฟนคลับ
        Tone: อบอุ่น, จริงใจ, สุภาพ, ให้เกียรติ, และเต็มไปด้วยพลังบวก (เหมือนเขียนจดหมายหาคนสำคัญ)
        Language: ภาษาไทยที่สละสลวย กินใจ น่าอ่าน (ความยาวประมาณ 4-5 บรรทัด)

        Input: แฟนคลับชื่อ "{name}" ผู้ชื่นชอบศิลปินฝั่ง "{gender.upper()}"

        Task: เขียนข้อความอวยพรสุดพิเศษ โดยมีองค์ประกอบดังนี้:
        1. **การต้อนรับ:** ขอบคุณที่มาเป็นส่วนหนึ่งในความทรงจำครั้งสำคัญนี้
        2. **ความรู้สึก:** บรรยายถึงพลังงานดีๆ ความสุข หรือรอยยิ้มที่พวกเขาจะได้รับกลับไป
        3. **คำอวยพร:** ขอให้วันนี้เป็นวันที่ดีที่สุด การเดินทางปลอดภัย และสุขภาพแข็งแรง
        4. **ปิดท้าย (Quote):** ขอ 1 ประโยคสั้นๆ (ภาษาอังกฤษ) ที่มีความหมายดีๆ เกี่ยวกับ Music, Love หรือ Happiness ปิดท้ายบรรทัดล่างสุด

        *ไม่ต้องใส่หัวข้อ ให้เขียนเป็นย่อหน้าต่อเนื่องกันสวยงาม*
        """

        prompt_en = f"""
        Role: You are the "Happiness Ambassador" of Riser Concert, writing thank-you notes to fans.
        Tone: Warm, sincere, polite, respectful, and full of positive energy.
        Language: Beautiful, touching English (Length: about 4-5 sentences).

        Input: Fan named "{name}" who supports the "{gender.upper()}" artist side.

        Task: Write an exclusive blessing message with these elements:
        1. **Welcome:** Thank them deeply for being part of this historic memory.
        2. **Feeling:** Describe the positive energy, joy, and smiles they will take home.
        3. **Blessing:** Wish them the best day, safe travels, and good health.
        4. **Closing Quote:** A short, meaningful quote about Music, Love, or Happiness at the very bottom.

        *Do not use headers. Write as a beautiful continuous paragraph.*
        """

        final_prompt = prompt_en if lang == 'en' else prompt_th

        # ✅ เรียกใช้ AI ด้วย SDK ใหม่ (Client.aio.models.generate_content)
        response = await client_ai.aio.models.generate_content(
            model=AI_MODEL_NAME,
            contents=final_prompt,
            config=types.GenerateContentConfig(
                temperature=0.7, # เพิ่มความสร้างสรรค์
            )
        )
        return response.text.strip()

    except Exception as e:
        print(f"🔥 AI Error ({AI_MODEL_NAME}): {e}")
        # Fallback กรณีโมเดลใหม่ยังไม่รองรับ หรือ Key มีปัญหา
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