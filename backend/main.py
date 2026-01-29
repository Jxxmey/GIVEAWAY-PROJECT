import os
import random
import hashlib
from datetime import datetime
from fastapi import FastAPI, HTTPException, Request
from fastapi.responses import FileResponse, JSONResponse
from fastapi.staticfiles import StaticFiles
from fastapi.middleware.cors import CORSMiddleware
from pymongo import MongoClient
import google.generativeai as genai

# --- 1. Configuration & Setup ---

app = FastAPI()

# โหลด Environment Variables
MONGO_URI = os.getenv("MONGO_URI", "mongodb://localhost:27017")
GEMINI_KEY = os.getenv("GEMINI_API_KEY")

# ตั้งค่า CORS (เผื่อไว้สำหรับการเทส Local, แต่บน Render จะคุยผ่าน Port เดียวกัน)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# เชื่อมต่อ Database
client = MongoClient(MONGO_URI)
db = client['riser_gacha']
players = db['players']
# สร้าง Index เพื่อบังคับว่า 1 IP Hash ต้องไม่ซ้ำ (Unique)
players.create_index("ip_hash", unique=True)

# ตั้งค่า Gemini AI
if GEMINI_KEY:
    genai.configure(api_key=GEMINI_KEY)
    model = genai.GenerativeModel('gemini-1.5-flash')
else:
    print("WARNING: GEMINI_API_KEY is missing!")
    model = None

# กำหนด Path ของไฟล์ต่างๆ (อิงตาม Dockerfile ที่เราเขียน)
# รูปที่ใส่ลายน้ำแล้วจะอยู่ที่ /app/processed_images
IMAGE_DIR = "/app/processed_images"
# ไฟล์เว็บ React จะอยู่ที่ /app/static
STATIC_DIR = "/app/static"

# --- 2. Helper Functions ---

def get_ip_hash(ip: str):
    """แปลง IP Address เป็น Hash เพื่อความเป็นส่วนตัว (PDPA)"""
    return hashlib.sha256(ip.encode()).hexdigest()

def get_random_image(gender: str):
    """สุ่มรูปภาพจากโฟลเดอร์ตามเพศ (โอกาสเท่ากันทุกรูป)"""
    target_dir = os.path.join(IMAGE_DIR, gender)
    
    # เช็กว่ามีโฟลเดอร์จริงไหม
    if not os.path.exists(target_dir):
        # Fallback: ถ้ายังไม่ได้รัน script processed_images ให้ลองไปหาใน assets (รูปดิบ) แทนชั่วคราว
        fallback_dir = os.path.join("/app/assets", gender)
        if os.path.exists(fallback_dir):
            target_dir = fallback_dir
        else:
            raise HTTPException(500, f"Image folder for {gender} not found.")
    
    files = [f for f in os.listdir(target_dir) if f.lower().endswith(('.png', '.jpg', '.jpeg'))]
    
    if not files:
        raise HTTPException(500, "No images found in pool.")
    
    return random.choice(files)

async def generate_blessing(name: str, gender: str):
    """เรียก AI สร้างคำอวยพร"""
    if not model:
        return "ขอให้มีความสุขกับคอนเสิร์ต Riser นะครับ! (System)"
        
    try:
        # Prompt ภาษาไทย
        prompt = (
            f"เขียนคำอวยพรสั้นๆ อบอุ่น สไตล์ไอดอล ให้แฟนคลับชื่อ '{name}' "
            f"(เพศศิลปินที่เลือก: {gender}) ที่มาร่วมงาน 'Riser Concert'. "
            f"ภาษาไทย ความยาวไม่เกิน 2 ประโยค ไม่ต้องใส่อัญประกาศ"
        )
        response = await model.generate_content_async(prompt)
        return response.text.strip()
    except Exception as e:
        print(f"AI Error: {e}")
        return "ขอให้วันนี้เป็นวันที่ดีของคุณนะครับ! (จาก Riser Team)"

# --- 3. API Endpoints ---

@app.post("/api/play")
async def play_gacha(request: Request):
    try:
        data = await request.json()
        gender = data.get("gender")
        name = data.get("name", "Fan")
        
        if gender not in ['male', 'female']:
            raise HTTPException(400, "Invalid gender selected")

        # 1. IP Security Check
        # บน Render/Nginx IP จริงมักจะอยู่ใน Header 'X-Forwarded-For' หรือ 'X-Real-IP'
        client_ip = request.headers.get("X-Forwarded-For") or request.client.host
        # ถ้ามีหลาย IP (ผ่าน proxy) ให้เอาตัวแรก
        if "," in client_ip:
            client_ip = client_ip.split(",")[0].strip()
            
        ip_hash = get_ip_hash(client_ip)
        
        # 2. ตรวจสอบว่าเคยเล่นไปแล้วหรือยัง
        existing_player = players.find_one({"ip_hash": ip_hash})
        if existing_player:
            return {
                "status": "already_played",
                "data": {
                    "image_url": f"/api/image/{existing_player['gender']}/{existing_player['image_file']}",
                    "blessing": existing_player['blessing']
                }
            }

        # 3. สุ่มรูปภาพ
        selected_image = get_random_image(gender)
        
        # 4. ขอคำอวยพร AI
        blessing_text = await generate_blessing(name, gender)
        
        # 5. บันทึกลง Database
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
        
    except Exception as e:
        print(f"Server Error: {e}")
        raise HTTPException(500, "Internal Server Error")

@app.get("/api/image/{gender}/{filename}")
def get_image(gender: str, filename: str):
    """Endpoint สำหรับโหลดรูปภาพ"""
    # ลองหาในโฟลเดอร์ Processed ก่อน
    file_path = os.path.join(IMAGE_DIR, gender, filename)
    
    if not os.path.exists(file_path):
        # Fallback ไปหา assets
        file_path = os.path.join("/app/assets", gender, filename)
        
    if os.path.exists(file_path):
        return FileResponse(file_path)
    
    raise HTTPException(404, "Image not found")

# --- 4. Serve React Frontend (ส่วนสำคัญสำหรับ Single Container) ---

# Mount โฟลเดอร์ assets ของ React (css, js, logo)
# Vite build แล้วมักจะอยู่ใน assets/
if os.path.exists(os.path.join(STATIC_DIR, "assets")):
    app.mount("/assets", StaticFiles(directory=os.path.join(STATIC_DIR, "assets")), name="static")

# Catch-All Route: จัดการ Routing ทุกอย่างที่ไม่ใช่ API
@app.get("/{full_path:path}")
async def serve_react_app(full_path: str):
    """
    ฟังก์ชันนี้จะทำหน้าที่เป็น Web Server:
    1. ถ้า User ขอไฟล์ที่มีอยู่จริง (เช่น favicon.ico) -> ส่งไฟล์นั้นให้
    2. ถ้า User ขอ Path หน้าเว็บ (เช่น /result) -> ส่ง index.html ให้ React Router จัดการต่อ
    """
    
    # พยายามหาไฟล์จริงก่อน
    file_path = os.path.join(STATIC_DIR, full_path)
    if os.path.exists(file_path) and os.path.isfile(file_path):
        return FileResponse(file_path)
    
    # ถ้าไม่เจอไฟล์ ให้ส่ง index.html (SPA Fallback)
    index_path = os.path.join(STATIC_DIR, "index.html")
    if os.path.exists(index_path):
        return FileResponse(index_path)
        
    return "Frontend not built or not found. Please check Docker build steps."