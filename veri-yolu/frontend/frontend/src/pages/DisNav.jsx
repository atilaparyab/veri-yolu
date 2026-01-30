import React, { useEffect, useState, useContext } from "react";
import api from "../api/api";
import stickmanImage from "../assets/konuşma.png";
import { useNavigate } from "react-router-dom";
import { AuthContext } from "../context/AuthContext";

const DisNav = () => {
  const { user } = useContext(AuthContext);
  const navigate = useNavigate();
  const [forums, setForums] = useState([]);
  const [search, setSearch] = useState("");
  const [showNewThread, setShowNewThread] = useState(false);
  const [newThreadForumId, setNewThreadForumId] = useState("");
  const [newThreadTitle, setNewThreadTitle] = useState("");
  const [newThreadContent, setNewThreadContent] = useState("");
  const [status, setStatus] = useState(null);

  // --- Sayfalama için state ---
  const [currentPage, setCurrentPage] = useState(1);
  const PAGE_SIZE = 5; // Kaç forum bir sayfada görünsün?

  useEffect(() => {
    const loadForums = async () => {
      try {
        const res = await api.get("/discussions/forums");
        setForums(res.data || []);
      } catch (err) {
        // optional: surface error
      }
    };
    loadForums();
  }, []);

  const filteredForums = forums.filter((f) => {
    const s = search.toLowerCase();
    return (
      f.name?.toLowerCase().includes(s) ||
      f.description?.toLowerCase().includes(s)
    );
  });

  // --- Sayfalama hesaplama ---
  const totalPages = Math.ceil(filteredForums.length / PAGE_SIZE);
  const start = (currentPage - 1) * PAGE_SIZE;
  const paginatedForums = filteredForums.slice(start, start + PAGE_SIZE);

  const goPrev = () => setCurrentPage((p) => Math.max(1, p - 1));
  const goNext = () => setCurrentPage((p) => Math.min(totalPages, p + 1));

  const toggleNewThread = () => {
    if (!user) {
      navigate("/login");
      return;
    }
    setShowNewThread((v) => !v);
    setStatus(null);
  };

  const submitNewThread = async (e) => {
    e.preventDefault();
    setStatus(null);
    try {
      await api.post("/discussions/threads", {
        forum_id: Number(newThreadForumId),
        title: newThreadTitle,
        content: newThreadContent,
      });
      setStatus({ type: "success", text: "Konu başarıyla oluşturuldu." });
      setNewThreadTitle("");
      setNewThreadContent("");
    } catch (err) {
      setStatus({
        type: "error",
        text: err.response?.data?.detail || "Konu oluşturulamadı.",
      });
    }
  };

  const blobColors = ["text-purple-400", "text-blue-400", "text-pink-400"];
  const blobShapes = [
    "M44.8,-60.2C59.7,-52.8,75.7,-43.3,80.3,-29.6C85,-15.9,78.3,2,69.1,15.3C60,28.6,48.3,37.2,36.1,49.7C23.9,62.2,12,78.6,-2.3,81.9C-16.5,85.1,-33,75.3,-46.5,62.5C-60,49.7,-70.6,34,-75.3,16.1C-80,-1.8,-78.7,-21.9,-67.6,-34.9C-56.5,-47.8,-35.6,-53.5,-17.6,-60.6C0.4,-67.7,15.6,-76.1,29.9,-74.9C44.1,-73.7,59.7,-61.5,44.8,-60.2Z",
    "M39.3,-55.5C50.8,-45.4,59.8,-33.2,66.4,-18.5C73.1,-3.8,77.4,13.3,71.8,26.1C66.2,38.9,50.8,47.4,37.4,57.4C24.1,67.5,12,79,-3.5,83.8C-19,88.7,-38,87,-52.8,76.1C-67.6,65.2,-78.2,45.1,-81.8,24.3C-85.4,3.5,-81.9,-18,-70.6,-33.4C-59.3,-48.8,-40.1,-58.1,-21.5,-64.2C-2.9,-70.4,14.8,-73.4,29.5,-68.4C44.1,-63.5,55.8,-50.5,39.3,-55.5Z",
    "M47.8,-65.4C60.4,-54.7,68.9,-40.1,75.7,-23.9C82.5,-7.6,87.6,10.2,82.3,23.5C77,36.8,61.3,45.6,46.8,54.5C32.3,63.4,19.2,72.4,4.3,76.6C-10.5,80.8,-21,80.1,-34.5,73.4C-48.1,66.7,-64.7,54.1,-74.3,37.1C-83.9,20.1,-86.5,-1.3,-80.4,-20.1C-74.3,-38.8,-59.6,-55,-43,-65.6C-26.4,-76.3,-8.1,-81.3,7.7,-85.2C23.6,-89.1,47.1,-92.1,47.8,-65.4Z",
  ];

  return (
    <div className="max-w-7xl mx-auto py-8 px-4">
      {/* Arama Kutusu */}
      <div className="flex justify-between items-center mb-8 w-full max-w-7x1 mx-auto">
        <form className="flex items-center w-full max-w-7xl border border-gray-300 rounded-full px-4 py-2 ">
          <i className="bi bi-search text-gray-400 mr-2"></i>
          <input
            type="text"
            placeholder="Ara..."
            className="w-full outline-none"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setCurrentPage(1); // aramada sayfa başa dönsün
            }}
          />
        </form>
      </div>

      {/* Başlık + Görsel */}
      <div className="flex flex-col md:flex-row justify-between items-center">
        <div className="flex flex-col mt-3">
          <h1 className="text-3xl font-extrabold mb-2 text-black">
            Konuşmalar
          </h1>
          <p className="text-gray-600 text-base mb-4">
            VeriYolu platformunda veri kümeleri, makine öğrenimi ve diğer
            konular hakkında konuşun.
          </p>
          <button
            onClick={toggleNewThread}
            className=" text-black border border-black font-semibold px-6 py-2 rounded-full hover:bg-black hover:text-white transition duration-200 ease mb-4 cursor-pointer w-fit"
          >
            + Yeni Konuşma
          </button>
        </div>
        <div className=" flex-shrink-0">
          <img
            src={stickmanImage}
            alt="Konuşmalar"
            className="w-40 sm:w-52 md:w-60 lg:w-62"
          />
        </div>
      </div>

      {/* Forumlar */}
      <h2 className="text-xl font-bold flex items-center gap-2 mb-4">
        <i className="bi bi-chat-dots"></i> Forumlar
      </h2>

      <div className="divide-y border border-gray-400 rounded-lg shadow">
        {paginatedForums.map((f, i) => (
          <div
            key={f.id}
            className="relative p-4 flex justify-between items-center hover:bg-gray-100 transition cursor-pointer overflow-hidden"
            onClick={() => navigate(`/discussions/forums/${f.id}`)}
          >
            {/* Bloblar */}
            <svg
              className={`absolute top-2 left-6 w-12 h-12 ${
                blobColors[i % blobColors.length]
              } opacity-40`}
              viewBox="0 0 200 200"
            >
              <path
                fill="currentColor"
                d={blobShapes[i % blobShapes.length]}
                transform="translate(100 100)"
              />
            </svg>
            {/* İçerik + avatarlar */}
            <div className="relative z-0 w-full flex items-center justify-between">
              <div className="min-w-0">
                <h3 className="text-lg font-semibold truncate">{f.name}</h3>
                {f.description && (
                  <p className="text-gray-600 text-sm truncate">
                    {f.description}
                  </p>
                )}
              </div>

              {/* Avatar grubu (kartın en sağında, z-index düşük) */}
              <div className="flex -space-x-2 z-0">
                {f.participant_avatars?.slice(0, 3).map((url, idx) => (
                  <img
                    key={idx}
                    src={url || "/placeholder-avatar.png"}
                    alt="avatar"
                    className="w-8 h-8 rounded-full border border-white"
                  />
                ))}
              </div>
            </div>
          </div>
        ))}

        {filteredForums.length === 0 && (
          <div className="p-4 text-gray-500 text-sm">Forum bulunamadı.</div>
        )}
      </div>
      {/* Sayfalama Kontrolü */}
      {filteredForums.length > 0 && (
        <div className="flex items-center justify-between mt-4">
          <span className="text-sm text-gray-600">
            {start + 1}-{Math.min(start + PAGE_SIZE, filteredForums.length)} /{" "}
            {filteredForums.length}
          </span>
          <div className="flex gap-2">
            <button
              onClick={goPrev}
              disabled={currentPage === 1}
              className={`px-3 py-1 rounded-full border ${
                currentPage === 1
                  ? "opacity-50 cursor-not-allowed"
                  : "hover:bg-gray-50"
              }`}
            >
              Önceki
            </button>
            <span className="text-sm px-2 py-1">
              Sayfa {currentPage} / {totalPages}
            </span>
            <button
              onClick={goNext}
              disabled={currentPage === totalPages}
              className={`px-3 py-1 rounded-full border ${
                currentPage === totalPages
                  ? "opacity-50 cursor-not-allowed"
                  : "hover:bg-gray-50"
              }`}
            >
              Sonraki
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default DisNav;
