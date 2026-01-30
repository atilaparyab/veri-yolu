// components/Sidebar.jsx
import { Link, useLocation } from "react-router-dom";
import { createContext, useContext, useState } from "react";
import { AuthContext } from "../context/AuthContext";

export const SidebarContext = createContext();

export const SidebarProvider = ({ children }) => {
  const [open, setOpen] = useState(true);
  return (
    <SidebarContext.Provider value={{ open, setOpen }}>
      {children}
    </SidebarContext.Provider>
  );
};

const Sidebar = () => {
  const { user } = useContext(AuthContext);
  const location = useLocation();
  const { open, setOpen } = useContext(SidebarContext);
  const [showCreateModal, setShowCreateModal] = useState(false);
  // Hide on landing, login, register

  const links = [
    { to: "/topics?openCreate=1", label: "Oluştur", icon: "bi bi-plus-square" },
    { to: "/profile", label: "Profil", icon: "bi bi-person" },
    { to: "/topics", label: "Veri Kümeleri", icon: "bi bi-collection" },
    { to: "/discussions", label: "Konuşmalar", icon: "bi bi-chat-dots" },

    {
      to: "/my-topics",
      label: "Veri Kümelerim",
      icon: "bi bi-boxes",
    },

    {
      to: "/my-images",
      label: "Görsellerim",
      icon: "bi bi-images",
     
    },
  ];
  if (user && user.role === "admin") {
    links.push({ to: "/admin", label: "Admin", icon: "bi bi-shield-lock" });
  }
  return (
    <aside
      className={`sticky top-0 left-0 h-screen z-40 flex flex-col bg-gray-100 shadow-lg
                overflow-hidden transition-[width] duration-300 ease-in-out
                ${open ? "w-56" : "w-16"}`}
    >
      {/* Üst kısım: toggle */}
      <div className={`px-4 mt-4`}>
        {" "}
        {/* <- px-4 her zaman sabit; ikon x’i değişmez */}
        <button
          className="text-gray-500 hover:text-primary focus:outline-none"
          onClick={() => setOpen((v) => !v)}
          aria-label={open ? "Menüyü Kapat" : "Menüyü Aç"}
        >
          <i className={`bi ${open ? "bi-x-lg" : "bi-list"} text-2xl`}></i>
        </button>
      </div>

      {/* Logo */}
      <Link
        to="/"
        className={`text-2xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-purple-500 to-blue-500
                  mt-8 flex items-center gap-3 px-4 transition-colors duration-300`}
      >
        <i className="bi bi-bar-chart text-transparent bg-clip-text bg-gradient-to-r from-purple-500 to-blue-500"></i>
        {/* metni solda sabit tut; sadece genişlik/opacity animasyon */}
        <span
          className={`overflow-hidden whitespace-nowrap transition-all duration-300
                    ${
                      open ? "max-w-[160px] opacity-100" : "max-w-0 opacity-0"
                    }`}
        >
          VeriYolu
        </span>
      </Link>

      {/* Menü */}
      <nav className={`flex flex-col gap-3 flex-1 ${open ? "mt-15" : "mt-15"}`}>
        {links
          .filter((link) => !link.adminOnly || (user && user.role === "admin"))
          .map((link) => (
            <Link
              key={link.to}
              to={link.to}
              className={`flex items-center gap-3 py-2 rounded-lg font-semibold text-base
                        px-4 transition-colors duration-150
              ${
                location.pathname.startsWith(link.to)
                  ? "bg-primary.light text-primary"
                  : "text-gray-700 hover:bg-primary.light hover:text-primary"
              }`}
              title={!open ? link.label : undefined}
            >
              {/* ikon her zaman aynı x konumunda (px-4 sabit) */}
              <i className={link.icon}></i>

              {/* etiket: sadece genişliği aç/kapa -> hizası bozulmaz */}
              <span
                className={`overflow-hidden whitespace-nowrap transition-all duration-200
                          ${
                            open
                              ? "max-w-[180px] opacity-100"
                              : "max-w-0 opacity-0"
                          }`}
              >
                {link.label}
              </span>
            </Link>
          ))}
      </nav>

      {/* Alt telif: hizayı sabit tutmak için px-4 sabit, metni animasyonla gizle */}
      <div className="px-4 mb-4">
        <span
          className={`block text-xs text-gray-400 transition-all duration-300
                    ${
                      open
                        ? "max-w-[200px] opacity-100"
                        : "max-w-0 opacity-0 overflow-hidden"
                    }`}
        >
          © {new Date().getFullYear()} VeriYolu
        </span>
      </div>
    </aside>
  );
};

export default Sidebar;
