"use client";

import React from "react";
import { AuthModal } from "@/components/auth/AuthModal";
import { NewConversationModal } from "@/components/chat/NewConversationModal";
import { CreateGroupModal } from "@/components/chat/CreateGroupModal";
import { AddMemberModal } from "@/components/chat/AddMemberModal";
import { GroupMembersModal } from "@/components/chat/GroupMembersModal";
import { Contact } from "@/components/chat/ChatSidebar";

interface ChatModalsProps {
  isAuthModalOpen: boolean;
  onCloseAuthModal: () => void;
  isNewChatModalOpen: boolean;
  onCloseNewChatModal: () => void;
  isCreateGroupModalOpen: boolean;
  onCloseCreateGroupModal: () => void;
  isAddMemberModalOpen: boolean;
  onCloseAddMemberModal: () => void;
  isGroupMembersModalOpen: boolean;
  onCloseGroupMembersModal: () => void;
  onOpenAddMemberModal: () => void;
  currentUserId: string;
  activeContact: Contact | null;
  onSelectNewChatUser: (user: { id: string; name: string; avatar: string }) => void;
  onGroupCreated: (group: { id: string }) => void;
}

export const ChatModals: React.FC<ChatModalsProps> = ({
  isAuthModalOpen,
  onCloseAuthModal,
  isNewChatModalOpen,
  onCloseNewChatModal,
  isCreateGroupModalOpen,
  onCloseCreateGroupModal,
  isAddMemberModalOpen,
  onCloseAddMemberModal,
  isGroupMembersModalOpen,
  onCloseGroupMembersModal,
  onOpenAddMemberModal,
  currentUserId,
  activeContact,
  onSelectNewChatUser,
  onGroupCreated,
}) => {
  return (
    <>
      {/* Redux Auth Modal */}
      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={onCloseAuthModal}
      />

      {/* New Conversation User Picker Modal */}
      <NewConversationModal
        isOpen={isNewChatModalOpen}
        onClose={onCloseNewChatModal}
        currentUserId={currentUserId}
        onSelectUser={onSelectNewChatUser}
      />

      {/* Create Group Modal */}
      <CreateGroupModal
        isOpen={isCreateGroupModalOpen}
        onClose={onCloseCreateGroupModal}
        currentUserId={currentUserId}
        onGroupCreated={onGroupCreated}
      />

      {/* Add Member to Group Modal */}
      {activeContact?.isGroup && (
        <AddMemberModal
          isOpen={isAddMemberModalOpen}
          onClose={onCloseAddMemberModal}
          groupId={activeContact.id}
          groupName={activeContact.name}
          existingMemberIds={
            activeContact.members?.map((m: any) => m.id) || [currentUserId]
          }
        />
      )}

      {/* View Group Members Modal */}
      {activeContact?.isGroup && (
        <GroupMembersModal
          isOpen={isGroupMembersModalOpen}
          onClose={onCloseGroupMembersModal}
          groupId={activeContact.id}
          currentUserId={currentUserId}
          onOpenAddMemberModal={onOpenAddMemberModal}
        />
      )}
    </>
  );
};
