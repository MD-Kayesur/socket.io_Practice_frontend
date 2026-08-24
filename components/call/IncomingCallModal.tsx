"use client";

import React from "react";
import { IncomingCallData } from "@/hooks/useWebRTC";
import { Phone, PhoneOff, Video, Mic } from "lucide-react";

interface IncomingCallModalProps {
  incomingCall: IncomingCallData | null;
  onAccept: () => void;
  onReject: () => void;
}

export const IncomingCallModal: React.FC<IncomingCallModalProps> = ({
  incomingCall,
  onAccept,
  onReject,
}) => {
  if (!incomingCall) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-200 select-none">
      <div className="relative w-full max-w-sm bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl flex flex-col items-center text-center">
        {/* Ringing Animation Avatar */}
        <div className="relative mb-5">
          <div className="absolute inset-0 rounded-full bg-indigo-500/20 animate-ping" />
          <div className="absolute -inset-3 rounded-full border border-indigo-500/40 animate-pulse" />
          <img
            src={
              incomingCall.callerAvatar ||
              "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=250&q=80"
            }
            alt={incomingCall.callerName}
            className="w-24 h-24 rounded-full object-cover ring-4 ring-indigo-500 relative z-10 shadow-lg"
          />
          <span className="absolute bottom-0 right-0 z-20 p-2 bg-indigo-600 text-white rounded-full ring-4 ring-slate-900 shadow">
            {incomingCall.callType === "video" ? (
              <Video className="w-4 h-4" />
            ) : (
              <Mic className="w-4 h-4" />
            )}
          </span>
        </div>

        {/* Caller Info */}
        <h3 className="text-lg font-bold text-slate-100 mb-1 truncate w-full">
          {incomingCall.callerName}
        </h3>
        <p className="text-xs text-indigo-400 font-medium mb-6 animate-pulse">
          Incoming {incomingCall.callType === "video" ? "Video Call" : "Audio Call"}...
        </p>

        {/* Action Buttons */}
        <div className="flex items-center gap-6 w-full justify-center">
          {/* Decline Button */}
          <button
            onClick={onReject}
            className="flex flex-col items-center gap-1 group"
          >
            <div className="w-14 h-14 rounded-full bg-rose-600 hover:bg-rose-500 text-white flex items-center justify-center shadow-lg shadow-rose-600/30 transition-all active:scale-95">
              <PhoneOff className="w-6 h-6" />
            </div>
            <span className="text-[11px] font-semibold text-rose-400 group-hover:text-rose-300">
              Decline
            </span>
          </button>

          {/* Accept Button */}
          <button
            onClick={onAccept}
            className="flex flex-col items-center gap-1 group"
          >
            <div className="w-14 h-14 rounded-full bg-emerald-600 hover:bg-emerald-500 text-white flex items-center justify-center shadow-lg shadow-emerald-600/30 transition-all active:scale-95 animate-bounce">
              {incomingCall.callType === "video" ? (
                <Video className="w-6 h-6" />
              ) : (
                <Phone className="w-6 h-6" />
              )}
            </div>
            <span className="text-[11px] font-semibold text-emerald-400 group-hover:text-emerald-300">
              Accept
            </span>
          </button>
        </div>
      </div>
    </div>
  );
};
