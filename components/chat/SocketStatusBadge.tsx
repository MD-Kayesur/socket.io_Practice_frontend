"use client";

import React, { useState } from "react";
import { Wifi, WifiOff, RefreshCw, Server, CheckCircle2 } from "lucide-react";

interface SocketStatusBadgeProps {
  status: "connected" | "connecting" | "disconnected";
  serverUrl: string;
  onUrlChange: (newUrl: string) => void;
  onReconnect: () => void;
}

export const SocketStatusBadge: React.FC<SocketStatusBadgeProps> = ({
  status,
  serverUrl,
  onUrlChange,
  onReconnect,
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [tempUrl, setTempUrl] = useState(serverUrl);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    onUrlChange(tempUrl);
    setIsEditing(false);
  };

  return (
    <div className="flex items-center justify-between px-4 py-2.5 bg-slate-900/80 backdrop-blur-md border-b border-slate-800/80 text-xs">
      <div className="flex items-center gap-2.5">
        <div className="relative flex items-center justify-center">
          {status === "connected" && (
            <>
              <span className="absolute w-3 h-3 rounded-full bg-emerald-500 animate-ping opacity-75"></span>
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 relative"></span>
            </>
          )}
          {status === "connecting" && (
            <RefreshCw className="w-3.5 h-3.5 text-amber-400 animate-spin" />
          )}
          {status === "disconnected" && (
            <span className="w-2.5 h-2.5 rounded-full bg-rose-500 relative"></span>
          )}
        </div>

        <div className="flex items-center gap-1.5 font-medium">
          <span className="text-slate-400">Socket.io:</span>
          {status === "connected" && (
            <span className="text-emerald-400 font-semibold flex items-center gap-1">
              Connected
            </span>
          )}
          {status === "connecting" && (
            <span className="text-amber-400 font-semibold">Connecting...</span>
          )}
          {status === "disconnected" && (
            <span className="text-rose-400 font-semibold">Disconnected</span>
          )}
        </div>

        <span className="text-slate-600">|</span>

        {isEditing ? (
          <form onSubmit={handleSave} className="flex items-center gap-1.5">
            <input
              type="text"
              value={tempUrl}
              onChange={(e) => setTempUrl(e.target.value)}
              className="px-2 py-0.5 rounded bg-slate-800 text-slate-200 border border-slate-700 text-xs focus:outline-none focus:border-indigo-500"
            />
            <button
              type="submit"
              className="px-2 py-0.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded text-[11px] font-medium transition-colors"
            >
              Save
            </button>
            <button
              type="button"
              onClick={() => setIsEditing(false)}
              className="px-2 py-0.5 bg-slate-800 hover:bg-slate-700 text-slate-400 rounded text-[11px]"
            >
              Cancel
            </button>
          </form>
        ) : (
          <div className="flex items-center gap-2">
            <span className="font-mono text-slate-400 text-[11px] bg-slate-800/60 px-2 py-0.5 rounded border border-slate-800">
              {serverUrl}
            </span>
            <button
              onClick={() => setIsEditing(true)}
              className="text-slate-400 hover:text-slate-200 transition-colors text-[11px] underline underline-offset-2"
            >
              Change
            </button>
          </div>
        )}
      </div>

      <button
        onClick={onReconnect}
        className="flex items-center gap-1 px-2.5 py-1 rounded bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors text-xs font-medium border border-slate-700/50"
      >
        <RefreshCw className="w-3 h-3" />
        Reconnect
      </button>
    </div>
  );
};
