"use client";

import React from "react";
import { Mic, MicOff, Video, VideoOff, PhoneOff, User } from "lucide-react";

interface VideoCallOverlayProps {
  callState: "idle" | "calling" | "incoming" | "connected";
  callType: "audio" | "video";
  peerInfo: { id: string; name: string; avatar?: string } | null;
  isMuted: boolean;
  isVideoOff: boolean;
  callDuration: number;
  localVideoRef: React.RefObject<HTMLVideoElement | null>;
  remoteVideoRef: React.RefObject<HTMLVideoElement | null>;
  onEndCall: () => void;
  onToggleMute: () => void;
  onToggleVideo: () => void;
}

export const VideoCallOverlay: React.FC<VideoCallOverlayProps> = ({
  callState,
  callType,
  peerInfo,
  isMuted,
  isVideoOff,
  callDuration,
  localVideoRef,
  remoteVideoRef,
  onEndCall,
  onToggleMute,
  onToggleVideo,
}) => {
  if (callState === "idle" || callState === "incoming") return null;

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/95 backdrop-blur-lg animate-in fade-in duration-200 select-none">
      <div className="relative w-full h-full md:max-w-5xl md:max-h-[85vh] md:rounded-3xl border border-slate-800 bg-slate-900 shadow-2xl overflow-hidden flex flex-col">
        
        {/* Remote Video / Audio Area */}
        <div className="relative flex-1 bg-slate-950 flex items-center justify-center overflow-hidden">
          {callState === "connected" && callType === "video" ? (
            <video
              ref={remoteVideoRef}
              autoPlay
              playsInline
              className="w-full h-full object-cover"
            />
          ) : (
            /* Audio Call / Calling State Placeholder */
            <div className="flex flex-col items-center justify-center text-center p-6">
              <div className="relative mb-4">
                {callState === "calling" && (
                  <div className="absolute inset-0 rounded-full bg-indigo-500/20 animate-ping" />
                )}
                <img
                  src={
                    peerInfo?.avatar ||
                    "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=250&q=80"
                  }
                  alt={peerInfo?.name}
                  className="w-32 h-32 md:w-40 md:h-40 rounded-full object-cover ring-4 ring-indigo-500/50 shadow-xl"
                />
              </div>

              <h2 className="text-xl md:text-2xl font-bold text-slate-100 mb-1">
                {peerInfo?.name || "Calling..."}
              </h2>

              <p className="text-xs text-indigo-400 font-medium">
                {callState === "calling"
                  ? "Ringing..."
                  : `In ${callType === "video" ? "Video" : "Audio"} Call (${formatDuration(callDuration)})`}
              </p>
            </div>
          )}

          {/* Local Self Camera Preview (Picture in Picture) */}
          {callType === "video" && (
            <div className="absolute bottom-4 right-4 w-32 h-44 md:w-48 md:h-64 rounded-2xl overflow-hidden border-2 border-indigo-500/50 shadow-2xl bg-slate-900 flex items-center justify-center z-20">
              <video
                ref={localVideoRef}
                autoPlay
                playsInline
                muted
                className={`w-full h-full object-cover ${isVideoOff ? "hidden" : "block"}`}
              />
              {isVideoOff && (
                <div className="flex flex-col items-center justify-center text-slate-400 gap-1">
                  <User className="w-8 h-8" />
                  <span className="text-[10px]">Camera Off</span>
                </div>
              )}
            </div>
          )}

          {/* Top Bar Header */}
          <div className="absolute top-4 left-4 right-4 flex items-center justify-between z-20 pointer-events-none">
            <div className="bg-slate-900/80 backdrop-blur-md px-4 py-2 rounded-2xl border border-slate-800 text-xs font-semibold text-slate-200 flex items-center gap-2 shadow">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
              <span>{peerInfo?.name}</span>
              {callState === "connected" && (
                <span className="text-slate-400 ml-1 font-mono">{formatDuration(callDuration)}</span>
              )}
            </div>
          </div>
        </div>

        {/* Bottom Call Controls Action Bar */}
        <div className="p-4 md:p-6 bg-slate-900/90 border-t border-slate-800 flex items-center justify-center gap-6 z-30">
          {/* Mute Mic Button */}
          <button
            onClick={onToggleMute}
            title={isMuted ? "Unmute Mic" : "Mute Mic"}
            className={`p-3.5 md:p-4 rounded-2xl transition-all shadow-md active:scale-95 ${
              isMuted
                ? "bg-amber-500/20 text-amber-300 border border-amber-500/40 hover:bg-amber-500/30"
                : "bg-slate-800 text-slate-200 border border-slate-700 hover:bg-slate-700"
            }`}
          >
            {isMuted ? <MicOff className="w-5 h-5 md:w-6 md:h-6" /> : <Mic className="w-5 h-5 md:w-6 md:h-6" />}
          </button>

          {/* End Call Button */}
          <button
            onClick={onEndCall}
            title="End Call"
            className="p-4 md:p-5 rounded-2xl bg-rose-600 hover:bg-rose-500 text-white shadow-lg shadow-rose-600/30 transition-all active:scale-95"
          >
            <PhoneOff className="w-6 h-6 md:w-7 md:h-7" />
          </button>

          {/* Toggle Camera Button */}
          {callType === "video" && (
            <button
              onClick={onToggleVideo}
              title={isVideoOff ? "Turn Camera On" : "Turn Camera Off"}
              className={`p-3.5 md:p-4 rounded-2xl transition-all shadow-md active:scale-95 ${
                isVideoOff
                  ? "bg-amber-500/20 text-amber-300 border border-amber-500/40 hover:bg-amber-500/30"
                  : "bg-slate-800 text-slate-200 border border-slate-700 hover:bg-slate-700"
              }`}
            >
              {isVideoOff ? <VideoOff className="w-5 h-5 md:w-6 md:h-6" /> : <Video className="w-5 h-5 md:w-6 md:h-6" />}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
