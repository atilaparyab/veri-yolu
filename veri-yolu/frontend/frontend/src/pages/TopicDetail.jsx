// src/pages/TopicDetail.jsx
import React, { useState, useEffect, useContext } from "react";
import { useParams, Link, useNavigate, useLocation } from "react-router-dom";
import { AuthContext } from "../context/AuthContext";
import api from "../api/api";
import { saveAs } from "file-saver";
import { useRef } from "react";

const TopicDetail = () => {
  const { id } = useParams();
  const { user } = useContext(AuthContext);
  const navigate = useNavigate();
  const location = useLocation();

  const [topic, setTopic] = useState(null);
  const [images, setImages] = useState([]);
  const [search, setSearch] = useState("");
  const [showUpload, setShowUpload] = useState(false);
  const [showLabelsModal, setShowLabelsModal] = useState(false);
  const [labelsInput, setLabelsInput] = useState("");
  const [selectedImages, setSelectedImages] = useState([]);
  const [batchLabel, setBatchLabel] = useState("");
  const [batchResult, setBatchResult] = useState(null);
  const [batchLoading, setBatchLoading] = useState(false);
  const [autoLabelLoading, setAutoLabelLoading] = useState(false);
  const [autoLabelResult, setAutoLabelResult] = useState(null);
  const [selectedLabelingLoading, setSelectedLabelingLoading] = useState(false);
  const [selectedLabelingResult, setSelectedLabelingResult] = useState(null);
  const [topicThreads, setTopicThreads] = useState([]);
  const [newTopicThreadTitle, setNewTopicThreadTitle] = useState("");
  const [newTopicThreadContent, setNewTopicThreadContent] = useState("");
  const [threadStatus, setThreadStatus] = useState(null);
  const [showNewTopicThreadModal, setShowNewTopicThreadModal] = useState(false);

  // ✅ METRİKLER (unique views/downloads)
  const [metrics, setMetrics] = useState({ views: 0, downloads: 0 });

  const tableRef = useRef();

  // --- Sayfalama state'leri ---
  const [currentPage, setCurrentPage] = useState(1);
  const ITEMS_PER_PAGE = 10;

  const activeTab =
    new URLSearchParams(location.search).get("tab") || "profile";

  const changeTab = (tab) => {
    navigate(`?tab=${tab}`);
  };

  useEffect(() => {
    fetchTopic();
    fetchImages();
    fetchTopicThreads();
    fetchMetrics();
  }, [id]);

  // 👁️ Unique view ping (login'li kullanıcıda bir kere)
  useEffect(() => {
    if (!user) return;
    api
      .post(`/topics/${id}/view`)
      .then(() => fetchMetrics())
      .catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, !!user]);

  const fetchTopic = async () => {
    try {
      const res = await api.get(`/topics/${id}`);
      setTopic(res.data);
    } catch (err) {
      console.error(err);
    }
  };

  const fetchImages = async () => {
    try {
      const res = await api.get(`/images/${id}/list`);
      setImages(res.data);
    } catch (err) {
      console.error(err);
    }
  };

  const fetchTopicThreads = async () => {
    try {
      const res = await api.get(`/discussions/topic/${id}/threads`);
      setTopicThreads(res.data || []);
    } catch (err) {
      // silent
    }
  };

  const fetchMetrics = async () => {
    try {
      const res = await api.get(`/topics/${id}/metrics`);
      setMetrics(res.data || { views: 0, downloads: 0 });
    } catch (err) {
      // silent
    }
  };

  // İstatistikler
  const totalImages = images.length;
  const annotatedImages = images.filter(
    (img) => img.annotation_count > 0
  ).length;

  // Filtre
  const filteredImages = images.filter((img) => {
    return !search || img.filename.toLowerCase().includes(search.toLowerCase());
  });

  // --- Sayfalama hesapları ---
  const totalPages = Math.max(
    1,
    Math.ceil(filteredImages.length / ITEMS_PER_PAGE)
  );
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const endIndex = startIndex + ITEMS_PER_PAGE;
  const pageImages = filteredImages.slice(startIndex, endIndex);

  // Filtre / arama değişince sayfayı gerekirse 1'e çek
  useEffect(() => {
    if (currentPage > totalPages) setCurrentPage(1);
  }, [filteredImages.length, totalPages, currentPage]);

  const handleSelectImage = (id) => {
    setSelectedImages((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  };

  // Yalnızca mevcut sayfadaki görseller için "tümünü seç"
  const handleSelectAll = () => {
    const pageIds = pageImages.map((img) => img.id);
    const allSelectedOnPage = pageIds.every((pid) =>
      selectedImages.includes(pid)
    );

    if (allSelectedOnPage) {
      setSelectedImages((prev) => prev.filter((id) => !pageIds.includes(id)));
    } else {
      setSelectedImages((prev) => Array.from(new Set([...prev, ...pageIds])));
    }
  };

  const handleBatchLabel = async () => {
    if (!batchLabel || selectedImages.length === 0) return;
    setBatchLoading(true);
    setBatchResult(null);
    let success = 0,
      fail = 0;
    for (const id of selectedImages) {
      try {
        await api.post(`/annotation/image/${id}/annotations`, {
          label: batchLabel,
          x: 0,
          y: 0,
          width: 0,
          height: 0,
          image_id: id,
          category_id: topic?.category_id || 1,
        });
        success++;
      } catch {
        fail++;
      }
    }
    setBatchResult({ success, fail });
    setBatchLoading(false);
    fetchImages();
  };

  const handleBatchSuggest = async () => {
    if (selectedImages.length === 0) return;
    setBatchLoading(true);
    setBatchResult(null);
    let success = 0,
      fail = 0;
    for (const id of selectedImages) {
      try {
        const res = await api.post(`/annotation/image/${id}/suggest_label`, {});
        if (res.data.label) {
          await api.post(`/annotation/image/${id}/annotations`, {
            label: res.data.label,
            x: 0,
            y: 0,
            width: 0,
            height: 0,
            image_id: id,
            category_id: topic?.category_id || 1,
          });
          success++;
        } else {
          fail++;
        }
      } catch {
        fail++;
      }
    }
    setBatchResult({ success, fail });
    setBatchLoading(false);
    fetchImages();
  };

  // Batch auto-label handler (all images)
  const handleAutoLabel = async () => {
    setAutoLabelLoading(true);
    setAutoLabelResult(null);
    try {
      const res = await api.post(`/annotation/topic/${id}/auto_annotate`);
      setAutoLabelResult({ success: true, count: res.data.results.length });
      await fetchImages();
    } catch (err) {
      setAutoLabelResult({
        success: false,
        error: err.response?.data?.detail || err.message,
      });
    } finally {
      setAutoLabelLoading(false);
    }
  };

  // AI-label only selected images
  const handleSelectedAutoLabel = async () => {
    if (selectedImages.length === 0) return;
    setSelectedLabelingLoading(true);
    setSelectedLabelingResult(null);
    let success = 0,
      fail = 0;
    for (const imgId of selectedImages) {
      try {
        const res = await api.post(
          `/annotation/image/${imgId}/suggest_label`,
          {}
        );
        if (res.data.label) {
          await api.post(`/annotation/image/${imgId}/annotations`, {
            label: res.data.label,
            x: 0,
            y: 0,
            width: 0,
            height: 0,
            image_id: imgId,
            category_id: topic?.category_id || 1,
          });
          success++;
        } else {
          fail++;
        }
      } catch {
        fail++;
      }
    }
    setSelectedLabelingResult({ success, fail });
    await fetchImages();
    setSelectedLabelingLoading(false);
  };

  // ⬇️⬇️⬇️  İNDİRME AKSİYONLARI — unique download log + ZIP indirme ⬇️⬇️⬇️

  // Genel yardımcı: download ping + sonra metrik tazele
  const pingDownloadThen = async (doAfter) => {
    if (!user) return navigate("/login");
    try {
      await api.post(`/topics/${id}/download`);
    } catch (e) {
      // ping başarısız olsa da indirmeyi deneyebiliriz
    }
    await doAfter();
    fetchMetrics();
  };

  // "İndir" butonu — görselleri ZIP indir
  const handleMainImagesDownload = async () => {
    await pingDownloadThen(async () => {
      try {
        const url = `/topics/${id}/images/zip`; // tek doğru endpoint
        const res = await api.get(url, { responseType: "blob" });
        const disp = res.headers?.["content-disposition"];
        const fname =
          (disp && /filename="([^"]+)"/.exec(disp)?.[1]) ||
          `topic_${id}_images.zip`;
        saveAs(res.data, fname);
      } catch (err) {
        alert(
          "Görseller indirilemedi: " +
            (err?.response?.data?.detail || err.message)
        );
      }
    });
  };

  // Export annotation handler (JSON/CSV)
  const handleExportAnnotations = async (format = "json") => {
    await pingDownloadThen(async () => {
      const urls = [
        // topic.py içindeki 3 endpoint'i sırayla dene:
        `/annotation/topic/${id}/export_annotations?format=${format}`,
        `/annotations/topic/${id}/export_annotations?format=${format}`,
        `/topics/${id}/annotations/export?format=${format}`,
      ];

      let lastErr;
      for (const url of urls) {
        try {
          const res = await api.get(url, { responseType: "blob" });

          // Sunucunun döndürdüğü Content-Type kontrolü
          const ct = (res.headers && res.headers["content-type"]) || "";
          if (ct.includes("application/json") && format !== "json") {
            // Muhtemel hata mesajını okuyup göster (Blob -> text)
            const msg = await res.data.text();
            try {
              const parsed = JSON.parse(msg);
              throw new Error(parsed.detail || msg);
            } catch {
              throw new Error(msg);
            }
          }

          // Sunucunun önerdiği dosya adını yakala (varsa)
          let filename = `annotations_topic_${id}.${format}`;
          const cd = res.headers?.["content-disposition"];
          if (cd) {
            const match = /filename\*?=([^;]+)/i.exec(cd);
            if (match) {
              // RFC5987 veya düz filename olabilir
              let raw = match[1].trim().replace(/^UTF-8''/i, "");
              raw = raw.replace(/^["']|["']$/g, ""); // çevre tırnakları at
              try {
                filename = decodeURIComponent(raw);
              } catch {
                filename = raw;
              }
            }
          }

          saveAs(res.data, filename);
          return; // başarıyla indirdik, çık
        } catch (e) {
          lastErr = e;
        }
      }

      alert(
        "Export başarısız: " +
          (lastErr?.response?.data?.detail ||
            lastErr?.message ||
            "Uygun endpoint bulunamadı")
      );
    });
  };

  // Sayfa değiştirme
  const handlePageChange = (page) => {
    if (page < 1 || page > totalPages) return;
    setCurrentPage(page);
  };

  // Başlıktan sabit bir sayı üret
  const hashStr = (str = "") => {
    let h = 0;
    for (let i = 0; i < str.length; i++) h = (h * 31 + str.charCodeAt(i)) >>> 0;
    return h;
  };

  // Başlığa göre pastel gradyan üret
  const gradientFrom = (key = "") => {
    const h = hashStr(key) % 360;
    const c1 = `hsl(${h}, 80%, 85%)`;
    const c2 = `hsl(${(h + 35) % 360}, 80%, 75%)`;
    return `linear-gradient(135deg, ${c1}, ${c2})`;
  };

  // Başlıktan 1–2 harflik kısaltma (isteğe bağlı)
  const initials = (title = "Konu") =>
    title
      .trim()
      .split(/\s+/)
      .slice(0, 2)
      .map((s) => s[0]?.toUpperCase())
      .join("") || "K";
  const [imgError, setImgError] = useState(false);

  return (
    <div className=" relative">
      <style>{`
      footer { display: none; }
    `}</style>

      <div className="hidden md:block absolute right-0 top-5">
        {topic?.cover_image && !imgError ? (
          <img
            src={`/uploaded_images/${topic.cover_image}`}
            alt="Kapak Görseli"
            className="w-60 h-32 rounded-3xl shadow-lg object-cover"
            onError={() => setImgError(true)}
          />
        ) : (
          <div
            className="w-60 h-32 rounded-3xl shadow-lg flex items-center justify-center"
            style={{
              background: gradientFrom(topic?.title || String(topic?.id || "")),
            }}
            aria-label="Kapak Yer Tutucu"
          >
            <span className="text-black/70 font-semibold tracking-wide">
              {initials(topic?.title)}
            </span>
          </div>
        )}
      </div>

      {topic && (
        <div className="flex flex-col md:flex-row gap-4 mb-4">
          {/* Sağ taraf: Başlık, Kategori, Oluşturan, Butonlar */}
          <div className="flex flex-col flex-1 justify-between mt-10 ">
            {/* Başlık ve Açıklama */}
            <div>
              <h1 className="text-4xl font-extrabold text-black mb-2">
                {topic.name || topic.title}
              </h1>

              {/* Kategori ve Oluşturan */}
              <div className="flex items-center gap-2 bg-gray-50 text-gray-700 px-1 rounded-full">
                <img
                  src={topic?.owner_avatar_url || "/placeholder-avatar.png"}
                  alt={topic?.owner_email || "Kullanıcı"}
                  className="w-5 h-5 rounded-full object-cover"
                />
                <span className="text-xs text-gray-500">
                  {" "}
                  {topic?.owner_email || "-"}
                </span>
              </div>

              {/* Butonlar ve İstatistikler */}
              <div className="flex flex-col md:items-end gap-3 mt-20 w-full">
                {/* Butonlar: sadece giriş yapıldıysa göster */}
                {user && (
                  <div className="flex w-full justify-normal flex-wrap gap-1">
                    <button
                      type="button"
                      className={`px-4 py-2 text-sm font-medium rounded focus:z-10 focus:ring-2 ${
                        user
                          ? "text-gray-900 bg-gray-100 hover:bg-gray-200 hover:text-black focus:ring-gray-500 cursor-pointer"
                          : "text-gray-400 bg-gray-50 cursor-not-allowed"
                      }`}
                      onClick={() =>
                        user ? setShowUpload(true) : navigate("/login")
                      }
                    >
                      <i className="bi bi-upload mr-1"></i> Yükle
                    </button>

                    {/* İndir (ZIP görseller) */}
                    <button
                      type="button"
                      className={`px-4 py-2 text-sm font-medium rounded focus:z-10 focus:ring-2 ${
                        user
                          ? "text-gray-900 bg-gray-100 hover:bg-gray-200 hover:text-black focus:ring-gray-500 cursor-pointer"
                          : "text-gray-400 bg-gray-50 cursor-not-allowed"
                      }`}
                      onClick={() =>
                        user ? handleMainImagesDownload() : navigate("/login")
                      }
                    >
                      <i className="bi bi-download mr-1"></i> İndir
                    </button>

                    <button
                      type="button"
                      className={`px-4 py-2 text-sm font-medium rounded focus:z-10 focus:ring-2 ${
                        user
                          ? "text-gray-900 bg-gray-100 hover:bg-gray-200 hover:text-black focus:ring-gray-500 cursor-pointer"
                          : "text-gray-400 bg-gray-50 cursor-not-allowed"
                      }`}
                      onClick={() =>
                        user ? handleAutoLabel() : navigate("/login")
                      }
                      disabled={autoLabelLoading || !user}
                    >
                      {autoLabelLoading
                        ? "AI ile Etiketleniyor..."
                        : "Tümünü Etiketle"}
                    </button>

                    <button
                      type="button"
                      className={`px-4 py-2 text-sm font-medium rounded focus:z-10 focus:ring-2 ${
                        user
                          ? "text-gray-900 bg-gray-100 hover:bg-gray-200 hover:text-black focus:ring-gray-500 cursor-pointer"
                          : "text-gray-400 bg-gray-50 cursor-not-allowed"
                      }`}
                      onClick={() =>
                        user ? handleSelectedAutoLabel() : navigate("/login")
                      }
                      disabled={
                        selectedLabelingLoading ||
                        selectedImages.length === 0 ||
                        !user
                      }
                    >
                      {selectedLabelingResult
                        ? "Seçili Etiketleniyor..."
                        : "Seçiliyi Etiketle"}
                    </button>

                    {/* ANN (JSON) */}
                    <button
                      type="button"
                      className={`px-4 py-2 text-sm font-medium rounded focus:z-10 focus:ring-2 ${
                        user
                          ? "text-gray-900 bg-gray-100 hover:bg-gray-200 hover:text-black focus:ring-gray-500 cursor-pointer"
                          : "text-gray-400 bg-gray-50 cursor-not-allowed"
                      }`}
                      onClick={() =>
                        user
                          ? handleExportAnnotations("json")
                          : navigate("/login")
                      }
                    >
                      ANN (JSON)
                    </button>

                    {/* ANN (CSV) */}
                    <button
                      type="button"
                      className={`px-4 py-2 text-sm font-medium rounded focus:z-10 focus:ring-2 ${
                        user
                          ? "text-gray-900 bg-gray-100 hover:bg-gray-200 hover:text-black focus:ring-gray-500 cursor-pointer"
                          : "text-gray-400 bg-gray-50 cursor-not-allowed"
                      }`}
                      onClick={() =>
                        user
                          ? handleExportAnnotations("csv")
                          : navigate("/login")
                      }
                    >
                      ANN (CSV)
                    </button>

                    {/* Upload Modal */}
                    {showUpload && (
                      <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
                        <div className="bg-gray-50 rounded-xl shadow-lg w-full max-w-xl max-h-[80vh] overflow-hidden flex flex-col">
                          {/* Header */}
                          <div className="flex justify-between items-center p-4 border-b">
                            <h2 className="text-xl text-black font-bold">
                              Görsel Yükle
                            </h2>
                            <button
                              onClick={() => setShowUpload(false)}
                              className="text-gray-500 hover:text-gray-800"
                            >
                              <i className="bi bi-x-lg "></i>
                            </button>
                          </div>

                          {/* Content (scrollable) */}
                          <div className="flex-1 min-h-0 overflow-y-auto p-4 overscroll-contain">
                            <UploadImagesModal
                              topicId={id}
                              onClose={() => setShowUpload(false)}
                              onUploaded={fetchImages}
                            />
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Etiketleri Düzenle Butonu (admin/owner) */}
                    {(user?.role === "admin" ||
                      user?.id === topic.owner_id) && (
                      <button
                        className="px-4 py-2 text-sm font-medium text-gray-900 bg-gray-100 rounded hover:bg-gray-200 hover:text-black focus:z-10 focus:ring-2 focus:ring-gray-500 cursor-pointer"
                        onClick={() => {
                          setLabelsInput(
                            Array.isArray(topic.candidate_labels)
                              ? topic.candidate_labels.join(", ")
                              : topic.candidate_labels
                              ? JSON.parse(topic.candidate_labels).join(", ")
                              : ""
                          );
                          setShowLabelsModal(true);
                        }}
                      >
                        Etiketleri Düzenle
                      </button>
                    )}
                  </div>
                )}
              </div>

              {/* AI Sonuç Mesajları */}
              {autoLabelResult && (
                <div
                  className={`mt-2 text-sm font-semibold ${
                    autoLabelResult.success ? "text-green-600" : "text-red-600"
                  }`}
                >
                  {autoLabelResult.success
                    ? `Tüm görseller otomatik etiketlendi (${autoLabelResult.count} görsel).`
                    : `Otomatik etiketleme başarısız: ${
                        autoLabelResult.error || "Bilinmeyen hata"
                      }`}
                </div>
              )}
              {selectedLabelingResult && (
                <div className="text-sm font-semibold text-blue-600">
                  Seçili görseller: Başarılı: {selectedLabelingResult.success},
                  Hatalı: {selectedLabelingResult.fail}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Liste Sayfası (Tab Yapısı) */}
      <div className="mb-4 border-b border-gray-200 dark:border-gray-700">
        <ul
          className="flex flex-wrap -mb-px text-sm font-medium text-center"
          role="tablist"
        >
          <li className="me-2" role="presentation">
            <button
              className={`inline-block p-4 border-b-2 rounded-t-lg ${
                activeTab === "profile"
                  ? "text-purple-600 border-purple-600"
                  : "text-gray-500 border-transparent hover:text-gray-600 hover:border-gray-300 cursor-pointer"
              }`}
              type="button"
              role="tab"
              onClick={() => changeTab("profile")}
            >
              Veri Kümesi
            </button>
          </li>
          <li className="me-2" role="presentation">
            <button
              className={`inline-block p-4 border-b-2 rounded-t-lg ${
                activeTab === "dashboard"
                  ? "text-purple-600 border-purple-600"
                  : "text-gray-500 border-transparent hover:text-gray-600 hover:border-gray-300 cursor-pointer"
              }`}
              type="button"
              role="tab"
              onClick={() => changeTab("dashboard")}
            >
              Konuşmalar
            </button>
          </li>
        </ul>
      </div>

      {/* Tab İçerikleri */}
      <div>
        {/* Detaylar Tabı */}
        {activeTab === "profile" && (
          <div className="p-4 rounded-lg bg-gray-50 ">
            {/* 📄 Hakkında Başlığı */}
            <h2 className="text-2xl font-bold text-gray-800 mb-2">Hakkında</h2>
            <p className="text-sm text-gray-600 mb-4">
              {topic?.description ?? "Açıklama yok"}
            </p>
            {/* 🔥 ÇİZGİ */}
            <div className="border-t border-gray-300 mt-10"></div>

            <div className="flex items-center gap-8 mb-6 mt-5">
              {/* Toplam Görsel */}
              <div className="flex flex-col items-center">
                <div className="flex items-center gap-2">
                  <i className="bi bi-images text-2xl text-gray-600"></i>
                  <h4 className="text-md font-semibold text-gray-700">
                    Toplam Görsel
                  </h4>
                </div>
                <span className="text-3xl font-bold text-gray-900">
                  {totalImages}
                </span>
                <span className="text-xs text-gray-500">
                  {totalImages} son 30 günde yüklendi
                </span>
              </div>

              {/* Etiketlenen */}
              <div className="flex flex-col items-center border-l border-gray-300 pl-8">
                <div className="flex items-center gap-2">
                  <i className="bi bi-check-circle text-2xl text-gray-600"></i>
                  <h4 className="text-md font-semibold text-gray-700">
                    Etiketlenen
                  </h4>
                </div>
                <span className="text-3xl font-bold text-gray-900">
                  {annotatedImages}
                </span>
                <span className="text-xs text-gray-500">
                  {annotatedImages} son 30 günde etiketlendi
                </span>
              </div>

              {/* Views */}
              <div className="flex flex-col items-center border-l border-gray-300 pl-8">
                <div className="flex items-center gap-2">
                  <i className="bi bi-eye-fill text-2xl text-gray-600"></i>
                  <h4 className="text-md font-semibold text-gray-700">
                    Görünümler
                  </h4>
                </div>
                <span className="text-3xl font-bold text-gray-900">
                  {metrics.views}
                </span>
                <span className="text-xs text-gray-500">
                  Unique kullanıcı sayısı
                </span>
              </div>

              {/* Downloads */}
              <div className="flex flex-col items-center border-l border-gray-300 pl-8">
                <div className="flex items-center gap-2">
                  <i className="bi bi-download text-2xl text-gray-600"></i>
                  <h4 className="text-md font-semibold text-gray-700">
                    İndirilenler
                  </h4>
                </div>
                <span className="text-3xl font-bold text-gray-900">
                  {metrics.downloads}
                </span>
                <span className="text-xs text-gray-500">
                  Unique kullanıcı sayısı
                </span>
              </div>
            </div>

            {/* 🔥 ÇİZGİ */}
            <div className="border-t border-gray-300 mt-10"></div>

            {/* 🔎 Arama Kutusu */}
            <div className="flex items-center gap-3 mb-6 mt-10">
              <input
                type="text"
                placeholder="Görsel ara..."
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setCurrentPage(1);
                }}
                className="flex-1 border border-gray-300 rounded-full px-4 py-2 focus:ring-2 focus:ring-primary"
              />
              <button
                type="button"
                className="text-white bg-gradient-to-r from-purple-500 to-pink-500 hover:bg-gradient-to-l focus:ring-4 focus:outline-none focus:ring-purple-200 dark:focus:ring-purple-800 font-medium rounded-lg text-sm px-5 py-2.5 text-center me-2 mb-2 mt-2"
                onClick={() => {
                  const etiketsiz = images.find(
                    (img) => !img.annotation_count || img.annotation_count === 0
                  );
                  if (etiketsiz) {
                    navigate(`/annotate/${etiketsiz.id}`);
                  } else {
                    alert("Etiketsiz görsel bulunamadı!");
                  }
                }}
              >
                Etiketle
              </button>
            </div>

            {/* 🖼️ Görsel Tablosu */}
            <div
              ref={tableRef}
              className="relative shadow-md sm:rounded-lg bg-transparent"
            >
              <>
                <table className="w-full text-sm text-left text-gray-700">
                  <thead className="text-xs text-gray-700 uppercase bg-gray-100">
                    <tr>
                      <th scope="col" className="p-4">
                        <div className="flex items-center">
                          <input
                            id="checkbox-all-search"
                            type="checkbox"
                            checked={
                              pageImages.length > 0 &&
                              pageImages.every((img) =>
                                selectedImages.includes(img.id)
                              )
                            }
                            onChange={handleSelectAll}
                            className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500 focus:ring-2"
                          />
                          <label
                            htmlFor="checkbox-all-search"
                            className="sr-only"
                          >
                            checkbox
                          </label>
                        </div>
                      </th>
                      <th scope="col" className="px-6 py-3">
                        Önizleme
                      </th>
                      <th scope="col" className="px-6 py-3">
                        Dosya Adı
                      </th>
                      <th scope="col" className="px-6 py-3">
                        Yükleyen
                      </th>
                      <th scope="col" className="px-6 py-3">
                        Etiket
                      </th>
                      <th scope="col" className="px-6 py-3">
                        Tip
                      </th>
                      <th scope="col" className="px-6 py-3">
                        Etiket Kaynağı
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {pageImages.length > 0 ? (
                      pageImages.map((img) => (
                        <tr
                          key={img.id}
                          className="bg-white border-b hover:bg-gray-50 transition"
                        >
                          <td className="w-4 p-4">
                            <div className="flex items-center">
                              <input
                                id={`checkbox-table-search-${img.id}`}
                                type="checkbox"
                                checked={selectedImages.includes(img.id)}
                                onChange={() => handleSelectImage(img.id)}
                                className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500 focus:ring-2"
                              />
                              <label
                                htmlFor={`checkbox-table-search-${img.id}`}
                                className="sr-only"
                              >
                                checkbox
                              </label>
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <img
                              src={`/uploaded_images/${img.filename}`}
                              alt={img.filename}
                              className="h-12 w-12 object-cover rounded shadow"
                            />
                          </td>
                          <td className="px-6 py-4 font-medium text-gray-900 whitespace-nowrap">
                            {img.filename}
                          </td>
                          <td className="px-6 py-4">
                            {img.uploader_name || "-"}
                          </td>
                          <td className="px-6 py-4">
                            {img.annotation_count > 0 ? "Etiketli" : "-"}
                          </td>
                          <td className="px-6 py-4">{img.type || "-"}</td>
                          <td className="px-6 py-4">
                            {img.annotation_source || "-"}
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td
                          colSpan={8}
                          className="text-center py-8 text-gray-400"
                        >
                          Görsel bulunamadı.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>

                {/* Sayfalama Kontrolleri */}
                {filteredImages.length > ITEMS_PER_PAGE && (
                  <>
                    <button
                      className="float-left px-3 py-1 rounded border text-sm hover:bg-gray-100 disabled:opacity-50 mt-3"
                      onClick={() => handlePageChange(currentPage - 1)}
                      disabled={currentPage === 1}
                    >
                      ‹ Önceki
                    </button>

                    <button
                      className="float-right px-3 py-1 rounded border text-sm hover:bg-gray-100 disabled:opacity-50 mt-3"
                      onClick={() => handlePageChange(currentPage + 1)}
                      disabled={currentPage === totalPages}
                    >
                      Sonraki ›
                    </button>
                  </>
                )}
              </>
            </div>
          </div>
        )}

        {/* Konuşmalar Tabı */}
        {activeTab === "dashboard" && (
          <div className="p-4 rounded-lg bg-gray-50">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-2xl font-semibold">konuşmalar</h3>
              <button
                onClick={() => {
                  if (!user) return navigate("/login");
                  setThreadStatus(null);
                  setNewTopicThreadTitle("");
                  setNewTopicThreadContent("");
                  setShowNewTopicThreadModal(true);
                }}
                className={`border border-gray-400 px-3 py-1 rounded-full text-sm ${
                  user
                    ? "hover:bg-black hover:text-white duration-200 cursor-pointer"
                    : "opacity-50 cursor-pointer"
                }`}
                disabled={!user}
                title={!user ? "Konuşma başlatmak için giriş yapın" : undefined}
              >
                + Yeni Konuşma
              </button>
            </div>

            <div className="divide-y border border-gray-300 rounded-lg bg-gray-50">
              {topicThreads.map((t) => (
                <div
                  key={t.id}
                  className="relative overflow-hidden p-5 flex items-center gap-3"
                >
                  {/* ALTA TEK DESEN (SVG) */}
                  <svg
                    className="pointer-events-none select-none absolute bottom-0 left-0 w-full h-5"
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

                  {/* === /blob === */}

                  <img
                    src={t.author_avatar_url || "/placeholder-avatar.png"}
                    alt="avatar"
                    className="w-12 h-12 rounded-full border relative z-10"
                  />
                  <div className="flex-1 relative z-10">
                    <div className="font-medium">{t.title}</div>
                    <div className="text-xs text-gray-500">
                      {t.author_email || "Anonim"} •{" "}
                      {new Date(t.created_at).toLocaleString()}
                    </div>
                  </div>
                  <button
                    className="relative z-10 text-blue-400 text-sm hover:text-blue-500 cursor-pointer"
                    onClick={() => navigate(`/discussions/thread/${t.id}`)}
                  >
                    Görüntüle
                  </button>
                </div>
              ))}
              {topicThreads.length === 0 && (
                <div className="p-4 text-gray-500 text-sm">
                  Henüz konuşma yok.
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {showNewTopicThreadModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80">
          {/* modal kutusu */}
          <div className="bg-white rounded-lg shadow-lg w-full max-w-lg p-4 relative overflow-hidden">
            {/* ALTA TEK DESEN (SVG) */}
            <svg
              className="pointer-events-none select-none absolute bottom-0 left-0 w-full h-15"
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

            <div className="relative z-10">
              <div className="flex items-center justify-between mb-2">
                <h3 className="font-extrabold text-lg">Yeni Konuşma</h3>
                <button
                  className="text-gray-500 hover:text-black"
                  onClick={() => setShowNewTopicThreadModal(false)}
                >
                  ×
                </button>
              </div>

              {threadStatus && (
                <div
                  className={`mb-2 text-sm ${
                    threadStatus.type === "success"
                      ? "text-green-700"
                      : "text-red-700"
                  }`}
                >
                  {threadStatus.text}
                </div>
              )}

              <form
                onSubmit={async (e) => {
                  e.preventDefault();
                  if (!user) return navigate("/login");
                  setThreadStatus(null);
                  try {
                    await api.post("/discussions/threads", {
                      forum_id: topic?.forum_id || 1,
                      topic_id: Number(id),
                      title: newTopicThreadTitle,
                      content: newTopicThreadContent,
                    });
                    setThreadStatus({
                      type: "success",
                      text: "Konu oluşturuldu",
                    });
                    await fetchTopicThreads();
                    setShowNewTopicThreadModal(false);
                  } catch (err) {
                    setThreadStatus({
                      type: "error",
                      text: err.response?.data?.detail || "Konu oluşturulamadı",
                    });
                  }
                }}
              >
                <input
                  type="text"
                  placeholder="Başlık"
                  value={newTopicThreadTitle}
                  onChange={(e) => setNewTopicThreadTitle(e.target.value)}
                  required
                  className="border border-gray-400 rounded-xl w-full p-2 mb-2"
                />

                <textarea
                  placeholder="İçerik"
                  value={newTopicThreadContent}
                  onChange={(e) => setNewTopicThreadContent(e.target.value)}
                  required
                  className="border border-gray-400 rounded-xl w-full p-2 h-28"
                />

                <div className="mt-3 flex gap-2 justify-end">
                  <button
                    type="button"
                    className="px-3 py-1 cursor-pointer border bg-white border-gray-500 hover:border-gray-400 duration-200 rounded-full"
                    onClick={() => setShowNewTopicThreadModal(false)}
                  >
                    Kapat
                  </button>
                  <button
                    type="submit"
                    className="px-3 py-1 bg-black hover:bg-gray-900 hover:text-white duration-100 cursor-pointer text-white rounded-full"
                  >
                    Oluştur
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TopicDetail;

function UploadImagesModal({ topicId, onClose, onUploaded }) {
  const [files, setFiles] = React.useState([]);
  const [progress, setProgress] = React.useState([]); // [{percent, status}]
  const [uploading, setUploading] = React.useState(false);
  const [error, setError] = React.useState("");
  const [success, setSuccess] = React.useState(false);
  const [uploadResults, setUploadResults] = React.useState(null); // <-- new

  const handleFilesChange = (e) => {
    setFiles(Array.from(e.target.files));
    setProgress([]);
    setError("");
    setSuccess(false);
    setUploadResults(null); // <-- reset
  };

  const handleUpload = async (e) => {
    e.preventDefault();
    if (!files.length) {
      setError("Lütfen en az bir dosya seçin.");
      return;
    }
    setUploading(true);
    setError("");
    setSuccess(false);
    setProgress(files.map(() => ({ percent: 0, status: "Bekliyor" })));
    setUploadResults(null);
    const formData = new FormData();
    files.forEach((f) => formData.append("files", f));
    try {
      const res = await api.post(`/images/${topicId}/upload`, formData, {
        headers: { "Content-Type": "multipart/form-data" },
        onUploadProgress: (event) => {
          if (event.lengthComputable) {
            const percent = Math.round((event.loaded / event.total) * 100);
            setProgress((p) => p.map((pr, i) => ({ ...pr, percent })));
          }
        },
      });
      setUploading(false);
      setProgress((p) =>
        p.map((pr) => ({ ...pr, percent: 100, status: "Tamamlandı" }))
      );
      setSuccess(true);
      setUploadResults(res.data.results || []); // <-- store results
      onUploaded && onUploaded();
    } catch (err) {
      setUploading(false);
      setError(
        "Yükleme başarısız: " + (err.response?.data?.detail || err.message)
      );
    }
  };

  return (
    <form onSubmit={handleUpload} className="flex flex-col gap-6">
      <label className="flex flex-col items-center justify-center border-2 border-dashed border-primary/40 rounded-xl p-6 cursor-pointer hover:bg-primary/5 transition">
        <i className="bi bi-images text-4xl text-gray-400 mb-2"></i>
        <span className="font-semibold text-gray-700 mb-1">
          Görsel(ler) Seç
        </span>
        <span className="text-gray-500 text-sm mb-2">
          Bir veya birden fazla görsel seçebilirsiniz
        </span>
        <input
          type="file"
          name="files"
          accept="image/*"
          multiple
          disabled={uploading}
          onChange={handleFilesChange}
          className="hidden"
        />
      </label>
      {files.length > 0 && (
        <div className="space-y-2">
          {files.map((f, i) => (
            <div key={i} className="flex items-center gap-2">
              <i className="bi bi-file-earmark-image text-primary"></i>
              <span className="truncate max-w-xs">{f.name}</span>
              <div className="flex-1 bg-gray-200 rounded h-2 mx-2">
                <div
                  className="bg-primary h-2 rounded"
                  style={{ width: `${progress[i]?.percent || 0}%` }}
                />
              </div>
              <span className="text-xs text-gray-500 w-16">
                {progress[i]?.status || "Bekliyor"}
              </span>
            </div>
          ))}
          <div className="text-xs text-right text-gray-500 mt-1">
            Genel: %
            {Math.round(
              progress.reduce((a, b) => a + (b.percent || 0), 0) /
                files.length || 0
            )}
          </div>
        </div>
      )}
      {error && (
        <div className="text-red-600 text-sm flex items-center gap-2">
          <i className="bi bi-x-circle"></i> {error}
        </div>
      )}
      {success && uploadResults && (
        <div className="text-green-700 text-sm mt-2">
          <div className="font-bold mb-1 flex items-center gap-2">
            <i className="bi bi-check-circle"></i> Yükleme Sonuçları:
          </div>
          <table className="w-full text-xs border mt-1">
            <thead>
              <tr className="bg-primary/10">
                <th className="p-1">Dosya</th>
                <th className="p-1">AI Skoru</th>
                <th className="p-1">Kazandığı Puan</th>
                <th className="p-1">Durum</th>
                <th className="p-1">Otomatik Etiket</th>
              </tr>
            </thead>
            <tbody>
              {uploadResults.map((r, i) => (
                <tr key={i}>
                  <td className="p-1">{r.filename}</td>
                  <td className="p-1">
                    {typeof r.ai_score === "number"
                      ? r.ai_score.toFixed(2)
                      : "-"}
                  </td>
                  <td className="p-1">{r.points_awarded}</td>
                  <td className="p-1">
                    {r.status === "approved"
                      ? "Onaylandı"
                      : r.status === "pending"
                      ? "Onay Bekliyor"
                      : r.status}
                  </td>
                  <td className="p-1">{r.auto_label || "-"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <button
        type="submit"
        className="bg-black text-white px-6 py-3 rounded-full font-bold text-lg hover:bg-gray-900 transition disabled:opacity-10"
        disabled={uploading || !files.length}
      >
        {uploading ? (
          <span className="flex items-center gap-2">
            <i className="bi bi-arrow-repeat animate-spin"></i> Yükleniyor...
          </span>
        ) : (
          <span className="flex items-center gap-2">
            <i className="bi bi-upload"></i> Yükle
          </span>
        )}
      </button>
    </form>
  );
}
