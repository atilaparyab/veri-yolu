import React, { useContext, useRef, useState, useEffect } from "react";
import { AuthContext } from "../context/AuthContext";
import { Link, useNavigate } from "react-router-dom";

const UserMenu = () => {
  const { user, logout } = useContext(AuthContext);
  const [open, setOpen] = useState(false);
  const menuRef = useRef();
  const navigate = useNavigate();

  useEffect(() => {
    const handleClick = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  if (!user) return null;

  return (
    <div className="top-4 right-4 z-50" ref={menuRef}>
      {/* Avatar butonu */}
      <button
        className="w-11 h-11 rounded-full bg-primary.light flex items-center justify-center shadow hover:ring-2 hover:ring-primary focus:outline-none transition"
        onClick={() => setOpen((v) => !v)}
        aria-label="Kullanıcı menüsü"
      >
        {user.profile_image ? (
          <img
            src={`/uploaded_images/${user.profile_image}?v=${Date.now()}`}
            alt="Profil"
            className="w-full h-full object-cover rounded-full"
          />
        ) : (
          <span className="text-xl font-bold text-primary">
            {user.email?.[0]?.toUpperCase()}
          </span>
        )}
      </button>

      {/* === RIGHT DRAWER === */}
      <div
        className={`fixed inset-0 z-[60] ${
          open ? "pointer-events-auto" : "pointer-events-none"
        }`}
        aria-hidden={!open}
      >
        {/* Arka plan (tıklayınca kapanır) */}
        <div
          className={`absolute inset-0 bg-black/30 transition-opacity ${
            open ? "opacity-100" : "opacity-0"
          }`}
          onClick={() => setOpen(false)}
        />

        {/* Drawer kutusu */}
        <div
          id="drawer-right-example"
          className={`fixed top-0 right-0 h-screen p-4 overflow-y-auto bg-white w-80 dark:bg-gray-800
                border-l border-gray-200 shadow-2xl transition-transform duration-300
                ${open ? "translate-x-0" : "translate-x-full"}`}
          role="dialog"
          aria-modal="true"
          aria-labelledby="drawer-right-label"
          tabIndex={-1}
        >
          {/* ALTA TEK DESEN (SVG) */}
          <svg
            className="pointer-events-none select-none absolute bottom-0 left-0 w-full h-60"
            viewBox="0 0 1440 160"
            preserveAspectRatio="none"
            aria-hidden="true"
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
          {/* Üst bar: email solda, kapat sağda + alt çizgi */}
          <div className="flex items-center justify-between mb-4 pb-3 border-b border-gray-200 dark:border-gray-700">
            <div
              id="drawer-right-label"
              className="text-sm font-semibold text-gray-700 dark:text-gray-300"
            >
              {user.email}
            </div>

            <button
              type="button"
              onClick={() => setOpen(false)}
              aria-controls="drawer-right-example"
              aria-label="Kapat"
              className="text-gray-600 bg-transparent hover:bg-gray-200 hover:text-gray-900 rounded-lg
                   text-sm w-8 h-8 inline-flex items-center justify-center
                   dark:hover:bg-gray-600 dark:hover:text-white"
            >
              <svg
                className="w-3 h-3"
                aria-hidden="true"
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 14 14"
              >
                <path
                  stroke="currentColor"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="m1 1 6 6m0 0 6 6M7 7l6-6M7 7l-6 6"
                />
              </svg>
            </button>
          </div>

          {/* İçerik */}
          <div className="grid grid-cols-1 gap-2">
            <Link
              to="/profile"
              className="px-4 py-2 text-sm font-medium text-center text-gray-900 bg-white border border-gray-200 rounded-lg
                   focus:outline-none hover:bg-gray-100 focus:z-10 focus:ring-4 focus:ring-gray-100
                   dark:focus:ring-gray-700 dark:bg-gray-800 dark:text-gray-400 dark:border-gray-600 dark:hover:text-white dark:hover:bg-gray-700"
              onClick={() => setOpen(false)}
            >
              Profilim
            </Link>

            <Link
              to="/profile/edit"
              className="px-4 py-2 text-sm font-medium text-center text-gray-900 bg-white border border-gray-200 rounded-lg
                   focus:outline-none hover:bg-gray-100 focus:z-10 focus:ring-4 focus:ring-gray-100
                   dark:focus:ring-gray-700 dark:bg-gray-800 dark:text-gray-400 dark:border-gray-600 dark:hover:text-white dark:hover:bg-gray-700"
              onClick={() => setOpen(false)}
            >
              Profili Düzenle
            </Link>

            <button
              onClick={() => {
                setOpen(false);
                logout();
                navigate("/");
              }}
              className="px-4 py-2 text-sm font-medium text-center text-red-600 bg-white border border-red-200 rounded-lg
                   hover:bg-red-50 focus:outline-none focus:ring-4 focus:ring-red-100"
            >
              Çıkış Yap
            </button>
          </div>
        </div>
      </div>
      {/* === /RIGHT DRAWER === */}
    </div>
  );
};

export default UserMenu;
