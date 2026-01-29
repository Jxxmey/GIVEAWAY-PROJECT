# --- Stage 1: Build Frontend (React) ---
FROM node:18-slim as frontend-build
WORKDIR /app/frontend

# Copy package files and install dependencies
COPY frontend/package*.json ./
RUN npm install

# Copy source code and build
COPY frontend/ .
RUN npm run build
# ผลลัพธ์จะอยู่ที่ /app/frontend/dist

# --- Stage 2: Setup Backend & Final Image ---
FROM python:3.11-slim

WORKDIR /app

# Install System Dependencies (สำหรับจัดการรูปภาพ)
RUN apt-get update && apt-get install -y libgl1

# Install Python Dependencies
COPY backend/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy Backend Code
COPY backend/ .
COPY prepare_images.py .
COPY logo.png .

# Copy Assets (รูปต้นฉบับ)
COPY assets/ ./assets/

# Run Script สร้างลายน้ำตอน Build เลย (จะได้มีรูปพร้อมใช้)
# ต้องแน่ใจว่า requirements.txt มี Pillow แล้ว
RUN python prepare_images.py

# --- KEY STEP: Copy Frontend Build from Stage 1 ---
# เอาไฟล์เว็บที่ Build เสร็จแล้ว มาวางไว้ในโฟลเดอร์ static ของ Backend
COPY --from=frontend-build /app/frontend/dist /app/static

# Expose Port
EXPOSE 8000

# Run FastAPI
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]