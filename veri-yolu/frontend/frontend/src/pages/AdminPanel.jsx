import { useEffect, useState, useContext } from "react";
import api from "../api/api";
import { AuthContext } from "../context/AuthContext";
import { useNavigate } from "react-router-dom";

const AdminPanel = () => {
  const { user } = useContext(AuthContext);
  const [categories, setCategories] = useState([]);
  const [users, setUsers] = useState([]);
  const [showCatModal, setShowCatModal] = useState(false);
  const [newCatTr, setNewCatTr] = useState("");
  const [catToDelete, setCatToDelete] = useState(null);
  const [toast, setToast] = useState("");
  const [pendingImages, setPendingImages] = useState([]);
  const [imgToast, setImgToast] = useState("");

  const fetchUsers = async () => {
    const res = await api.get("/admin/users");
    setUsers(res.data);
  };

  const fetchCategories = async () => {
    const res = await api.get("/admin/categories");
    setCategories(res.data);
    console.log("Categories data:", res.data); // This shows the actual data
  };

  const addCategory = async () => {
    try {
      await api.post("/admin/category", { name_tr: newCatTr });
      setShowCatModal(false);
      setNewCatTr("");
      fetchCategories();
      setToast("Kategori eklendi!");
    } catch (err) {
      setToast("Kategori eklenemedi!");
    }
  };

  const deleteCategory = async (id) => {
    try {
      await api.delete(`/admin/category/${id}`);
      setToast("Kategori silindi!");
      fetchCategories();
    } catch (err) {
      setToast("Kategori silinemedi!");
    }
    setCatToDelete(null);
  };

  const updateRole = async (id, role) => {
    await api.put(`/admin/users/${id}/role`, null, {
      params: { new_role: role },
    });
    fetchUsers();
    setToast("Rol güncellendi!");
  };

  const fetchPendingImages = async () => {
    try {
      const res = await api.get("/images/pending");
      setPendingImages(res.data);
    } catch (err) {
      setPendingImages([]);
    }
  };

  const approveImage = async (id) => {
    await api.post(`/images/${id}/approve`);
    fetchPendingImages();
    setImgToast("Görsel onaylandı!");
  };

  const rejectImage = async (id) => {
    await api.post(`/images/${id}/reject`);
    fetchPendingImages();
    setImgToast("Görsel reddedildi!");
  };

  useEffect(() => {
    fetchUsers();
    fetchCategories();
    fetchPendingImages();
  }, []);

  useEffect(() => {
    if (toast) {
      const t = setTimeout(() => setToast(""), 2000);
      return () => clearTimeout(t);
    }
  }, [toast]);

  useEffect(() => {
    if (imgToast) {
      const t = setTimeout(() => setImgToast(""), 2000);
      return () => clearTimeout(t);
    }
  }, [imgToast]);

  if (user?.role !== "admin") return <p>Bu sayfaya sadece admin erişebilir.</p>;

  return (
    <div className="p-4 mx-auto">
      <style>{`
    footer { display: none; }
  `}</style>
      <h2 className="text-2xl font-bold mb-4 text-blue-700">Yönetici Paneli</h2>
      {toast && (
        <div className="mb-4 px-4 py-2 bg-primary.light text-primary rounded shadow text-center">
          {toast}
        </div>
      )}
      {/* Kategori Yönetimi */}
      <div className="mb-10">
        <div className="flex items-center justify-between mb-2">
          <h4 className="font-semibold">Kategori Yönetimi</h4>
          <button
            onClick={() => setShowCatModal(true)}
            className="bg-blue-800 text-white px-4 py-2 rounded-full font-semibold shadow hover:bg-blue-700 transition cursor-pointer"
          >
            + Kategori Ekle
          </button>
        </div>
        <div className="overflow-x-auto bg-gray-50 border border-gray-300 rounded-xl p-5 shadow">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="bg-primary.light text-primary">
                <th className="py-3 px-4 text-left">Kategori Adı</th>
                <th className="py-3 px-4 text-left">İşlemler</th>
              </tr>
            </thead>
            <tbody>
              {categories.map((cat) => (
                <tr
                  key={cat.id}
                  className="border-b hover:bg-primary.light/40 transition"
                >
                  <td className="py-2 px-4 font-semibold">{cat.name_tr}</td>
                  <td className="py-2 px-4">
                    <button
                      onClick={() => setCatToDelete(cat)}
                      className="text-red-600 hover:underline font-semibold"
                    >
                      Sil
                    </button>
                  </td>
                </tr>
              ))}
              {categories.length === 0 && (
                <tr>
                  <td colSpan={2} className="text-center py-6 text-gray-400">
                    Hiç kategori yok.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
      {/* Kullanıcı Yönetimi */}
      <div className="mb-10">
        <h4 className="font-semibold mb-2">Kullanıcılar</h4>
        <div className="overflow-x-auto bg-gray-50 border border-gray-300 p-5 rounded-xl shadow">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="bg-primary.light text-primary">
                <th className="py-3 px-4 text-left">E-posta</th>
                <th className="py-3 px-4 text-left">Rol</th>
                <th className="py-3 px-4 text-left">İşlemler</th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr
                  key={u.id}
                  className="border-b hover:bg-primary.light/40 transition"
                >
                  <td className="py-2 px-4 font-semibold">{u.email}</td>
                  <td className="py-2 px-4">{u.role}</td>
                  <td className="py-2 px-4">
                    <select
                      defaultValue={u.role}
                      onChange={(e) => updateRole(u.id, e.target.value)}
                      className="border rounded px-2 py-1"
                    >
                      <option value="user">Kullanıcı</option>
                      <option value="admin">Yönetici</option>
                      <option value="project_owner">Proje Sahibi</option>
                      <option value="annotator">Etiketleyici</option>
                    </select>
                  </td>
                </tr>
              ))}
              {users.length === 0 && (
                <tr>
                  <td colSpan={3} className="text-center py-6 text-gray-400">
                    Hiç kullanıcı yok.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
      {/* Kategori Ekle Modal */}
      {showCatModal && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded shadow w-full max-w-md relative">
            <button
              onClick={() => setShowCatModal(false)}
              className="absolute top-2 right-2 text-xl text-gray-500 hover:text-black"
            >
              &times;
            </button>
            <h3 className="text-xl font-bold mb-4 text-primary">
              Kategori Ekle
            </h3>
            <input
              value={newCatTr}
              onChange={(e) => setNewCatTr(e.target.value)}
              placeholder="Kategori Adı"
              className="border px-3 py-2 rounded w-full mb-4"
            />
            <button
              onClick={addCategory}
              className="bg-blue-600 text-white px-4 py-2 rounded-xl font-semibold w-full shadow hover:bg-blue-700 transition cursor-pointer"
              disabled={!newCatTr}
            >
              Kaydet
            </button>
          </div>
        </div>
      )}
      {/* Kategori Sil Onay Modalı */}
      {catToDelete && (
        <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded shadow w-full max-w-md relative">
            <button
              onClick={() => setCatToDelete(null)}
              className="absolute top-2 right-2 text-xl text-gray-500 hover:text-red-600"
            >
              &times;
            </button>
            <h3 className="text-xl font-bold mb-4 text-primary">
              Kategoriyi Sil
            </h3>
            <p className="mb-4">
              "{catToDelete.name_tr}" kategorisini silmek istediğine emin misin?
            </p>
            <button
              onClick={() => deleteCategory(catToDelete.id)}
              className="bg-red-600 text-white px-4 py-2 rounded font-semibold w-full shadow hover:bg-red-700 transition"
            >
              Sil
            </button>
          </div>
        </div>
      )}
      {/* Konu ve Görsel Yönetimi Placeholder */}
      <div className="mb-8 mt-12">
        <h4 className="font-semibold mb-2">Onay Bekleyen Görseller</h4>
        {imgToast && (
          <div className="mb-4 px-4 py-2 bg-green-100 text-green-800 rounded shadow text-center">
            {imgToast}
          </div>
        )}
        <div className="overflow-x-auto bg-white rounded-xl shadow">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="bg-primary.light text-primary">
                <th className="py-3 px-4 text-left">Görsel</th>
                <th className="py-3 px-4 text-left">Dosya Adı</th>
                <th className="py-3 px-4 text-left">AI Skoru</th>
                <th className="py-3 px-4 text-left">Yükleyen</th>
                <th className="py-3 px-4 text-left">İşlemler</th>
              </tr>
            </thead>
            <tbody>
              {pendingImages.map((img) => (
                <tr
                  key={img.id}
                  className="border-b hover:bg-primary.light/40 transition"
                >
                  <td className="py-2 px-4">
                    <img
                      src={`/uploaded_images/${img.filename}`}
                      alt={img.filename}
                      className="w-20 h-20 object-cover rounded shadow"
                    />
                  </td>
                  <td className="py-2 px-4 font-semibold">{img.filename}</td>
                  <td className="py-2 px-4">
                    {img.ai_score ? img.ai_score.toFixed(2) : "-"}
                  </td>
                  <td className="py-2 px-4">{img.uploader_id}</td>
                  <td className="py-2 px-4 flex gap-2">
                    <button
                      onClick={() => approveImage(img.id)}
                      className="bg-green-600 text-white px-3 py-1 rounded font-semibold shadow hover:bg-green-700 transition"
                    >
                      Onayla
                    </button>
                    <button
                      onClick={() => rejectImage(img.id)}
                      className="bg-red-600 text-white px-3 py-1 rounded font-semibold shadow hover:bg-red-700 transition"
                    >
                      Reddet
                    </button>
                  </td>
                </tr>
              ))}
              {pendingImages.length === 0 && (
                <tr>
                  <td colSpan={5} className="text-center py-6 text-gray-400">
                    Onay bekleyen görsel yok.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default AdminPanel;
