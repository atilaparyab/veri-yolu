import React, { useContext, useEffect, useState, useMemo } from "react";
import { AuthContext } from "../context/AuthContext";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import api from "../api/api";

const MyImages = () => {
  const { user, token } = useContext(AuthContext);
  const [images, setImages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [topics, setTopics] = useState({});
  const [error, setError] = useState("");
  const [showMineOnly, setShowMineOnly] = useState(false); // sadece admin için
  const { t } = useTranslation();
  const navigate = useNavigate();

  //Konu bazlı arama metni
  const [searchText, setSearchText] = useState("");

  //Yeni→eski sıralama helper'ı
  const sortByCreatedDesc = (list) =>
    [...(list || [])].sort((a, b) => {
      const ta = new Date(a?.created_at || a?.uploaded_at || 0).getTime() || 0;
      const tb = new Date(b?.created_at || b?.uploaded_at || 0).getTime() || 0;
      // tarih eşitse id'ye göre azalan
      if (tb - ta !== 0) return tb - ta;
      return (Number(b?.id) || 0) - (Number(a?.id) || 0);
    });

  useEffect(() => {
    if (!token || !user) return;

    let ignore = false;

    const fetchImages = async () => {
      setLoading(true);
      setError("");

      const primaryUrl = user?.role === "admin" ? "/images/all" : "/images/me";

      try {
        const res = await api.get(primaryUrl);
        if (!ignore) {
          const data = Array.isArray(res.data) ? res.data : [];
          const sorted = sortByCreatedDesc(data);
          setImages(sorted);
          await hydrateTopics(sorted, ignore);
        }
      } catch {
        // Fallback 1: /images?uploader_id=
        try {
          const res2 = await api.get("/images", {
            params: { uploader_id: user.id },
          });
          if (!ignore) {
            const data = Array.isArray(res2.data) ? res2.data : [];
            const sorted = sortByCreatedDesc(data);
            setImages(sorted);
            await hydrateTopics(sorted, ignore);
          }
        } catch {
          // Fallback 2: /images?owner_id=
          try {
            const res3 = await api.get("/images", {
              params: { owner_id: user.id },
            });
            if (!ignore) {
              const data = Array.isArray(res3.data) ? res3.data : [];
              const sorted = sortByCreatedDesc(data);
              setImages(sorted);
              await hydrateTopics(sorted, ignore);
            }
          } catch {
            if (!ignore) setError("Görseller yüklenemedi.");
          }
        }
      } finally {
        if (!ignore) setLoading(false);
      }
    };

    const hydrateTopics = async (imgs, ignoreFlag) => {
      const topicIds = [
        ...new Set((imgs || []).map((i) => i.topic_id).filter(Boolean)),
      ];
      if (topicIds.length === 0) return;
      try {
        const arr = await Promise.all(
          topicIds.map((id) =>
            api
              .get(`/topics/${id}`)
              .then((r) => r.data)
              .then((d) => ({ id, name: d?.title || d?.name || "-" }))
              .catch(() => ({ id, name: String(id) }))
          )
        );
        if (!ignoreFlag) {
          const map = {};
          arr.forEach((t) => (map[t.id] = t.name));
          setTopics(map);
        }
      } catch {
        /* ignore */
      }
    };

    fetchImages();
    return () => {
      ignore = true;
    };
  }, [token, user]);

  const ownerIdOf = (img) =>
    img?.uploader_id ??
    img?.owner_id ??
    img?.user_id ??
    img?.uploaded_by ??
    img?.owner?.id ??
    null;

  const canDelete = (img) =>
    user?.role === "admin" ||
    (ownerIdOf(img) != null && Number(ownerIdOf(img)) === Number(user?.id));

  // Admin "sadece benimkiler" filtresi
  const displayedImages = useMemo(() => {
    if (user?.role !== "admin" || !showMineOnly) return images;
    return images.filter((img) => Number(ownerIdOf(img)) === Number(user?.id));
  }, [images, showMineOnly, user]);

  //Konu bazlı arama (topic adı + dosya adı)
  const searchFilteredImages = useMemo(() => {
    const q = (searchText || "").trim().toLowerCase();
    if (!q) return displayedImages;
    return displayedImages.filter((img) => {
      const topicName = (topics[img.topic_id] || "").toLowerCase();
      const filename = (img.filename || "").toLowerCase();
      return topicName.includes(q) || filename.includes(q);
    });
  }, [displayedImages, searchText, topics]);

  if (!user) return <div className="p-6">Giriş yapmalısınız.</div>;

  return (
    <div className="min-h-screen flex flex-col items-center bg-background py-12">
      <style>{`footer { display: none; }`}</style>

      <div className="bg-gray-50  border border-gray-200 rounded-2xl p-8 w-full">
        <div className="flex items-center justify-between pb-2 mb-4">
          <h2 className="text-2xl font-extrabold text-black">
            {user.role === "admin" ? "Tüm Görseller" : "Görsellerim"}
          </h2>

          {user.role === "admin" && (
            <label className="flex items-center gap-2 text-sm text-gray-700">
              <input
                type="checkbox"
                className="accent-primary"
                checked={showMineOnly}
                onChange={(e) => setShowMineOnly(e.target.checked)}
              />
              Sadece benimkiler
            </label>
          )}
        </div>

        {/* Konu bazlı arama kutusu */}
        <div className="mb-6">
          <div className="relative">
            <input
              type="text"
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              placeholder="Konu adına veya dosya adına göre ara..."
              className="w-full pl-10 pr-9 py-2 border border-gray-300 rounded-full focus:outline-none focus:ring focus:ring-primary"
            />
            <i className="bi bi-search absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"></i>
            {searchText && (
              <button
                type="button"
                onClick={() => setSearchText("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                title="Temizle"
              >
                <i className="bi bi-x-circle"></i>
              </button>
            )}
          </div>
        </div>

        {error && <div className="text-red-600 mb-4 text-center">{error}</div>}

        {loading ? (
          <div className="flex flex-col items-center py-12">
            <div className="loader mb-4" />
            <span className="text-gray-500">Yükleniyor...</span>
          </div>
        ) : searchFilteredImages.length === 0 ? (
          <div className="flex flex-col items-center py-12">
            <span className="text-gray-500">
              Aramanıza uygun görsel bulunamadı.
            </span>
          </div>
        ) : (
          <div className="space-y-3">
            {searchFilteredImages.map((img) => (
              <div
                key={img.id}
                className="flex items-center gap-4 p-3 bg-white border border-gray-200 rounded-xl shadow-sm hover:shadow-md transition"
              >
                {/* Önizleme */}
                <img
                  src={`/uploaded_images/${img.filename}`}
                  alt={img.filename}
                  className="w-16 h-16 rounded object-cover flex-shrink-0"
                />

                {/* Metin alanı */}
                <div className="flex-1 min-w-0">
                  {/* Dosya adı */}
                  <a
                    className="block font-medium text-black truncate"
                    title={img.filename}
                  >
                    {img.filename}
                  </a>

                  {/* Konu + Puan */}
                  <div className="text-sm text-gray-600 mt-0.5 flex flex-wrap items-center gap-x-4 gap-y-1">
                    <span className="truncate">
                      <span className="font-semibold text-gray-700">
                        Konu:{" "}
                      </span>
                      {topics[img.topic_id] || img.topic_id || "-"}
                    </span>
                    <span>
                      <span className="font-semibold text-gray-700">
                        Puan:{" "}
                      </span>
                      {img.points_awarded ?? "-"}
                    </span>
                  </div>
                </div>

                {/* Sil butonu */}
                {canDelete(img) && (
                  <button
                    className="px-3 py-1.5 text-xs font-semibold rounded-full border border-red-300 text-red-600 hover:bg-red-50"
                    onClick={async () => {
                      if (!window.confirm("Bu görsel silinsin mi?")) return;
                      const prev = images;
                      setImages((p) => p.filter((i) => i.id !== img.id)); // mevcut sıra korunur
                      try {
                        await api.delete(`/images/${img.id}`);
                      } catch {
                        alert("Silme sırasında bir hata oluştu.");
                        setImages(prev); // geri al
                      }
                    }}
                  >
                    <i className="bi bi-trash text-lg"></i>
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default MyImages;
