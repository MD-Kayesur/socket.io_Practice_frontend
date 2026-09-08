"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { getSocket } from "@/lib/socket";
import { ringtoneManager } from "@/lib/ringtone";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

const RTC_CONFIG: RTCConfiguration = {
  iceServers: [
    { urls: "stun:stun.l.google.com:19302" },
    { urls: "stun:stun1.l.google.com:19302" },
    { urls: "stun:stun.cloudflare.com:3478" },
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

  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
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

  // Cleanup peer connection and media streams
  const cleanupCall = useCallback(() => {
    ringtoneManager.stop();

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
    setLocalStream(null);
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
      console.log("WebRTC received remote track:", event.track.kind, event.track.id);
      event.track.enabled = true;

      let stream = remoteStreamRef.current;
      if (!stream) {
        stream = new MediaStream();
        remoteStreamRef.current = stream;
      }

      // Add the incoming track if not already in the stream
      if (!stream.getTracks().some((t) => t.id === event.track.id)) {
        stream.addTrack(event.track);
      }

      // Also merge any tracks present in event.streams[0]
      if (event.streams && event.streams[0]) {
        event.streams[0].getTracks().forEach((t) => {
          t.enabled = true;
          if (!stream!.getTracks().some((st) => st.id === t.id)) {
            stream!.addTrack(t);
          }
        });
      }

      setRemoteStream(stream);

      if (event.track.kind === "video") {
        setIsRemoteVideoActive(true);
        event.track.onended = () => setIsRemoteVideoActive(false);
      }

      try {
        event.track.enabled = true;

        const audioTracks = stream.getAudioTracks();
        if (audioTracks.length > 0 && remoteAudioRef.current) {
          audioTracks.forEach((t) => (t.enabled = true));
          if (remoteAudioRef.current.srcObject !== stream) {
            remoteAudioRef.current.srcObject = stream;
          }
          remoteAudioRef.current.muted = false;
          remoteAudioRef.current.volume = 1.0;
          remoteAudioRef.current.play().catch((e) => {
            console.log("Remote audio autoplay waiting interaction:", e);
          });
        }

        const videoTracks = stream.getVideoTracks();
        if (videoTracks.length > 0 && remoteVideoRef.current) {
          const currentVideoSrc = remoteVideoRef.current.srcObject as MediaStream | null;
          const isSameVideo = currentVideoSrc && currentVideoSrc.getVideoTracks().some((t) => t.id === videoTracks[0].id);
          if (!isSameVideo) {
            remoteVideoRef.current.srcObject = new MediaStream(videoTracks);
          }
          remoteVideoRef.current.muted = true;
          remoteVideoRef.current.play().catch(() => {});
        }
      } catch (e) {}
    };

    pc.oniceconnectionstatechange = () => {
      console.log("ICE Connection State:", pc.iceConnectionState);
    };

    return pc;
  }, []);

  // Get user media stream (mic & camera)
  const getUserMedia = useCallback(async (type: "audio" | "video") => {
    if (typeof navigator === "undefined" || !navigator.mediaDevices?.getUserMedia) {
      alert("Microphone/Camera access is not supported in this browser.");
      throw new Error("getUserMedia not supported");
    }

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
                width: { ideal: 640, max: 1280 },
                height: { ideal: 480, max: 720 },
              }
            : false,
      };
      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      localStreamRef.current = stream;
      setLocalStream(stream);
      if (localVideoRef.current) {
        localVideoRef.current.muted = true;
        localVideoRef.current.srcObject = stream;
        localVideoRef.current.play().catch(() => {});
      }
      return stream;
    } catch (err) {
      console.warn("Retrying getUserMedia with basic constraints...", err);
      try {
        const fallbackConstraints: MediaStreamConstraints = {
          audio: true,
          video: type === "video" ? true : false,
        };
        const stream = await navigator.mediaDevices.getUserMedia(fallbackConstraints);
        localStreamRef.current = stream;
        setLocalStream(stream);
        if (localVideoRef.current) {
          localVideoRef.current.muted = true;
          localVideoRef.current.srcObject = stream;
          localVideoRef.current.play().catch(() => {});
        }
        return stream;
      } catch (fallbackErr) {
        console.error("Failed to access media devices:", fallbackErr);
        alert("Could not access microphone or camera. Please check browser permissions.");
        throw fallbackErr;
      }
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

        stream.getTracks().forEach((track) => {
          track.enabled = true;
          pc.addTrack(track, stream);
        });

        pc.getTransceivers().forEach((t) => {
          t.direction = "sendrecv";
        });

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
        console.error("startCall error:", err);
        cleanupCall();
      }
    },
    [createPeerConnection, currentUserId, currentUserAvatar, currentUserName, getUserMedia, cleanupCall]
  );

  // Accept incoming call
  const acceptCall = useCallback(async () => {
    if (!incomingCall) return;

    ringtoneManager.stop();
    const callerId = incomingCall.callerId;
    setCallState("connected");
    setPeerInfo({
      id: incomingCall.callerId,
      name: incomingCall.callerName,
      avatar: incomingCall.callerAvatar,
    });
    setCallType(incomingCall.callType);

    try {
      const pc = createPeerConnection(callerId);

      // 1. Set Remote Description (the Caller's offer) FIRST so transceivers are initialized!
      await pc.setRemoteDescription(new RTCSessionDescription(incomingCall.signalData));

      // 2. Process any ICE candidates that arrived before acceptCall was triggered
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

      // 3. Acquire local mic / camera
      const stream = await getUserMedia(incomingCall.callType);

      // 4. Bind local tracks explicitly into the matched transceivers
      stream.getTracks().forEach((track) => {
        track.enabled = true;
        const matchingTransceiver = pc.getTransceivers().find(
          (t) => t.receiver.track.kind === track.kind
        );
        if (matchingTransceiver) {
          matchingTransceiver.direction = "sendrecv";
          matchingTransceiver.sender.replaceTrack(track);
        } else {
          pc.addTrack(track, stream);
        }
      });

      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);

      const socket = getSocket(API_URL);
      socket.emit("answerCall", {
        callerId: callerId,
        signalData: answer,
      });

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
    ringtoneManager.stop();
    if (incomingCall) {
      const socket = getSocket(API_URL);
      socket.emit("rejectCall", { callerId: incomingCall.callerId });
    }
    cleanupCall();
  }, [incomingCall, cleanupCall]);

  // Hangup / End ongoing call
  const endCall = useCallback(() => {
    ringtoneManager.stop();
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
      ringtoneManager.start();
    };

    const handleCallAccepted = async (data: { signalData: RTCSessionDescriptionInit }) => {
      console.log("Call accepted by remote user");
      setCallState("connected");
      ringtoneManager.stop();
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
      ringtoneManager.stop();
      alert("Call was declined.");
      cleanupCall();
    };

    const handleCallEnded = () => {
      ringtoneManager.stop();
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
        iceCandidatesQueueRef.current.push(data.candidate);
      }
    };

    socket.on("incomingCall", handleIncomingCall);
    socket.on("callAccepted", handleCallAccepted);
    socket.on("callRejected", handleCallRejected);
    socket.on("callEnded", handleCallEnded);
    socket.on("iceCandidate", handleIceCandidate);

    return () => {
      ringtoneManager.stop();
      socket.off("incomingCall", handleIncomingCall);
      socket.off("callAccepted", handleCallAccepted);
      socket.off("callRejected", handleCallRejected);
      socket.off("callEnded", handleCallEnded);
      socket.off("iceCandidate", handleIceCandidate);
    };
  }, [cleanupCall]);

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
    localStream,
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
