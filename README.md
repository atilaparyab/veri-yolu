# 📊 VeriYolu – Veri Toplama ve Etiketleme Platformu

VeriYolu, Kaggle benzeri bir veri toplama, paylaşma ve etiketleme platformudur.  
Proje, **React (Vite)** ve **FastAPI** kullanılarak geliştirilmiştir.

---

## 🚀 Projeyi Çalıştırma (Geliştirici Kurulumu)

### 📦 1. Gereksinimler

- Python **3.10+**
- Node.js (npm dahil)
- PostgreSQL **15+**
- Git (önerilir)

---

## 🛠️  Kurulum

1. Yeni veritabanı oluşturun:


CREATE DATABASE veriyolu;


2. Ortam Değişkenleri (.env)

Backend dizininde .env oluşturun:
DATABASE_URL=postgresql://veriyolu_user:strong_password@localhost/veriyolu
SECRET_KEY=your_secret_key_here


3. Backend (FastAPI)

cd backend
pip install -r requirements.txt
python scripts/init_db.py
uvicorn main:app --reload
http://localhost:8000/docs


4. Frontend (React + Vite)

cd frontend/frontend
npm install
npm run dev
http://localhost:3000


5. Yönetici (Admin) Hesabı
Varsayılan admin bilgileri bulunmaz.

Oluşturmak için:
python scripts/create_admin.py  veya Swagger kullanabilirsiniz.


6. Kullanım Notları

-Frontend ve backend birlikte çalışmalıdır.
-İlk kurulumda veritabanı boştur.
-Kullanıcı ve konu oluşturulmalıdır.
-SPA nedeniyle refresh sonrası 404 görülebilir.
-Production için Nginx önerilir.



