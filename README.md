# 📊 VeriYolu – Veri Toplama ve Etiketleme Platformu

VeriYolu, Kaggle benzeri bir veri toplama, paylaşma ve etiketleme platformudur.  
Proje, **React (Vite)** ve **FastAPI** kullanılarak geliştirilmiştir.

---

## 🚀 Projeyi Çalıştırma (Geliştirici Kurulumu)

### 📦 1. Gereksinimler

Sisteminize aşağıdaki yazılımların kurulu olması gerekir:

- Python **3.10+**
- Node.js (npm dahil)
- PostgreSQL **15+**
- Git (önerilir)

---

## 🛠️ 2. PostgreSQL Kurulumu ve Yapılandırma

PostgreSQL kurulumundan sonra yeni bir veritabanı oluşturun:

- CREATE DATABASE veriyolu;

## 🔐 3. Ortam Değişkenleri 

Backend dizininde bir **.env** dosyası oluşturun:

- DATABASE_URL=postgresql://veriyolu_user:strong_password@localhost/veriyolu
- SECRET_KEY=your_secret_key_here

##  🐍 4. Backend (FastAPI)

Terminal'de
- cd backend
- pip install -r requirements.txt
- python scripts/init_db.py
- uvicorn main:app --reload
- http://localhost:8000/docs


## 🌐 5. Frontend (React + Vite)

Terminal'de
- cd frontend/frontend
- npm install
- npm run dev
- http://localhost:3000

## 👤 6. Yönetici (Admin) Hesabı

Varsayılan admin bilgileri kod içinde tutulmamaktadır.

İlk yönetici hesabını oluşturmak için:
- python scripts/create_admin.py

veya Swagger arayüzü üzerinden kayıt oluşturabilirsiniz.


## 🧩 7. Kullanım Notları

- Frontend ve backend aynı anda çalışmalıdır.
- İlk kurulumda veritabanı boş olur.
- Kullanıcı ve konu eklenmesi gerekir.
- React SPA yapısı nedeniyle sayfa yenilemelerinde 404 görülebilir.
- Production ortamında reverse proxy (Nginx vb.) önerilir.
