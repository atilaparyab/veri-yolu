// components/Layout.jsx
import React, { useContext, useState } from "react";
import { Outlet, useLocation } from "react-router-dom";
import Navbar from "./Navbar";
import Sidebar from "./Sidebar";
import { AuthContext } from "../context/AuthContext";
import Footer from "./Footer";
import GlobalSearchBar from "./GlobalSearchBar";
import { SidebarProvider } from "./Sidebar";

const Layout = ({ children }) => {
  const { user } = useContext(AuthContext);
  const location = useLocation();
  // Hide global search bar on landing page for non-logged-in users, and on /login, /register
  const hideSearchBar =
    (!user && location.pathname === "/") ||
    location.pathname === "/login" ||
    location.pathname === "/register";
  return (
    <SidebarProvider>
      <div className="min-h-screen bg-gray-50 font-sans flex">
        <Sidebar />
        <div className="flex-1 flex flex-col min-h-screen">
          <Navbar />
          <main className="flex-1 px-6 md:p-10 max-w-7xl mx-auto w-full">
            <GlobalSearchBar />
            <Outlet />
          </main>
          <Footer />
        </div>
      </div>
    </SidebarProvider>
  );
};

export default Layout;
