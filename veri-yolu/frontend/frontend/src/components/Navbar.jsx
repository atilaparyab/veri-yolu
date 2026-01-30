import { useContext, useState } from "react";
import { AuthContext } from "../context/AuthContext";
import { Link, useNavigate } from "react-router-dom";
import UserMenu from "./UserMenu";
import { FiSearch } from "react-icons/fi";

const Navbar = () => {
  const { user } = useContext(AuthContext);
  const [menuOpen, setMenuOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const navigate = useNavigate();

  const navLinks = [
    { to: "/", label: "Anasayfa" },
    { to: "/topicsNav", label: "Veri Kümeleri" },
    { to: "/disNav", label: "Konuşmalar" },
    { to: "/about", label: "Hakkımızda" },
    { to: "/communication", label: "İletişim" },
  ];

  const handleSearch = (e) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/search?q=${encodeURIComponent(searchQuery.trim())}`);
    }
  };

  return (
    <nav className="w-full bg-white shadow">
      <div className="max-w-7xl mx-auto px-4 md:px-8 flex items-center justify-between py-4">
        {/* Sol logo */}
        <div className="text-2xl font-bold flex items-center gap-2">
          <Link to="/" className="flex items-center gap-2 text-primary">
            <i className="bi bi-bar-chart text-2xl text-transparent bg-clip-text bg-gradient-to-r from-purple-500 to-blue-500"></i>
            <span className="hidden sm:inline text-transparent bg-clip-text bg-gradient-to-r from-purple-500 to-blue-500">
              VeriYolu
            </span>
          </Link>
        </div>

        {/* Orta: Links + Search */}
        <div className="hidden md:flex gap-4 items-center flex-1 justify-center">
          <div className="flex gap-4">
            {navLinks.map((l) => (
              <Link
                key={l.to}
                to={l.to}
                className="text-gray-700 hover:text-black font-medium transition"
              >
                {l.label}
              </Link>
            ))}
          </div>

          <form onSubmit={handleSearch} className="flex ml-6 relative">
            <FiSearch className="absolute left-8 top-1/2 transform -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Ara..."
              className="ml-5 border border-gray-300 rounded-full px-10 py-1 focus:outline-none focus:ring-2 focus:ring-primary w-78"
            />
          </form>
        </div>

        {/* Sağ: Kullanıcı veya Giriş */}
        <div className="flex items-center gap-4">
          {user ? (
            <UserMenu />
          ) : (
            <Link
              to="/login"
              className="bg-white text-gray-600 text-center font-semibold rounded-full px-4 py-2 border border-gray-200 hover:bg-gray-100 transition duration-300 ease"
            >
              Giriş Yap
            </Link>
          )}

          {/* Mobile hamburger */}
          <button
            className="md:hidden text-2xl text-gray-500 hover:text-primary focus:outline-none ml-2"
            onClick={() => setMenuOpen((v) => !v)}
            aria-label="Menüyü Aç/Kapat"
          >
            <i className={`bi ${menuOpen ? "bi-x-lg" : "bi-list"}`}></i>
          </button>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
