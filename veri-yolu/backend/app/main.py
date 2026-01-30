# main.py
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from app.api import auth, topic, image, admin, communication, discussion
from app.db.init_db import init_db
import os

app = FastAPI()

@app.get("/")
def read_root():
    return {"message": "Hoşgeldiniz"}

@app.on_event("startup")
def on_startup():
    init_db()

# ⬇️ CORS: React/Vite olası origin'leri ekledik
origins = [
    "http://localhost:3000",
    "http://127.0.0.1:3000",
    "http://localhost:5173",
    "http://127.0.0.1:5173",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,          # üretimde * kullanma
    allow_credentials=True,         # cookie kullanıyorsan gerekli
    allow_methods=["*"],            # OPTIONS dahil
    allow_headers=["*"],            # Authorization vs.
)

# Router'lar (CORS middleware'den SONRA geliyor olmalı)
app.include_router(auth.router, prefix="/auth", tags=["auth"])
# (Bunu iki kez eklemek yerine özel route'u ayrı expose et; çakışma olmasın)
# app.include_router(auth.router, include_in_schema=False)  # GEREKSİZ -> kaldır

app.include_router(topic.router, prefix="/topics", tags=["topics"])
app.include_router(image.router, prefix="/images", tags=["images"])
app.include_router(admin.router, prefix="/admin", tags=["admin"])
app.include_router(communication.router, prefix="/contact", tags=["contact"])
app.include_router(discussion.router, prefix="/discussions", tags=["discussions"])

app.mount(
    "/uploaded_images",
    StaticFiles(directory=os.path.abspath(os.path.join(os.path.dirname(__file__), "../uploaded_images"))),
    name="uploaded_images",
)


