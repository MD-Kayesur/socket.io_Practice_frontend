"use client";

import React from "react";
import { RefreshCw } from "lucide-react";

interface SocketStatusBadgeProps {
  status: "connected" | "connecting" | "disconnected";
  serverUrl: string;
  onReconnect: () => void;
}

export const SocketStatusBadge: React.FC<
  SocketStatusBadgeProps
> = ({
  status,
  serverUrl,
  onReconnect,
}) => {
  return (
    <div className="flex items-center justify-between gap-1.5 sm:gap-2 px-2 sm:px-3 py-1 sm:py-1.5 bg-slate-900/80 backdrop-blur-md border border-slate-800 rounded-xl text-xs flex-shrink-0">
      <div className="flex items-center gap-1.5 sm:gap-2.5">
        <div className="relative flex items-center justify-center">
          {status === "connected" && (
            <>
              <span className="absolute w-2.5 sm:w-3 h-2.5 sm:h-3 rounded-full bg-emerald-500 animate-ping opacity-75" />
              <span className="w-2 sm:w-2.5 h-2 sm:h-2.5 rounded-full bg-emerald-500 relative" />
            </>
          )}

          {status === "connecting" && (
            <RefreshCw className="w-3 sm:w-3.5 h-3 sm:h-3.5 text-amber-400 animate-spin" />
          )}

          {status === "disconnected" && (
            <span className="w-2 sm:w-2.5 h-2 sm:h-2.5 rounded-full bg-rose-500" />
          )}
        </div>

        <div className="flex items-center gap-1 font-medium text-[11px] sm:text-xs">
          <span className="hidden sm:inline text-slate-400">
            Socket.io:
          </span>

          {status === "connected" && (
            <span className="text-emerald-400 font-semibold">
              <span className="hidden xs:inline">Connected</span>
              <span className="xs:hidden">Live</span>
            </span>
          )}

          {status === "connecting" && (
            <span className="text-amber-400 font-semibold">
              Connecting...
            </span>
          )}

          {status === "disconnected" && (
            <span className="text-rose-400 font-semibold">
              Offline
            </span>
          )}
        </div>
      </div>

      <button
        onClick={onReconnect}
        disabled={status === "connecting"}
        title="Reconnect to Socket server"
        className="flex items-center gap-1 px-1.5 sm:px-2.5 py-0.5 sm:py-1 rounded bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors text-[11px] sm:text-xs font-medium border border-slate-700/50 disabled:opacity-50"
      >
        <RefreshCw
          className={`w-3 h-3 ${
            status === "connecting"
              ? "animate-spin"
              : ""
          }`}
        />
        <span className="hidden md:inline">Reconnect</span>
      </button>
    </div>
  );
};