"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { getSocket } from "@/lib/socket";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

const RTC_CONFIG: RTCConfiguration = {
  iceServers: [
    { urls: "stun:stun.l.google.com:19302" },
    { urls: "stun:stun1.l.google.com:19302" },
    { urls: "stun:stun2.l.google.com:19302" },
    { urls: "stun:stun3.l.google.com:19302" },
    { urls: "stun:stun4.l.google.com:19302" },
    {
      urls: [
        "turn:openrelay.metered.ca:80",
        "turn:openrelay.metered.ca:443",
        "turn:openrelay.metered.ca:443?transport=tcp",
      ],
      username: "openrelay",
      credential: "openrelay",
    },
  ],
  iceCandidatePoolSize: 10,
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

  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);
  const [isRemoteVideoActive, setIsRemoteVideoActive] = useState(false);

  const peerConnectionRef = useRef<RTCPeerConnection | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const remoteStreamRef = useRef<MediaStream | null>(null);
  const durationTimerRef = useRef<NodeJS.Timeout | null>(null);
  const remotePeerIdRef = useRef<string | null>(null);
  const iceCandidatesQueueRef = useRef<RTCIceCandidateInit[]>([]);

  // References for video and audio elements
  const localVideoRef = useRef<HTMLVideoElement | null>(null);
  const remoteVideoRef = useRef<HTMLVideoElement | null>(null);
  const remoteAudioRef = useRef<HTMLAudioElement | null>(null);

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
    if (remoteAudioRef.current) remoteAudioRef.current.srcObject = null;

    remoteStreamRef.current = null;
    remotePeerIdRef.current = null;
    iceCandidatesQueueRef.current = [];
    setRemoteStream(null);
    setIsRemoteVideoActive(false);
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
      console.log("WebRTC received track:", event.track.kind);
      let stream = remoteStreamRef.current;
      if (event.streams && event.streams[0]) {
        stream = event.streams[0];
      } else {
        if (!stream) {
          stream = new MediaStream();
        }
        stream.addTrack(event.track);
      }
      remoteStreamRef.current = stream;
      setRemoteStream(stream);

      if (event.track.kind === "video") {
        setIsRemoteVideoActive(true);
        event.track.onmute = () => setIsRemoteVideoActive(false);
        event.track.onunmute = () => setIsRemoteVideoActive(true);
        event.track.onended = () => setIsRemoteVideoActive(false);
      }

      if (remoteVideoRef.current) {
        remoteVideoRef.current.srcObject = stream;
        remoteVideoRef.current.play().catch((e) => console.log("Remote video play deferred:", e));
      }
      if (remoteAudioRef.current) {
        remoteAudioRef.current.srcObject = stream;
        remoteAudioRef.current.play().catch((e) => console.log("Remote audio play deferred:", e));
      }
    };

    pc.oniceconnectionstatechange = () => {
      console.log("ICE Connection State:", pc.iceConnectionState);
    };

    return pc;
  }, []);

  // Get user media stream (mic & camera)
  const getUserMedia = useCallback(async (type: "audio" | "video") => {
    try {
      const constraints: MediaStreamConstraints = {
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
        video:
          type === "video"
            ? {
                facingMode: "user",
                width: { ideal: 1280 },
                height: { ideal: 720 },
              }
            : false,
      };
      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      localStreamRef.current = stream;
      if (localVideoRef.current) {
        localVideoRef.current.srcObject = stream;
        localVideoRef.current.play().catch(() => {});
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
      iceCandidatesQueueRef.current = [];

      try {
        const stream = await getUserMedia(type);
        const pc = createPeerConnection(recipient.id);

        stream.getTracks().forEach((track) => pc.addTrack(track, stream));

        const offer = await pc.createOffer({
          offerToReceiveAudio: true,
          offerToReceiveVideo: type === "video",
        });
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
        console.error("startCall error:", err);
        cleanupCall();
      }
    },
    [createPeerConnection, currentUserId, currentUserAvatar, currentUserName, getUserMedia, cleanupCall]
  );

  // Accept incoming call
  const acceptCall = useCallback(async () => {
    if (!incomingCall) return;

    const callerId = incomingCall.callerId;
    setCallState("connected");
    setPeerInfo({
      id: incomingCall.callerId,
      name: incomingCall.callerName,
      avatar: incomingCall.callerAvatar,
    });
    setCallType(incomingCall.callType);

    try {
      const stream = await getUserMedia(incomingCall.callType);
      const pc = createPeerConnection(callerId);

      stream.getTracks().forEach((track) => pc.addTrack(track, stream));

      await pc.setRemoteDescription(new RTCSessionDescription(incomingCall.signalData));

      // Process any ICE candidates that arrived before acceptCall was triggered
      if (iceCandidatesQueueRef.current.length > 0) {
        console.log(`Processing ${iceCandidatesQueueRef.current.length} queued ICE candidates`);
        for (const candidate of iceCandidatesQueueRef.current) {
          try {
            await pc.addIceCandidate(new RTCIceCandidate(candidate));
          } catch (e) {
            console.error("Error adding queued ICE candidate:", e);
          }
        }
        iceCandidatesQueueRef.current = [];
      }

      const answer = await pc.createAnswer({
        offerToReceiveAudio: true,
        offerToReceiveVideo: incomingCall.callType === "video",
      });
      await pc.setLocalDescription(answer);

      const socket = getSocket(API_URL);
      socket.emit("answerCall", {
        callerId: callerId,
        signalData: answer,
      });

      // Start duration timer
      durationTimerRef.current = setInterval(() => {
        setCallDuration((prev) => prev + 1);
      }, 1000);

      setIncomingCall(null);
    } catch (err) {
      console.error("acceptCall error:", err);
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
      console.log("Call accepted by remote user");
      setCallState("connected");
      const pc = peerConnectionRef.current;
      if (pc) {
        try {
          await pc.setRemoteDescription(new RTCSessionDescription(data.signalData));
          if (iceCandidatesQueueRef.current.length > 0) {
            console.log(`Caller processing ${iceCandidatesQueueRef.current.length} queued ICE candidates`);
            for (const candidate of iceCandidatesQueueRef.current) {
              try {
                await pc.addIceCandidate(new RTCIceCandidate(candidate));
              } catch (e) {
                console.error("Error adding queued candidate for caller:", e);
              }
            }
            iceCandidatesQueueRef.current = [];
          }
        } catch (err) {
          console.error("Error setting remote description on caller:", err);
        }
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
      if (!data?.candidate) return;
      const pc = peerConnectionRef.current;
      if (pc && pc.remoteDescription && pc.remoteDescription.type) {
        try {
          await pc.addIceCandidate(new RTCIceCandidate(data.candidate));
        } catch (err) {
          console.error("Error adding ICE candidate:", err);
        }
      } else {
        // Queue candidates until remote description is set
        iceCandidatesQueueRef.current.push(data.candidate);
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
    remoteAudioRef,
    remoteStream,
    isRemoteVideoActive,
    startCall,
    acceptCall,
    rejectCall,
    endCall,
    toggleMute,
    toggleVideo,
  };
};
