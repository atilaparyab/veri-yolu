import React from "react";
import Sidebar, { SidebarProvider } from "./Sidebar";
import UserMenu from "./UserMenu";
import Footer from "./Footer";
import { Outlet } from "react-router-dom";
import GlobalSearchBar from "./GlobalSearchBar";

const PrivateLayout = () => {
  return (
    <SidebarProvider>
      <div className="min-h-screen bg-gray-50 font-sans flex">
        <Sidebar />
        <div className="flex-1 flex flex-col min-h-screen">
          <main className="flex-1 px-6 md:px-10 max-w-6xl mx-auto w-full">
            <GlobalSearchBar />
            <Outlet />
          </main>
          <Footer />
        </div>
      </div>
    </SidebarProvider>
  );
};

export default PrivateLayout;
