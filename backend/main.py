import os
import random
import hashlib
from datetime import datetime
from fastapi import FastAPI, HTTPException, Request
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles
from fastapi.middleware.cors import CORSMiddleware
from pymongo import MongoClient
from google import genai 

# --- 1. Configuration & Setup ---

app = FastAPI()

# Config
MONGO_URI = os.getenv("MONGO_URI", "mongodb://localhost:27017")
GEMINI_KEY = os.getenv("GEMINI_API_KEY")

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
    players.create_index("ip_hash", unique=True)
    print("✅ MongoDB Connected")
except Exception as e:
    print(f"❌ MongoDB Error: {e}")

# AI Setup
client_ai = None
if GEMINI_KEY:
    try:
        client_ai = genai.Client(api_key=GEMINI_KEY)
        print("✅ Gemini Client Ready")
    except Exception as e:
        print(f"❌ Gemini Error: {e}")

IMAGE_DIR = "/app/processed_images"
STATIC_DIR = "/app/static"

# --- 2. Helpers ---

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

async def generate_blessing(name: str, gender: str):
    if not client_ai:
        return "ขอให้มีความสุขมากๆ กับคอนเสิร์ตครั้งนี้นะครับ ขอบคุณที่มาเป็นกำลังใจให้กันเสมอ ขอให้วันนี้เป็นวันที่ดีของคุณครับ!"
    
    try:
        # ปรับ Prompt: ขอให้ยาวขึ้น อบอุ่นขึ้น และไม่ต้องบอกว่าเป็น AI
        prompt = (
            f"เขียนข้อความอวยพรแฟนคลับที่มาร่วมงาน 'Riser Concert' ให้กับคุณ '{name}' "
            f"(แฟนคลับคนนี้ชอบศิลปินฝั่ง: {gender}) "
            f"ขอภาษาไทยที่อบอุ่น ซึ้งกินใจ เป็นกันเอง และให้กำลังใจ "
            f"ความยาวประมาณ 3-4 ประโยค ไม่ต้องลงชื่อท้ายข้อความ"
        )
        
        response = await client_ai.aio.models.generate_content(
            model='gemini-1.5-flash',
            contents=prompt
        )
        return response.text.strip()
    except Exception as e:
        print(f"⚠️ AI Gen Error: {e}")
        return "ขอบคุณที่มาร่วมสร้างความทรงจำดีๆ ด้วยกันในวันนี้นะครับ ขอให้กลับบ้านปลอดภัยและมีความสุขมากๆ ครับ!"

# --- 3. Routes ---

@app.post("/api/play")
async def play_gacha(request: Request):
    try:
        data = await request.json()
        gender = data.get("gender")
        name = data.get("name", "Fan")
        
        client_ip = request.headers.get("X-Forwarded-For") or request.client.host
        if "," in client_ip: client_ip = client_ip.split(",")[0]
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
        blessing = await generate_blessing(name, gender)

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

# --- 4. Frontend Serve ---
if os.path.exists(os.path.join(STATIC_DIR, "assets")):
    app.mount("/assets", StaticFiles(directory=os.path.join(STATIC_DIR, "assets")), name="static")

@app.get("/{full_path:path}")
async def serve_spa(full_path: str):
    file_path = os.path.join(STATIC_DIR, full_path)
    if os.path.exists(file_path) and os.path.isfile(file_path):
        return FileResponse(file_path)
    return FileResponse(os.path.join(STATIC_DIR, "index.html"))