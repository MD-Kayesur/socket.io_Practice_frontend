"use client";

import React from "react";
import { SocketStatusBadge } from "@/components/chat/SocketStatusBadge";
import { LogIn, LogOut, User as UserIcon } from "lucide-react";

interface ChatNavbarProps {
  socketStatus: "connected" | "disconnected" | "connecting";
  serverUrl: string;
  onReconnect: () => void;
  isAuthenticated: boolean;
  userName?: string;
  onLogin: () => void;
  onLogout: () => void;
}

export const ChatNavbar: React.FC<ChatNavbarProps> = ({
  socketStatus,
  serverUrl,
  onReconnect,
  isAuthenticated,
  userName,
  onLogin,
  onLogout,
}) => {
  return (
    <div className="flex items-center justify-between border-b border-slate-800 bg-slate-900/90 px-3 sm:px-4 py-2 flex-shrink-0">
      <div className="flex items-center gap-2 sm:gap-3 min-w-0">
        <img
          src="/Screenshot_2026-08-19_at_11.42.59_AM-removebg-preview.png"
          alt="Navbar Logo"
          className="h-7 sm:h-8 md:h-9 w-auto object-contain drop-shadow flex-shrink-0"
        />
        <SocketStatusBadge
          status={socketStatus}
          serverUrl={serverUrl}
          onReconnect={onReconnect}
        />
      </div>

      <div className="flex items-center gap-2 sm:gap-3 text-xs flex-shrink-0">
        {isAuthenticated ? (
          <div className="flex items-center gap-1.5 sm:gap-2">
            <span className="text-emerald-400 font-medium flex items-center gap-1 max-w-[90px] xs:max-w-[140px] sm:max-w-[180px] truncate">
              <UserIcon className="w-3.5 h-3.5 flex-shrink-0" />
              <span className="truncate">{userName}</span>
            </span>
            <button
              onClick={onLogout}
              className="flex items-center gap-1 px-2 sm:px-2.5 py-1 bg-slate-800 hover:bg-rose-950 hover:text-rose-300 text-slate-300 rounded border border-slate-700 transition-colors active:scale-95 cursor-pointer"
            >
              <LogOut className="w-3 h-3" />
              <span className="hidden sm:inline">Logout</span>
            </button>
          </div>
        ) : (
          <button
            onClick={onLogin}
            className="flex items-center gap-1.5 px-2.5 sm:px-3 py-1 bg-indigo-600 hover:bg-indigo-500 text-white font-medium rounded transition-colors shadow-sm active:scale-95 cursor-pointer"
          >
            <LogIn className="w-3.5 h-3.5" />
            <span>Log In</span>
          </button>
        )}
      </div>
    </div>
  );
};
