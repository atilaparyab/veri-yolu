import { useState } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";

const Register = ({ showToast }) => {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const navigate = useNavigate();

  const handleRegister = async (e) => {
    e.preventDefault();
    try {
      await axios.post("http://localhost:8000/auth/register", {
        email,
        password,
        name,
      });
      showToast && showToast("Kayıt başarılı! Giriş yapabilirsiniz.");
      navigate("/login");
    } catch (err) {
      showToast &&
        showToast("Hata: " + (err.response?.data?.detail || err.message));
    }
  };

  return (
    <div className="mt-15 flex items-center justify-center bg-gray-50">
      <div className="relative w-full max-w-sm bg-white rounded-3xl border border-gray-200 shadow-lg p-8 flex flex-col items-center overflow-hidden">
        {/* Üst kısım: marka + başlık */}
        <div className="w-full text-center">
          <div className="text-transparent bg-clip-text bg-gradient-to-r from-purple-500 to-blue-500 text-3xl font-semibold tracking-tight">
            VeriYolu
          </div>
          <h2 className="text-3xl font-extrabold mt-2 text-gray-900">
            Kayıt Ol
          </h2>
        </div>

        {/* İnce ayırıcı çizgi */}
        <div className="w-full my-6">
          <div className="h-px w-full bg-gray-200" />
        </div>

        {/* Form */}
        <form onSubmit={handleRegister} className="w-full flex flex-col gap-4">
          <input
            type="text"
            placeholder="Ad Soyad"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            className="px-4 py-2 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary"
          />
          <input
            type="email"
            placeholder="E-posta"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className="px-4 py-2 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary"
          />
          <input
            type="password"
            placeholder="Şifre"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            className="px-4 py-2 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary"
          />

          <button
            type="submit"
            className="w-full bg-black text-white font-semibold py-2 rounded-xl transition duration-300 ease-in-out hover:bg-gray-900 hover:shadow-lg cursor-pointer"
          >
            Kayıt Ol
          </button>
        </form>

        {/* Zaten hesabın var mı? */}
        <div className="flex flex-col items-center mt-4 text-gray-500 text-sm">
          <span>
            Zaten hesabın var mı?{" "}
            <span
              onClick={() => navigate("/login")}
              className="text-blue-500 font-bold cursor-pointer underline hover:text-blue-300 duration-200"
            >
              Giriş Yap
            </span>
          </span>
        </div>

        {/* ALTA TEK DESEN (SVG) */}
        <svg
          className="pointer-events-none select-none absolute bottom-0 left-0 w-full h-10"
          viewBox="0 0 1440 160"
          preserveAspectRatio="none"
          aria-hidden="true"
        >
          {/* arka yumuşak dalga */}
          <path
            d="M0,80 C180,120 320,40 520,70 C740,105 900,10 1140,60 C1260,85 1350,110 1440,95 L1440,160 L0,160 Z"
            fill="#22CCFF" /* sky-200 */
            opacity="0.55"
          />
          {/* orta sarı dalga */}
          <path
            d="M0,95 C160,135 340,75 520,95 C760,120 930,45 1140,95 C1280,125 1370,135 1440,125 L1440,160 L0,160 Z"
            fill="#8B5CF6" /* amber-300 */
            opacity="0.55"
          />
          {/* önde küçük yeşil dalga */}
          <path
            d="M0,115 C220,150 420,105 640,120 C880,140 1080,95 1440,120 L1440,160 L0,160 Z"
            fill="#C4B5FD" /* green-200 */
            opacity="0.7"
          />
        </svg>
      </div>
    </div>
  );
};

export default Register;
