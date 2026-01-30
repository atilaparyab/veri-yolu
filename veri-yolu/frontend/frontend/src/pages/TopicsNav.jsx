// src/components/TopicsNav.jsx
import { useEffect, useState, useContext, useRef } from "react";
import { FiSearch, FiMenu, FiX } from "react-icons/fi";
import { Link, useNavigate } from "react-router-dom";
import { AuthContext } from "../context/AuthContext";
import stickmanImage from "../assets/stickman.png";
import api from "../api/api";
import CreateTopic from "./CreateTopic";

const TopicsNav = () => {
  const { user } = useContext(AuthContext);
  const navigate = useNavigate();
  const [topics, setTopics] = useState([]);
  const [categories, setCategories] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState("");
  const [search, setSearch] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [modalCategory, setModalCategory] = useState("");
  const [loading, setLoading] = useState(false);
  const [newCategory, setNewCategory] = useState("");
  const [addingCategory, setAddingCategory] = useState(false);
  const [modalError, setModalError] = useState("");
  const [modalSuccess, setModalSuccess] = useState("");
  const [modalLoading, setModalLoading] = useState(false);
  const categoryInputRef = useRef();
  const [modalCategorySearch, setModalCategorySearch] = useState("");
  const [showCreateModal, setShowCreateModal] = useState(false);

  // === Infinite scroll ayarları ===
  const INITIAL_BATCH = 8;
  const LOAD_STEP = 8;
  const [visibleCount, setVisibleCount] = useState(INITIAL_BATCH);
  const sentinelRef = useRef(null);

  // 👇 YENİ: topic_id -> { views, downloads } map'i tut
  const [metricsByTopic, setMetricsByTopic] = useState({});

  // 👇 YENİ: küçük/kompakt sayı formatı (tr)
  const formatCompact = (n) => {
    if (typeof Intl !== "undefined" && Intl.NumberFormat) {
      try {
        return new Intl.NumberFormat("tr", {
          notation: "compact",
          compactDisplay: "short",
        }).format(n ?? 0);
      } catch (_) {}
    }
    // basit fallback
    n = Number(n || 0);
    if (n >= 1_000_000)
      return (n / 1_000_000).toFixed(1).replace(/\.0$/, "") + "M";
    if (n >= 1_000) return (n / 1_000).toFixed(1).replace(/\.0$/, "") + "K";
    return String(n);
  };

  // Helper to check if user has a privileged role
  const canEdit = true;

  useEffect(() => {
    fetchTopics();
    fetchCategories();
  }, []);

  // 👇 YENİ: Tek bir topic için metrics çek
  const fetchOneMetric = async (topicId) => {
    try {
      const res = await api.get(`/topics/${topicId}/metrics`);
      return res.data || { views: 0, downloads: 0 };
    } catch {
      return { views: 0, downloads: 0 };
    }
  };

  // 👇 YENİ: Tüm topic'ler için metrics'i paralel çek
  const fetchMetricsForList = async (list) => {
    const entries = await Promise.all(
      list.map(async (t) => {
        const data = await fetchOneMetric(t.id);
        return [t.id, data];
      })
    );
    const map = {};
    for (const [id, data] of entries) map[id] = data;
    setMetricsByTopic(map);
  };

  const fetchTopics = async () => {
    try {
      setLoading(true);
      const res = await api.get("/topics");
      const list = Array.isArray(res.data) ? res.data : [];
      setTopics(list);

      // 👇 YENİ: Topics geldikten sonra metric'leri getir
      fetchMetricsForList(list);
    } catch (err) {
      console.error("Konu alınamadı:", err);
    } finally {
      setLoading(false);
    }
  };

  const fetchCategories = async () => {
    try {
      const res = await api.get("/admin/categories");
      setCategories(res.data);
    } catch (err) {
      console.error("Kategoriler alınamadı:", err);
    }
  };

  const handleCreateTopic = async () => {
    if (!title || !modalCategory) return;
    try {
      await api.post("/topics", {
        name: title,
        description,
        category_id: modalCategory,
      });
      setTitle("");
      setDescription("");
      setModalCategory("");
      setShowModal(false);
      fetchTopics();
    } catch (err) {
      console.error("Konu oluşturulamadı:", err);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Bu konu silinsin mi?")) return;
    try {
      await api.delete(`/topics/${id}`);
      fetchTopics();
    } catch (err) {
      console.error("Silme hatası:", err);
    }
  };

  const handleAddCategory = async () => {
    if (!newCategory) return;
    setAddingCategory(true);
    setModalError("");
    try {
      const res = await api.post("/admin/category", { name_tr: newCategory });
      setCategories([...categories, res.data]);
      setModalCategory(res.data.id.toString());
      setNewCategory("");
      setModalSuccess("Kategori eklendi!");
      setTimeout(() => setModalSuccess(""), 1500);
      categoryInputRef.current?.focus();
    } catch (err) {
      setModalError("Kategori eklenemedi!");
    } finally {
      setAddingCategory(false);
    }
  };

  const filteredTopics = topics.filter((t) => {
    const name = t.name || t.title || "";
    const matchesCategory = selectedCategory
      ? t.category_id === Number(selectedCategory)
      : true;
    const matchesSearch = search
      ? name.toLowerCase().includes(search.toLowerCase())
      : true;
    return matchesCategory && matchesSearch;
  });

  const trendingTopics = topics.slice(0, 4);

  const filteredCategories = categories.filter((cat) =>
    (cat.name_tr || cat.name || "")
      .toLowerCase()
      .includes((modalCategorySearch || "").toLowerCase())
  );

  // === Infinite scroll efektleri ===

  // Filtre/değişim olduğunda başa dön
  useEffect(() => {
    setVisibleCount(INITIAL_BATCH);
  }, [filteredTopics.length]);

  // Sentinel görünür oldukça daha fazla yükle
  useEffect(() => {
    if (!sentinelRef.current) return;

    // Liste tamamen yüklendiyse gözlemlemeye gerek yok
    if (visibleCount >= filteredTopics.length) return;

    const el = sentinelRef.current;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          setVisibleCount((c) =>
            Math.min(c + LOAD_STEP, filteredTopics.length)
          );
        }
      },
      { root: null, rootMargin: "200px", threshold: 0.1 }
    );

    observer.observe(el);
    return () => observer.unobserve(el);
  }, [visibleCount, filteredTopics.length]);

  // 👇 YENİ: kolay erişim helper'ı
  const getViews = (t) => metricsByTopic?.[t.id]?.views ?? 0;

  return (
    <div className="max-w-7xl mx-auto py-8 px-4">
      {/* Arama Kutusu + Profil */}
      <div className="flex justify-between items-center mb-8 w-full max-w-7x1 mx-auto">
        <form className="flex items-center w-full max-w-7xl border border-gray-300 rounded-full px-4 py-2">
          <i className="bi bi-search text-gray-400 mr-2"></i>
          <input
            type="text"
            placeholder="Ara..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full outline-none"
          />
        </form>
      </div>

      {/* Main Content: Başlık + Resim */}
      <div className="flex flex-col md:flex-row justify-between items-center">
        {/* Sol: Başlık, Açıklama, Buton */}
        <div className="flex flex-col mb-2">
          <h2 className="text-3xl font-extrabold mb-2 text-black">
            Veri Kümeleri
          </h2>
          <p className="text-gray-600 text-base mb-4">
            Topluluk tarafından oluşturulan genel veri setlerini keşfedin.
          </p>

          {/* Yeni Veri Seti Butonu */}
          <button
            onClick={() => {
              if (user) {
                setShowCreateModal(true);
              } else {
                navigate("/login");
              }
            }}
            className="text-black border border-black font-semibold px-6 py-2 rounded-full hover:bg-black hover:text-white transition duration-200 ease mb-4 cursor-pointer w-fit"
          >
            + Yeni Veri Kümesi
          </button>
        </div>

        {/* Sağ: Resim */}
        <div className="flex-shrink-0">
          <img
            src={stickmanImage}
            alt="stickman"
            className="w-40 sm:w-52 md:w-60 lg:w-68"
          />
        </div>
      </div>

      {/* 🔥 ÇİZGİ */}
      <div className="border-t border-gray-300"></div>

      {/* Veri Seti Grid */}
      {loading ? (
        <p>Yükleniyor...</p>
      ) : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6 mt-6">
            {filteredTopics.slice(0, visibleCount).map((t) => {
              const completion =
                t.total_images > 0
                  ? Math.round((t.annotated_images / t.total_images) * 100)
                  : 0;

              return (
                <div
                  key={t.id}
                  className="bg-white rounded-xl shadow p-1 flex flex-col gap-2 hover:shadow-lg transition relative cursor-pointer"
                  onClick={() => navigate(`/topics/${t.id}`)}
                >
                  {/* Görsel Alanı */}
                  <div className="h-35 bg-gray-100 rounded flex items-center justify-center text-4xl text-primary overflow-hidden">
                    {t.cover_image ? (
                      <img
                        src={`/uploaded_images/${t.cover_image}`}
                        alt="Kapak Görseli"
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      ""
                    )}
                  </div>

                  {/* Başlık ve Açıklama */}
                  <div className="text-lg font-extrabold">
                    {t.title || t.name}
                  </div>

                  {/* Kategori Etiketi */}
                  <span className=" text-gray-500 text-sm ">
                    {t.category_name}
                  </span>

                  {/* 👇 Alt Çizgi + Sağdaki Avatar */}
                  <div className="flex items-center justify-between border-t border-gray-200 px-4 py-2">
                    {/* 👁 Görüntülenme (unique) */}
                    <div className="flex items-center gap-1 text-gray-600">
                      <i className="bi bi-eye text-[14px] leading-none"></i>
                      <span className="text-xs leading-none font-medium mb-0.5">
                        {formatCompact(getViews(t))}
                      </span>
                    </div>

                    {/* Owner */}
                    <div className="flex items-center gap-2 mt-2">
                      {t.owner_avatar_url ? (
                        <img
                          src={t.owner_avatar_url}
                          alt={t.owner_email || "Sahip"}
                          className="w-8 h-8 rounded-full object-cover cursor-pointer"
                          onClick={(e) => {
                            e.stopPropagation();
                            const ownerId =
                              t.owner_id ??
                              t.owner?.id ??
                              t.user_id ??
                              t.created_by ??
                              null;

                            if (ownerId) {
                              navigate(`/profile/${ownerId}`, {
                                state: {
                                  prefillUser: {
                                    id: ownerId,
                                    email:
                                      t.owner_email ?? t.owner?.email ?? null,
                                    // url veya dosya adı olmasına göre iki alanı da gönderiyoruz
                                    profile_image_url:
                                      t.owner_avatar_url ?? null,
                                    profile_image_file:
                                      t.owner_avatar_filename ?? null,
                                    role: t.owner_role ?? t.owner?.role ?? null,
                                  },
                                },
                              });
                            }
                          }}
                        />
                      ) : (
                        <div
                          title={t.owner_email || "Sahip"}
                          className="w-8 h-8 rounded-full border border-gray-300 bg-white cursor-pointer"
                          onClick={(e) => {
                            e.stopPropagation();
                            const ownerId =
                              t.owner_id ??
                              t.owner?.id ??
                              t.user_id ??
                              t.created_by;
                            if (ownerId) navigate(`/profile/${ownerId}`);
                          }}
                        />
                      )}
                    </div>
                  </div>
                  {/* Sil Butonu */}
                  {user?.role === "admin" && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDelete(t.id);
                      }}
                      className="mt-2 text-xs text-red-600 border border-red-400 px-2 py-1 rounded hover:bg-red-50 cursor-pointer"
                    >
                      Sil
                    </button>
                  )}
                </div>
              );
            })}
          </div>

          {/* Sentinel: daha fazla içerik varsa görünür olmalı */}
          {visibleCount < filteredTopics.length && (
            <div ref={sentinelRef} className="h-10" />
          )}
        </>
      )}

      {filteredTopics.length === 0 && !loading && <p>Hiç konu bulunamadı.</p>}
    </div>
  );
};

export default TopicsNav;
