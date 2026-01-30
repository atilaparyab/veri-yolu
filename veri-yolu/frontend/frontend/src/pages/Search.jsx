import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import api from "../api/api";

function useQuery() {
  return new URLSearchParams(useLocation().search);
}

const sortOptions = [
  { value: "-created_at", label: "En Yeni" },
  { value: "created_at", label: "En Eski" },
  { value: "title", label: "Başlığa Göre (A-Z)" },
  { value: "-title", label: "Başlığa Göre (Z-A)" },
];

const Search = () => {
  const query = useQuery().get("q") || "";
  const [userResults, setUserResults] = useState([]);
  const [topicResults, setTopicResults] = useState([]);
  const [categories, setCategories] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState("");
  const [sort, setSort] = useState("-created_at");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const navigate = useNavigate();
  const [q, setQ] = useState(query);

  useEffect(() => {
    api.get("/topics/categories").then((res) => setCategories(res.data || []));
  }, []);

  useEffect(() => {
    if (!q.trim()) {
      setUserResults([]);
      setTopicResults([]);
      return;
    }
    setLoading(true);
    setError("");
    // Kullanıcı ve konu aramasını paralel yap
    Promise.all([
      api.get(`/users/search?q=${encodeURIComponent(q.trim())}`),
      api.get(
        `/topics?search=${encodeURIComponent(q.trim())}${
          selectedCategory ? `&category_id=${selectedCategory}` : ""
        }&sort=${sort}`
      ),
    ])
      .then(([userRes, topicRes]) => {
        setUserResults(userRes.data || []);
        setTopicResults(topicRes.data || []);
      })
      .catch(() => setError("Arama sırasında hata oluştu."))
      .finally(() => setLoading(false));
  }, [q, selectedCategory, sort]);

  // Remove the search bar UI here, just show results and filters
  return (
    <div className="max-w-5xl mx-auto py-8 px-4 min-h-screen">
      <h2 className="text-2xl font-bold mb-6">Arama Sonuçları</h2>
      <div className="flex flex-wrap gap-4 mb-6 items-center">
        <div>
          <label className="mr-2 font-medium">Kategori:</label>
          <select
            className="border rounded px-2 py-1"
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
          >
            <option value="">Tümü</option>
            {categories.map((cat) => (
              <option key={cat.id} value={cat.id}>
                {cat.name_tr || cat.name}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="mr-2 font-medium">Sırala:</label>
          <select
            className="border rounded px-2 py-1"
            value={sort}
            onChange={(e) => setSort(e.target.value)}
          >
            {sortOptions.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>
      </div>
      {loading && (
        <div className="flex flex-col items-center py-12">
          <div className="loader mb-4" />
          <span className="text-gray-500">Yükleniyor...</span>
        </div>
      )}
      {error && <p className="text-red-500">{error}</p>}
      {!loading && !error && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div>
            <h3 className="text-lg font-semibold mb-2">Kullanıcılar</h3>
            {userResults.length === 0 ? (
              <p className="text-gray-500">Kullanıcı bulunamadı.</p>
            ) : (
              <ul className="space-y-3">
                {userResults.map((u) => (
                  <li
                    key={u.id}
                    className="flex items-center gap-3 p-3 bg-white rounded shadow hover:bg-gray-50 cursor-pointer"
                    onClick={() => navigate(`/profile/${u.id}`)}
                  >
                    <div className="w-10 h-10 rounded-full bg-primary flex items-center justify-center text-white font-bold text-lg">
                      {u.email?.[0]?.toUpperCase()}
                    </div>
                    <div>
                      <div className="font-semibold">{u.name || u.email}</div>
                      <div className="text-xs text-gray-500">{u.email}</div>
                      <div className="text-xs text-gray-400">{u.role}</div>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
          <div>
            <h3 className="text-lg font-semibold mb-2">Veri Kümeleri</h3>
            {topicResults.length === 0 ? (
              <p className="text-gray-500">Veri kümesi bulunamadı.</p>
            ) : (
              <ul className="space-y-3">
                {topicResults.map((t) => (
                  <li
                    key={t.id}
                    className="p-3 bg-white rounded shadow hover:bg-gray-50 cursor-pointer flex flex-col gap-1"
                    onClick={() => navigate(`/topics/${t.id}`)}
                  >
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-primary text-lg">
                        {t.title}
                      </span>
                      {t.category_name && (
                        <span className="ml-2 text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded-full">
                          {t.category_name}
                        </span>
                      )}
                    </div>
                    <div className="text-xs text-gray-500">{t.description}</div>
                    <div className="text-xs text-gray-400">
                      Oluşturulma: {new Date(t.created_at).toLocaleString()}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default Search;
