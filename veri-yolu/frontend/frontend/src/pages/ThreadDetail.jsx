import React, { useEffect, useState, useContext, useMemo, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import api from "../api/api";
import { AuthContext } from "../context/AuthContext";

const ThreadDetail = () => {
  const { threadId } = useParams();
  const { user } = useContext(AuthContext);
  const navigate = useNavigate();

  const [posts, setPosts] = useState([]);
  const [content, setContent] = useState("");
  const [status, setStatus] = useState(null);
  const [visibleCount, setVisibleCount] = useState(3);
  const [replyTo, setReplyTo] = useState(null); // { id, author_email } | null

  // Hangi postun yanıtları açık? { [postId]: boolean }
  const [openMap, setOpenMap] = useState({});

  // --- İMLEÇ / DRAFT ÇÖZÜMÜ ---
  const [replyDrafts, setReplyDrafts] = useState({}); // { [postId]: "draft text" }
  const replyRefs = useRef({}); // { [postId]: HTMLTextAreaElement }

  // ====== Fallback avatar yardımcıları ======
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

  const handleReplyChange = (postId) => (e) => {
    const el = e.target;
    const start = el.selectionStart;
    const end = el.selectionEnd;
    const next = el.value;

    // Per-post draft + mevcut yapıya uyumlu olması için global content'i de güncelle
    setReplyDrafts((d) => ({ ...d, [postId]: next }));
    setContent(next);

    // Caret'i koru
    requestAnimationFrame(() => {
      const ref = replyRefs.current[postId];
      if (ref && document.activeElement === ref) {
        try {
          ref.setSelectionRange(start, end);
        } catch {}
      }
    });
  };

  const clearReplyDraft = (postId) => {
    setReplyDrafts((d) => {
      const { [postId]: _, ...rest } = d;
      return rest;
    });
  };

  useEffect(() => {
    // Bir posta yanıtlamaya tıklayınca, varsa o postun draft'ını inputa yükle
    if (replyTo?.id) {
      setContent(replyDrafts[replyTo.id] ?? "");
    }
  }, [replyTo, replyDrafts]);

  const load = async () => {
    try {
      const res = await api.get(`/discussions/threads/${threadId}/posts`);
      setPosts(res.data || []);
    } catch (err) {
      console.error("Postlar yüklenemedi:", err);
      setStatus({ type: "error", text: "Gönderiler yüklenemedi." });
    }
  };

  useEffect(() => {
    load();
  }, [threadId]);

  // Düz listeden ağaç yapısı kur
  const tree = useMemo(() => {
    const byId = new Map();
    const roots = [];
    const sorted = [...(posts || [])].sort(
      (a, b) => new Date(a.created_at) - new Date(b.created_at)
    );
    sorted.forEach((p) => byId.set(p.id, { ...p, children: [] }));
    byId.forEach((node) => {
      if (node.parent_id && byId.has(node.parent_id)) {
        byId.get(node.parent_id).children.push(node);
      } else {
        roots.push(node);
      }
    });
    return roots;
  }, [posts]);

  const submitPost = async (e) => {
    e.preventDefault();
    if (!user) return navigate("/login");
    if (!content.trim()) return;

    setStatus(null);
    try {
      await api.post("/discussions/posts", {
        thread_id: Number(threadId),
        content,
        parent_id: replyTo?.id ?? null,
      });
      // Gönderince temizle
      if (replyTo?.id) {
        clearReplyDraft(replyTo.id);
      }
      setContent("");
      // Yanıt yazdıysak, ilgili parent'ın yanıtları açık kalsın
      if (replyTo?.id) {
        setOpenMap((m) => ({ ...m, [replyTo.id]: true }));
      }
      setReplyTo(null);
      await load();
    } catch (err) {
      console.error("Gönderi eklenemedi:", err);
      setStatus({
        type: "error",
        text: err.response?.data?.detail || "Gönderi eklenemedi.",
      });
    }
  };

  const toggleLike = async (postId) => {
    if (!user) return navigate("/login");
    try {
      await api.post("/discussions/posts/vote", { post_id: postId });
      await load();
    } catch (err) {
      console.error("Beğeni hatası:", err);
      setStatus({
        type: "error",
        text: err.response?.data?.detail || "İşlem başarısız.",
      });
    }
  };

  const blockPost = async (postId) => {
    if (!user) return navigate("/login");
    try {
      await api.post("/discussions/posts/block", { post_id: postId });
      setStatus({ type: "success", text: "Gönderi engellendi." });
      await load();
    } catch (err) {
      console.error("Engelleme hatası:", err);
      setStatus({
        type: "error",
        text: err.response?.data?.detail || "Engelleme başarısız.",
      });
    }
  };

  useEffect(() => {
    setVisibleCount(Math.min(3, tree.length || 0));
  }, [tree]);

  const openRepliesFor = (postId) => {
    setOpenMap((m) => ({ ...m, [postId]: true }));
  };

  // ✅ Yorum (chat) ikonuna basınca yanıtları aç/kapa
  const toggleReplies = (postId) => {
    setOpenMap((m) => {
      const nextOpen = !m[postId];
      const next = { ...m, [postId]: nextOpen };
      // Kapatırken o post için açık bir inline form varsa kapat
      if (!nextOpen && replyTo?.id === postId) {
        setReplyTo(null);
      }
      return next;
    });
  };

  // Tek bir postu (ve çocuklarını) çizen yardımcı bileşen
  const PostItem = ({ p, depth = 0 }) => {
    const authorId =
      p.author_id ?? p.user_id ?? p.created_by ?? p.author?.id ?? null;

    const childCount = p.children?.length || 0;
    const isOpen = !!openMap[p.id] || replyTo?.id === p.id;

    // Fallback avatar verileri
    const baseForColor = p.author_email || authorId || "anon";
    const fallbackBg = colorFromString(baseForColor);
    const fallbackInitial = initialFromEmail(p.author_email);

    return (
      <div
        className="relative overflow-hidden p-3 border border-gray-300 rounded-lg shadow-sm"
        style={{ marginLeft: depth * 16 }}
      >
        <style>{`
      footer { display: none; }
    `}</style>
        <div className="z-10">
          <div className="flex items-center gap-3 mb-2">
            {p.author_avatar_url ? (
              <img
                src={p.author_avatar_url}
                alt={p.author_email || "avatar"}
                className="w-8 h-8 rounded-full border cursor-pointer object-cover"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  if (authorId) {
                    navigate(`/profile/${authorId}`, {
                      state: {
                        prefillUser: {
                          id: authorId,
                          email: p.author_email ?? p.author?.email ?? null,
                          profile_image_url: p.author_avatar_url ?? null,
                          role: p.author_role ?? p.author?.role ?? null,
                        },
                      },
                    });
                  }
                }}
              />
            ) : (
              <div
                title={p.author_email || "Anonim"}
                className="w-8 h-8 rounded-full border cursor-pointer grid place-items-center text-white text-xs font-semibold uppercase"
                style={{ backgroundColor: fallbackBg }}
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  if (authorId) {
                    navigate(`/profile/${authorId}`, {
                      state: {
                        prefillUser: {
                          id: authorId,
                          email: p.author_email ?? p.author?.email ?? null,
                          profile_image_url: null,
                          role: p.author_role ?? p.author?.role ?? null,
                        },
                      },
                    });
                  }
                }}
              >
                {fallbackInitial}
              </div>
            )}

            <div className="text-sm text-gray-700">
              {p.author_email || "Anonim"}
            </div>
            <div className="text-xs text-gray-400">
              {new Date(p.created_at).toLocaleString()}
            </div>
          </div>

          <div className="mb-3 whitespace-pre-wrap">{p.content}</div>

          {/* Aksiyon ikonları – iki grup: solda (beğen/yanıtlar/yanıtla), sağda (engelle/sil) */}
          <div className="flex items-center justify-between text-gray-500">
            {/* Sol grup: ❤️ + 💬 (yanıtları aç/kapa) + Yanıtla */}
            <div className="flex items-center gap-4">
              {/* ❤️ Beğen */}
              <button
                type="button"
                onClick={() => toggleLike(p.id)}
                disabled={!user}
                title={!user ? "Beğenmek için giriş yapın" : "Beğen"}
                className="flex items-center mt-0.5 gap-1 hover:text-red-600 disabled:text-gray-300"
              >
                <i
                  className={`bi ${
                    p.user_liked ? "bi-heart-fill text-red-600" : "bi-heart"
                  } text-lg`}
                ></i>
                {p.score > 0 && <span className="text-xs">{p.score}</span>}
              </button>

              {/* 💬 Yorumlar: aç/kapa */}
              <button
                type="button"
                onClick={() => toggleReplies(p.id)}
                className="flex items-center gap-1 hover:text-blue-500"
                title={openMap[p.id] ? "Yanıtları gizle" : "Yanıtları göster"}
              >
                <i className="bi bi-chat text-lg"></i>
                {childCount > 0 && (
                  <span className="text-xs text-gray-600">{childCount}</span>
                )}
              </button>

              {/* ✍️ Yanıtla: inline formu aç */}
              <button
                type="button"
                onClick={() => {
                  setReplyTo({
                    id: p.id,
                    author_email: p.author_email || "kullanıcı",
                  });
                  setContent(replyDrafts[p.id] ?? "");
                  openRepliesFor(p.id);
                }}
                className="text-sm hover:text-black"
                title="Yanıt yaz"
              >
                <i className="bi bi-reply text-lg"></i>
              </button>
            </div>

            {/* Sağ grup: 🚫 + 🗑 */}
            <div className="flex items-center gap-4">
              {/* 🚫 Engelle */}
              {user && (
                <button
                  type="button"
                  onClick={() => blockPost(p.id)}
                  className="text-xs text-gray-500 hover:text-gray-700  duration-200"
                  title="Engelle"
                >
                  Şikayet et
                </button>
              )}

              {/* 🗑 Sil */}
              {user && user.id === p.author_id && (
                <button
                  type="button"
                  onClick={async () => {
                    if (
                      !window.confirm(
                        "Bu gönderiyi silmek istediğine emin misin?"
                      )
                    )
                      return;
                    try {
                      await api.delete(`/discussions/posts/${p.id}`);
                      setStatus({ type: "success", text: "Gönderi silindi." });
                      await load();
                    } catch (err) {
                      console.error("Silme hatası:", err);
                      setStatus({
                        type: "error",
                        text: err.response?.data?.detail || "Silme başarısız.",
                      });
                    }
                  }}
                  className="flex items-center hover:text-gray-700"
                  title="Sil"
                >
                  <i className="bi bi-trash text-lg"></i>
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Çocuklar (chat'e basınca ya da replyTo bu post ise göster) */}
        {childCount > 0 && isOpen && (
          <div className="mt-3 space-y-3 border-l border-gray-200 pl-4">
            {p.children.map((child) => (
              <PostItem key={child.id} p={child} depth={depth + 1} />
            ))}
          </div>
        )}

        {/* Inline yanıt formu – sadece seçilen postun altında */}
        {replyTo?.id === p.id && (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              submitPost(e); // mevcut gönderim fonksiyonun
            }}
            // Sadece tıklamayı yukarı taşırma; klavye event'i yok!
            onClick={(e) => e.stopPropagation()}
            className="mt-3 space-y-2"
          >
            {/* Yazma alanı */}
            <textarea
              ref={(el) => (replyRefs.current[p.id] = el)}
              value={replyDrafts[p.id] ?? ""}
              onChange={handleReplyChange(p.id)}
              placeholder={`${replyTo.author_email} için yanıt yaz...`}
              className="w-full border border-gray-400 rounded-xl p-2"
              rows={3}
              autoFocus
              // Klavye event'i EKLEME!
              // onKeyDown / onKeyUp / onKeyPress KULLANMA
            />

            {/* Butonlar */}
            <div className="flex gap-2">
              <button
                type="submit"
                className="flex-1 px-4 py-2 bg-black text-white rounded-full hover:bg-gray-900"
              >
                Gönder
              </button>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation(); // sadece tıklama
                  setReplyTo(null);
                }}
                className="flex-1 px-4 py-2 border rounded-full text-gray-600 hover:text-gray-800 hover:bg-gray-100"
              >
                İptal
              </button>
            </div>
          </form>
        )}
      </div>
    );
  };

  return (
    <div className="mx-auto py-8">
      {status && (
        <div
          className={`mb-4 text-sm rounded-xl p-3 ${
            status.type === "success"
              ? "bg-green-100 text-green-800"
              : "bg-red-100 text-red-800"
          }`}
        >
          {status.text}
        </div>
      )}

      <div className="space-y-4">
        {/* Kök yorumları gösteriyoruz */}
        {tree.slice(0, visibleCount).map((p) => (
          <PostItem key={p.id} p={p} depth={0} />
        ))}

        {tree.length === 0 && (
          <div className="text-gray-500 text-sm">Henüz gönderi yok.</div>
        )}

        {/* Yükleme/katlama butonları */}
        {tree.length > 3 && (
          <div className="bg-gray-50 pt-2 flex justify-center">
            {visibleCount < tree.length ? (
              <button
                onClick={() =>
                  setVisibleCount((c) => Math.min(c + 3, tree.length))
                }
                className="px-4 py-1 rounded-full border border-gray-300 hover:bg-gray-50 cursor-pointer text-sm"
              >
                Daha Fazla Göster
              </button>
            ) : (
              <button
                onClick={() => setVisibleCount(3)}
                className="px-4 py-1 rounded-full border border-gray-300 hover:bg-gray-50 cursor-pointer text-sm"
              >
                Daha Az Göster
              </button>
            )}
          </div>
        )}
      </div>

      {/* Alttaki genel form – sadece genel yorum için, replyTo yoksa göster */}
      {!replyTo && (
        <form onSubmit={submitPost} className="mt-6 grid gap-2">
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="Yanıt yaz..."
            className="border border-gray-400 rounded-xl p-2 h-18"
          />
          <div>
            <button
              type="submit"
              className="px-4 py-2 bg-black text-white rounded-full hover:bg-gray-900 cursor-pointer"
            >
              Yanıtla
            </button>
          </div>
        </form>
      )}
    </div>
  );
};

export default ThreadDetail;
