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
    <div className="flex items-center justify-between px-4 py-2.5 bg-slate-900/80 backdrop-blur-md border-b border-slate-800/80 text-xs">
      <div className="flex items-center gap-2.5">
        <div className="relative flex items-center justify-center">
          {status === "connected" && (
            <>
              <span className="absolute w-3 h-3 rounded-full bg-emerald-500 animate-ping opacity-75" />
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 relative" />
            </>
          )}

          {status === "connecting" && (
            <RefreshCw className="w-3.5 h-3.5 text-amber-400 animate-spin" />
          )}

          {status === "disconnected" && (
            <span className="w-2.5 h-2.5 rounded-full bg-rose-500" />
          )}
        </div>

        <div className="flex items-center gap-1.5 font-medium">
          <span className="text-slate-400">
            Socket.io:
          </span>

          {status === "connected" && (
            <span className="text-emerald-400 font-semibold">
              Connected
            </span>
          )}

          {status === "connecting" && (
            <span className="text-amber-400 font-semibold">
              Connecting...
            </span>
          )}

          {status === "disconnected" && (
            <span className="text-rose-400 font-semibold">
              Disconnected
            </span>
          )}
        </div>

        <span className="text-slate-600">|</span>

        <span className="font-mono text-slate-400 text-[11px] bg-slate-800/60 px-2 py-0.5 rounded border border-slate-800">
          {serverUrl}/realtime
        </span>
      </div>

      <button
        onClick={onReconnect}
        disabled={status === "connecting"}
        className="flex items-center gap-1 px-2.5 py-1 rounded bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors text-xs font-medium border border-slate-700/50 disabled:opacity-50"
      >
        <RefreshCw
          className={`w-3 h-3 ${
            status === "connecting"
              ? "animate-spin"
              : ""
          }`}
        />

        Reconnect
      </button>
    </div>
  );
};