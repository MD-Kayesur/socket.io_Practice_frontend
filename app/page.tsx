"use client";

import React, { useState, useEffect, useMemo, Suspense } from "react";
import { ChatSidebar } from "@/components/chat/ChatSidebar";
import { ChatWindow } from "@/components/chat/ChatWindow";
import { ChatNavbar } from "@/components/chat/ChatNavbar";
import { ChatModals } from "@/components/chat/ChatModals";
import { CallModalsContainer } from "@/components/call/CallModalsContainer";
import { useWebRTC } from "@/hooks/useWebRTC";
import { useGroupWebRTC } from "@/hooks/useGroupWebRTC";
import { useMessengerChat } from "@/hooks/useMessengerChat";
import { useAppDispatch, useAppSelector } from "@/redux/hooks";
import { setActiveContactId } from "@/redux/slices/chatSlice";
import { logout, setUser } from "@/redux/slices/authSlice";
import { useGetMeQuery } from "@/redux/api/authApi";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

function MessengerContent() {
  const dispatch = useAppDispatch();
  const { user: authUser, isAuthenticated } = useAppSelector((state) => state.auth);

  // Dialog & drawer visibility states
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [isNewChatModalOpen, setIsNewChatModalOpen] = useState(false);
  const [isCreateGroupModalOpen, setIsCreateGroupModalOpen] = useState(false);
  const [isAddMemberModalOpen, setIsAddMemberModalOpen] = useState(false);
  const [isGroupMembersModalOpen, setIsGroupMembersModalOpen] = useState(false);
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);

  // Synchronize authenticated user profile
  const { data: meData } = useGetMeQuery(undefined, { skip: !isAuthenticated });
  useEffect(() => {
    if (meData?.user) {
      dispatch(setUser(meData.user));
    }
  }, [meData, dispatch]);

  const currentUser = useMemo(
    () => ({
      id: authUser?.id || "user-me",
      name: authUser?.name || "Guest User",
      avatar:
        authUser?.avatar ||
        "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=250&q=80",
      status: "online",
    }),
    [authUser]
  );

  // 1-on-1 WebRTC Calling Hook
  const webrtc = useWebRTC(currentUser.id, currentUser.name, currentUser.avatar);

  // Multi-user Group WebRTC Calling Hook
  const groupWebRTC = useGroupWebRTC(currentUser.id, currentUser.name, currentUser.avatar);

  // Real-time Chat, DB Synchronization, and Messaging Hook
  const chat = useMessengerChat({
    currentUser,
    isAuthenticated,
    onRequireAuth: () => setIsAuthModalOpen(true),
  });

  return (
    <div className="flex flex-col h-[100dvh] w-screen bg-slate-950 text-slate-100 overflow-hidden font-sans">
      {/* Top Navbar with Socket status & user profile / auth controls */}
      <ChatNavbar
        socketStatus={chat.socketStatus}
        serverUrl={API_URL}
        onReconnect={chat.handleReconnect}
        isAuthenticated={isAuthenticated}
        userName={authUser?.name}
        onLogin={() => setIsAuthModalOpen(true)}
        onLogout={() => dispatch(logout())}
      />

      {/* Main Responsive Messenger Layout */}
      <div className="flex flex-1 overflow-hidden relative">
        {/* Primary Sidebar: responsive toggle for mobile / fixed width on desktop */}
        <div
          className={`${
            chat.isChatOpenOnMobile ? "hidden md:flex" : "flex"
          } h-full w-full md:w-80 lg:w-96 flex-shrink-0`}
        >
          <ChatSidebar
            contacts={chat.contacts}
            activeContactId={chat.activeContactId}
            onSelectContact={chat.handleSelectContact}
            onDeleteContact={chat.handleDeleteContact}
            onOpenNewChatModal={() => setIsNewChatModalOpen(true)}
            onOpenCreateGroupModal={() => setIsCreateGroupModalOpen(true)}
            currentUser={currentUser}
          />
        </div>

        {/* Primary Chat Window */}
        <div
          className={`${
            chat.isChatOpenOnMobile ? "flex" : "hidden md:flex"
          } h-full w-full flex-1`}
        >
          <ChatWindow
            activeContact={chat.activeContact}
            messages={chat.currentMessages}
            currentUserId={currentUser.id}
            isTyping={Boolean(chat.typingInfo)}
            typingUserName={chat.typingInfo?.senderName}
            isRemovedFromGroup={chat.isRemovedFromGroup}
            onSendMessage={chat.handleSendMessage}
            onTyping={chat.handleTyping}
            isAuthenticated={isAuthenticated}
            onRequireAuth={() => setIsAuthModalOpen(true)}
            onDeleteMessage={chat.handleDeleteMessage}
            onDeleteContact={chat.handleDeleteContact}
            onOpenCreateGroupModal={() => setIsCreateGroupModalOpen(true)}
            onOpenAddMemberModal={() => setIsAddMemberModalOpen(true)}
            onOpenGroupMembersModal={() => setIsGroupMembersModalOpen(true)}
            onStartAudioCall={() => {
              if (chat.activeContact) {
                if (chat.activeContact.isGroup) {
                  groupWebRTC.startGroupCall(chat.activeContact, "audio");
                } else {
                  webrtc.startCall(chat.activeContact, "audio");
                }
              }
            }}
            onStartVideoCall={() => {
              if (chat.activeContact) {
                if (chat.activeContact.isGroup) {
                  groupWebRTC.startGroupCall(chat.activeContact, "video");
                } else {
                  webrtc.startCall(chat.activeContact, "video");
                }
              }
            }}
            activeGroupCall={
              chat.activeContact?.isGroup
                ? groupWebRTC.activeGroupCallsMap[chat.activeContact.id] || null
                : null
            }
            onJoinGroupCall={(group, type) => {
              groupWebRTC.joinGroupCall(group, type);
            }}
            onBack={() => dispatch(setActiveContactId(""))}
            onToggleMobileSidebar={() => setIsMobileSidebarOpen((prev) => !prev)}
          />
        </div>

        {/* Mobile Slide-Over Sidebar Menu Drawer */}
        {isMobileSidebarOpen && (
          <div className="fixed inset-0 z-50 md:hidden flex">
            <div
              className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm transition-opacity"
              onClick={() => setIsMobileSidebarOpen(false)}
            />
            <div className="relative z-50 w-full h-full bg-slate-900 shadow-2xl animate-in slide-in-from-left duration-200 flex flex-col">
              <ChatSidebar
                contacts={chat.contacts}
                activeContactId={chat.activeContactId}
                onSelectContact={(id) => {
                  chat.handleSelectContact(id);
                  setIsMobileSidebarOpen(false);
                }}
                onDeleteContact={chat.handleDeleteContact}
                onOpenNewChatModal={() => {
                  setIsMobileSidebarOpen(false);
                  setIsNewChatModalOpen(true);
                }}
                onOpenCreateGroupModal={() => {
                  setIsMobileSidebarOpen(false);
                  setIsCreateGroupModalOpen(true);
                }}
                onCloseMobileSidebar={() => setIsMobileSidebarOpen(false)}
                currentUser={currentUser}
              />
            </div>
          </div>
        )}
      </div>

      {/* Chat Modals (Auth, New Chat, Create Group, Add Member, Group Members) */}
      <ChatModals
        isAuthModalOpen={isAuthModalOpen}
        onCloseAuthModal={() => setIsAuthModalOpen(false)}
        isNewChatModalOpen={isNewChatModalOpen}
        onCloseNewChatModal={() => setIsNewChatModalOpen(false)}
        isCreateGroupModalOpen={isCreateGroupModalOpen}
        onCloseCreateGroupModal={() => setIsCreateGroupModalOpen(false)}
        isAddMemberModalOpen={isAddMemberModalOpen}
        onCloseAddMemberModal={() => setIsAddMemberModalOpen(false)}
        isGroupMembersModalOpen={isGroupMembersModalOpen}
        onCloseGroupMembersModal={() => setIsGroupMembersModalOpen(false)}
        onOpenAddMemberModal={() => setIsAddMemberModalOpen(true)}
        currentUserId={currentUser.id}
        activeContact={chat.activeContact}
        onSelectNewChatUser={chat.handleSelectNewChatUser}
        onGroupCreated={(group) => {
          dispatch(setActiveContactId(group.id));
        }}
      />

      {/* WebRTC Calling Modals & Overlays */}
      <CallModalsContainer
        callState={webrtc.callState}
        callType={webrtc.callType}
        peerInfo={webrtc.peerInfo}
        incomingCall={webrtc.incomingCall}
        isMuted={webrtc.isMuted}
        isVideoOff={webrtc.isVideoOff}
        callDuration={webrtc.callDuration}
        localVideoRef={webrtc.localVideoRef}
        remoteVideoRef={webrtc.remoteVideoRef}
        remoteAudioRef={webrtc.remoteAudioRef}
        localStream={webrtc.localStream}
        remoteStream={webrtc.remoteStream}
        isRemoteVideoActive={webrtc.isRemoteVideoActive}
        onAcceptCall={webrtc.acceptCall}
        onRejectCall={webrtc.rejectCall}
        onEndCall={webrtc.endCall}
        onToggleMute={webrtc.toggleMute}
        onToggleVideo={webrtc.toggleVideo}
        incomingGroupCall={groupWebRTC.incomingGroupCall}
        onAcceptIncomingGroupCall={groupWebRTC.acceptIncomingGroupCall}
        onRejectIncomingGroupCall={groupWebRTC.rejectIncomingGroupCall}
        isGroupCallActive={groupWebRTC.isGroupCallActive}
        activeCallGroup={groupWebRTC.activeGroup}
        groupCallType={groupWebRTC.groupCallType}
        groupCallDuration={groupWebRTC.callDuration}
        groupLocalStream={groupWebRTC.localStream}
        groupParticipants={groupWebRTC.participants}
        isGroupMuted={groupWebRTC.isMuted}
        isGroupVideoOff={groupWebRTC.isVideoOff}
        currentUserId={currentUser.id}
        currentUserName={currentUser.name}
        currentUserAvatar={currentUser.avatar}
        onLeaveGroupCall={groupWebRTC.leaveGroupCall}
        onToggleGroupMute={groupWebRTC.toggleMute}
        onToggleGroupVideo={groupWebRTC.toggleVideo}
      />
    </div>
  );
}

export default function MessengerPage() {
  return (
    <Suspense
      fallback={
        <div className="h-screen w-screen bg-slate-950 flex items-center justify-center text-slate-400">
          Loading Messenger...
        </div>
      }
    >
      <MessengerContent />
    </Suspense>
  );
}
