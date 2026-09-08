"use client";

import React, { useEffect, useState } from "react";
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
  remoteAudioRef: React.RefObject<HTMLAudioElement | null>;
  localStream?: MediaStream | null;
  remoteStream?: MediaStream | null;
  isRemoteVideoActive?: boolean;
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
  remoteAudioRef,
  localStream,
  remoteStream,
  isRemoteVideoActive = false,
  onEndCall,
  onToggleMute,
  onToggleVideo,
}) => {
  const [isVideoPlaying, setIsVideoPlaying] = useState(false);

  if (callState === "idle" || callState === "incoming") return null;

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  // Has live remote video track
  const hasLiveVideoTrack = Boolean(
    remoteStream &&
      remoteStream.getVideoTracks().length > 0 &&
      remoteStream.getVideoTracks().some((t) => t.readyState === "live" && t.enabled)
  );

  // Show live video if track is live, playing, or flagged active
  const shouldShowRemoteVideo =
    callState === "connected" &&
    callType === "video" &&
    (hasLiveVideoTrack || isRemoteVideoActive || isVideoPlaying);

  // Ensure remote audio and video streams are attached and playing with audio enabled
  useEffect(() => {
    if (remoteStream) {
      if (remoteVideoRef.current && remoteVideoRef.current.srcObject !== remoteStream) {
        remoteVideoRef.current.srcObject = remoteStream;
        remoteVideoRef.current.muted = false;
        remoteVideoRef.current.play().catch((e) => console.log("Remote video play deferred:", e));
      }
      if (remoteAudioRef.current && remoteAudioRef.current.srcObject !== remoteStream) {
        remoteAudioRef.current.srcObject = remoteStream;
        remoteAudioRef.current.muted = false;
        remoteAudioRef.current.volume = 1.0;
        remoteAudioRef.current.play().catch((e) => console.log("Remote audio play deferred:", e));
      }
    }
  }, [remoteStream, remoteVideoRef, remoteAudioRef, callState]);

  // Ensure local video stream is attached and playing (muted so user doesn't hear their own mic)
  useEffect(() => {
    if (localStream && localVideoRef.current && localVideoRef.current.srcObject !== localStream) {
      localVideoRef.current.srcObject = localStream;
      localVideoRef.current.muted = true;
      localVideoRef.current.play().catch(() => {});
    }
  }, [localStream, localVideoRef, callState]);

  // User gesture handler on any tap of the screen to un-block / play audio
  const handleUserGestureUnlock = () => {
    if (remoteVideoRef.current) {
      remoteVideoRef.current.muted = false;
      remoteVideoRef.current.play().catch(() => {});
    }
    if (remoteAudioRef.current) {
      remoteAudioRef.current.muted = false;
      remoteAudioRef.current.volume = 1.0;
      remoteAudioRef.current.play().catch(() => {});
    }
  };

  return (
    <div
      onClick={handleUserGestureUnlock}
      onTouchStart={handleUserGestureUnlock}
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/95 backdrop-blur-lg animate-in fade-in duration-200 select-none"
    >
      {/* Audio element for voice playback */}
      <audio
        ref={remoteAudioRef}
        autoPlay
        playsInline
        className="hidden"
      />

      <div className="relative w-full h-full md:max-w-5xl md:max-h-[85vh] md:rounded-3xl border border-slate-800 bg-slate-900 shadow-2xl overflow-hidden flex flex-col">
        
        {/* Remote Video & Avatar View Area */}
        <div className="relative flex-1 bg-slate-950 flex items-center justify-center overflow-hidden">
          
          {/* Always-mounted Remote Video Element for continuous stream playback.
              Notice: muted is NOT true. The remote peer's voice must play out of the speakers! */}
          {callType === "video" && (
            <video
              ref={remoteVideoRef}
              autoPlay
              playsInline
              onLoadedMetadata={(e) => {
                e.currentTarget.muted = false;
                e.currentTarget.play().catch(() => {});
                setIsVideoPlaying(true);
              }}
              onCanPlay={(e) => {
                e.currentTarget.muted = false;
                e.currentTarget.play().catch(() => {});
                setIsVideoPlaying(true);
              }}
              onPlay={() => setIsVideoPlaying(true)}
              onPlaying={() => setIsVideoPlaying(true)}
              className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-300 ${
                shouldShowRemoteVideo ? "opacity-100 z-10" : "opacity-0 pointer-events-none"
              }`}
            />
          )}

          {/* Remote User Profile Card (Visible ONLY when video is off, loading, or for audio calls) */}
          {!shouldShowRemoteVideo && (
            <div className="flex flex-col items-center justify-center text-center p-6 z-0">
              <div className="relative mb-5">
                {callState === "calling" ? (
                  <div className="absolute -inset-2 rounded-full bg-indigo-500/30 animate-ping" />
                ) : (
                  <div className="absolute -inset-3 rounded-full bg-indigo-600/20 animate-pulse" />
                )}
                <img
                  src={
                    peerInfo?.avatar ||
                    "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=250&q=80"
                  }
                  alt={peerInfo?.name || "Remote User"}
                  className="w-32 h-32 md:w-44 md:h-44 rounded-full object-cover ring-4 ring-indigo-500/60 shadow-2xl relative z-10"
                />
              </div>

              <h2 className="text-xl md:text-2xl font-bold text-slate-100 mb-1.5 flex items-center gap-2">
                <span>{peerInfo?.name || "User"}</span>
              </h2>

              <p className="text-xs text-indigo-400 font-medium tracking-wide">
                {callState === "calling"
                  ? "Ringing..."
                  : callType === "video"
                  ? shouldShowRemoteVideo
                    ? `Live Video Call (${formatDuration(callDuration)})`
                    : `Connecting Video (${formatDuration(callDuration)})...`
                  : `Live Audio Call (${formatDuration(callDuration)})`}
              </p>
            </div>
          )}

          {/* Local Self Camera Preview (Picture in Picture for Video Calls)
              Local camera MUST be muted so user does not hear their own microphone looped back */}
          {callType === "video" && (
            <div className="absolute bottom-4 right-4 w-28 h-40 sm:w-36 sm:h-52 md:w-48 md:h-64 rounded-2xl overflow-hidden border-2 border-indigo-500/70 shadow-2xl bg-slate-900 flex items-center justify-center z-20 transition-all">
              <video
                ref={localVideoRef}
                autoPlay
                playsInline
                muted
                className={`w-full h-full object-cover scale-x-[-1] ${isVideoOff ? "hidden" : "block"}`}
              />
              {isVideoOff && (
                <div className="flex flex-col items-center justify-center text-slate-400 gap-1.5 p-2 text-center">
                  <User className="w-8 h-8 text-slate-500" />
                  <span className="text-[11px] font-medium text-slate-400">Camera Off</span>
                </div>
              )}
            </div>
          )}

          {/* Top Bar Header Badge */}
          <div className="absolute top-4 left-4 right-4 flex items-center justify-between z-20 pointer-events-none">
            <div className="bg-slate-900/85 backdrop-blur-md px-4 py-2 rounded-2xl border border-slate-800 text-xs font-semibold text-slate-200 flex items-center gap-2.5 shadow-lg">
              <span className={`w-2.5 h-2.5 rounded-full ${callState === "connected" ? "bg-emerald-500 animate-pulse" : "bg-amber-500 animate-ping"}`} />
              <span className="max-w-[140px] sm:max-w-none truncate">{peerInfo?.name || "Connected"}</span>
              {callState === "connected" && (
                <span className="text-slate-400 ml-1 font-mono font-normal">
                  {formatDuration(callDuration)}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Bottom Call Controls Action Bar */}
        <div className="p-4 md:p-6 bg-slate-900/95 border-t border-slate-800 flex items-center justify-center gap-6 z-30">
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
