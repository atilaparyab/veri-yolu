import React, { useContext, useEffect, useState } from "react";
import { AuthContext } from "../context/AuthContext";
import { Link, useNavigate } from "react-router-dom";
import api from "../api/api";
import newIllustration from "../assets/Animasyon2.png";
import roadImage from "../assets/Road.png";
import { t } from "i18next";

const Home = () => {
  const { user } = useContext(AuthContext);
  const [popularTopics, setPopularTopics] = useState([]);
  const [myStats, setMyStats] = useState({
    images: 0,
    topics: 0,
    points: 0,
    discussions: 0,
  }); // ✅ discussions eklendi

  // ✅ EK: konu başına metrikler
  const [metricsByTopic, setMetricsByTopic] = useState({});

  // ✅ EK: bu konunun view sayısı (unique)
  const getViews = (t) => metricsByTopic?.[t.id]?.views ?? 0;

  // ✅ EK: 1.2B/3.4M gibi kompakt gösterim
  const formatCompact = (n) => {
    try {
      return new Intl.NumberFormat("tr", {
        notation: "compact",
        compactDisplay: "short",
        maximumFractionDigits: 1,
      }).format(n ?? 0);
    } catch {
      if (!n) return "0";
      if (n >= 1_000_000)
        return (n / 1_000_000).toFixed(1).replace(".0", "") + "M";
      if (n >= 1_000) return (n / 1_000).toFixed(1).replace(".0", "") + "B";
      return String(n);
    }
  };

  // ✅ EK: verilen konu listesi için /topics/{id}/metrics topla
  const loadMetricsFor = async (list) => {
    if (!Array.isArray(list) || list.length === 0) return;
    try {
      const entries = await Promise.all(
        list.map((t) =>
          api
            .get(`/topics/${t.id}/metrics`)
            .then((res) => [t.id, res.data])
            .catch(() => [t.id, { views: 0, downloads: 0 }])
        )
      );
      setMetricsByTopic((prev) => {
        const next = { ...prev };
        entries.forEach(([id, data]) => (next[id] = data));
        return next;
      });
    } catch {
      /* sessiz geç */
    }
  };

  const navigate = useNavigate();

  useEffect(() => {
    if (!user) {
      api.get("/topics").then((res) => {
        const list = res.data.slice(0, 3);
        setPopularTopics(list);
        loadMetricsFor(list); // ✅ metrikleri de getir
      });
    } else {
      // Kullanıcıya özel istatistikler
      api
        .get("/images/me")
        .then((res) => setMyStats((s) => ({ ...s, images: res.data.length })))
        .catch(() => setMyStats((s) => ({ ...s, images: 0 })));

      api
        .get("/topics/mine")
        .then((res) => setMyStats((s) => ({ ...s, topics: res.data.length })))
        .catch(() => setMyStats((s) => ({ ...s, topics: 0 })));

      api
        .get("/auth/me")
        .then((res) =>
          setMyStats((s) => ({
            ...s,
            points: res.data?.points ?? 0,
            streak: res.data?.streak ?? 0, // Giriş Serisi kutusu için
          }))
        )
        .catch(() => setMyStats((s) => ({ ...s, points: 0, streak: 0 })));

      // ✅ Konuşmalar (kendi gönderi sayın)
      api
        .get("/discussions/stats/me")
        .then((res) =>
          setMyStats((s) => ({ ...s, discussions: res.data?.discussions ?? 0 }))
        )
        .catch(() => setMyStats((s) => ({ ...s, discussions: 0 })));

      api.get("/topics").then((res) => {
        const list = res.data.slice(0, 3);
        setPopularTopics(list);
        loadMetricsFor(list); // ✅ metrikleri de getir
      });
    }
  }, [user]);

  //Giriş yapılmadan önceki sayfa
  if (!user) {
    return (
      <div className="w-full bg-gray-50 relative">
        <div className="max-w-7xl mx-auto px-4 md:px-8 py-2 relative z-10">
          <div className="flex flex-col md:flex-row items-center gap-12">
            {/* Hero Text */}
            <div className="flex-1 flex flex-col space-y-4">
              <h1 className="text-5xl md:text-8xl font-extrabold text-black leading-tight">
                VeriYolu
              </h1>
              <p className="text-lg md:text-4xl text-gray-700 max-w-2xl leading-relaxed">
                Görsellerini yükle, etiketle ve anotasyonlarını kolayca yönet.
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-500 to-blue-500 font-semibold">
                  Gelişmiş yapay zeka destekli bir deneyimle tanış!
                </span>
              </p>

              {/* Butonlar */}
              <div className="flex gap-4 flex-wrap mt-5">
                <button
                  onClick={() => navigate("/register")}
                  className="px-8 py-3 rounded-full bg-black text-white font-semibold text-lg shadow transition duration-300 ease-in-out hover:bg-primary-dark hover:scale-105 hover:shadow-lg cursor-pointer "
                >
                  Kayıt Ol
                </button>
                <button
                  onClick={() => navigate("/login")}
                  className="px-8 py-3 rounded-full bg-gray-50 border border-gray-100  font-semibold text-lg shadow transition duration-300 ease-in-out hover:bg-primary hover:scale-105 hover:shadow-lg cursor-pointer"
                >
                  Giriş Yap
                </button>
              </div>
            </div>

            {/* Hero Illustration */}
            <img
              src={newIllustration}
              alt="Yapay zeka figürleri"
              className="flex-1 max-w-xs md:max-w-md w-full rounded-xl object-contain"
            />
          </div>
        </div>

        {/* 🔥 ÇİZGİ */}
        <div className="border-t border-gray-300 my-6"></div>
        {popularTopics.length > 0 && (
          <div className="bg-gray-50 py-2">
            <div className="max-w-7xl mx-auto px-4 md:px-8">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-2xl font-bold text-gray-900">
                  Güncel Veri Kümeleri
                </h3>

                <Link
                  to="/topicsNav"
                  className="inline-flex items-center gap-2 px-4 py-2  text-gray-600 font-extralight hover:text-gray-900 transition"
                >
                  Tümü <span aria-hidden></span>
                </Link>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
                {popularTopics.map((t) => (
                  <div
                    key={t.id}
                    className="bg-white rounded-xl shadow hover:shadow-lg transition cursor-pointer flex flex-col justify-between"
                  >
                    {/* Görsel veya boş header */}

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

                    {/* Başlık + Açıklama */}
                    <div className="p-4 flex flex-col gap-2">
                      <Link
                        to={`/topics/${t.id}`}
                        className="text-lg font-bold text-gray-800 hover:text-gray-500 line-clamp-2"
                      >
                        {t.title}
                      </Link>
                      {/* Kategori Etiketi */}
                      <span className=" text-gray-500 text-sm ">
                        {t.category_name}
                      </span>
                    </div>

                    {/* 👇 Alt Çizgi + Sağdaki Avatar */}
                    <div className="flex items-center justify-between border-t border-gray-200 px-4 py-2">
                      {/* 👁 Görüntülenme (unique) */}
                      <div className="flex items-center gap-1 text-gray-600">
                        <i className="bi bi-eye text-[14px] leading-none"></i>
                        <span className="text-xs leading-none font-medium">
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
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ÇİZGİ */}
        <div className="border-t border-gray-300 my-6"></div>

        {/* Who Uses Section */}
        <div className="max-w-7xl mx-auto px-4 md:px-8 py-4 ">
          {" "}
          <h2 className="text-2xl md:text-3xl font-bold mb-6 text-gray-900">
            Kimler{" "}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-500 to-blue-500">
              VeriYolu
            </span>{" "}
            kullanıyor?
          </h2>
          <div className="flex flex-col md:flex-row gap-6">
            {/* Kartlar */}
            <div className="flex-1 bg-gray-50 rounded-2xl p-6 shadow text-center md:text-left">
              <h3 className="font-semibold text-lg">Öğrenciler</h3>
              <p className="text-gray-600 text-base leading-relaxed">
                Derslerde projeler hazırlamak ve veri kümeleri üzerinde çalışmak
                için VeriYolu'nu kullanıyorlar.
              </p>
            </div>
            <div className="flex-1 bg-gray-50 rounded-2xl p-6 shadow text-center md:text-left">
              <h3 className="font-semibold text-lg">Geliştiriciler</h3>
              <p className="text-gray-600 text-base leading-relaxed">
                Modelleri eğitmek, verileri etiketlemek ve projelerini kolayca
                yönetmek için tercih ediyorlar.
              </p>
            </div>
            <div className="flex-1 bg-gray-50 rounded-2xl p-6 shadow text-center md:text-left">
              <h3 className="font-semibold text-lg">Araştırmacılar</h3>
              <p className="text-gray-600 text-base leading-relaxed">
                Yapay zeka araştırmalarını desteklemek için veri kümelerini
                analiz ediyor ve sonuçlar üretiyorlar.
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Giriş yapıldıysa Kaggle dashboard tarzı
  return (
    <div className="w-full flex flex-col items-center justify-center font-sans bg-gray-50">
      <style>{`footer { display: none; }`}</style>

      <div className="w-full max-w-7xl mb-10">
        {/* Hoş geldin + Login & Tier kutuları */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
          {/* Hoş Geldin Yazısı */}
          <h2 className="text-3xl font-bold text-black text-start">
            Hoş geldin,{" "}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-500 to-blue-500">
              {user.email ? user.email.split("@")[0] : "kullanıcı"}
            </span>
            !
          </h2>

          {/* Login + Tier Box */}
          <div className="grid">
            {/* LOGIN STREAK */}
            <div className="text-center bg-gray-50 p-4">
              <h4 className="text-sm font-semibold text-gray-500 ">
                Giriş Serisi
              </h4>
              <p className="text-3xl font-bold text-gray-800 mt-2">
                {myStats.streak}
              </p>
              <p className="text-sm text-gray-500 leading-tight">
                gün
                <br />
              </p>
            </div>
          </div>
        </div>

        {/* Kaggle tarzı istatistik kutuları */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-10">
          {/* 2. Kutucuk */}
          <div className="flex flex-col gap-2 p-0 rounded-lg border-0 bg-transparent shadow-none">
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-gray-50 ring-1 ring-gray-200">
                <i
                  className="bi bi-collection text-base text-gray-600"
                  aria-hidden="true"
                ></i>
              </span>
              <span className="text-sm font-semibold text-gray-800">
                Veri Kümeleri
              </span>
            </div>
            <div className="flex items-baseline gap-2 pl-3">
              <span className="inline-block h-5 border-l-2 border-gray-200 rounded-sm" />
              <span className="text-2xl font-bold text-gray-900">
                {myStats.topics}
              </span>
              <span className="text-xs text-gray-500">toplam oluşturma</span>
            </div>
          </div>

          {/* 1. Kutucuk */}
          <div className="flex flex-col gap-2 p-0 rounded-lg border-0 bg-transparent shadow-none">
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-gray-50 ring-1 ring-gray-200">
                <i
                  className="bi bi-images text-base text-gray-600"
                  aria-hidden="true"
                ></i>
              </span>
              <span className="text-sm font-semibold text-gray-800">
                Görseller
              </span>
            </div>
            <div className="flex items-baseline gap-2 pl-3">
              <span className="inline-block h-5 border-l-2 border-gray-200 rounded-sm" />
              <span className="text-2xl font-bold text-gray-900">
                {myStats.images}
              </span>
              <span className="text-xs text-gray-500">toplam yükleme</span>
            </div>
          </div>

          {/* 4. Kutucuk — Konuşmalar */}
          <div className="flex flex-col gap-2 p-0 rounded-lg border-0 bg-transparent shadow-none">
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-gray-50 ring-1 ring-gray-200">
                <i
                  className="bi bi-chat-dots text-base text-gray-600"
                  aria-hidden="true"
                ></i>
              </span>
              <span className="text-sm font-semibold text-gray-800">
                Konuşmalar
              </span>
            </div>
            <div className="flex items-baseline gap-2 pl-3">
              <span className="inline-block h-5 border-l-2 border-gray-200 rounded-sm" />
              <span className="text-2xl font-bold text-gray-900">
                {myStats?.discussions ?? 0}
              </span>
              <span className="text-xs text-gray-500">toplam gönderi</span>
            </div>
          </div>

          {/* 3. Kutucuk */}
          <div className="flex flex-col gap-2 p-0 rounded-lg border-0 bg-transparent shadow-none">
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-gray-50 ring-1 ring-gray-200">
                <i
                  className="bi bi-star text-base text-gray-600"
                  aria-hidden="true"
                ></i>
              </span>
              <span className="text-sm font-semibold text-gray-800">Puan</span>
            </div>
            <div className="flex items-baseline gap-2 pl-3">
              <span className="inline-block h-5 border-l-2 border-gray-200 rounded-sm" />
              <span className="text-2xl font-bold text-gray-900">
                {myStats.points}
              </span>
              <span className="text-xs text-gray-500">toplam puan</span>
            </div>
          </div>
        </div>

        {/* ÇİZGİ */}
        <div className="border-t border-gray-300 my-6"></div>

        {/* Öneri Kartları */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          {/* Kart 1 */}
          <div className="rounded-2xl border border-gray-200 bg-white shadow-sm hover:shadow-xl transition-all duration-100 overflow-hidden flex flex-col h-60 p-0">
            {/* Görsel Alanı (SVG desen) */}
            <div className="relative h-24 w-full">
              <svg
                className="absolute inset-0 w-full h-full"
                viewBox="0 0 400 160"
                xmlns="http://www.w3.org/2000/svg"
                preserveAspectRatio="none"
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
              {/* ikon rozet */}
              <div className="absolute bottom-2 left-3 w-10 h-10 rounded-full bg-white ring-1 ring-gray-200 shadow flex items-center justify-center">
                <i className="bi bi-chat-dots text-lg text-gray-700"></i>
              </div>
            </div>

            {/* Gövde */}
            <div className="px-4 py-3 flex flex-col flex-1">
              <h3 className="font-bold text-lg text-gray-900">
                Konuşmaya Başla
              </h3>
              <p className="text-gray-500 text-sm mt-1">
                Kendi fikirlerini yayınla ve yeni bir konuşma ortamı yarat.
              </p>
              <button
                onClick={() => navigate("/discussions")}
                className="mt-auto inline-flex items-center gap-2 text-sm font-semibold text-gray-800  cursor-pointer"
              >
                Hadi Başla <span aria-hidden>→</span>
              </button>
            </div>
          </div>

          {/* Kart 2 */}
          <div className="rounded-2xl border border-gray-200 bg-white shadow-sm hover:shadow-xl transition-all duration-100 overflow-hidden flex flex-col h-60 p-0">
            <div className="relative h-24 w-full">
              <svg
                className="absolute inset-0 w-full h-full"
                viewBox="0 0 400 160"
                xmlns="http://www.w3.org/2000/svg"
                preserveAspectRatio="none"
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
              <div className="absolute bottom-2 left-3 w-10 h-10 rounded-full bg-white ring-1 ring-gray-200 shadow flex items-center justify-center">
                <i className="bi bi-plus-square text-lg text-gray-700"></i>
              </div>
            </div>

            <div className="px-4 py-3 flex flex-col flex-1">
              <h3 className="font-bold text-lg text-gray-900">
                Yeni Veri Kümesi Oluştur
              </h3>
              <p className="text-gray-500 text-sm mt-1">
                Kendi veri toplama konunu başlat ve uygula.
              </p>
              <button
                onClick={() =>
                  navigate("/topics", { state: { openCreate: true } })
                }
                className="mt-auto inline-flex items-center gap-2 text-sm font-semibold text-gray-800 cursor-pointer"
              >
                Hadi Başla <span aria-hidden>→</span>
              </button>
            </div>
          </div>

          {/* Kart 3 */}
          <div className="rounded-2xl border border-gray-200 bg-white shadow-sm hover:shadow-xl transition-all duration-100 overflow-hidden flex flex-col h-60 p-0">
            <div className="relative h-24 w-full">
              <svg
                className="absolute inset-0 w-full h-full"
                viewBox="0 0 400 160"
                xmlns="http://www.w3.org/2000/svg"
                preserveAspectRatio="none"
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
              <div className="absolute bottom-2 left-3 w-10 h-10 rounded-full bg-white ring-1 ring-gray-200 shadow flex items-center justify-center">
                <i className="bi bi-collection text-lg text-gray-700"></i>
              </div>
            </div>

            <div className="px-4 py-3 flex flex-col flex-1">
              <h3 className="font-bold text-lg text-gray-900">Tüm Konular</h3>
              <p className="text-gray-500 text-sm mt-1">
                Topluluğun oluşturduğu tüm veri kümelerine göz at.
              </p>
              <button
                onClick={() => navigate("/topics")}
                className="mt-auto inline-flex items-center gap-2 text-sm font-semibold text-gray-800  cursor-pointer"
              >
                Hadi Başla <span aria-hidden>→</span>
              </button>
            </div>
          </div>
        </div>

        {/* ÇİZGİ */}
        <div className="border-t border-gray-300 my-6"></div>

        {/* Duyurular */}
        <div className="mt-8">
          <h3 className="text-2xl font-bold text-black mb-4 flex items-center gap-2">
            <i className="bi bi-megaphone text-transparent bg-clip-text bg-gradient-to-r from-purple-500 to-blue-500"></i>{" "}
            Duyurular
          </h3>

          <div className="space-y-4">
            {/* Duyuru Kartı */}
            <div className="p-4 bg-transparent border border-gray-200 rounded-lg  hover:shadow transition duration-200">
              <h4 className="font-bold text-lg text-gray-800">
                Yeni Özellik: Etiketleme Puan Sistemi
              </h4>
              <p className="text-sm text-gray-500 mt-1">
                Artık görselleri etiketleyerek daha fazla puan kazanabilir ve
                sıralamada yükselebilirsiniz!
              </p>
              <span className="text-xs text-gray-400 mt-2 block">
                22 Temmuz 2025
              </span>
            </div>

            <div className="p-4 bg-transparent border border-gray-200 rounded-lg hover:shadow transition duration-200">
              <h4 className="font-bold text-lg text-gray-800">
                Bakım Çalışması
              </h4>
              <p className="text-sm text-gray-500 mt-1">
                Sistem 25 Temmuz 2025 tarihinde 02:00 - 04:00 arasında bakıma
                alınacaktır.
              </p>
              <span className="text-xs text-gray-400 mt-2 block">
                20 Temmuz 2025
              </span>
            </div>

            <div className="p-4 bg-transparent border border-gray-200 rounded-lg hover:shadow transition duration-200">
              <h4 className="font-bold text-lg text-gray-800">
                Topluluk Forumu Açıldı!
              </h4>
              <p className="text-sm text-gray-500 mt-1">
                Diğer kullanıcılarla veri kümeleri hakkında sohbet etmek için{" "}
                <a href="#" className="text-blue-600 underline">
                  forumu ziyaret edin
                </a>
                .
              </p>
              <span className="text-xs text-gray-400 mt-2 block">
                18 Temmuz 2025
              </span>
            </div>

            {/* ÇİZGİ */}
            <div className="border-t border-gray-300 my-6"></div>
            {/* Next Steps */}
            <div className="mt-10">
              <h3 className="text-2xl font-bold text-black mb-4 flex items-center gap-2">
                <i className="bi bi-graph-up text-transparent bg-clip-text bg-gradient-to-r from-purple-500 to-blue-500"></i>{" "}
                Diğer Adımlar
              </h3>

              <div className="space-y-4">
                {/* Liste öğeleri */}
                <div className="flex items-center justify-between p-4 bg-gray-50 border border-gray-200 rounded-lg hover:bg-gray-100 transition">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                      <i className="bi bi-play text-gray-400"></i>
                    </div>
                    <div>
                      <h4 className="font-bold text-gray-800">
                        Yeni Veri Kümeni Oluştur
                      </h4>
                      <p className="text-gray-500 text-sm">
                        Kendi{" "}
                        <a
                          href="#"
                          className="underline text-blue-400"
                          onClick={(e) => {
                            e.preventDefault(); // sayfa yenilenmesini engeller
                            navigate("/Create-Topic");
                          }}
                        >
                          konunu
                        </a>
                        , başlat ve uygula.
                      </p>
                    </div>
                  </div>
                  <input
                    type="checkbox"
                    className="w-5 h-5 border-gray-300 rounded"
                  />
                </div>

                <div className="flex items-center justify-between p-4 bg-gray-50 border border-gray-200 rounded-lg hover:bg-gray-100 transition">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                      <i className="bi bi-chat-left-dots text-gray-400"></i>
                    </div>
                    <div>
                      <h4 className="font-bold text-gray-800">
                        Konuşmaya Başla
                      </h4>
                      <p className="text-gray-500 text-sm">
                        İlk yorumunuzu yapın! Forumları ziyaret edin veya veri
                        kümeleriyle ilgili{" "}
                        <a
                          href="#"
                          className="underline text-blue-400"
                          onClick={(e) => {
                            e.preventDefault(); // sayfa yenilenmesini engeller
                            navigate("/discussions");
                          }}
                        >
                          tartışmaları keşfedin
                        </a>
                        .
                      </p>
                    </div>
                  </div>
                  <input
                    type="checkbox"
                    className="w-5 h-5 border-gray-300 rounded"
                  />
                </div>

                <div className="flex items-center justify-between p-4 bg-gray-50 border border-gray-200 rounded-lg hover:bg-gray-100 transition">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                      <i className="bi bi-pencil-square text-gray-400"></i>
                    </div>
                    <div>
                      <h4 className="font-bold text-gray-800">
                        etiketleme yapmaya başla
                      </h4>
                      <p className="text-gray-500 text-sm">
                        Yeni görsellerini hızlıca{" "}
                        <a
                          href="#"
                          className="underline text-blue-400"
                          onClick={(e) => {
                            e.preventDefault(); // sayfa yenilenmesini engeller
                            navigate("/Topics");
                          }}
                        >
                          etiketle
                        </a>{" "}
                        ve puan kazanmaya başla.
                      </p>
                    </div>
                  </div>
                  <input
                    type="checkbox"
                    className="w-5 h-5 border-gray-300 rounded"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Home;
