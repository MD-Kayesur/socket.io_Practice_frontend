"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { getSocket } from "@/lib/socket";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

const RTC_CONFIG: RTCConfiguration = {
  iceServers: [
    { urls: "stun:stun.l.google.com:19302" },
    { urls: "stun:stun1.l.google.com:19302" },
    { urls: "stun:stun2.l.google.com:19302" },
  ],
};

export interface IncomingCallData {
  callerId: string;
  callerName: string;
  callerAvatar?: string;
  signalData: RTCSessionDescriptionInit;
  callType: "audio" | "video";
}

export const useWebRTC = (currentUserId: string, currentUserName: string, currentUserAvatar?: string) => {
  const [callState, setCallState] = useState<"idle" | "calling" | "incoming" | "connected">("idle");
  const [callType, setCallType] = useState<"audio" | "video">("video");
  const [peerInfo, setPeerInfo] = useState<{ id: string; name: string; avatar?: string } | null>(null);
  const [incomingCall, setIncomingCall] = useState<IncomingCallData | null>(null);

  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(false);
  const [callDuration, setCallDuration] = useState(0);

  const peerConnectionRef = useRef<RTCPeerConnection | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const remoteStreamRef = useRef<MediaStream | null>(null);
  const durationTimerRef = useRef<NodeJS.Timeout | null>(null);
  const remotePeerIdRef = useRef<string | null>(null);

  // References for video elements
  const localVideoRef = useRef<HTMLVideoElement | null>(null);
  const remoteVideoRef = useRef<HTMLVideoElement | null>(null);

  // Play ringing sound
  const playRingtone = useCallback(() => {
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sine";
      osc.frequency.setValueAtTime(440, ctx.currentTime);
      gain.gain.setValueAtTime(0.1, ctx.currentTime);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 1.5);
    } catch (e) {}
  }, []);

  // Cleanup peer connection and media streams
  const cleanupCall = useCallback(() => {
    if (durationTimerRef.current) {
      clearInterval(durationTimerRef.current);
      durationTimerRef.current = null;
    }
    setCallDuration(0);

    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((track) => track.stop());
      localStreamRef.current = null;
    }

    if (peerConnectionRef.current) {
      peerConnectionRef.current.close();
      peerConnectionRef.current = null;
    }

    if (localVideoRef.current) localVideoRef.current.srcObject = null;
    if (remoteVideoRef.current) remoteVideoRef.current.srcObject = null;

    remoteStreamRef.current = null;
    remotePeerIdRef.current = null;
    setCallState("idle");
    setPeerInfo(null);
    setIncomingCall(null);
    setIsMuted(false);
    setIsVideoOff(false);
  }, []);

  // Initialize WebRTC PeerConnection
  const createPeerConnection = useCallback((remoteUserId: string) => {
    const pc = new RTCPeerConnection(RTC_CONFIG);
    peerConnectionRef.current = pc;
    remotePeerIdRef.current = remoteUserId;

    pc.onicecandidate = (event) => {
      if (event.candidate) {
        const socket = getSocket(API_URL);
        socket.emit("iceCandidate", {
          to: remoteUserId,
          candidate: event.candidate,
        });
      }
    };

    pc.ontrack = (event) => {
      if (event.streams && event.streams[0]) {
        remoteStreamRef.current = event.streams[0];
        if (remoteVideoRef.current) {
          remoteVideoRef.current.srcObject = event.streams[0];
        }
      }
    };

    return pc;
  }, []);

  // Get user media stream (mic & camera)
  const getUserMedia = useCallback(async (type: "audio" | "video") => {
    try {
      const constraints: MediaStreamConstraints = {
        audio: true,
        video: type === "video" ? { width: { ideal: 1280 }, height: { ideal: 720 } } : false,
      };
      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      localStreamRef.current = stream;
      if (localVideoRef.current) {
        localVideoRef.current.srcObject = stream;
      }
      return stream;
    } catch (err) {
      console.error("Failed to access media devices:", err);
      alert("Could not access microphone or camera. Please check browser permissions.");
      throw err;
    }
  }, []);

  // Initiate call to recipient
  const startCall = useCallback(
    async (recipient: { id: string; name: string; avatar?: string }, type: "audio" | "video" = "video") => {
      setCallType(type);
      setPeerInfo(recipient);
      setCallState("calling");

      try {
        const stream = await getUserMedia(type);
        const pc = createPeerConnection(recipient.id);

        stream.getTracks().forEach((track) => pc.addTrack(track, stream));

        const offer = await pc.createOffer();
        await pc.setLocalDescription(offer);

        const socket = getSocket(API_URL);
        socket.emit("callUser", {
          recipientId: recipient.id,
          callerId: currentUserId,
          callerName: currentUserName,
          callerAvatar: currentUserAvatar,
          signalData: offer,
          callType: type,
        });
      } catch (err) {
        cleanupCall();
      }
    },
    [createPeerConnection, currentUserId, currentUserAvatar, currentUserName, getUserMedia, cleanupCall]
  );

  // Accept incoming call
  const acceptCall = useCallback(async () => {
    if (!incomingCall) return;

    setCallState("connected");
    setPeerInfo({
      id: incomingCall.callerId,
      name: incomingCall.callerName,
      avatar: incomingCall.callerAvatar,
    });
    setCallType(incomingCall.callType);

    try {
      const stream = await getUserMedia(incomingCall.callType);
      const pc = createPeerConnection(incomingCall.callerId);

      stream.getTracks().forEach((track) => pc.addTrack(track, stream));

      await pc.setRemoteDescription(new RTCSessionDescription(incomingCall.signalData));

      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);

      const socket = getSocket(API_URL);
      socket.emit("answerCall", {
        callerId: incomingCall.callerId,
        signalData: answer,
      });

      // Start duration timer
      durationTimerRef.current = setInterval(() => {
        setCallDuration((prev) => prev + 1);
      }, 1000);

      setIncomingCall(null);
    } catch (err) {
      cleanupCall();
    }
  }, [incomingCall, getUserMedia, createPeerConnection, cleanupCall]);

  // Reject incoming call
  const rejectCall = useCallback(() => {
    if (incomingCall) {
      const socket = getSocket(API_URL);
      socket.emit("rejectCall", { callerId: incomingCall.callerId });
    }
    cleanupCall();
  }, [incomingCall, cleanupCall]);

  // Hangup / End ongoing call
  const endCall = useCallback(() => {
    const remoteId = peerInfo?.id || remotePeerIdRef.current;
    if (remoteId) {
      const socket = getSocket(API_URL);
      socket.emit("endCall", { to: remoteId });
    }
    cleanupCall();
  }, [peerInfo, cleanupCall]);

  // Toggle Mute Audio
  const toggleMute = useCallback(() => {
    if (localStreamRef.current) {
      const audioTrack = localStreamRef.current.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled;
        setIsMuted(!audioTrack.enabled);
      }
    }
  }, []);

  // Toggle Camera Video
  const toggleVideo = useCallback(() => {
    if (localStreamRef.current) {
      const videoTrack = localStreamRef.current.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.enabled = !videoTrack.enabled;
        setIsVideoOff(!videoTrack.enabled);
      }
    }
  }, []);

  // Socket event listeners for WebRTC signaling
  useEffect(() => {
    const socket = getSocket(API_URL);

    const handleIncomingCall = (data: IncomingCallData) => {
      setIncomingCall(data);
      setCallState("incoming");
      playRingtone();
    };

    const handleCallAccepted = async (data: { signalData: RTCSessionDescriptionInit }) => {
      setCallState("connected");
      if (peerConnectionRef.current) {
        await peerConnectionRef.current.setRemoteDescription(new RTCSessionDescription(data.signalData));
      }
      durationTimerRef.current = setInterval(() => {
        setCallDuration((prev) => prev + 1);
      }, 1000);
    };

    const handleCallRejected = () => {
      alert("Call was declined.");
      cleanupCall();
    };

    const handleCallEnded = () => {
      cleanupCall();
    };

    const handleIceCandidate = async (data: { candidate: RTCIceCandidateInit }) => {
      if (peerConnectionRef.current && data.candidate) {
        try {
          await peerConnectionRef.current.addIceCandidate(new RTCIceCandidate(data.candidate));
        } catch (err) {
          console.error("Error adding ICE candidate:", err);
        }
      }
    };

    socket.on("incomingCall", handleIncomingCall);
    socket.on("callAccepted", handleCallAccepted);
    socket.on("callRejected", handleCallRejected);
    socket.on("callEnded", handleCallEnded);
    socket.on("iceCandidate", handleIceCandidate);

    return () => {
      socket.off("incomingCall", handleIncomingCall);
      socket.off("callAccepted", handleCallAccepted);
      socket.off("callRejected", handleCallRejected);
      socket.off("callEnded", handleCallEnded);
      socket.off("iceCandidate", handleIceCandidate);
    };
  }, [playRingtone, cleanupCall]);

  return {
    callState,
    callType,
    peerInfo,
    incomingCall,
    isMuted,
    isVideoOff,
    callDuration,
    localVideoRef,
    remoteVideoRef,
    startCall,
    acceptCall,
    rejectCall,
    endCall,
    toggleMute,
    toggleVideo,
  };
};
