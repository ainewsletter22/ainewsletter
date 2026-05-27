import { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import Logo from "./Logo";
import Dashboard from "../assets/dashboardIcon.png";
import DashboardInactive from "../assets/dashboardIconInactive.svg";
import clients from "../assets/findIcon.png";
import clientsActive from "../assets/findClientsActive.svg";
import clientsIcon from "../assets/clientsIcon.svg";
import clientsIconActive from "../assets/manageClientsActive.svg";
import sendIcon from "../assets/sendIcon.png";


export default function DashboardHeader() {
  const navigate = useNavigate();
  const location = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const navItems = [
    { label: "Dashboard", icon: location.pathname === "/dashboard" ? Dashboard : DashboardInactive, path: "/dashboard" },
    { label: "Find Clients", icon: location.pathname === "/find-clients" ? clientsActive : clients, path: "/find-clients" },
    { label: "Manage Clients", icon: location.pathname === "/manage-clients" ? clientsIconActive : clientsIcon, path: "/manage-clients" },
  ];


  return (
    <header className="w-full bg-white border-b border-gray-100 px-4 lg:px-6 py-4 lg:py-7 flex flex-col lg:flex-row lg:items-center justify-between sticky top-0 z-40 gap-4 lg:gap-0">
      <div className="flex items-center justify-between w-full lg:w-auto">
        {/* Logo */}
        <div className="flex items-center">
          <Logo />
        </div>

        {/* Right: bell + avatar + hamburger for mobile */}
        <div className="flex items-center gap-2 lg:hidden">
          {/* Bell */}
          <button className="relative w-9 h-9 flex items-center justify-center rounded-full bg-gray-100 transition-colors">
            <svg width="18" height="18" viewBox="0 0 20 20" fill="none">
              <path
                d="M10 2a6 6 0 00-6 6v3l-1.5 2.5h15L16 11V8a6 6 0 00-6-6z"
                stroke="#6B7280"
                strokeWidth="1.4"
                fill="none"
              />
              <path d="M8 15.5a2 2 0 004 0" stroke="#6B7280" strokeWidth="1.4" />
            </svg>
            <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full" />
          </button>
          
          {/* Avatar (Icon only on mobile) */}
          <button className="flex items-center justify-center hover:bg-gray-50 rounded-lg p-1 transition-colors">
            <div className="w-8 h-8 rounded-full bg-blue-500 flex items-center justify-center text-white text-sm font-bold">
              J
            </div>
          </button>
          
          {/* Hamburger toggle */}
          <button 
            className="p-1.5 rounded-lg bg-gray-100 text-gray-600 hover:bg-gray-200 transition-colors"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d={mobileMenuOpen ? "M6 18L18 6M6 6l12 12" : "M4 6h16M4 12h16M4 18h16"} />
            </svg>
          </button>
        </div>
      </div>

      {/* Nav */}
      <nav className={`${mobileMenuOpen ? "flex" : "hidden"} lg:flex flex-col lg:flex-row items-start lg:items-center gap-2 lg:gap-1 w-full lg:w-auto`}>
        {navItems.map((item) => {
          const isActive = location.pathname === item.path;
          return (
            <button
              key={item.path}
              onClick={() => { navigate(item.path); setMobileMenuOpen(false); }}
              className={`flex items-center justify-start lg:justify-center gap-2 px-4 py-3 lg:py-2 rounded-lg text-sm font-medium transition-colors w-full lg:w-auto ${
                isActive
                  ? "bg-blue-50 text-blue-600"
                  : "text-gray-500 hover:text-gray-800 hover:bg-gray-50"
              }`}
            >
            <img src={item.icon} className="w-5 h-5 lg:w-auto lg:h-auto" alt="" />
              {item.label}
            </button>
          );
        })}

        {/* Send AI Newsletter CTA */}
        <button className="lg:ml-3 flex items-center justify-center shrink-0 w-full lg:w-auto gap-2 bg-linear-to-r from-[#337DD3] to-[#9C4EFF] hover:from-blue-600 hover:to-blue-700 text-white font-semibold text-sm px-4 py-3 rounded-xl transition-colors mt-2 md:mt-0">
          Send AI Newsletter    
          <img src={sendIcon} className="" alt="" />
        </button>
      </nav>

      {/* Right: bell + avatar for desktop */}
      <div className="hidden lg:flex items-center gap-3">
        {/* Bell */}
        <button className="relative w-11 h-11 flex items-center justify-center rounded-full bg-gray-100 transition-colors">
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
            <path
              d="M10 2a6 6 0 00-6 6v3l-1.5 2.5h15L16 11V8a6 6 0 00-6-6z"
              stroke="#6B7280"
              strokeWidth="1.4"
              fill="none"
            />
            <path d="M8 15.5a2 2 0 004 0" stroke="#6B7280" strokeWidth="1.4" />
          </svg>
          <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full" />
        </button>

        {/* Avatar */}
        <button className="flex items-center gap-2 hover:bg-gray-50 rounded-lg px-2 py-1 transition-colors">
          <div className="w-8 h-8 rounded-full bg-blue-500 flex items-center justify-center text-white text-sm font-bold">
            J
          </div>
          <span className="text-sm font-medium text-gray-700">Jamson</span>
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
            <path d="M3 5l4 4 4-4" stroke="#9CA3AF" strokeWidth="1.4" strokeLinecap="round" />
          </svg>
        </button>
      </div>
    </header>
  );
}