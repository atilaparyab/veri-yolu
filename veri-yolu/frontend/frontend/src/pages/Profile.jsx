import React, { useContext, useState, useEffect } from "react";
import { AuthContext } from "../context/AuthContext";
import { useTranslation } from "react-i18next";
import { useNavigate, useParams, useLocation } from "react-router-dom";
import { FiEdit2 } from "react-icons/fi";
import api from "../api/api";
import { FiMessageSquare } from "react-icons/fi";

const Profile = () => {
  const { user } = useContext(AuthContext);
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { id: routeId } = useParams();
  const location = useLocation();

  // Avatar tıklamasından gelen ön-dolum verisi (hemen gösterelim)
  const prefillUser = location.state?.prefillUser;

  // Kimin profili görüntüleniyor?
  const viewingSelf =
    !routeId || (user?.id != null && String(routeId) === String(user.id));
  const ownerUserId = viewingSelf ? user?.id ?? null : Number(routeId);

  // Görüntülenecek kullanıcı (kendiysen user; başkasıysa prefill varsa prefill, yoksa null)
  const initialViewUser = viewingSelf ? user : prefillUser ?? null;
  const [viewUser, setViewUser] = useState(initialViewUser);
  const [userLoading, setUserLoading] = useState(!viewingSelf && !prefillUser);

  const [myImages, setMyImages] = useState([]);
  const [imgLoading, setImgLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("about");

  // ✅ Hakkımda düzenleme state'i
  const [about, setAbout] = useState(viewUser?.about || "");
  const [isEditing, setIsEditing] = useState(false); // ✅ edit mode toggle

  // 🔹 Pagination state (images)
  const [page, setPage] = useState(1);
  const PER_PAGE = 5;
  const totalPages = Math.max(1, Math.ceil(myImages.length / PER_PAGE));
  const pageImages = myImages.slice((page - 1) * PER_PAGE, page * PER_PAGE);

  // 🔹 Kullanıcının veri kümeleri (datasets)
  const [myDatasets, setMyDatasets] = useState([]);
  const [dsLoading, setDsLoading] = useState(false);
  const [dsError, setDsError] = useState("");

  // 🔹 KULLANICININ KONUŞMALARI
  const [myThreads, setMyThreads] = useState([]);
  const [threadsLoading, setThreadsLoading] = useState(false);
  const [threadsError, setThreadsError] = useState("");

  // 🔹 Pagination state (discussions)
  const [threadsPage, setThreadsPage] = useState(1);
  const THREADS_PER_PAGE = 5;
  const threadsTotalPages = Math.max(
    1,
    Math.ceil(myThreads.length / THREADS_PER_PAGE)
  );
  const threadsPageItems = myThreads.slice(
    (threadsPage - 1) * THREADS_PER_PAGE,
    threadsPage * THREADS_PER_PAGE
  );

  // 🔹 Çok uçlu GET helper: listedeki endpointleri sırayla dener
  const tryGet = async (candidates) => {
    for (const c of candidates) {
      try {
        const res = await api.get(c.url, c.config || {});
        if (res && res.status >= 200 && res.status < 300) return res;
      } catch (e) {
        continue;
      }
    }
    return null;
  };

  // Başka bir kullanıcının profiliyse bilgileri çek (prefill olsa bile)
  useEffect(() => {
    let ignore = false;

    if (viewingSelf) {
      setViewUser(user);
      setUserLoading(false);
      return;
    }

    const fetchUser = async () => {
      setUserLoading(true);
      try {
        const res = await tryGet([
          { url: `/auth/users/${routeId}` }, // 👈 yeni endpoint
          { url: `/users/${routeId}` },
          { url: `/users`, config: { params: { id: routeId } } },
          { url: `/public/users/${routeId}` },
          { url: `/api/users/${routeId}` },
          { url: `/profile/${routeId}` },
        ]);

        console.log("Profil endpoint sonucu:", res?.config?.url, res?.data);

        if (!ignore) {
          const data = res?.data?.user ?? res?.data ?? null;
          // Prefill (avatar/email) + server (about/diğerleri) birleşsin
          setViewUser((prev) => ({ ...(prev || {}), ...(data || {}) }));
        }
      } catch (e) {
        console.log("Profil isteği HATA:", e?.response?.status, e?.message);
        if (!ignore) setViewUser((prev) => prev ?? null);
      } finally {
        if (!ignore) setUserLoading(false);
      }
    };

    if (routeId) fetchUser(); // 👈 prefill kontrolü YOK
    else setUserLoading(false);

    return () => {
      ignore = true;
    };
  }, [routeId, viewingSelf, user]);

  // ✅ viewUser güncellenince (ve özellikle kendi profilin ise) about state'ini senkronla
  useEffect(() => {
    if (viewingSelf) {
      setAbout(viewUser?.about || "");
    }
  }, [viewingSelf, viewUser?.about]);

  // Görseller: veri geldikçe
  useEffect(() => {
    if (viewingSelf && !user) return;

    setImgLoading(true);

    const fetchImages = async () => {
      try {
        if (viewingSelf) {
          const me = await tryGet([
            { url: "/images/me" },
            { url: "/api/images/me" },
          ]);
          console.log("images(me) sonucu:", me?.config?.url, me?.data);
          setMyImages(Array.isArray(me?.data) ? me.data : []);
        } else if (ownerUserId) {
          const res = await tryGet([
            { url: `/users/${ownerUserId}/images` },
            { url: `/api/users/${ownerUserId}/images` },
            { url: `/images/user/${ownerUserId}` },
            { url: `/images`, config: { params: { owner_id: ownerUserId } } },
          ]);

          console.log("images(owner) sonucu:", res?.config?.url, res?.data);

          if (res && Array.isArray(res.data)) {
            setMyImages(res.data);
          } else {
            const all = await tryGet([
              { url: `/images` },
              { url: `/api/images` },
            ]);
            const list = Array.isArray(all?.data) ? all.data : [];
            const mine = list.filter((img) => {
              const imgOwner =
                img.owner_id ?? img.user_id ?? img.created_by ?? img.owner?.id;
              return String(imgOwner) === String(ownerUserId);
            });
            setMyImages(mine);
          }
        } else {
          setMyImages([]);
        }
      } catch (e) {
        setMyImages([]);
      } finally {
        setImgLoading(false);
      }
    };

    fetchImages();
  }, [user, viewingSelf, ownerUserId]);

  // Aktif sekme değişince images'ta başa dön
  useEffect(() => {
    if (activeTab === "images") setPage(1);
    if (activeTab === "discussions") setThreadsPage(1);
  }, [activeTab]);

  // Toplam sayfa küçülürse mevcut sayfayı düzelt
  useEffect(() => {
    if (page > totalPages) setPage(totalPages);
  }, [totalPages, page]);

  // Konuşmalar: toplam sayfa küçülürse mevcut sayfayı düzelt
  useEffect(() => {
    if (threadsPage > threadsTotalPages) setThreadsPage(threadsTotalPages);
  }, [threadsTotalPages, threadsPage]);

  // ✅ Başkasının profiline girildiğinde "images" sekmesini görünmez yap ve aktifse "about"a al
  useEffect(() => {
    if (!viewingSelf && activeTab === "images") {
      setActiveTab("about");
    }
  }, [viewingSelf, activeTab]);

  // ✅ Belirli kullanıcıya ait datasetleri süzen helper
  const filterByOwner = (arr, ownerId, ownerEmail) =>
    (arr || []).filter((t) => {
      const tOwnerId =
        t.owner_id ?? t.user_id ?? t.created_by ?? t.owner?.id ?? null;
      const tOwnerEmail =
        t.owner_email ??
        t.user_email ??
        t.created_by_email ??
        t.owner?.email ??
        null;

      return (
        (ownerId != null && String(tOwnerId) === String(ownerId)) ||
        (ownerEmail &&
          tOwnerEmail &&
          String(tOwnerEmail) === String(ownerEmail))
      );
    });

  // 🔸 Datasets sekmesi
  useEffect(() => {
    if (activeTab !== "datasets") return;
    if (!ownerUserId && !viewUser?.email) return;
    let ignore = false;

    const fetchMine = async () => {
      setDsLoading(true);
      setDsError("");
      try {
        const res = await api.get("/topics", {
          params: { owner_id: ownerUserId },
        });
        if (!ignore)
          setMyDatasets(filterByOwner(res.data, ownerUserId, viewUser?.email));
      } catch (err) {
        try {
          const all = await api.get("/topics");
          if (!ignore)
            setMyDatasets(
              filterByOwner(all.data, ownerUserId, viewUser?.email)
            );
        } catch (err2) {
          if (!ignore) setDsError("Veri kümeleri alınamadı.");
        }
      } finally {
        if (!ignore) setDsLoading(false);
      }
    };

    fetchMine();
    return () => {
      ignore = true;
    };
  }, [activeTab, user?.id, viewUser?.email, ownerUserId]);

  // 🔸 Discussions sekmesi
  useEffect(() => {
    if (activeTab !== "discussions") return;
    if (!ownerUserId) return;
    let ignore = false;

    const fetchMyThreads = async () => {
      setThreadsLoading(true);
      setThreadsError("");
      try {
        const res = await api.get("/discussions/threads", {
          params: { author_id: Number(ownerUserId) },
        });
        if (!ignore) setMyThreads(Array.isArray(res.data) ? res.data : []);

        if (!ignore && (!res.data || res.data.length === 0)) {
          try {
            const all = await api.get("/discussions/threads");
            if (!ignore) {
              const mine = (all.data || []).filter(
                (th) =>
                  Number(th.author?.id) === Number(ownerUserId) ||
                  Number(th.author_id) === Number(ownerUserId)
              );
              setMyThreads(mine);
            }
          } catch (err2) {
            if (!ignore) setThreadsError("Konuşmalar alınamadı (fallback).");
          }
        }
      } catch (err) {
        try {
          const all = await api.get("/discussions/threads");
          if (!ignore) {
            const mine = (all.data || []).filter(
              (th) =>
                Number(th.author?.id) === Number(ownerUserId) ||
                Number(th.author_id) === Number(ownerUserId)
            );
            setMyThreads(mine);
          }
        } catch (err2) {
          if (!ignore) setThreadsError("Konuşmalar alınamadı.");
        }
      } finally {
        if (!ignore) setThreadsLoading(false);
      }
    };

    fetchMyThreads();
    return () => {
      ignore = true;
    };
  }, [activeTab, user?.id, ownerUserId]);

  // ✅ Konu detayına gitme
  const openThread = (th) => {
    if (!th) return;
    if (th.id) {
      navigate(`/discussions/thread/${th.id}`);
      return;
    }
    if (th.forum_id && th.id) {
      navigate(`/discussions/forums/${th.forum_id}/threads/${th.id}`);
    }
  };

  // ✅ Hakkımda -> Kaydet
  const handleUpdate = async () => {
    try {
      const formData = new FormData();
      formData.append("about", about);

      const token =
        localStorage.getItem("token") ||
        localStorage.getItem("access_token") ||
        "";

      await api.put("/auth/me", formData, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });

      // Sunucudan güncel me bilgilerini çek ve ekranda güncelle
      const me = await api.get("/auth/me", {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      const fresh = me?.data || {};
      setViewUser((prev) => ({ ...(prev || {}), about: fresh.about || about }));
      setIsEditing(false); // ✅ kaydedince görüntüleme moduna dön
    } catch (e) {
      console.error("About update error:", e);
    }
  };

  // Sadece kendi profiline bakıyorsan ve login değilsen uyarı
  if (!user && viewingSelf) {
    return (
      <div className="p-6 text-center">
        <h2 className="text-2xl font-bold text-gray-700">{t("profile")}</h2>
        <p className="text-gray-500">{t("not_logged_in")}</p>
      </div>
    );
  }

  const stats = [
    { label: "Konular", value: 3 },
    { label: "Yüklenen Görseller", value: myImages.length },
    { label: "Etiketler", value: 27 },
    { label: "Puan", value: viewUser?.points || 0 },
  ];

  // Yükleme durumu
  if (userLoading) {
    return (
      <div className="min-h-screen bg-gray-50 font-sans flex items-center justify-center">
        <div className="text-gray-500">Yükleniyor…</div>
      </div>
    );
  }

  // ✅ Sekme tanımı: images sekmesi sadece viewingSelf iken eklenecek
  const tabsToShow = [
    { key: "about", label: "HAKKIMDA" },
    { key: "datasets", label: "VERİ KÜMELERİ" },
    ...(viewingSelf ? [{ key: "images", label: "GÖRSELLER" }] : []),
    { key: "discussions", label: "KONUŞMALAR" },
  ];

  return (
    <div className="min-h-screen bg-gray-50 font-sans">
      <style>{`footer { display: none; }`}</style>

      {/* ✅ Profile Card */}
      <div className="flex flex-col items-center justify-start py-5">
        <div className="relative bg-gray-50 backdrop-blur-[2px] border border-gray-300 shadow-xl rounded-3xl p-8 w-full max-w-6xl flex flex-col md:flex-row items-center md:items-start gap-8 overflow-hidden">
          {/* Düzenle Butonu (sadece kendi profilinde) */}
          {viewingSelf && (
            <button
              onClick={() => navigate("/profile/edit")}
              className="absolute cursor-pointer top-4 right-4 p-2 rounded-full bg-white text-gray-600 hover:bg-gray-200 hover:text-black transition z-10"
              title="Profili Düzenle"
            >
              <FiEdit2 className="w-5 h-5" />
            </button>
          )}

          {/* 🎨 Sağ kenar deseni */}
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

          {/* Sol: Profil Fotoğrafı ve İsim */}
          <div className="flex flex-col items-center">
            {viewUser?.profile_image_url ? (
              <img
                src={viewUser.profile_image_url}
                alt="Profile"
                className="w-50 h-50 rounded-full border-4 border-blue-200 mb-3 relative shadow-md z-10"
              />
            ) : viewUser?.profile_image || viewUser?.profile_image_file ? (
              <img
                src={`/uploaded_images/${
                  viewUser.profile_image || viewUser.profile_image_file
                }?v=${Date.now()}`}
                alt="Profile"
                className="w-50 h-50 rounded-full border-4 border-blue-200 mb-3 relative shadow-md z-10"
              />
            ) : (
              <img
                src={`https://ui-avatars.com/api/?name=${
                  viewUser?.email || "User"
                }&background=random`}
                alt="Profile"
                className="w-48 h-48 rounded-full border-4 border-primary mb-4 relative z-10"
              />
            )}

            <div className="text-center mt-1">
              <h2 className="text-lg font-bold text-black z-10">
                {viewUser?.email}
              </h2>
              <p className="text-sm text-gray-500 z-10">{viewUser?.role}</p>
            </div>
          </div>

          {/* Sağ: Kullanıcı Bilgileri */}
          <div className="flex flex-col justify-center ml-40 mt-10">
            <div className="flex flex-col gap-2 text-gray-700 text-md">
              <div className="flex items-center gap-2">
                <i className="bi bi-person"></i>Atilla Paryab
              </div>
              <div className="flex items-center gap-2">
                <i className="bi bi-briefcase"></i>Bilgisayar Mühendisi
              </div>
              <div className="flex items-center gap-2">
                <i className="bi bi-geo-alt"></i>İstanbul, Türkiye
              </div>
              <div className="flex items-center gap-2">
                <i className="bi bi-calendar"></i>Joined 1 year ago · last seen
                today
              </div>
              <div className="flex items-center gap-2">
                <i className="bi bi-link-45deg"></i>
                <a
                  href=""
                  target="_blank"
                  className="text-blue-500 hover:underline"
                >
                  VeriYolu
                </a>
              </div>
            </div>
          </div>
        </div>

        {/* 🔥 Sekmeler */}
        <div className="w-full max-w-6xl mt-8">
          <div className="border-b border-gray-200">
            <div className="flex gap-6">
              {tabsToShow.map((tab) => (
                <button
                  key={tab.key}
                  className={`relative px-3 py-2 text-sm sm:text-base ${
                    activeTab === tab.key
                      ? "text-black font-medium"
                      : "text-gray-500 hover:text-gray-700"
                  }`}
                  onClick={() => setActiveTab(tab.key)}
                >
                  {tab.label}
                  {activeTab === tab.key && (
                    <span className="absolute left-0 right-0 -bottom-[1px] h-[2px] bg-black" />
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* Sekme içerikleri */}
          <div className="pt-6">
            {activeTab === "about" && (
              <div className="space-y-4">
                {/* Başkasının profili: sadece göster */}
                {!viewingSelf ? (
                  <p>{viewUser?.about || "Henüz bir şey yazılmamış."}</p>
                ) : (
                  <>
                    {/* Görüntüleme modu */}
                    {!isEditing ? (
                      <div className="flex items-start justify-between gap-4">
                        <p className="text-gray-700">
                          {(viewUser?.about ?? "").length > 0
                            ? viewUser.about
                            : "Henüz bir şey yazmadınız."}
                        </p>
                        <button
                          onClick={() => setIsEditing(true)}
                          className="text-gray-500 hover:text-black flex-shrink-0"
                          title="Hakkımda'yı düzenle"
                        >
                          <FiEdit2 size={18} />
                        </button>
                      </div>
                    ) : (
                      // Düzenleme modu
                      <div className="space-y-2">
                        <textarea
                          value={about}
                          onChange={(e) => setAbout(e.target.value)}
                          placeholder="Hakkımda..."
                          className="w-full border border-gray-200 p-2 rounded min-h-[120px]"
                        />
                        <div className="flex gap-2">
                          <button
                            onClick={handleUpdate}
                            className="inline-flex items-center px-4 py-2 rounded-full bg-black text-white hover:bg-gray-800 transition cursor-pointer"
                          >
                            Kaydet
                          </button>
                          <button
                            onClick={() => {
                              setAbout(viewUser?.about || "");
                              setIsEditing(false);
                            }}
                            className="inline-flex items-center px-4 py-2 rounded-full bg-gray-200 hover:bg-gray-300 transition cursor-pointer"
                          >
                            İptal
                          </button>
                        </div>
                      </div>
                    )}
                  </>
                )}
              </div>
            )}

            {activeTab === "datasets" && (
              <div className="w-full">
                {dsLoading ? (
                  <div className="text-center text-gray-400 py-8">
                    Yükleniyor...
                  </div>
                ) : dsError ? (
                  <div className="text-center text-red-600 py-8">{dsError}</div>
                ) : myDatasets.length === 0 ? (
                  <div className="text-center text-gray-400 py-8">
                    Henüz oluşturduğun veri kümesi yok.
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6 w-full justify-items-center">
                    {myDatasets.map((t) => {
                      const name = t.title || t.name || "Adsız";
                      const completion =
                        t.total_images > 0
                          ? Math.round(
                              (t.annotated_images / t.total_images) * 100
                            )
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

                          {/* Başlık */}
                          <div className="text-lg font-extrabold">{name}</div>

                          {/* Kategori */}
                          <span className="text-gray-500 text-sm">
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

                          {/* Alt şerit */}
                          <div className="flex items-center justify-between border-t border-gray-200 px-4 py-2">
                            <div className="flex items-center gap-1 text-gray-600">
                              <i className="bi bi-eye mt-3"></i>
                              <span>{t.total_images}</span>
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
                                    if (ownerId)
                                      navigate(`/profile/${ownerId}`, {
                                        state: {
                                          prefillUser: {
                                            id: ownerId,
                                            email:
                                              t.owner_email ??
                                              t.owner?.email ??
                                              null,
                                            profile_image_url:
                                              t.owner_avatar_url ?? null,
                                            profile_image_file:
                                              t.owner_avatar_filename ?? null,
                                            role:
                                              t.owner_role ??
                                              t.owner?.role ??
                                              null,
                                          },
                                        },
                                      });
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
                                      t.created_by ??
                                      null;
                                    if (ownerId)
                                      navigate(`/profile/${ownerId}`, {
                                        state: {
                                          prefillUser: {
                                            id: ownerId,
                                            email:
                                              t.owner_email ??
                                              t.owner?.email ??
                                              null,
                                            profile_image_url: null,
                                            profile_image_file:
                                              t.owner_avatar_filename ?? null,
                                            role:
                                              t.owner_role ??
                                              t.owner?.role ??
                                              null,
                                          },
                                        },
                                      });
                                  }}
                                />
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {/* ✅ Images sekmesi sadece viewingSelf iken gösterilir */}
            {viewingSelf && activeTab === "images" && (
              <div className="w-full">
                {imgLoading ? (
                  <div className="text-center text-gray-400 py-8">
                    Yükleniyor...
                  </div>
                ) : myImages.length === 0 ? (
                  <div className="text-center text-gray-400 py-8">
                    Hiç görsel yüklemediniz.
                  </div>
                ) : (
                  <>
                    <div className="overflow-x-auto bg-gray-50 rounded-xl shadow-xs border border-gray-300">
                      <table className="min-w-full text-sm">
                        <thead>
                          <tr className="bg-primary.light text-black font-sans">
                            <th className="py-3 px-4 text-left">Görsel</th>
                            <th className="py-3 px-4 text-left">Dosya Adı</th>
                            <th className="py-3 px-4 text-left">Durum</th>
                            <th className="py-3 px-4 text-left">AI Skoru</th>
                          </tr>
                        </thead>
                        <tbody>
                          {pageImages.map((img) => (
                            <tr
                              key={img.id}
                              className="border-b hover:bg-primary.light/40 transition text-gray-500 font-mono"
                            >
                              <td className="py-2 px-4">
                                <img
                                  src={`/uploaded_images/${img.filename}`}
                                  alt={img.filename}
                                  className="w-16 h-16 object-cover rounded shadow"
                                />
                              </td>
                              <td className="py-2 px-4 font-semibold">
                                {img.filename}
                              </td>
                              <td className="py-2 px-4">
                                {img.status === "approved" && (
                                  <span className="bg-green-100 text-green-700 px-2 py-1 rounded text-xs font-bold">
                                    Onaylandı
                                  </span>
                                )}
                                {img.status === "pending" && (
                                  <span className="bg-yellow-100 text-yellow-700 px-2 py-1 rounded text-xs font-bold">
                                    Onay Bekliyor
                                  </span>
                                )}
                                {img.status === "rejected" && (
                                  <span className="bg-red-100 text-red-700 px-2 py-1 rounded text-xs font-bold">
                                    Reddedildi
                                  </span>
                                )}
                              </td>
                              <td className="py-2 px-4">
                                {img.ai_score !== null
                                  ? Number(img.ai_score).toFixed(2)
                                  : "-"}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>

                    {/* 🔹 Sayfalama (Görseller) */}
                    <div className="flex justify-center items-center gap-3 mt-4">
                      <button
                        className="px-3 py-1 rounded-full border border-gray-300 bg-white hover:bg-gray-100 disabled:opacity-50"
                        disabled={page === 1}
                        onClick={() => setPage((p) => Math.max(1, p - 1))}
                      >
                        Önceki
                      </button>
                      <span className="text-sm text-gray-600">
                        Sayfa {page} / {totalPages}
                      </span>
                      <button
                        className="px-3 py-1 rounded-full border border-gray-300 bg-white hover:bg-gray-100 disabled:opacity-50"
                        disabled={page === totalPages}
                        onClick={() =>
                          setPage((p) => Math.min(totalPages, p + 1))
                        }
                      >
                        Sonraki
                      </button>
                    </div>
                  </>
                )}
              </div>
            )}

            {/* 🔹 KULLANICININ KONUŞMALARI */}
            {activeTab === "discussions" && (
              <div className="w-full">
                {threadsLoading ? (
                  <div className="text-center text-gray-400 py-8">
                    Yükleniyor...
                  </div>
                ) : threadsError ? (
                  <div className="text-center text-red-600 py-8">
                    {threadsError}
                  </div>
                ) : myThreads.length === 0 ? (
                  <div className="text-center text-gray-400 py-8">
                    Henüz konuşma oluşturmadınız.
                  </div>
                ) : (
                  <>
                    <ul className="border border-gray-300 rounded-lg bg-gray-50 divide-y">
                      {threadsPageItems.map((th) => (
                        <li
                          key={th.id}
                          className="p-4 hover:bg-gray-100 transition cursor-pointer focus:outline-none"
                          onClick={() => openThread(th)}
                          onKeyDown={(e) => e.key === "Enter" && openThread(th)}
                          tabIndex={0}
                          role="button"
                          aria-label={th.title || "Konuşma detayına git"}
                        >
                          <div className="flex items-center gap-3">
                            <div className="min-w-0 flex-1">
                              <h3 className="font-semibold text-gray-800 leading-6">
                                <a
                                  href={`/discussions/threads/${th.id}`}
                                  onClick={(e) => {
                                    e.preventDefault();
                                    openThread(th);
                                  }}
                                  className="hover:underline"
                                >
                                  {th.title || "Başlıksız Konuşma"}
                                </a>
                              </h3>

                              {th.content && (
                                <p className="text-sm text-gray-600 line-clamp-2 mt-1">
                                  {th.content}
                                </p>
                              )}

                              <div className="mt-2 text-xs text-gray-500">
                                {th.forum?.name
                                  ? `Forum: ${th.forum.name}`
                                  : th.forum_name
                                  ? `Forum: ${th.forum_name}`
                                  : null}
                              </div>
                            </div>

                            <div className="flex-shrink-0 ml-auto self-center">
                              <div className="w-9 h-9 rounded-full border border-gray-300 bg-white grid place-items-center">
                                <FiMessageSquare className="text-gray-600" />
                              </div>
                            </div>
                          </div>
                        </li>
                      ))}
                    </ul>

                    {/* 🔹 Sayfalama (Konuşmalar) */}
                    <div className="flex justify-center items-center gap-3 mt-4">
                      <button
                        className="px-3 py-1 rounded-full border border-gray-300 bg-white hover:bg-gray-100 disabled:opacity-50"
                        disabled={threadsPage === 1}
                        onClick={() =>
                          setThreadsPage((p) => Math.max(1, p - 1))
                        }
                      >
                        Önceki
                      </button>
                      <span className="text-sm text-gray-600">
                        Sayfa {threadsPage} / {threadsTotalPages}
                      </span>
                      <button
                        className="px-3 py-1 rounded-full border border-gray-300 bg-white hover:bg-gray-100 disabled:opacity-50"
                        disabled={threadsPage === threadsTotalPages}
                        onClick={() =>
                          setThreadsPage((p) =>
                            Math.min(threadsTotalPages, p + 1)
                          )
                        }
                      >
                        Sonraki
                      </button>
                    </div>
                  </>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Profile;
