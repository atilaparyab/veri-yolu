# Veri-Yolu

Bu proje, Kaggle benzeri bir veri toplama ve etiketleme platformudur. React (Vite) ve FastAPI ile geliştirilmektedir.

---

## 🚀 Projeyi Çalıştırma Adımları (Geliştirici Kurulumu)

### 📦 1. Gereksinimler

- Python 3.10+
- Node.js (npm dahil)
- PostgreSQL 15+

---

### 🛠️ 2. PostgreSQL Ayarları

1. PostgreSQL kurulumunda kullanıcı adı ve şifreyi aşağıdaki gibi ayarla:

   - **Kullanıcı adı:** `postgres`
   - **Şifre:** `postgres`

2. pgAdmin veya terminal ile yeni bir veritabanı oluştur:

   ```sql
   CREATE DATABASE veriyolu;
   ```

---

### 🐍 3. Backend (FastAPI)

1. `backend/` dizinine gir:

   ```bash
   cd backend
   ```

2. Python bağımlılıklarını yükle:

   ```bash
   pip install -r requirements.txt
   ```

3. `.env` dosyasını kontrol et. Aşağıdaki gibi olmalı:

   ```env
   DATABASE_URL=postgresql://postgres:postgres@localhost/veriyolu
   ```

4. Veritabanı tablolarını başlat:

   ```bash
   python scripts/init_db.py
   ```

5. API sunucusunu başlat:

   ```bash
   uvicorn main:app --reload
   ```

> FastAPI Swagger arayüzü için: [http://localhost:8000/docs](http://localhost:8000/docs)

---

### 🌐 4. Frontend (React + Vite)

1. `frontend/frontend/` dizinine gir:

   ```bash
   cd frontend/frontend
   ```

2. Node modüllerini yükle:

   ```bash
   npm install
   ```

3. Geliştirme sunucusunu başlat:

   ```bash
   npm run dev
   ```

> Frontend varsayılan olarak [http://localhost:3000](http://localhost:3000) adresinde çalışır.

---

### 🧩 Notlar

- Her iki sunucu (frontend ve backend) paralel çalışmalıdır.
- Veritabanı ilk başlatıldığında boş olur, kullanıcı ve konu oluşturulması gerekir.
- React SPA olarak çalıştığı için refresh edilen sayfalar 404 hatası verebilir, bu normaldir.

---

init db içinde var admin credintals:\
[admin@veriyolu.com](mailto\:admin@veriyolu.com)

admin123
