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
    { urls: "stun:stun.cloudflare.com:3478" },
    { urls: "stun:global.stun.twilio.com:3478" },
    { urls: "stun:stun.nextcloud.com:3478" },
  ],
  iceCandidatePoolSize: 10,
};

export interface GroupParticipant {
  id: string;
  name: string;
  avatar?: string;
  stream?: MediaStream | null;
  isSpeaking?: boolean;
  isVideoOff?: boolean;
}

export interface ActiveGroupCallInfo {
  groupId: string;
  groupName: string;
  groupAvatar?: string;
  callType: "audio" | "video";
  caller: { id: string; name: string; avatar?: string };
  participantCount: number;
}

export const useGroupWebRTC = (
  currentUserId: string,
  currentUserName: string,
  currentUserAvatar?: string
) => {
  const [isGroupCallActive, setIsGroupCallActive] = useState(false);
  const [groupCallType, setGroupCallType] = useState<"audio" | "video">("video");
  const [activeGroup, setActiveGroup] = useState<{ id: string; name: string; avatar?: string } | null>(null);
  const [participants, setParticipants] = useState<GroupParticipant[]>([]);
  const [callDuration, setCallDuration] = useState(0);

  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(false);
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);

  // Ongoing call banner in chat
  const [activeGroupCallsMap, setActiveGroupCallsMap] = useState<Record<string, ActiveGroupCallInfo>>({});

  const peersRef = useRef<Map<string, RTCPeerConnection>>(new Map());
  const peerUsersRef = useRef<Map<string, { id: string; name: string; avatar?: string }>>(new Map());
  const remoteStreamsRef = useRef<Map<string, MediaStream>>(new Map());
  const iceCandidatesQueueRef = useRef<Map<string, RTCIceCandidateInit[]>>(new Map());

  const localStreamRef = useRef<MediaStream | null>(null);
  const durationTimerRef = useRef<NodeJS.Timeout | null>(null);
  const activeGroupIdRef = useRef<string | null>(null);

  // Sync state helpers
  const updateParticipantsState = useCallback(() => {
    const list: GroupParticipant[] = [];
    for (const [userId, user] of peerUsersRef.current.entries()) {
      const stream = remoteStreamsRef.current.get(userId) || null;
      list.push({
        id: userId,
        name: user.name,
        avatar: user.avatar,
        stream,
        isVideoOff: stream ? stream.getVideoTracks().length === 0 || !stream.getVideoTracks()[0].enabled : true,
      });
    }
    setParticipants(list);
  }, []);

  // Cleanup all connections and local tracks
  const leaveGroupCall = useCallback(() => {
    const groupId = activeGroupIdRef.current;
    if (groupId) {
      const socket = getSocket(API_URL);
      socket.emit("leaveGroupCall", {
        groupId,
        userId: currentUserId,
      });
    }

    if (durationTimerRef.current) {
      clearInterval(durationTimerRef.current);
      durationTimerRef.current = null;
    }
    setCallDuration(0);

    // Stop local media
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((track) => track.stop());
      localStreamRef.current = null;
    }

    // Close all peer connections
    for (const [, pc] of peersRef.current.entries()) {
      try {
        pc.close();
      } catch (e) {}
    }

    peersRef.current.clear();
    peerUsersRef.current.clear();
    remoteStreamsRef.current.clear();
    iceCandidatesQueueRef.current.clear();

    setLocalStream(null);
    setParticipants([]);
    setIsGroupCallActive(false);
    setActiveGroup(null);
    activeGroupIdRef.current = null;
    setIsMuted(false);
    setIsVideoOff(false);
  }, [currentUserId]);

  // Acquire user media stream (camera & mic)
  const getUserMedia = useCallback(async (type: "audio" | "video") => {
    if (typeof navigator === "undefined" || !navigator.mediaDevices?.getUserMedia) {
      alert("Camera and Microphone access not supported in this browser.");
      throw new Error("getUserMedia not supported");
    }

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

    try {
      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      localStreamRef.current = stream;
      setLocalStream(stream);
      return stream;
    } catch (err) {
      console.warn("Fallback to basic constraints for group call:", err);
      const fallbackStream = await navigator.mediaDevices.getUserMedia({
        audio: true,
        video: type === "video" ? true : false,
      });
      localStreamRef.current = fallbackStream;
      setLocalStream(fallbackStream);
      return fallbackStream;
    }
  }, []);

  // Create an RTCPeerConnection for a specific remote peer in the group
  const createPeerConnection = useCallback(
    (targetUser: { id: string; name: string; avatar?: string }, groupId: string) => {
      if (peersRef.current.has(targetUser.id)) {
        return peersRef.current.get(targetUser.id)!;
      }

      const pc = new RTCPeerConnection(RTC_CONFIG);
      peersRef.current.set(targetUser.id, pc);
      peerUsersRef.current.set(targetUser.id, targetUser);

      // Bind local tracks
      if (localStreamRef.current) {
        localStreamRef.current.getTracks().forEach((track) => {
          track.enabled = true;
          pc.addTrack(track, localStreamRef.current!);
        });
      }

      pc.getTransceivers().forEach((t) => {
        t.direction = "sendrecv";
      });

      // Send local ICE candidates to this specific target user
      pc.onicecandidate = (event) => {
        if (event.candidate) {
          const socket = getSocket(API_URL);
          socket.emit("groupCallSignal", {
            to: targetUser.id,
            from: {
              id: currentUserId,
              name: currentUserName,
              avatar: currentUserAvatar,
            },
            signalData: {
              candidate: event.candidate,
            },
            groupId,
          });
        }
      };

      // Handle incoming remote media tracks from this peer
      pc.ontrack = (event) => {
        console.log(`[Group Call] Remote track from ${targetUser.name}:`, event.track.kind);
        event.track.enabled = true;

        let stream = remoteStreamsRef.current.get(targetUser.id);
        if (!stream) {
          stream = new MediaStream();
        }

        if (!stream.getTracks().some((t) => t.id === event.track.id)) {
          stream.addTrack(event.track);
        }

        if (event.streams && event.streams[0]) {
          event.streams[0].getTracks().forEach((t) => {
            t.enabled = true;
            if (!stream!.getTracks().some((st) => st.id === t.id)) {
              stream!.addTrack(t);
            }
          });
        }

        const freshStream = new MediaStream(stream.getTracks());
        remoteStreamsRef.current.set(targetUser.id, freshStream);
        updateParticipantsState();
      };

      pc.onconnectionstatechange = () => {
        console.log(`[Group Call] Connection state with ${targetUser.name}:`, pc.connectionState);
      };

      return pc;
    },
    [currentUserId, currentUserName, currentUserAvatar, updateParticipantsState]
  );

  // Start a new group call
  const startGroupCall = useCallback(
    async (
      group: { id: string; name: string; avatar?: string },
      type: "audio" | "video" = "video"
    ) => {
      try {
        setGroupCallType(type);
        setActiveGroup(group);
        activeGroupIdRef.current = group.id;
        setIsGroupCallActive(true);

        await getUserMedia(type);

        const socket = getSocket(API_URL);
        socket.emit("startGroupCall", {
          groupId: group.id,
          groupName: group.name,
          groupAvatar: group.avatar,
          caller: {
            id: currentUserId,
            name: currentUserName,
            avatar: currentUserAvatar,
          },
          callType: type,
        });

        durationTimerRef.current = setInterval(() => {
          setCallDuration((prev) => prev + 1);
        }, 1000);
      } catch (err) {
        console.error("startGroupCall error:", err);
        leaveGroupCall();
      }
    },
    [currentUserId, currentUserName, currentUserAvatar, getUserMedia, leaveGroupCall]
  );

  // Join an ongoing group call
  const joinGroupCall = useCallback(
    async (
      group: { id: string; name: string; avatar?: string },
      type: "audio" | "video" = "video"
    ) => {
      try {
        setGroupCallType(type);
        setActiveGroup(group);
        activeGroupIdRef.current = group.id;
        setIsGroupCallActive(true);

        await getUserMedia(type);

        const socket = getSocket(API_URL);
        socket.emit("joinGroupCall", {
          groupId: group.id,
          user: {
            id: currentUserId,
            name: currentUserName,
            avatar: currentUserAvatar,
          },
          callType: type,
        });

        durationTimerRef.current = setInterval(() => {
          setCallDuration((prev) => prev + 1);
        }, 1000);
      } catch (err) {
        console.error("joinGroupCall error:", err);
        leaveGroupCall();
      }
    },
    [currentUserId, currentUserName, currentUserAvatar, getUserMedia, leaveGroupCall]
  );

  // Toggle Mute Local Mic
  const toggleMute = useCallback(() => {
    if (localStreamRef.current) {
      const audioTrack = localStreamRef.current.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled;
        setIsMuted(!audioTrack.enabled);
      }
    }
  }, []);

  // Toggle Camera
  const toggleVideo = useCallback(() => {
    if (localStreamRef.current) {
      const videoTrack = localStreamRef.current.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.enabled = !videoTrack.enabled;
        setIsVideoOff(!videoTrack.enabled);
      }
    }
  }, []);

  // Setup Socket.io Signaling Listeners for Group WebRTC
  useEffect(() => {
    const socket = getSocket(API_URL);

    // When someone starts a call in any group the user belongs to
    const handleGroupCallStarted = (data: ActiveGroupCallInfo) => {
      setActiveGroupCallsMap((prev) => ({
        ...prev,
        [data.groupId]: data,
      }));
    };

    // When participant count changes in a group call
    const handleGroupCallUpdated = (data: { groupId: string; participantCount: number }) => {
      setActiveGroupCallsMap((prev) => {
        if (!prev[data.groupId]) return prev;
        return {
          ...prev,
          [data.groupId]: {
            ...prev[data.groupId],
            participantCount: data.participantCount,
          },
        };
      });
    };

    // When a group call ends
    const handleGroupCallEnded = (data: { groupId: string }) => {
      setActiveGroupCallsMap((prev) => {
        const copy = { ...prev };
        delete copy[data.groupId];
        return copy;
      });

      if (activeGroupIdRef.current === data.groupId) {
        leaveGroupCall();
      }
    };

    // Joining user receives list of existing participants in the call: initiate offers!
    const handleGroupCallParticipants = async (data: {
      groupId: string;
      participants: Array<{ id: string; name: string; avatar?: string }>;
    }) => {
      if (data.groupId !== activeGroupIdRef.current) return;

      for (const peer of data.participants) {
        if (peer.id === currentUserId) continue;

        try {
          const pc = createPeerConnection(peer, data.groupId);
          const offer = await pc.createOffer();
          await pc.setLocalDescription(offer);

          socket.emit("groupCallSignal", {
            to: peer.id,
            from: {
              id: currentUserId,
              name: currentUserName,
              avatar: currentUserAvatar,
            },
            signalData: offer,
            groupId: data.groupId,
          });
        } catch (err) {
          console.error("Error creating offer to peer:", peer.id, err);
        }
      }
    };

    // Existing participant receives notification of a new peer joining
    const handleUserJoinedGroupCall = (data: {
      groupId: string;
      user: { id: string; name: string; avatar?: string };
    }) => {
      if (data.groupId !== activeGroupIdRef.current || data.user.id === currentUserId) return;
      peerUsersRef.current.set(data.user.id, data.user);
      updateParticipantsState();
    };

    // Handle incoming WebRTC signals (Offers, Answers, and ICE Candidates) between peers
    const handleGroupCallSignal = async (data: {
      from: { id: string; name: string; avatar?: string };
      signalData: any;
      groupId: string;
    }) => {
      if (data.groupId !== activeGroupIdRef.current || !data.from || data.from.id === currentUserId) return;

      const senderId = data.from.id;
      const pc = createPeerConnection(data.from, data.groupId);

      try {
        if (data.signalData.type === "offer") {
          await pc.setRemoteDescription(new RTCSessionDescription(data.signalData));

          // Flush any queued ICE candidates
          const queued = iceCandidatesQueueRef.current.get(senderId) || [];
          for (const cand of queued) {
            try {
              await pc.addIceCandidate(new RTCIceCandidate(cand));
            } catch (e) {}
          }
          iceCandidatesQueueRef.current.delete(senderId);

          const answer = await pc.createAnswer();
          await pc.setLocalDescription(answer);

          socket.emit("groupCallSignal", {
            to: senderId,
            from: {
              id: currentUserId,
              name: currentUserName,
              avatar: currentUserAvatar,
            },
            signalData: answer,
            groupId: data.groupId,
          });
        } else if (data.signalData.type === "answer") {
          await pc.setRemoteDescription(new RTCSessionDescription(data.signalData));

          const queued = iceCandidatesQueueRef.current.get(senderId) || [];
          for (const cand of queued) {
            try {
              await pc.addIceCandidate(new RTCIceCandidate(cand));
            } catch (e) {}
          }
          iceCandidatesQueueRef.current.delete(senderId);
        } else if (data.signalData.candidate) {
          if (pc.remoteDescription && pc.remoteDescription.type) {
            await pc.addIceCandidate(new RTCIceCandidate(data.signalData.candidate));
          } else {
            const list = iceCandidatesQueueRef.current.get(senderId) || [];
            list.push(data.signalData.candidate);
            iceCandidatesQueueRef.current.set(senderId, list);
          }
        }
      } catch (err) {
        console.error("Error processing groupCallSignal:", err);
      }
    };

    // Handle participant leaving
    const handleUserLeftGroupCall = (data: { groupId: string; userId: string }) => {
      if (data.groupId !== activeGroupIdRef.current) return;

      const pc = peersRef.current.get(data.userId);
      if (pc) {
        try {
          pc.close();
        } catch (e) {}
        peersRef.current.delete(data.userId);
      }
      peerUsersRef.current.delete(data.userId);
      remoteStreamsRef.current.delete(data.userId);
      iceCandidatesQueueRef.current.delete(data.userId);
      updateParticipantsState();
    };

    socket.on("groupCallStarted", handleGroupCallStarted);
    socket.on("groupCallUpdated", handleGroupCallUpdated);
    socket.on("groupCallEnded", handleGroupCallEnded);
    socket.on("groupCallParticipants", handleGroupCallParticipants);
    socket.on("userJoinedGroupCall", handleUserJoinedGroupCall);
    socket.on("groupCallSignal", handleGroupCallSignal);
    socket.on("userLeftGroupCall", handleUserLeftGroupCall);

    return () => {
      socket.off("groupCallStarted", handleGroupCallStarted);
      socket.off("groupCallUpdated", handleGroupCallUpdated);
      socket.off("groupCallEnded", handleGroupCallEnded);
      socket.off("groupCallParticipants", handleGroupCallParticipants);
      socket.off("userJoinedGroupCall", handleUserJoinedGroupCall);
      socket.off("groupCallSignal", handleGroupCallSignal);
      socket.off("userLeftGroupCall", handleUserLeftGroupCall);
    };
  }, [currentUserId, currentUserName, currentUserAvatar, createPeerConnection, updateParticipantsState, leaveGroupCall]);

  return {
    isGroupCallActive,
    groupCallType,
    activeGroup,
    participants,
    callDuration,
    localStream,
    isMuted,
    isVideoOff,
    activeGroupCallsMap,
    startGroupCall,
    joinGroupCall,
    leaveGroupCall,
    toggleMute,
    toggleVideo,
  };
};
