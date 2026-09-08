"use client";

import React, { useEffect, useState, useCallback } from "react";
import { Mic, MicOff, Video, VideoOff, PhoneOff, User, Volume2 } from "lucide-react";

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
  const [isLocalSpeaking, setIsLocalSpeaking] = useState(false);
  const [localVolumeLevel, setLocalVolumeLevel] = useState(0);
  const [isRemoteSpeaking, setIsRemoteSpeaking] = useState(false);
  const [isAudioBlocked, setIsAudioBlocked] = useState(false);

  const formatDuration = (seconds: number) => {
    const total = Math.max(0, Math.floor(seconds || 0));
    const mins = Math.floor(total / 60);
    const secs = total % 60;
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  // 1. Separate Audio & Video tracks so Chromium never mutes remote voice audio
  useEffect(() => {
    if (callState === "idle" || callState === "incoming") return;
    try {
      if (remoteStream) {
        // Attach audio tracks to <audio> (unmuted, volume 1.0)
        const audioTracks = remoteStream.getAudioTracks();
        if (audioTracks.length > 0 && remoteAudioRef.current) {
          audioTracks.forEach((t) => (t.enabled = true));
          if (remoteAudioRef.current.srcObject !== remoteStream) {
            remoteAudioRef.current.srcObject = remoteStream;
          }
          remoteAudioRef.current.muted = false;
          remoteAudioRef.current.volume = 1.0;
          remoteAudioRef.current.play().then(() => {
            setIsAudioBlocked(false);
          }).catch((e) => {
            console.log("Remote audio autoplay waiting interaction:", e);
            setIsAudioBlocked(true);
          });
        }

        // Attach video tracks ONLY to <video> (muted to satisfy autoplay)
        const videoTracks = remoteStream.getVideoTracks();
        if (videoTracks.length > 0 && remoteVideoRef.current) {
          const currentVideoSrc = remoteVideoRef.current.srcObject as MediaStream | null;
          const isSameVideo = currentVideoSrc && currentVideoSrc.getVideoTracks().some((t) => t.id === videoTracks[0].id);
          if (!isSameVideo) {
            remoteVideoRef.current.srcObject = new MediaStream(videoTracks);
          }
          remoteVideoRef.current.muted = true;
          remoteVideoRef.current.play().catch(() => {});
        }
      }
    } catch (e) {
      console.warn("Error attaching remote stream:", e);
    }
  }, [remoteStream, remoteVideoRef, remoteAudioRef, callState]);

  // 2. Attach local video track
  useEffect(() => {
    if (callState === "idle" || callState === "incoming") return;
    try {
      if (localStream && localVideoRef.current) {
        const videoTracks = localStream.getVideoTracks();
        if (videoTracks.length > 0) {
          localVideoRef.current.muted = true;
          localVideoRef.current.srcObject = new MediaStream(videoTracks);
          localVideoRef.current.play().catch(() => {});
        }
      }
    } catch (e) {
      console.warn("Error attaching local stream:", e);
    }
  }, [localStream, localVideoRef, callState]);

  // 3. Real-time Google Meet Style Voice Volume Detection for Local Mic
  useEffect(() => {
    if (callState === "idle" || callState === "incoming" || !localStream || isMuted) {
      setIsLocalSpeaking(false);
      setLocalVolumeLevel(0);
      return;
    }
    const audioTrack = localStream.getAudioTracks()[0];
    if (!audioTrack || !audioTrack.enabled) {
      setIsLocalSpeaking(false);
      setLocalVolumeLevel(0);
      return;
    }

    let audioCtx: AudioContext | null = null;
    let analyser: AnalyserNode | null = null;
    let source: MediaStreamAudioSourceNode | null = null;
    let animId: number | null = null;
    let clonedTrack: MediaStreamTrack | null = null;

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
        
        // Clone track to completely isolate Web Audio from WebRTC transmission on mobile
        clonedTrack = audioTrack.clone();
        source = audioCtx.createMediaStreamSource(new MediaStream([clonedTrack]));
        source.connect(analyser);

        const dataArray = new Uint8Array(analyser.frequencyBinCount);
        const checkVolume = () => {
          if (!analyser) return;
          analyser.getByteFrequencyData(dataArray);
          let sum = 0;
          for (let i = 0; i < dataArray.length; i++) {
            sum += dataArray[i];
          }
          const average = sum / dataArray.length;
          setIsLocalSpeaking(average > 8);
          setLocalVolumeLevel(Math.min(100, Math.round(average * 2.2)));
          animId = requestAnimationFrame(checkVolume);
        };
        checkVolume();
      }
    } catch (e) {
      console.warn("Local audio analyzer error:", e);
    }

    return () => {
      if (animId) cancelAnimationFrame(animId);
      if (source) {
        try { source.disconnect(); } catch (e) {}
      }
      if (clonedTrack) {
        try { clonedTrack.stop(); } catch (e) {}
      }
      if (audioCtx && audioCtx.state !== "closed") {
        try { audioCtx.close().catch(() => {}); } catch (e) {}
      }
    };
  }, [localStream, isMuted, callState]);

  // 4. Real-time Voice Volume Detection for Remote Peer (Speaking Indicator)
  useEffect(() => {
    if (callState === "idle" || callState === "incoming" || !remoteStream) {
      setIsRemoteSpeaking(false);
      return;
    }
    const audioTrack = remoteStream.getAudioTracks()[0];
    if (!audioTrack || !audioTrack.enabled) {
      setIsRemoteSpeaking(false);
      return;
    }

    let audioCtx: AudioContext | null = null;
    let analyser: AnalyserNode | null = null;
    let source: MediaStreamAudioSourceNode | null = null;
    let animId: number | null = null;
    let clonedTrack: MediaStreamTrack | null = null;

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
        clonedTrack = audioTrack.clone();
        source = audioCtx.createMediaStreamSource(new MediaStream([clonedTrack]));
        source.connect(analyser);

        const dataArray = new Uint8Array(analyser.frequencyBinCount);
        const checkVolume = () => {
          if (!analyser) return;
          analyser.getByteFrequencyData(dataArray);
          let sum = 0;
          for (let i = 0; i < dataArray.length; i++) {
            sum += dataArray[i];
          }
          const average = sum / dataArray.length;
          setIsRemoteSpeaking(average > 8);
          animId = requestAnimationFrame(checkVolume);
        };
        checkVolume();
      }
    } catch (e) {}

    return () => {
      if (animId) cancelAnimationFrame(animId);
      if (source) {
        try { source.disconnect(); } catch (e) {}
      }
      if (clonedTrack) {
        try { clonedTrack.stop(); } catch (e) {}
      }
      if (audioCtx && audioCtx.state !== "closed") {
        try { audioCtx.close().catch(() => {}); } catch (e) {}
      }
    };
  }, [remoteStream, callState]);

  // User gesture tap to guarantee audio unpause
  const handleOverlayTap = useCallback(() => {
    try {
      if (remoteAudioRef.current) {
        remoteAudioRef.current.muted = false;
        remoteAudioRef.current.volume = 1.0;
        if (remoteAudioRef.current.paused) {
          remoteAudioRef.current.play().then(() => {
            setIsAudioBlocked(false);
          }).catch(() => {});
        } else {
          setIsAudioBlocked(false);
        }
      }
    } catch (e) {}
  }, [remoteAudioRef]);

  if (callState === "idle" || callState === "incoming") return null;

  const showLiveVideo = Boolean(isRemoteVideoActive && callState === "connected" && callType === "video");

  return (
    <div
      onClick={handleOverlayTap}
      onTouchStart={handleOverlayTap}
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/95 backdrop-blur-lg animate-in fade-in duration-200 select-none"
    >
      {/* Dedicated audio element ensuring voice is always delivered loud and clear without echo */}
      <audio
        ref={remoteAudioRef}
        autoPlay
        playsInline
      />

      <div className="relative w-full h-full md:max-w-5xl md:max-h-[85vh] md:rounded-3xl border border-slate-800 bg-slate-900 shadow-2xl overflow-hidden flex flex-col">
        
        {/* Remote Video & Avatar View Area */}
        <div className="relative flex-1 bg-slate-950 flex items-center justify-center overflow-hidden">
          
          {/* Remote Video Element (Muted so mobile browser allows autoplay; voice is routed to <audio> above) */}
          {callType === "video" && (
            <video
              ref={remoteVideoRef}
              autoPlay
              playsInline
              muted
              className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-300 ${
                showLiveVideo ? "opacity-100 z-10" : "opacity-0 pointer-events-none"
              }`}
            />
          )}

          {/* Remote User Profile Card (Visible when remote video is connecting, audio call, or ringing) */}
          <div className="flex flex-col items-center justify-center text-center p-6 z-0">
            <div className="relative mb-6">
              {/* Google Meet Style Pulse Halos when remote peer is talking */}
              {isRemoteSpeaking ? (
                <>
                  <div className="absolute -inset-4 rounded-full border-2 border-emerald-400/60 animate-ping pointer-events-none" />
                  <div className="absolute -inset-2 rounded-full bg-emerald-500/25 animate-pulse pointer-events-none" />
                </>
              ) : callState === "calling" ? (
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
                className={`w-32 h-32 md:w-44 md:h-44 rounded-full object-cover transition-all duration-300 relative z-10 ${
                  isRemoteSpeaking
                    ? "ring-4 ring-emerald-400 shadow-2xl shadow-emerald-500/40 scale-105"
                    : "ring-4 ring-indigo-500/60 shadow-2xl"
                }`}
              />
            </div>

            <h2 className="text-xl md:text-2xl font-bold text-slate-100 mb-1.5 flex items-center justify-center gap-2">
              <span>{peerInfo?.name || "User"}</span>
              {isRemoteSpeaking && (
                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 animate-pulse">
                  Speaking
                </span>
              )}
            </h2>

            <p className="text-xs text-indigo-400 font-medium tracking-wide flex items-center justify-center gap-1.5">
              {callState === "calling"
                ? "Ringing..."
                : callType === "video"
                ? showLiveVideo
                  ? `Live Video Call (${formatDuration(callDuration)})`
                  : `Connecting Video (${formatDuration(callDuration)})...`
                : `Live Audio Call (${formatDuration(callDuration)})`}
            </p>
          </div>

          {/* Local Self Camera Preview (Picture in Picture for Video Calls) */}
          {callType === "video" && (
            <div
              className={`absolute bottom-4 right-4 w-28 h-40 sm:w-36 sm:h-52 md:w-48 md:h-64 rounded-2xl overflow-hidden shadow-2xl bg-slate-900 flex items-center justify-center z-20 transition-all border-2 ${
                isLocalSpeaking && !isMuted
                  ? "border-emerald-400 shadow-emerald-500/30 ring-2 ring-emerald-400/50"
                  : "border-indigo-500/70"
              }`}
            >
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

            {/* Speaking Status Pill (Google Meet Style) */}
            {isLocalSpeaking && !isMuted && (
              <div className="bg-emerald-950/80 backdrop-blur-md px-3 py-1.5 rounded-full border border-emerald-500/40 text-[11px] font-medium text-emerald-300 flex items-center gap-1.5 shadow-lg animate-in fade-in duration-150">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                <span>Microphone Active</span>
              </div>
            )}
          </div>

          {/* Mobile Sound Unblock Banner */}
          {isAudioBlocked && (
            <div className="absolute top-16 left-1/2 -translate-x-1/2 z-30 pointer-events-auto">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleOverlayTap();
                }}
                className="bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold px-4 py-2 rounded-full shadow-2xl flex items-center gap-2 animate-bounce text-xs transition-all active:scale-95 cursor-pointer"
              >
                <Volume2 className="w-4 h-4" />
                <span>Tap here to enable sound</span>
              </button>
            </div>
          )}
        </div>

        {/* Bottom Call Controls Action Bar */}
        <div className="p-4 md:p-6 bg-slate-900/95 border-t border-slate-800 flex items-center justify-center gap-6 z-30">
          
          {/* Mute Mic Button with Google Meet Style Speaking Animation */}
          <div className="relative flex items-center justify-center">
            {/* Pulsing rings when user is actively talking (Google Meet effect) */}
            {isLocalSpeaking && !isMuted && (
              <>
                <span className="absolute -inset-2.5 rounded-2xl bg-emerald-500/30 animate-ping pointer-events-none" />
                <span className="absolute -inset-1 rounded-2xl bg-emerald-400/25 animate-pulse pointer-events-none" />
              </>
            )}

            <button
              onClick={() => {
                onToggleMute();
                handleOverlayTap();
              }}
              title={isMuted ? "Unmute Mic" : "Mute Mic"}
              className={`relative p-3.5 md:p-4 rounded-2xl transition-all shadow-md active:scale-95 flex items-center gap-2 ${
                isMuted
                  ? "bg-rose-500/20 text-rose-300 border border-rose-500/40 hover:bg-rose-500/30"
                  : isLocalSpeaking
                  ? "bg-emerald-600 text-white border border-emerald-400 shadow-emerald-500/40 shadow-lg scale-105"
                  : "bg-slate-800 text-slate-200 border border-slate-700 hover:bg-slate-700"
              }`}
            >
              {isMuted ? (
                <MicOff className="w-5 h-5 md:w-6 md:h-6" />
              ) : (
                <>
                  <Mic className="w-5 h-5 md:w-6 md:h-6" />
                  {/* Google Meet 3-Bar Audio Equalizer Wave Animation */}
                  <div className="flex items-end gap-0.5 h-4 w-3.5 pb-0.5">
                    <span
                      className={`w-0.5 rounded-full transition-all duration-75 ${
                        isLocalSpeaking ? "bg-white" : "bg-slate-500"
                      }`}
                      style={{
                        height: isLocalSpeaking
                          ? `${Math.max(25, Math.min(100, localVolumeLevel * 0.8))}%`
                          : "30%",
                      }}
                    />
                    <span
                      className={`w-0.5 rounded-full transition-all duration-75 ${
                        isLocalSpeaking ? "bg-white" : "bg-slate-500"
                      }`}
                      style={{
                        height: isLocalSpeaking
                          ? `${Math.max(40, Math.min(100, localVolumeLevel * 1.3))}%`
                          : "45%",
                      }}
                    />
                    <span
                      className={`w-0.5 rounded-full transition-all duration-75 ${
                        isLocalSpeaking ? "bg-white" : "bg-slate-500"
                      }`}
                      style={{
                        height: isLocalSpeaking
                          ? `${Math.max(20, Math.min(100, localVolumeLevel * 0.6))}%`
                          : "20%",
                      }}
                    />
                  </div>
                </>
              )}
            </button>
          </div>

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
              onClick={() => {
                onToggleVideo();
                handleOverlayTap();
              }}
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
