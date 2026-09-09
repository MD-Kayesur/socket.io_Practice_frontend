"use client";

import React from "react";
import { IncomingCallModal } from "@/components/call/IncomingCallModal";
import { IncomingGroupCallModal } from "@/components/call/IncomingGroupCallModal";
import { VideoCallOverlay } from "@/components/call/VideoCallOverlay";
import { GroupCallOverlay } from "@/components/call/GroupCallOverlay";
import { CallErrorBoundary } from "@/components/call/CallErrorBoundary";
import { ActiveGroupCallInfo, GroupParticipant } from "@/hooks/useGroupWebRTC";

interface CallModalsContainerProps {
  // 1-on-1 Call state & handlers
  callState: "idle" | "calling" | "incoming" | "connected";
  callType: "audio" | "video";
  peerInfo: { id: string; name: string; avatar?: string } | null;
  incomingCall: any;
  isMuted: boolean;
  isVideoOff: boolean;
  callDuration: number;
  localVideoRef: React.RefObject<HTMLVideoElement | null>;
  remoteVideoRef: React.RefObject<HTMLVideoElement | null>;
  remoteAudioRef: React.RefObject<HTMLAudioElement | null>;
  localStream: MediaStream | null;
  remoteStream: MediaStream | null;
  isRemoteVideoActive: boolean;
  onAcceptCall: () => void;
  onRejectCall: () => void;
  onEndCall: () => void;
  onToggleMute: () => void;
  onToggleVideo: () => void;

  // Group Call state & handlers
  incomingGroupCall: ActiveGroupCallInfo | null;
  onAcceptIncomingGroupCall: () => void;
  onRejectIncomingGroupCall: () => void;
  isGroupCallActive: boolean;
  activeCallGroup: { id: string; name: string; avatar?: string } | null;
  groupCallType: "audio" | "video";
  groupCallDuration: number;
  groupLocalStream: MediaStream | null;
  groupParticipants: GroupParticipant[];
  isGroupMuted: boolean;
  isGroupVideoOff: boolean;
  currentUserId: string;
  currentUserName: string;
  currentUserAvatar?: string;
  onLeaveGroupCall: () => void;
  onToggleGroupMute: () => void;
  onToggleGroupVideo: () => void;
}

export const CallModalsContainer: React.FC<CallModalsContainerProps> = ({
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
  onAcceptCall,
  onRejectCall,
  onEndCall,
  onToggleMute,
  onToggleVideo,
  incomingGroupCall,
  onAcceptIncomingGroupCall,
  onRejectIncomingGroupCall,
  isGroupCallActive,
  activeCallGroup,
  groupCallType,
  groupCallDuration,
  groupLocalStream,
  groupParticipants,
  isGroupMuted,
  isGroupVideoOff,
  currentUserId,
  currentUserName,
  currentUserAvatar,
  onLeaveGroupCall,
  onToggleGroupMute,
  onToggleGroupVideo,
}) => {
  return (
    <CallErrorBoundary onReset={onEndCall}>
      {/* Incoming WebRTC 1-to-1 Call Dialog */}
      {incomingCall && (
        <IncomingCallModal
          incomingCall={incomingCall}
          onAccept={onAcceptCall}
          onReject={onRejectCall}
        />
      )}

      {/* Incoming WebRTC Group Call Dialog */}
      {incomingGroupCall && (
        <IncomingGroupCallModal
          incomingCall={incomingGroupCall}
          onAccept={onAcceptIncomingGroupCall}
          onReject={onRejectIncomingGroupCall}
        />
      )}

      {/* Active WebRTC 1-to-1 Call Overlay */}
      {(callState === "calling" || callState === "connected") && (
        <VideoCallOverlay
          callState={callState}
          callType={callType}
          peerInfo={peerInfo}
          isMuted={isMuted}
          isVideoOff={isVideoOff}
          callDuration={callDuration}
          localVideoRef={localVideoRef}
          remoteVideoRef={remoteVideoRef}
          remoteAudioRef={remoteAudioRef}
          localStream={localStream}
          remoteStream={remoteStream}
          isRemoteVideoActive={isRemoteVideoActive}
          onEndCall={onEndCall}
          onToggleMute={onToggleMute}
          onToggleVideo={onToggleVideo}
        />
      )}

      {/* Active WebRTC Multi-User Group Call Overlay */}
      {isGroupCallActive && (
        <GroupCallOverlay
          isOpen={isGroupCallActive}
          group={activeCallGroup}
          callType={groupCallType}
          callDuration={groupCallDuration}
          localStream={groupLocalStream}
          participants={groupParticipants}
          isMuted={isGroupMuted}
          isVideoOff={isGroupVideoOff}
          currentUserId={currentUserId}
          currentUserName={currentUserName}
          currentUserAvatar={currentUserAvatar}
          onLeaveCall={onLeaveGroupCall}
          onToggleMute={onToggleGroupMute}
          onToggleVideo={onToggleGroupVideo}
        />
      )}
    </CallErrorBoundary>
  );
};
