"use client";

import React, { useEffect, useRef, useState, useCallback } from "react";
import { Mic, MicOff, Video, VideoOff, PhoneOff, User, Users, Volume2 } from "lucide-react";
import { GroupParticipant } from "@/hooks/useGroupWebRTC";

interface GroupCallOverlayProps {
  isOpen: boolean;
  group: { id: string; name: string; avatar?: string } | null;
  callType: "audio" | "video";
  callDuration: number;
  localStream: MediaStream | null;
  participants: GroupParticipant[];
  isMuted: boolean;
  isVideoOff: boolean;
  currentUserId: string;
  currentUserName: string;
  currentUserAvatar?: string;
  onLeaveCall: () => void;
  onToggleMute: () => void;
  onToggleVideo: () => void;
}

// Single Participant Video Tile Component
const ParticipantTile: React.FC<{
  participant: GroupParticipant;
  callType: "audio" | "video";
  isLocal?: boolean;
  localVideoOff?: boolean;
  localMuted?: boolean;
}> = ({ participant, callType, isLocal = false, localVideoOff = false, localMuted = false }) => {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [hasVideoTrack, setHasVideoTrack] = useState(false);

  // Attach media stream to video element
  useEffect(() => {
    if (!videoRef.current || !participant.stream) return;

    try {
      videoRef.current.srcObject = participant.stream;
      videoRef.current.muted = isLocal; // Local must be muted to avoid self-echo; remote unmuted for loudspeaker
      if (!isLocal) {
        videoRef.current.volume = 1.0;
      }
      videoRef.current.play().catch(() => {});
    } catch (e) {
      console.warn("Tile video play error:", e);
    }

    const videoTracks = participant.stream.getVideoTracks();
    setHasVideoTrack(videoTracks.length > 0 && videoTracks[0].enabled);
  }, [participant.stream, isLocal]);

  // Voice activity detection for Google Meet style speaking halo
  useEffect(() => {
    if (!participant.stream || (isLocal && localMuted)) {
      setIsSpeaking(false);
      return;
    }

    const audioTrack = participant.stream.getAudioTracks()[0];
    if (!audioTrack || !audioTrack.enabled) {
      setIsSpeaking(false);
      return;
    }

    let audioCtx: AudioContext | null = null;
    let analyser: AnalyserNode | null = null;
    let source: MediaStreamAudioSourceNode | null = null;
    let animId: number | null = null;

    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioCtx) {
        audioCtx = new AudioCtx();
        if (audioCtx.state === "suspended") {
          audioCtx.resume().catch(() => {});
        }
        analyser = audioCtx.createAnalyser();
        analyser.fftSize = 256;
        analyser.smoothingTimeConstant = 0.4;
        source = audioCtx.createMediaStreamSource(new MediaStream([audioTrack]));
        source.connect(analyser);

        const dataArray = new Uint8Array(analyser.frequencyBinCount);
        let lastUpdate = 0;
        const checkVol = () => {
          if (!analyser) return;
          analyser.getByteFrequencyData(dataArray);
          let sum = 0;
          for (let i = 0; i < dataArray.length; i++) {
            sum += dataArray[i];
          }
          const avg = sum / dataArray.length;
          const now = performance.now();
          if (now - lastUpdate > 100) {
            lastUpdate = now;
            setIsSpeaking(avg > 10);
          }
          animId = requestAnimationFrame(checkVol);
        };
        checkVol();
      }
    } catch (e) {}

    return () => {
      if (animId) cancelAnimationFrame(animId);
      if (source) {
        try { source.disconnect(); } catch (e) {}
      }
      if (audioCtx && audioCtx.state !== "closed") {
        try { audioCtx.close().catch(() => {}); } catch (e) {}
      }
    };
  }, [participant.stream, isLocal, localMuted]);

  const showVideo = Boolean(callType === "video" && (isLocal ? !localVideoOff : hasVideoTrack));

  return (
    <div
      className={`relative w-full h-full bg-slate-900/90 rounded-2xl md:rounded-3xl border overflow-hidden flex items-center justify-center transition-all duration-300 shadow-xl ${
        isSpeaking
          ? "border-emerald-400 ring-2 ring-emerald-400/50 shadow-emerald-500/20"
          : "border-slate-800"
      }`}
    >
      {/* Video Element */}
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted={isLocal}
        className={`w-full h-full object-cover transition-opacity duration-300 ${
          showVideo ? "opacity-100" : "opacity-0 pointer-events-none"
        } ${isLocal ? "scale-x-[-1]" : ""}`}
      />

      {/* Avatar Fallback View (When camera is off or in audio call) */}
      {!showVideo && (
        <div className="absolute inset-0 flex flex-col items-center justify-center p-4">
          <div className="relative mb-3">
            {isSpeaking && (
              <>
                <div className="absolute -inset-3 rounded-full border-2 border-emerald-400/60 animate-ping pointer-events-none" />
                <div className="absolute -inset-1.5 rounded-full bg-emerald-500/20 animate-pulse pointer-events-none" />
              </>
            )}
            <img
              src={
                participant.avatar ||
                "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=250&q=80"
              }
              alt={participant.name}
              className={`w-20 h-20 md:w-28 md:h-28 rounded-full object-cover relative z-10 transition-all ${
                isSpeaking ? "ring-4 ring-emerald-400 shadow-lg shadow-emerald-500/30 scale-105" : "ring-2 ring-slate-700"
              }`}
            />
          </div>
          <p className="text-sm font-semibold text-slate-200 truncate max-w-[160px]">
            {participant.name} {isLocal && "(You)"}
          </p>
        </div>
      )}

      {/* Bottom Floating Info Badge */}
      <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between pointer-events-none z-10">
        <div className="bg-slate-950/80 backdrop-blur-md px-2.5 py-1 rounded-xl border border-slate-800/80 text-xs font-medium text-slate-200 flex items-center gap-1.5 shadow">
          {isSpeaking && <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />}
          <span className="truncate max-w-[120px]">{participant.name} {isLocal && "(You)"}</span>
        </div>

        {((isLocal && localMuted) || (!isLocal && !participant.stream)) && (
          <div className="bg-rose-950/80 backdrop-blur-md p-1.5 rounded-xl border border-rose-800/80 text-rose-300 shadow">
            <MicOff className="w-3.5 h-3.5" />
          </div>
        )}
      </div>
    </div>
  );
};

