import React, { useContext, useEffect, useState } from "react";
import { AuthContext } from "../context/AuthContext";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import api from "../api/api";
import { FiX } from "react-icons/fi";

const PageSearchBar = () => {
  const [q, setQ] = useState("");
  const navigate = useNavigate();
  const handleSearch = (e) => {
    e.preventDefault();
    if (q.trim()) {
      navigate(`/search?q=${encodeURIComponent(q.trim())}`);
      setQ("");
    }
  };
  return (
    <div className="w-full flex justify-center mt-5 px-4">
      <form
        onSubmit={handleSearch}
        className="relative w-full max-w-5xl px-0 mb-8"
      >
        <input
          type="text"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Görsel, konu veya kullanıcı ara..."
          className="pl-10 pr-4 py-2 w-full border border-gray-300 rounded-full focus:outline-none focus:ring focus:ring-primary shadow"
        />
        <button
          type="submit"
          className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
          style={{ background: "none", border: "none", padding: 0 }}
          tabIndex={-1}
        >
          <i className="bi bi-search"></i>
        </button>
      </form>
    </div>
  );
};

const MyTopics = () => {
  const { user, token } = useContext(AuthContext);
  const [topics, setTopics] = useState([]);
  const [loading, setLoading] = useState(true);
  const [categories, setCategories] = useState({});
  const [error, setError] = useState("");
  const { t } = useTranslation();

  // Edit modal state
  const [editing, setEditing] = useState(null);
  const [editTitle, setEditTitle] = useState("");
  const [editDesc, setEditDesc] = useState("");
  const [editCategory, setEditCategory] = useState("");
  const [editFile, setEditFile] = useState(null);

  // Admin için "Sadece benimkiler" checkbox state
  const [showMineOnly, setShowMineOnly] = useState(false);

  //konu bazlı arama metni
  const [searchText, setSearchText] = useState("");

  const FALLBACK_TO_QUERY_PARAM = false;

  const sortByCreatedDesc = (list) =>
    [...(list || [])].sort((a, b) => {
      const da = new Date(a?.created_at || 0).getTime();
      const db = new Date(b?.created_at || 0).getTime();
      return db - da; // desc
    });

  useEffect(() => {
    if (!token || !user) return;
    let ignore = false;

    const load = async () => {
      setLoading(true);
      setError("");

      try {
        let url = user?.role === "admin" ? "/topics/all" : "/topics/mine";
        if (FALLBACK_TO_QUERY_PARAM && user?.role !== "admin") {
          url = `/topics?owner_id=${user.id}`;
        }

        const res = await api.get(url);
        if (!ignore) {
          const data = Array.isArray(res.data) ? res.data : [];
          setTopics(sortByCreatedDesc(data));
        }
      } catch (e) {
        if (!ignore) setError("Konular yüklenemedi.");
      } finally {
        if (!ignore) setLoading(false);
      }

      try {
        const resCat = await api.get("/topics/categories");
        if (!ignore) {
          const map = {};
          (resCat.data || []).forEach((cat) => {
            map[cat.id] = cat.name_tr || cat.name_en || cat.name;
          });
          setCategories(map);
        }
      } catch {}
    };

    load();
    return () => {
      ignore = true;
    };
  }, [token, user]);

  if (!user) {
    return <div className="p-6">Giriş yapmalısınız.</div>;
  }

  const openEdit = (topic) => {
    setEditing(topic);
    setEditTitle(topic.title || "");
    setEditDesc(topic.description || "");
    setEditCategory(topic.category_id || "");
    setEditFile(null);
  };

  const handleEditSave = async () => {
    if (!editing) return;

    const formData = new FormData();
    formData.append("title", editTitle);
    formData.append("description", editDesc);
    formData.append("category_id", editCategory);
    if (editFile) formData.append("cover_image", editFile);

    try {
      const res = await api.put(`/topics/${editing.id}`, formData);
      setTopics((list) =>
        sortByCreatedDesc(list.map((t) => (t.id === editing.id ? res.data : t)))
      );
      setEditing(null);
    } catch (e) {
      const status = e?.response?.status;
      const detail = e?.response?.data?.detail;
      alert(
        status
          ? `Güncelleme sırasında hata oluştu (${status})${
              detail ? `: ${detail}` : ""
            }`
          : "Güncelleme sırasında bir hata oluştu."
      );
    }
  };

  //  önce "sadece benimkiler" filtresi
  const mineFiltered =
    user.role === "admin" && showMineOnly
      ? topics.filter((t) => t.owner_id === user.id)
      : topics;

  // sonra konu bazlı arama filtresi (title/name + description + kategori adı)
  const filteredTopics = mineFiltered.filter((t) => {
    if (!searchText.trim()) return true;
    const q = searchText.trim().toLowerCase();
    const title = (t.title || t.name || "").toLowerCase();
    const desc = (t.description || "").toLowerCase();
    const catName = (categories[t.category_id] || "").toLowerCase();
    return title.includes(q) || desc.includes(q) || catName.includes(q);
  });

  return (
    <div className="min-h-screen flex flex-col items-center bg-background py-12">
      <style>{`footer { display: none; }`}</style>

      <div className="bg-gray-50 shadow-sm border border-gray-300 rounded-2xl p-8 w-full">
        {/* Başlık + admin için checkbox */}
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-extrabold text-black">
            {user.role === "admin" ? "Tüm Veri Kümeleri" : "Veri Kümelerim"}
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
              placeholder="Konu ara (başlık, açıklama, kategori)..."
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

        {error && <div className="text-center text-red-600 mb-4">{error}</div>}

        {loading ? (
          <div className="flex flex-col items-center py-12">
            <div className="loader mb-4" />
            <span className="text-gray-500">Yükleniyor...</span>
          </div>
        ) : filteredTopics.length === 0 ? (
          <div className="flex flex-col items-center py-12">
            <span className="text-gray-500">Hiç konu yok.</span>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredTopics.map((topic) => (
              <div
                key={topic.id}
                className="bg-white rounded-xl shadow hover:shadow-lg transition relative"
              >
                {/* Kapak görseli */}
                <div className="h-40 bg-gray-100 rounded-t-xl overflow-hidden flex items-center justify-center">
                  {topic.cover_image ? (
                    <img
                      src={`/uploaded_images/${topic.cover_image}`}
                      alt={topic.title}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <span className="text-gray-400 text-2xl"></span>
                  )}
                </div>

                {/* İçerik */}
                <div className="p-4 flex flex-col space-y-2">
                  <a
                    href={`/topics/${topic.id}`}
                    className="text-lg font-semibold truncate text-gray-700 hover:underline"
                  >
                    {topic.title}
                  </a>
                  <p className="text-sm text-gray-600">
                    {categories[topic.category_id] || topic.category_id}
                  </p>
                </div>

                {/* Aksiyonlar */}
                <div className="flex justify-end space-x-3 p-3 border-t">
                  {(user.role === "admin" || topic.owner_id === user.id) && (
                    <>
                      <button
                        className="bg-white text-gray-700 border border-gray-600 rounded-full hover:border-black hover:text-black duration-100 px-2 text-sm"
                        onClick={() => openEdit(topic)}
                      >
                        <i className="bi bi-pencil text-lg"></i>
                      </button>

                      <button
                        className="bg-white text-red-500 border border-red-600 rounded-full hover:border-red-900 hover:text-red-900 duration-100 px-2 text-sm"
                        onClick={async () => {
                          if (!window.confirm("Bu konu silinsin mi?")) return;
                          const prev = topics;
                          setTopics((list) =>
                            list.filter((t) => t.id !== topic.id)
                          );
                          try {
                            await api.delete(`/topics/${topic.id}`);
                          } catch (e) {
                            alert(
                              e?.response?.status === 403
                                ? "Bu konuyu silme yetkiniz yok."
                                : "Silme sırasında bir hata oluştu."
                            );
                            setTopics(prev);
                          }
                        }}
                      >
                        <i className="bi bi-trash text-lg"></i>
                      </button>
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Düzenleme Modal */}
      {editing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div
            className="absolute inset-0 bg-black/50 backdrop-blur-[1px]"
            onClick={() => setEditing(null)}
          />

          <div
            className="relative w-full max-w-xl md:max-w-2xl
                 bg-gray-50 border border-gray-200 shadow-2xl rounded-2xl
                 transform transition-transform duration-300
                 overflow-y-auto scrollbar-hide"
            role="dialog"
            aria-modal="true"
          >
            <svg
              className="pointer-events-none select-none absolute bottom-0 left-0 w-full h-5"
              viewBox="0 0 1440 160"
              preserveAspectRatio="none"
              aria-hidden="true"
            >
              <path
                d="M0,80 C180,120 320,40 520,70 C740,105 900,10 1140,60 C1260,85 1350,110 1440,95 L1440,160 L0,160 Z"
                fill="#22CCFF"
                opacity="0.55"
              />
              <path
                d="M0,95 C160,135 340,75 520,95 C760,120 930,45 1140,95 C1280,125 1370,135 1440,125 L1440,160 L0,160 Z"
                fill="#8B5CF6"
                opacity="0.55"
              />
              <path
                d="M0,115 C220,150 420,105 640,120 C880,140 1080,95 1440,120 L1440,160 L0,160 Z"
                fill="#C4B5FD"
                opacity="0.7"
              />
            </svg>

            <button
              className="absolute top-3 right-3 text-gray-500 hover:text-black text-2xl"
              onClick={() => setEditing(null)}
              aria-label="Kapat"
            >
              <FiX />
            </button>

            <div className="h-full overflow-y-auto p-6 scrollbar-hide">
              <h3 className="text-xl font-bold mb-4">Veri Kümesini Düzenle</h3>

              <input
                type="text"
                className="w-full border border-gray-300 p-2 rounded mb-3"
                placeholder="Başlık"
                value={editTitle}
                onChange={(e) => setEditTitle(e.target.value)}
              />

              <textarea
                className="w-full border border-gray-300 p-2 rounded mb-3"
                placeholder="Açıklama"
                value={editDesc}
                onChange={(e) => setEditDesc(e.target.value)}
              />

              <select
                className="w-full border border-gray-300 p-2 rounded mb-3"
                value={editCategory}
                onChange={(e) => setEditCategory(e.target.value)}
              >
                <option value="">Kategori Seç</option>
                {Object.entries(categories).map(([id, name]) => (
                  <option key={id} value={id}>
                    {name}
                  </option>
                ))}
              </select>

              <input
                type="file"
                className="w-full mb-3"
                onChange={(e) => setEditFile(e.target.files?.[0] || null)}
              />

              <div className="flex justify-end space-x-3">
                <button
                  className="px-4 py-2 bg-gray-50 rounded-full border border-gray-400 hover:border-gray-300 duration-150 cursor-pointer"
                  onClick={() => setEditing(null)}
                >
                  İptal
                </button>
                <button
                  className="px-4 py-2 bg-black text-white hover:bg-gray-900 cursor-pointer duration-150 rounded-full"
                  onClick={handleEditSave}
                >
                  Kaydet
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MyTopics;
