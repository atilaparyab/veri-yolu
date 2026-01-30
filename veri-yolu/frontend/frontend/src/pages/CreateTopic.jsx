import React, { useContext, useEffect, useState } from "react";
import { AuthContext } from "../context/AuthContext";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import api from "../api/api";

const CreateTopic = () => {
  const { user, token } = useContext(AuthContext);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("");
  const [categories, setCategories] = useState([]);
  const [labels, setLabels] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [coverImage, setCoverImage] = useState(null);
  const navigate = useNavigate();
  const { t } = useTranslation();

  // önce /topics/categories (public), olmazsa /admin/categories (fallback)
  const fetchCategories = async () => {
    try {
      const resPublic = await api.get("/topics/categories");
      setCategories(Array.isArray(resPublic.data) ? resPublic.data : []);
    } catch (err1) {
      try {
        const resAdmin = await api.get("/admin/categories");
        setCategories(Array.isArray(resAdmin.data) ? resAdmin.data : []);
      } catch (err2) {
        console.error("Kategoriler alınamadı:", err2);
        setCategories([]);
      }
    }
  };

  useEffect(() => {
    fetchCategories();
  }, []);

  if (!user) {
    return <div className="p-6">{t("not_logged_in")}</div>;
  }

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage("");
    try {
      const formData = new FormData();
      formData.append("title", title);
      formData.append("description", description);
      formData.append("category_id", category);
      formData.append(
        "candidate_labels",
        JSON.stringify(
          labels
            .split(",")
            .map((l) => l.trim())
            .filter(Boolean)
        )
      );
      if (coverImage) {
        formData.append("cover_image", coverImage);
      }
      const res = await api.post("/topics/", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      if (res.status === 200) {
        setMessage(t("Veri Kümesi Oluşturuldu"));
        setTimeout(() => navigate("/topics"), 1500);
      }
    } catch (err) {
      console.error("Error creating topic:", err);
      setMessage(t("Bir hata oluştu"));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center bg-background py-12 font-sans">
      <style>{`
    footer { display: none; }
  `}</style>

      <form
        onSubmit={handleSubmit}
        className="sticky bg-gray-50 rounded-2xl  w-full flex flex-col gap-2"
      >
        <h2 className="text-2xl font-extrabold text-black font-sans text-center mb-2">
          {t("Veri Kümesi Oluştur")}
        </h2>
        <label className="flex flex-col gap-1">
          <span className="text-sm font-light">{t("Konu")}</span>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="input input-bordered border border-gray-200 rounded-md p-2"
            required
          />
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-sm font-light">{t("Açıklama")}</span>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="input input-bordered border border-gray-200 rounded-md p-2"
            rows={3}
          />
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-sm font-light">{t("Kategori")}</span>
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="input input-bordered border border-gray-200 rounded-md p-2 text-gray-300"
            required
          >
            <option value="">{t("Kategori Seç")}</option>
            {categories.map((cat) => (
              <option key={cat.id} value={cat.id}>
                {cat.name_tr}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-sm font-light">
            {t("Etiket İsimleri (bir kaç etiket ismi eklenebilir.)")}
          </span>
          <input
            type="text"
            value={labels}
            onChange={(e) => setLabels(e.target.value)}
            className="input input-bordered border border-gray-200 rounded-md p-2 "
            placeholder={t("Başlığınıza uygun etiket isimleri olsun.")}
          />
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-sm font-light">
            {t("Kapak Resmi (yatay göesel)")}
          </span>
          <input
            type="file"
            accept="image/*"
            onChange={(e) => setCoverImage(e.target.files[0])}
            className="input input-bordered border border-gray-200 rounded-md p-2 text-gray-300"
            required
          />
        </label>
        <button
          type="submit"
          className="px-6 py-2 bg-black text-white font-semibold rounded-full hover:bg-gray-900 transition duration-300 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
          disabled={loading}
        >
          {loading ? t("kaydediliyor") : t("Kaydet")}
        </button>
        {message && <div className="text-center text-sm mt-2">{message}</div>}
      </form>
    </div>
  );
};

export default CreateTopic;