export const GroupCallOverlay: React.FC<GroupCallOverlayProps> = ({
  isOpen,
  group,
  callType,
  callDuration,
  localStream,
  participants,
  isMuted,
  isVideoOff,
  currentUserId,
  currentUserName,
  currentUserAvatar,
  onLeaveCall,
  onToggleMute,
  onToggleVideo,
}) => {
  if (!isOpen) return null;

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  // Total tiles = local user + remote participants
  const totalTiles = 1 + participants.length;

  // Compute adaptive responsive grid layout
  const getGridClass = () => {
    if (totalTiles === 1) return "grid-cols-1 max-w-2xl";
    if (totalTiles === 2) return "grid-cols-1 md:grid-cols-2 max-w-4xl";
    if (totalTiles <= 4) return "grid-cols-2 max-w-4xl";
    return "grid-cols-2 md:grid-cols-3 max-w-5xl";
  };

  const localParticipant: GroupParticipant = {
    id: currentUserId,
    name: currentUserName,
    avatar: currentUserAvatar,
    stream: localStream,
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/95 backdrop-blur-xl animate-in fade-in duration-200 select-none p-2 sm:p-4 md:p-6">
      <div className="relative w-full h-full max-w-6xl md:max-h-[90vh] bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl flex flex-col overflow-hidden">
        
        {/* Top Header Bar */}
        <div className="px-6 py-4 border-b border-slate-800 bg-slate-900/90 flex items-center justify-between z-10 flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-indigo-600/30 border border-indigo-500/40 flex items-center justify-center text-indigo-400 font-bold overflow-hidden shadow">
              {group?.avatar ? (
                <img src={group.avatar} alt={group.name} className="w-full h-full object-cover" />
              ) : (
                <Users className="w-5 h-5" />
              )}
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-100 flex items-center gap-2">
                <span>{group?.name || "Group Call"}</span>
                <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                  {callType === "video" ? "Video Call" : "Audio Call"}
                </span>
              </h2>
              <p className="text-xs text-slate-400 flex items-center gap-2">
                <span>{totalTiles} participant{totalTiles > 1 ? "s" : ""}</span>
                <span>•</span>
                <span className="font-mono text-indigo-400 font-medium">{formatDuration(callDuration)}</span>
              </p>
            </div>
          </div>

          <div className="hidden sm:flex items-center gap-2 bg-slate-950/60 border border-slate-800 px-3 py-1.5 rounded-2xl text-xs text-slate-300">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span>Group Call Live</span>
          </div>
        </div>

        {/* Dynamic Participants Video Grid */}
        <div className="flex-1 p-3 sm:p-5 overflow-y-auto flex items-center justify-center">
          <div className={`grid gap-3 sm:gap-4 w-full h-full min-h-[300px] items-center justify-center ${getGridClass()}`}>
            
            {/* 1. Local Participant Tile */}
            <ParticipantTile
              participant={localParticipant}
              callType={callType}
              isLocal={true}
              localVideoOff={isVideoOff}
              localMuted={isMuted}
            />

            {/* 2. Remote Participants Tiles */}
            {participants.map((participant) => (
              <ParticipantTile
                key={participant.id}
                participant={participant}
                callType={callType}
                isLocal={false}
              />
            ))}
          </div>
        </div>

        {/* Bottom Floating Control Bar */}
        <div className="p-4 sm:p-5 bg-slate-950/90 border-t border-slate-800 flex items-center justify-center gap-4 sm:gap-6 z-20 flex-shrink-0">
          
          {/* Mute Mic Button */}
          <button
            onClick={onToggleMute}
            className={`w-12 h-12 sm:w-14 sm:h-14 rounded-full flex items-center justify-center shadow-lg transition-all active:scale-95 ${
              isMuted
                ? "bg-rose-600 hover:bg-rose-500 text-white shadow-rose-600/30"
                : "bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700"
            }`}
            title={isMuted ? "Unmute Microphone" : "Mute Microphone"}
          >
            {isMuted ? <MicOff className="w-5 h-5 sm:w-6 sm:h-6" /> : <Mic className="w-5 h-5 sm:w-6 sm:h-6" />}
          </button>

          {/* Toggle Camera Button (Only in Video calls) */}
          {callType === "video" && (
            <button
              onClick={onToggleVideo}
              className={`w-12 h-12 sm:w-14 sm:h-14 rounded-full flex items-center justify-center shadow-lg transition-all active:scale-95 ${
                isVideoOff
                  ? "bg-rose-600 hover:bg-rose-500 text-white shadow-rose-600/30"
                  : "bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700"
              }`}
              title={isVideoOff ? "Turn On Camera" : "Turn Off Camera"}
            >
              {isVideoOff ? <VideoOff className="w-5 h-5 sm:w-6 sm:h-6" /> : <Video className="w-5 h-5 sm:w-6 sm:h-6" />}
            </button>
          )}

          {/* Leave Call Button */}
          <button
            onClick={onLeaveCall}
            className="w-14 h-14 sm:w-16 sm:h-14 rounded-full bg-rose-600 hover:bg-rose-500 text-white flex items-center justify-center shadow-xl shadow-rose-600/40 transition-all active:scale-95 gap-2 px-4"
            title="Leave Group Call"
          >
            <PhoneOff className="w-6 h-6" />
            <span className="hidden sm:inline text-xs font-bold uppercase tracking-wider">Leave</span>
          </button>
        </div>
      </div>
    </div>
  );
};
