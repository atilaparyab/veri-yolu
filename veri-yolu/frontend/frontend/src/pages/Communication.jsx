import React, { useState, useContext } from "react";
import api from "../api/api";
import contactImage from "../assets/contact.png";
import { AuthContext } from "../context/AuthContext";

const Communication = () => {
  const [subject, setSubject] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [status, setStatus] = useState(null);

  const { user } = useContext(AuthContext);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setStatus(null);
    try {
      await api.post("/contact", {
        subject,
        first_name: firstName,
        last_name: lastName,
        email,
        message,
      });
      setStatus({ type: "success", text: "Mesajınız gönderildi." });
      setSubject("");
      setFirstName("");
      setLastName("");
      setEmail("");
      setMessage("");
    } catch (err) {
      setStatus({
        type: "error",
        text: err.response?.data?.detail || "Gönderim sırasında hata oluştu.",
      });
    }
  };

  return (
    <div className="bg-gray-50 flex flex-col px-4">
      {/* Giriş yapılmışsa footer'ı gizle */}
      {user && <style>{`footer { display: none; }`}</style>}

      {/* Üst Başlık ve Açıklama + Görsel */}
      <div className="max-w-7xl flex flex-col md:flex-row md:items-start justify-between mt-15 mb-8">
        {/* Yazılar */}
        <div className="max-w-3xl flex flex-col justify-center mt-5">
          <h1 className="text-3xl font-extrabold mb-2 text-black">
            Bizimle İletişime Geçin
          </h1>
          <p className="text-gray-600 leading-relaxed">
            Sorularınız, önerileriniz veya iş birlikleriniz için bize
            ulaşabilirsiniz. Size en kısa sürede geri döneceğiz!
          </p>
        </div>
        {/* Foto (istersen kullan) */}
        {/* <img src={contactImage} alt="İletişim" className="hidden md:block w-64 object-contain" /> */}
      </div>

      {/* Form Kutusu */}
      <div className="bg-gray-100 rounded-xl p-6 sm:p-8 w-full shadow-xl max-w-7xl">
        <h2 className="text-xl font-semibold mb-5 text-gray-800 text-center">
          İletişim Formu
        </h2>
        {status && (
          <div
            className={`mb-4 text-sm rounded-lg p-3 ${
              status.type === "success"
                ? "bg-green-100 text-green-800"
                : "bg-red-100 text-red-800"
            }`}
          >
            {status.text}
          </div>
        )}
        <form onSubmit={handleSubmit} className="flex flex-wrap gap-4">
          <input
            type="text"
            placeholder="Konu"
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            className="flex-1 border border-gray-300 rounded-lg p-3 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
          />
          <input
            type="text"
            placeholder="Ad"
            value={firstName}
            onChange={(e) => setFirstName(e.target.value)}
            className="flex-1 border border-gray-300 rounded-lg p-3 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
          />
          <input
            type="text"
            placeholder="Soyad"
            value={lastName}
            onChange={(e) => setLastName(e.target.value)}
            className="flex-1 border border-gray-300 rounded-lg p-3 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
          />
          <input
            type="email"
            placeholder="E-Posta"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="flex-1 border border-gray-300 rounded-lg p-3 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
          />
          <textarea
            placeholder="Mesajınız"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            className="w-full border border-gray-300 rounded-lg p-3 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 h-32 resize-none"
          ></textarea>
          <button
            type="submit"
            className="w-full py-3 bg-black text-white text-sm font-semibold rounded-full hover:bg-gray-900 transition duration-300 cursor-pointer"
          >
            Gönder
          </button>
        </form>
      </div>
    </div>
  );
};

export default Communication;
