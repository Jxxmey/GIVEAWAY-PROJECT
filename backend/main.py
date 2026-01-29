import os
import random
import hashlib
from datetime import datetime
from fastapi import FastAPI, HTTPException, Request, BackgroundTasks
from fastapi.responses import FileResponse
from fastapi.middleware.cors import CORSMiddleware
from pymongo import MongoClient
import google.generativeai as genai

# --- Config ---
app = FastAPI()
MONGO_URI = os.getenv("MONGO_URI", "mongodb://localhost:27017")
GEMINI_KEY = os.getenv("GEMINI_API_KEY")

# CORS Setup
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# Database Setup
client = MongoClient(MONGO_URI)
db = client['riser_gacha']
players = db['players']
# สร้าง Index ให้ IP Hash ห้ามซ้ำ
players.create_index("ip_hash", unique=True)

# AI Setup
genai.configure(api_key=GEMINI_KEY)
model = genai.GenerativeModel('gemini-1.5-flash')

# Image Path (Mapped from Docker Volume)
IMAGE_DIR = "/app/images"

# --- Helper Functions ---
def get_ip_hash(ip: str):
    return hashlib.sha256(ip.encode()).hexdigest()

def get_random_image(gender: str):
    target_dir = os.path.join(IMAGE_DIR, gender)
    if not os.path.exists(target_dir):
        raise HTTPException(500, f"Image folder {gender} missing")
    
    files = [f for f in os.listdir(target_dir) if f.lower().endswith(('.png', '.jpg', '.jpeg'))]
    if not files:
        raise HTTPException(500, "No images found in pool")
    
    return random.choice(files)

async def generate_blessing(name: str, gender: str):
    try:
        prompt = f"Write a short, warm, idol-style blessing for a fan named '{name}' (Gender: {gender}) attending 'Riser Concert'. Language: Thai. Max 2 sentences."
        response = await model.generate_content_async(prompt)
        return response.text
    except:
        return "ขอให้มีความสุขกับคอนเสิร์ต Riser นะครับ! (Gemini)"

# --- API Endpoints ---

@app.post("/api/play")
async def play_gacha(request: Request):
    data = await request.json()
    gender = data.get("gender") # 'male' or 'female'
    name = data.get("name", "Fan")
    
    # 1. Check IP Security
    # (ใช้ X-Real-IP จาก Nginx ถ้าไม่มีใช้ host ปกติ)
    client_ip = request.headers.get("X-Real-IP") or request.client.host
    ip_hash = get_ip_hash(client_ip)
    
    existing_player = players.find_one({"ip_hash": ip_hash})
    if existing_player:
        return {
            "status": "already_played",
            "data": {
                "image_url": f"/api/image/{existing_player['gender']}/{existing_player['image_file']}",
                "blessing": existing_player['blessing']
            }
        }

    # 2. Gacha Logic (Equal Chance)
    selected_image = get_random_image(gender)
    
    # 3. AI Blessing
    blessing_text = await generate_blessing(name, gender)
    
    # 4. Save to DB
    new_record = {
        "ip_hash": ip_hash,
        "gender": gender,
        "name": name,
        "image_file": selected_image,
        "blessing": blessing_text,
        "played_at": datetime.now()
    }
    players.insert_one(new_record)
    
    return {
        "status": "success",
        "data": {
            "image_url": f"/api/image/{gender}/{selected_image}",
            "blessing": blessing_text
        }
    }

@app.get("/api/image/{gender}/{filename}")
def get_image(gender: str, filename: str):
    # ใน Production ควรมีการเช็ก Token แต่อันนี้ปล่อยฟรีเพื่อความง่ายในการ Demo
    file_path = os.path.join(IMAGE_DIR, gender, filename)
    if os.path.exists(file_path):
        return FileResponse(file_path)
    raise HTTPException(404, "Image not found")