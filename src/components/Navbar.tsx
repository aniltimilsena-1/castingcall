import { Search, Menu } from "lucide-react";
import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { PageName } from "./AppDrawer";
import { motion, AnimatePresence } from "framer-motion";

interface NavbarProps {
  onSearch: (term: string, type?: "talents" | "projects") => void;
  onAuthClick: () => void;
  onMenuClick: () => void;
  onLogoClick: () => void;
  onPremiumClick: () => void;
  onNotificationClick: () => void;
  onMessagesClick: () => void;
  onNavigate: (page: PageName, options?: { searchType?: "talents" | "projects", openForm?: boolean }) => void;
  activePage: PageName;
  searchType?: "talents" | "projects";
  onDownloadClick?: () => void;
}

export default function Navbar({
  onSearch, onAuthClick, onMenuClick, onLogoClick,
  onNavigate, searchType
}: NavbarProps) {
  const { user, profile } = useAuth();
  
  return (
    <nav className="fixed top-0 left-0 w-full z-[100] bg-black h-[4.5rem] md:h-20 shadow-md">
      <div className="flex items-center justify-between px-4 md:px-8 h-full max-w-[2000px] mx-auto">
        {/* Left Side: Hamburger and Logo */}
        <div className="flex items-center gap-4 md:gap-6">
          <button onClick={onMenuClick} className="text-white hover:opacity-80 transition-opacity flex items-center justify-center">
            {/* Exactly matching thick hamburger menu */}
            <Menu className="w-9 h-9 md:w-10 md:h-10" strokeWidth={3} />
          </button>
          
          {/* Logo Recreation matching image exact styling */}
          <button 
            onClick={onLogoClick} 
            className="flex flex-col bg-[#FFCC00] p-[2px] shadow-sm shrink-0"
          >
            <div className="flex items-stretch bg-[#FFCC00] leading-none">
              <span className="text-black font-extrabold text-[24px] md:text-[28px] leading-[0.85] tracking-tighter pr-[3px] font-sans" style={{ fontFamily: 'Impact, Arial Black, sans-serif' }}>
                Casting
              </span>
              <div className="bg-white px-[3px] pt-[1px] pb-[0px] flex items-center justify-center">
                <span className="text-[#990000] font-black text-[24px] md:text-[28px] leading-[0.85] tracking-tighter font-sans" style={{ fontFamily: 'Impact, Arial Black, sans-serif' }}>
                  call
                </span>
              </div>
            </div>
            <div className="w-full flex justify-end bg-[#FFCC00] pt-[3px] pb-[1px] pr-[1px]">
              <span className="text-[#990000] text-[5px] md:text-[6px] font-bold tracking-[0.02em] leading-none whitespace-nowrap">
                Nepal's first online casting network
              </span>
            </div>
          </button>
        </div>

        {/* Right Side: Auth Context */}
        <div className="flex items-center gap-5 md:gap-8 pr-2">

          <button 
            onClick={() => onSearch('', 'talents')}
            className="text-white hover:text-[#FFCC00] transition-colors flex items-center justify-center p-2 rounded-full hover:bg-white/5"
            aria-label="Open Search"
          >
            <Search className="w-5 h-5 md:w-6 md:h-6" strokeWidth={2.5} />
          </button>

          {!user ? (
            <button onClick={onAuthClick} className="flex flex-col items-start leading-[1.2] text-white hover:opacity-80 transition-opacity">
              <span className="font-extrabold text-[15px] md:text-[17px] tracking-tight">Sign in</span>
              <span className="text-[10px] md:text-[11px] font-semibold text-white/90 tracking-tight">to publish your profile</span>
            </button>
          ) : (
            <button onClick={() => onNavigate('profile')} className="flex flex-col items-start leading-[1.2] text-white hover:opacity-80 transition-opacity">
              <span className="font-extrabold text-[15px] md:text-[17px] tracking-tight">{profile?.name || "Profile"}</span>
              <span className="text-[10px] md:text-[11px] font-semibold text-[#FFCC00] tracking-tight">Pro / Dashboard</span>
            </button>
          )}
        </div>
      </div>
    </nav>
  );
}
