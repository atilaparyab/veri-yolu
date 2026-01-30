import React from "react";
import { Link } from "react-router-dom";

const NotFound = () => {
  return (
    <div className="flex flex-col items-center justify-center h-screen bg-gray-100 text-center">
      <h1 className="text-6xl font-bold text-red-600 mb-4">404</h1>
      <p className="text-xl mb-6">Üzgünüz, aradığınız sayfa bulunamadı.</p>
      <Link to="/" className="text-blue-500 underline hover:text-blue-700">
        Ana sayfaya dön
      </Link>
      <div className="mt-12 text-gray-500 text-sm">
        <p>
          VeriYolu: Açık kaynak veri bilimi ve yapay zeka topluluğu platformu.
        </p>
        <footer className="mt-2">© {new Date().getFullYear()} VeriYolu</footer>
      </div>
    </div>
  );
};

export default NotFound;
