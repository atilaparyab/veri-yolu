import React, { useEffect, useState, useContext } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import api from "../api/api";
import { AuthContext } from "../context/AuthContext";
import { FiSearch, FiTrash } from "react-icons/fi";

const ForumDetail = () => {
  const { forumId } = useParams();
  const { user } = useContext(AuthContext);
  const navigate = useNavigate();

  const [forum, setForum] = useState(null);
  const [threads, setThreads] = useState([]);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState(null);
  const [showNewThread, setShowNewThread] = useState(false);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");

  // ===== Fallback avatar yardımcıları =====
  const initialFromEmail = (email) => {
    if (!email || typeof email !== "string") return "A";
    const c = email.trim()[0];
    return c ? c.toUpperCase() : "A";
  };
  const colorFromString = (s) => {
    const str = String(s || "anon");
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      hash = str.charCodeAt(i) + ((hash << 5) - hash);
    }
    const h = Math.abs(hash) % 360;
    return `hsl(${h}, 65%, 60%)`;
  };

  useEffect(() => {
    const load = async () => {
      try {
        const [fRes, tRes] = await Promise.all([
          api.get(`/discussions/forums/${forumId}`),
          api.get(`/discussions/forums/${forumId}/threads`),
        ]);
        setForum(fRes.data);
        setThreads(tRes.data || []);
      } catch (err) {
        setStatus({ type: "error", text: "Forum yüklenemedi." });
      }
    };
    load();
  }, [forumId]);

  const createThread = async (e) => {
    e.preventDefault();
    if (!user) return navigate("/login");
    try {
      await api.post("/discussions/threads", {
        forum_id: Number(forumId),
        title,
        content,
      });
      setTitle("");
      setContent("");
      setShowNewThread(false);
      const tRes = await api.get(`/discussions/forums/${forumId}/threads`);
      setThreads(tRes.data || []);
      setStatus({ type: "success", text: "Konu oluşturuldu." });
    } catch (err) {
      setStatus({ type: "error", text: "Konu oluşturulamadı." });
    }
  };

  // 🔹 Kullanıcı bu thread’in sahibi mi?
  const isOwner = (thr) => {
    if (!user) return false;
    const thrOwnerId =
      thr.author_id ?? thr.user_id ?? thr.created_by ?? thr.author?.id ?? null;
    return thrOwnerId && String(thrOwnerId) === String(user?.id);
  };

  // 🔹 Silme işlemi
  const deleteThread = async (e, thrId) => {
    // kart linkine tıklamayı durdur
    e.preventDefault();
    e.stopPropagation();

    const ok = window.confirm("Bu konuşmayı silmek istediğinize emin misiniz?");
    if (!ok) return;

    try {
      // optimistic: önce ekrandan düşür
      setThreads((prev) => prev.filter((t) => t.id !== thrId));

      await api.delete(`/discussions/threads/${thrId}`);
      setStatus({ type: "success", text: "Konu silindi." });
      // garanti için tekrar çekmek istersen:
      // const tRes = await api.get(`/discussions/forums/${forumId}/threads`);
      // setThreads(tRes.data || []);
    } catch (err) {
      setStatus({ type: "error", text: "Konu silinemedi." });
      // hata olduysa eski listeyi geri yükle
      const tRes = await api.get(`/discussions/forums/${forumId}/threads`);
      setThreads(tRes.data || []);
    }
  };

  const filtered = threads.filter((t) =>
    (t.title || "").toLowerCase().includes(search.toLowerCase())
  );

  const blobColors = [
    "text-purple-400",
    "text-blue-400",
    "text-pink-400",
    "text-green-400",
    "text-orange-400",
  ];

  return (
    <div className="max-w-7xl mx-auto py-8">
      <style>{`
      footer { display: none; }
    `}</style>
      {status && (
        <div
          className={`mb-4 text-sm rounded-lg p-3 ${
            status.type === "success"
              ? "bg-green-100 text-green-800"
              : "bg-red-100 text-red-800"
          }`}
        >
          {status.text}
        </div>
      )}

      {forum && (
        <div className="mb-4 flex items-start justify-between">
          <div>
            <h1 className="text-3xl font-extrabold text-black">{forum.name}</h1>
            {forum.description && (
              <p className="text-gray-600">{forum.description}</p>
            )}
          </div>
          <button
            onClick={() =>
              user ? setShowNewThread((v) => !v) : navigate("/login")
            }
            className="border border-black px-4 py-2 rounded-full text-black font-semibold hover:bg-black hover:text-white transition duration-200 ease w-fit cursor-pointer"
          >
            + Yeni Konuşma
          </button>
        </div>
      )}

      <div className="mb-4 relative">
        <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Başlıkta ara"
          className="border border-gray-300 rounded-full pl-10 pr-4 py-2 w-full"
        />
      </div>

      {showNewThread && (
        <div className="mb-6 border border-gray-400 rounded-lg p-4 shadow">
          <form onSubmit={createThread} className="grid gap-3">
            <input
              type="text"
              placeholder="Başlık"
              className="border border-gray-300 rounded-lg p-2"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
            />
            <textarea
              placeholder="İçerik"
              className="border border-gray-300 rounded-lg p-2 h-28"
              value={content}
              onChange={(e) => setContent(e.target.value)}
              required
            />
            <div className="flex gap-2">
              <button
                type="submit"
                className="px-4 py-2 bg-black text-white rounded-full hover:bg-gray-900 cursor-pointer"
              >
                Oluştur
              </button>
              <button
                type="button"
                onClick={() => setShowNewThread(false)}
                className="px-4 py-2 border border-gray-400 rounded-full hover:border-gray-300 cursor-pointer"
              >
                İptal
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="relative divide-y border border-gray-300 rounded-lg bg-gray-50 overflow-hidden">
        {filtered.map((thr, i) => (
          <Link
            to={`/discussions/thread/${thr.id}`}
            key={thr.id}
            className="relative p-5 hover:bg-gray-100 block"
          >
            {/* Blob */}
            <svg
              className={`absolute top-1/2 right-4 w-16 h-16 ${
                blobColors[i % blobColors.length]
              } opacity-40 transform -translate-y-1/2`}
              viewBox="0 0 200 200"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                fill="currentColor"
                d="M44.8,-60.2C59.7,-52.8,75.7,-43.3,80.3,-29.6C85,-15.9,78.3,2,69.1,15.3C60,28.6,48.3,37.2,36.1,49.7C23.9,62.2,12,78.6,-2.3,81.9C-16.5,85.1,-33,75.3,-46.5,62.5C-60,49.7,-70.6,34,-75.3,16.1C-80,-1.8,-78.7,-21.9,-67.6,-34.9C-56.5,-47.8,-35.6,-53.5,-17.6,-60.6C0.4,-67.7,15.6,-76.1,29.9,-74.9C44.1,-73.7,59.7,-61.5,44.8,-60.2Z"
                transform="translate(100 100)"
              />
            </svg>

            <div className="flex items-start gap-3 relative z-10">
              {/* Avatar (varsa resim, yoksa renkli ilk harf) */}
              {thr.author_avatar_url ? (
                <img
                  src={thr.author_avatar_url}
                  alt={thr.author_email || "avatar"}
                  className="w-12 h-12 rounded-full border cursor-pointer object-cover"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    const authorId =
                      thr.author_id ??
                      thr.user_id ??
                      thr.created_by ??
                      thr.author?.id ??
                      null;
                    if (authorId) {
                      navigate(`/profile/${authorId}`, {
                        state: {
                          prefillUser: {
                            id: authorId,
                            email:
                              thr.author_email ?? thr.author?.email ?? null,
                            profile_image_url: thr.author_avatar_url ?? null,
                            role: thr.author_role ?? thr.author?.role ?? null,
                          },
                        },
                      });
                    }
                  }}
                />
              ) : (
                <div
                  title={thr.author_email || "Anonim"}
                  className="w-12 h-12 rounded-full border cursor-pointer grid place-items-center text-white text-base font-semibold uppercase"
                  style={{
                    backgroundColor: colorFromString(
                      thr.author_email ||
                        (thr.author_id ??
                          thr.user_id ??
                          thr.created_by ??
                          thr.author?.id ??
                          "anon")
                    ),
                  }}
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    const authorId =
                      thr.author_id ??
                      thr.user_id ??
                      thr.created_by ??
                      thr.author?.id ??
                      null;
                    if (authorId) {
                      navigate(`/profile/${authorId}`, {
                        state: {
                          prefillUser: {
                            id: authorId,
                            email:
                              thr.author_email ?? thr.author?.email ?? null,
                            profile_image_url: null,
                            role: thr.author_role ?? thr.author?.role ?? null,
                          },
                        },
                      });
                    }
                  }}
                >
                  {initialFromEmail(thr.author_email)}
                </div>
              )}

              <div className="flex-1">
                <div className="font-semibold">{thr.title}</div>
                <div className="text-xs text-gray-500">
                  {thr.author_email || "Anonim"} •{" "}
                  {thr.created_at
                    ? new Date(thr.created_at).toLocaleString()
                    : ""}
                </div>
              </div>

              {/* 🔹 SADECE SAHİBİNE GÖRÜNEN SİL BUTONU */}
              {isOwner(thr) && (
                <button
                  className="absolute right-3 top-1/2 -translate-y-1/2 p-2 text-black hover:text-gray-400 cursor-pointer flex items-center justify-center"
                  onClick={(e) => deleteThread(e, thr.id)}
                  title="Konuyu sil"
                >
                  <FiTrash size={14} />
                </button>
              )}
            </div>
          </Link>
        ))}

        {filtered.length === 0 && (
          <div className="p-4 text-gray-500 text-sm relative z-10">
            Konu yok.
          </div>
        )}
      </div>

      {!user && (
        <div className="mt-4 text-sm text-gray-600">
          Yeni konu açmak için giriş yapın.
          <button
            onClick={() => navigate("/login")}
            className="ml-2 underline text-blue-600"
          >
            Giriş Yap
          </button>
        </div>
      )}
    </div>
  );
};

export default ForumDetail;
