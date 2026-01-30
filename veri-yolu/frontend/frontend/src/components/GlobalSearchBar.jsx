import { useState, useContext } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { AuthContext } from "../context/AuthContext";
import UserMenu from "./UserMenu";
// import { SidebarContext } from "./Sidebar"; // No longer needed

const GlobalSearchBar = () => {
  const [q, setQ] = useState("");
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useContext(AuthContext);
  // const { open } = useContext(SidebarContext); // No longer needed

  // Hide on /search, /login, /register, and landing page for non-logged-in users
  if (
    location.pathname === "/search" ||
    location.pathname === "/login" ||
    location.pathname === "/register" ||
    (!user && location.pathname === "/")
  )
    return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    if (q.trim()) {
      navigate(`/search?q=${encodeURIComponent(q.trim())}`);
      setQ("");
    }
  };

  return (
    <div className="flex items-center gap-5 w-full sticky top-0 left-0 z-5 bg-gray-50 py-3">
      <div className="w-full">
        <form onSubmit={handleSubmit} className="relative w-full" role="search">
          <input
            type="text"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Görsel, konu veya kullanıcı ara..."
            className="pl-10 pr-4 py-2 w-full border border-gray-300 rounded-full focus:outline-none focus:ring focus:ring-primary text-lg"
          />
          <button
            type="submit"
            className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
            style={{ background: "none", border: "none", padding: 0 }}
            tabIndex={-1}
          >
            <i className="bi bi-search text-xl"></i>
          </button>
        </form>
      </div>
      <UserMenu />
    </div>
  );
};

export default GlobalSearchBar;
