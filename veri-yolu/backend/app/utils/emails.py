import smtplib
from email.message import EmailMessage

def send_verification_email(email: str, token: str):
    msg = EmailMessage()
    msg["Subject"] = "Veri-Yolu E-Posta Doğrulama"
    msg["From"] = "noreply@veri-yolu.com"
    msg["To"] = email
    msg.set_content(f"Doğrulama bağlantısı: http://localhost:8000/verify?token={token}")

    with smtplib.SMTP("smtp.gmail.com", 587) as server:
        server.starttls()
        server.login("YOUR_EMAIL", "YOUR_APP_PASSWORD")
        server.send_message(msg)
