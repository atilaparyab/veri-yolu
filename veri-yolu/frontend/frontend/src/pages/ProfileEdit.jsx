import React, { useContext, useState } from "react";
import { AuthContext } from "../context/AuthContext";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import Cropper from "react-easy-crop";
import getCroppedImg from "../utils/cropImage";
import api from "../api/api";
import { FiEdit2 } from "react-icons/fi";

const ProfileEdit = () => {
  const { user, setUser, token } = useContext(AuthContext);
  const [email, setEmail] = useState(user?.email || "");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [profileImage, setProfileImage] = useState(
    user?.profile_image ? `/uploaded_images/${user.profile_image}` : null
  );
  const [newImage, setNewImage] = useState(null);
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState(null);
  const [showCrop, setShowCrop] = useState(false);
  const [editHover, setEditHover] = useState(false);
  const fileInputRef = React.useRef();
  const [unsavedPhoto, setUnsavedPhoto] = useState(false);

  if (!user) {
    return <div className="p-6">{t("not_logged_in")}</div>;
  }

  const handleImageChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      setNewImage(URL.createObjectURL(e.target.files[0]));
      setShowCrop(true);
      setUnsavedPhoto(true);
    }
  };
  const onCropComplete = (croppedArea, croppedAreaPixels) => {
    setCroppedAreaPixels(croppedAreaPixels);
  };
  const handleEditClick = () => {
    fileInputRef.current.click();
  };
  const handleCropSave = async () => {
    const croppedBlob = await getCroppedImg(newImage, croppedAreaPixels);
    setProfileImage(URL.createObjectURL(croppedBlob));
    setShowCrop(false);
    setNewImage(croppedBlob); // Bunu kaydedeceğiz
    setUnsavedPhoto(true);
    // Otomatik kaydet
    try {
      setLoading(true);
      const formData = new FormData();
      formData.append("profile_image", croppedBlob, "profile.jpg");
      const res = await api.put("/auth/me", formData);
      const data = res.data;
      setUser({ ...user, profile_image: data.profile_image });
      localStorage.setItem(
        "user",
        JSON.stringify({ ...user, profile_image: data.profile_image })
      );
      setUnsavedPhoto(false);
      setMessage(t("profile_update_success"));
    } catch (err) {
      setMessage(
        err?.response?.data?.detail || err?.message || t("profile_update_error")
      );
      console.error(
        "Profile update error:",
        err,
        err?.response?.data,
        err?.response
      );
    } finally {
      setLoading(false);
    }
  };
  const handleCropCancel = () => {
    setShowCrop(false);
    setNewImage(null);
    setUnsavedPhoto(false);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage("");
    try {
      const formData = new FormData();
      if (email !== user.email) formData.append("email", email);
      if (password) formData.append("password", password);
      if (newImage && newImage instanceof Blob)
        formData.append("profile_image", newImage, "profile.jpg");
      const res = await api.put("/auth/me", formData);
      console.log("Profile update response:", res);
      const data = res.data;
      console.log("API'den dönen profile_image:", data.profile_image);
      setUser({
        ...user,
        email: data.email,
        profile_image: data.profile_image,
      });
      localStorage.setItem(
        "user",
        JSON.stringify({
          ...user,
          email: data.email,
          profile_image: data.profile_image,
        })
      );
      console.log("Kullanıcı objesi:", {
        ...user,
        email: data.email,
        profile_image: data.profile_image,
      });
      setUnsavedPhoto(false);
      setMessage(t("profile_update_success"));
      setTimeout(() => navigate("/profile"), 1500);
    } catch (err) {
      setMessage(
        err?.response?.data?.detail || err?.message || t("profile_update_error")
      );
      console.error(
        "Profile update error:",
        err,
        err?.response?.data,
        err?.response
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-gray-50 font-sans">
      <style>{`
    footer { display: none; }
  `}</style>
      <div className="flex flex-col items-start justify-start py-10 ">
        <div className="relative bg-gray-100 border border-gray-300 shadow-xs rounded-2xl p-8 w-full max-w-6xl flex flex-col overflow-hidden pr-[32%] md:pr-[36%] lg:pr-[30%] ">
          <form
            onSubmit={handleSubmit}
            className="flex items-start gap-10 w-full"
          >
            {/* 🎨 Sağ kenar deseni (mavi–mor–lila şeritler) */}
            <div className="pointer-events-none absolute inset-y-0 right-0 w-[32%] md:w-[36%] lg:w-[30%] z-0">
              <svg
                viewBox="0 0 500 800"
                xmlns="http://www.w3.org/2000/svg"
                className="w-full h-full"
                preserveAspectRatio="none"
              >
                <path
                  d="M500,0 L500,800 C420,760 360,700 340,620 C320,540 360,470 390,410 C430,330 450,260 420,200 C390,140 330,110 280,90 C240,75 210,55 200,0 Z"
                  fill="#22CCFF"
                  opacity="0.85"
                />
                <path
                  d="M500,0 L500,800 C450,770 390,720 370,650 C350,580 380,520 410,470 C450,400 470,330 450,270 C430,210 380,180 330,160 C300,150 260,120 250,0 Z"
                  fill="#8B5CF6"
                  opacity="0.75"
                />
                <path
                  d="M500,0 L500,800 C470,780 420,740 400,690 C380,640 400,590 430,540 C460,490 480,430 470,370 C460,310 420,280 370,260 C340,250 300,230 290,0 Z"
                  fill="#C4B5FD"
                  opacity="0.7"
                />
              </svg>
            </div>
            {/* Profil Fotoğrafı */}
            <div className="flex flex-col items-center">
              <div
                className="w-48 h-48 rounded-full overflow-hidden bg-gray-200 border-4 border-primary relative group"
                onMouseEnter={() => setEditHover(true)}
                onMouseLeave={() => setEditHover(false)}
              >
                {profileImage ? (
                  <img
                    src={profileImage + "?v=" + Date.now()}
                    alt="Profil"
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <span className="text-6xl text-gray-400 flex items-center justify-center w-full h-full">
                    👤
                  </span>
                )}

                {/* Kalem ikonu */}
                <button
                  type="button"
                  className={`absolute inset-0 flex items-center justify-center bg-black bg-opacity-40 transition-opacity duration-200 ${
                    editHover ? "opacity-100" : "opacity-0"
                  }`}
                  onClick={handleEditClick}
                >
                  <FiEdit2 className="text-white text-3xl" />
                </button>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleImageChange}
                  ref={fileInputRef}
                  className="hidden"
                />
              </div>
              {unsavedPhoto && (
                <div className="text-xs text-red-500 mt-2">
                  Kaydetmeden çıkarsan değişiklikler kaybolur.
                </div>
              )}
            </div>

            {/* Ortadaki Form Alanları */}
            <div className="flex flex-col flex-1 max-w-md gap-4 ml-15">
              {/* Email */}
              <div className="flex flex-col">
                <label className="text-gray-600 font-semibold mb-1">
                  Email
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="border border-gray-300 rounded px-4 py-2 focus:outline-none focus:ring-2 focus:ring-primary"
                  placeholder="Emailini Yaz"
                  required
                />
              </div>

              {/* Yeni Şifre */}
              <div className="flex flex-col">
                <label className="text-gray-600 font-semibold mb-1">
                  Yeni Şifre
                </label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="border border-gray-300 rounded px-4 py-2 focus:outline-none focus:ring-2 focus:ring-primary"
                  placeholder="Yeni Şifre"
                />
              </div>

              {/* Kaydet Butonu */}
              <button
                type="submit"
                className="bg-black text-white rounded-sm py-2 px-6 font-semibold hover:bg-gray-900 transition disabled:opacity-50"
                disabled={loading}
              >
                {loading ? "Kaydediliyor..." : "Kaydet"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default ProfileEdit;
