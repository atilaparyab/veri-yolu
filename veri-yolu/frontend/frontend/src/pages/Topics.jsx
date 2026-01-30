// src/pages/Topics.jsx
import { useEffect, useState, useContext, useRef } from "react";
import { FiSearch, FiMenu, FiX } from "react-icons/fi";
import {
  Link,
  useNavigate,
  useLocation,
  useSearchParams,
} from "react-router-dom";
import { AuthContext } from "../context/AuthContext";
import stickmanImage from "../assets/stickman.png";
import api from "../api/api";
import CreateTopic from "./CreateTopic";

const Topics = () => {
  const { user } = useContext(AuthContext);
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams, setSearchParams] = useSearchParams();

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

  // Helper to check if user has a privileged role
  const canEdit = user && ["annotator", "admin", "owner"].includes(user.role);

  useEffect(() => {
    fetchTopics();
    fetchCategories();
  }, []);

  // 👁️ Küçük kısaltma formatı (örn: 12.3K)
  const compact = (n) => {
    try {
      return new Intl.NumberFormat("tr-TR", { notation: "compact" }).format(
        Number(n || 0)
      );
    } catch {
      const x = Number(n || 0);
      if (x >= 1000) return `${(x / 1000).toFixed(1)}K`;
      return `${x}`;
    }
  };

  // 👁️ Bir topic için view sayısını güvenli oku
  const getViews = (t) => t?.metrics?.views ?? 0;
  const getDownloads = (t) => t?.metrics?.downloads ?? 0;

  const fetchTopics = async () => {
    try {
      setLoading(true);
      const res = await api.get("/topics");
      const raw = res.data || [];

      // 🔗 Her topic için /topics/{id}/metrics çağırıp objeye ekle
      const withMetrics = await Promise.all(
        raw.map(async (t) => {
          try {
            const m = await api.get(`/topics/${t.id}/metrics`);
            return { ...t, metrics: m.data }; // {views, downloads}
          } catch {
            return { ...t, metrics: { views: 0, downloads: 0 } };
          }
        })
      );

      setTopics(withMetrics);
    } catch (err) {
      console.error("Konu alınamadı:", err);
    } finally {
      setLoading(false);
    }
  };

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

  // Drawer ortak aç/kapat fonksiyonları (buton ve URL tetiklesin)
  const openCreate = () => setShowCreateModal(true);
  const closeCreate = () => setShowCreateModal(false);

  // 🔒 Drawer açıkken body scroll kilidi
  useEffect(() => {
    if (!showCreateModal) return;
    const original = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = original;
    };
  }, [showCreateModal]);

  // 🔔 /topics?openCreate=1 ile gelindiyse drawer'ı aç
  useEffect(() => {
    if (searchParams.get("openCreate") === "1") {
      openCreate();
      // URL’i temizle (geri/ileri'de tekrar tetiklenmesin)
      searchParams.delete("openCreate");
      setSearchParams(searchParams, { replace: true });
    }
  }, [searchParams, setSearchParams]);

  // 🔔 state ile gelindiyse ({ state:{ openCreate:true } }) drawer'ı aç
  useEffect(() => {
    if (location.state?.openCreate) {
      openCreate();
      // state'i temizle
      navigate(location.pathname, { replace: true, state: {} });
    }
  }, [location.state, location.pathname, navigate]);

  // === Infinite Scroll: ilk 8, aşağı indikçe 8'er 8'er ===
  const INITIAL_BATCH = 8;
  const LOAD_STEP = 8;
  const [visibleCount, setVisibleCount] = useState(INITIAL_BATCH);
  const sentinelRef = useRef(null);

  // Filtre değişince başa dön
  useEffect(() => {
    setVisibleCount(INITIAL_BATCH);
  }, [filteredTopics.length]);

  // Sentinel görünür oldukça daha fazla yükle
  useEffect(() => {
    if (!sentinelRef.current) return;
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

  return (
    <div className="flex flex-col min-h-screen bg-gray-50">
      <style>{`
      footer { display: none; }
    `}</style>

      {/* Main Content */}
      <div className="flex-1  py-8 flex flex-col items-center">
        <div className="max-w-7xl w-full flex flex-col md:flex-row justify-between items-start gap-8">
          {/* Sol: Başlık ve İçerik */}
          <div className="flex-1 flex flex-col items-start mt-10">
            {/* Başlık */}
            <h2 className="text-3xl font-extrabold text-black mb-2 text-left">
              Veri Kümeleri
            </h2>
            <p className="text-gray-600 text-base text-left mb-4">
              Topluluk tarafından oluşturulan genel veri setlerini keşfedin.
            </p>

            {/* Yeni Veri Kümesi Butonu */}
            {user && (
              <button
                onClick={openCreate}
                className=" bg-black  px-4 py-2 rounded-full text-white font-semibold shadow hover:shadow-gray-900 transition duration-200 ease w-fit cursor-pointer"
              >
                + Yeni Veri Kümesi
              </button>
            )}
          </div>
          {/* Sağ: Stickman Görseli */}
          <div className="flex-shrink-0">
            <img
              src={stickmanImage}
              alt="stickman"
              className="w-36 sm:w-48 md:w-60 lg:w-72"
            />
          </div>
        </div>

        {/* Arama Kutusu */}
        <div className="w-full bg-gray-50 border-b border-gray-200 py-1 mb-8">
          <div className="relative ">
            <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Konu ara..."
              className="pl-10 pr-4 py-1 border border-gray-300 rounded-full w-full shadow-sm"
            />
          </div>

          {/* Kategori Butonları */}
          <div className="flex gap-2 flex-wrap justify-center mb-8 mt-5">
            <button
              onClick={() => setSelectedCategory("")}
              className={`px-4 py-1 rounded-full border cursor-pointer ${
                selectedCategory === ""
                  ? "bg-black text-white hover:bg-gray-800 transition cursor-pointer"
                  : ""
              }`}
            >
              Tümü
            </button>
            {categories.map((cat) => (
              <button
                key={cat.id}
                onClick={() => setSelectedCategory(String(cat.id))}
                className={`px-4 py-1 rounded-full border cursor-pointer ${
                  selectedCategory === String(cat.id)
                    ? "bg-black text-white hover:bg-gray-800 transition cursor-pointer"
                    : ""
                }`}
              >
                {cat.name_tr || cat.name}
              </button>
            ))}
          </div>
        </div>

        {/* Veri Seti Grid */}
        {loading ? (
          <p>Yükleniyor...</p>
        ) : (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6 w-full justify-items-center">
              {filteredTopics.slice(0, visibleCount).map((t) => {
                const completion =
                  t.total_images > 0
                    ? Math.round((t.annotated_images / t.total_images) * 100)
                    : 0;

                return (
                  <div
                    key={t.id}
                    className="bg-white rounded-xl shadow p-1 flex flex-col gap-2 hover:shadow-lg transition relative cursor-pointer w-full max-w-xs"
                    onClick={() => navigate(`/topics/${t.id}`)}
                  >
                    {/* Görsel Alanı */}
                    <div className="h-35 bg-gray-100 rounded flex items-center justify-center overflow-hidden">
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

                    {/* İlerleme Çubuğu */}
                    <div className="w-full bg-gray-200 rounded-full h-1 mt-1">
                      <div
                        className="bg-green-500 h-2 rounded-full"
                        style={{ width: `${completion}%` }}
                      />
                    </div>
                    <p className="text-xs text-right text-gray-500">
                      {completion}% tamamlandı
                    </p>

                    {/* 👇 Alt Çizgi + Sağdaki Avatar */}
                    <div className="flex items-center justify-between border-t border-gray-200 px-4 py-2">
                      {/* Sol kısım: 👁 Görünümler */}
                      <div className="flex items-center gap-1 text-gray-600">
                        <i className="bi bi-eye text-ms mt-3"></i>
                        <span className="text-xs mt-2.5">
                          {t.metrics?.views ?? 0}
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
                                      profile_image_url:
                                        t.owner_avatar_url ?? null,
                                      profile_image_file:
                                        t.owner_avatar_filename ?? null,
                                      role:
                                        t.owner_role ?? t.owner?.role ?? null,
                                    },
                                  },
                                });
                              }
                            }}
                          />
                        ) : (
                          // 🔹 Placeholder da tıklanabilir
                          <div
                            title={t.owner_email || "Sahip"}
                            className="w-8 h-8 rounded-full flex items-center justify-center cursor-pointer text-white font-bold"
                            style={{
                              backgroundColor:
                                "#" +
                                (((1 << 24) * Math.random()) | 0).toString(16), // random renk
                            }}
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
                                      profile_image_url: null,
                                      profile_image_file: null,
                                      role:
                                        t.owner_role ?? t.owner?.role ?? null,
                                      about: t.owner_about ?? null,
                                    },
                                  },
                                });
                              }
                            }}
                          >
                            {/* Baş harf */}
                            {(t.owner_email || "S")[0].toUpperCase()}
                          </div>
                        )}
                      </div>
                    </div>
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

      {/* CreateTopic Drawer (yandan çıkan) - arka plan karartması YOK */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 overflow-hidden">
          {/* şeffaf tıklama alanı (arka planı karartmaz) */}
          <div
            className="absolute inset-0 bg-black/50 backdrop-blur-[1px] transition-opacity"
            onClick={closeCreate}
          />

          {/* sağ panel */}
          <div
            className="absolute right-0 top-0 w-full max-w-xl md:max-w-2xl
           bg-gray-50 border-l border-gray-200 shadow-2xl rounded-l-2xl
           transform transition-transform duration-300 translate-x-0
           overflow-y-auto scrollbar-hide"
            role="dialog"
            aria-modal="true"
          >
            {/* ALTA TEK DESEN (SVG) */}
            <svg
              className="pointer-events-none select-none absolute bottom-0 left-0 w-full h-60"
              viewBox="0 0 1440 160"
              preserveAspectRatio="none"
              aria-hidden="true"
            >
              {/* arka yumuşak dalga */}
              <path
                d="M0,80 C180,120 320,40 520,70 C740,105 900,10 1140,60 C1260,85 1350,110 1440,95 L1440,160 L0,160 Z"
                fill="#22CCFF"
                opacity="0.55"
              />
              {/* orta sarı dalga */}
              <path
                d="M0,95 C160,135 340,75 520,95 C760,120 930,45 1140,95 C1280,125 1370,135 1440,125 L1440,160 L0,160 Z"
                fill="#8B5CF6"
                opacity="0.55"
              />
              {/* önde küçük yeşil dalga */}
              <path
                d="M0,115 C220,150 420,105 640,120 C880,140 1080,95 1440,120 L1440,160 L0,160 Z"
                fill="#C4B5FD"
                opacity="0.7"
              />
            </svg>

            <button
              className="absolute top-3 right-3 text-gray-500 hover:text-black text-2xl"
              onClick={closeCreate}
              aria-label="Kapat"
            >
              <FiX />
            </button>

            <div className="h-full overflow-y-auto p-6 scrollbar-hide">
              <CreateTopic
                onSuccess={() => {
                  closeCreate();
                  fetchTopics();
                }}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Topics;
