Bu proje, Kaggle benzeri bir veri toplama ve etiketleme platformudur. React (Vite) ve FastAPI ile geliştirilmektedir.

🚀 Projeyi Çalıştırma Adımları (Geliştirici Kurulumu)
📦 1. Gereksinimler
Python 3.10+
Node.js (npm dahil)
PostgreSQL 15+
🛠️ 2. PostgreSQL Ayarları
PostgreSQL kurulumunda kullanıcı adı ve şifreyi aşağıdaki gibi ayarla:

Kullanıcı adı: postgres
Şifre: postgres
pgAdmin veya terminal ile yeni bir veritabanı oluştur:

CREATE DATABASE veriyolu;
🐍 3. Backend (FastAPI)
backend/ dizinine gir:

cd backend
Python bağımlılıklarını yükle:

pip install -r requirements.txt
.env dosyasını kontrol et. Aşağıdaki gibi olmalı:

DATABASE_URL=postgresql://postgres:postgres@localhost/veriyolu
Veritabanı tablolarını başlat:

python scripts/init_db.py
API sunucusunu başlat:

uvicorn main:app --reload
FastAPI Swagger arayüzü için: http://localhost:8000/docs

🌐 4. Frontend (React + Vite)
frontend/frontend/ dizinine gir:

cd frontend/frontend
Node modüllerini yükle:

npm install
Geliştirme sunucusunu başlat:

npm run dev
Frontend varsayılan olarak http://localhost:3000 adresinde çalışır.

🧩 Notlar
Her iki sunucu (frontend ve backend) paralel çalışmalıdır.
Veritabanı ilk başlatıldığında boş olur, kullanıcı ve konu oluşturulması gerekir.
React SPA olarak çalıştığı için refresh edilen sayfalar 404 hatası verebilir, bu normaldir.
init db içinde var admin credintals:
admin@veriyolu.com

admin123
