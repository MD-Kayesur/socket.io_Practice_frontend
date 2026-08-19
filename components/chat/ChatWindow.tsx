"use client";

import React, { useRef, useEffect, useState } from "react";
import { Contact } from "./ChatSidebar";
import { MessageInput } from "./MessageInput";
import { DeleteMessageModal } from "./DeleteMessageModal";
import {
  Phone,
  Video,
  Info,
  Check,
  CheckCheck,
  MoreVertical,
  Shield,
  ShieldAlert,
  Trash2,
  ArrowLeft,
  Menu,
  Users,
  UserPlus,
} from "lucide-react";

export interface Message {
  id: string;
  senderId: string;
  senderName?: string;
  senderAvatar?: string;
  recipientId?: string;
  groupId?: string;
  text: string;
  timestamp: string;
  status?: "sent" | "delivered" | "read";
  isGroup?: boolean;
}

interface ChatWindowProps {
  activeContact: Contact | null;
  messages: Message[];
  currentUserId: string;
  isTyping: boolean;
  typingUserName?: string;
  isRemovedFromGroup?: boolean;
  onSendMessage: (text: string) => void;
  onTyping?: () => void;
  isAuthenticated?: boolean;
  onRequireAuth?: () => void;
  onDeleteMessage?: (messageId: string, mode: "everyone" | "me") => void;
  onDeleteContact?: (contactId: string) => void;
  onOpenCreateGroupModal?: () => void;
  onOpenAddMemberModal?: () => void;
  onOpenGroupMembersModal?: () => void;
  onBack?: () => void;
  onToggleMobileSidebar?: () => void;
}

export const ChatWindow: React.FC<ChatWindowProps> = ({
  activeContact,
  messages,
  currentUserId,
  isTyping,
  typingUserName,
  isRemovedFromGroup = false,
  onSendMessage,
  onTyping,
  isAuthenticated = true,
  onRequireAuth,
  onDeleteMessage,
  onDeleteContact,
  onOpenCreateGroupModal,
  onOpenAddMemberModal,
  onOpenGroupMembersModal,
  onBack,
  onToggleMobileSidebar,
}) => {
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [deletingMessage, setDeletingMessage] = useState<Message | null>(null);
  const [isOptionsMenuOpen, setIsOptionsMenuOpen] = useState(false);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isTyping]);

  if (!activeContact) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center bg-slate-950 text-slate-400 p-8 text-center select-none h-full">
        <div className="w-16 h-16 rounded-full bg-slate-900 flex items-center justify-center mb-4 border border-slate-800 text-indigo-400">
          <Shield className="w-8 h-8" />
        </div>
        <h3 className="text-lg font-semibold text-slate-200 mb-1">
          Select a Conversation
        </h3>
        <p className="text-sm text-slate-500 max-w-sm">
          Choose a 1-on-1 contact or group chat from the sidebar to start messaging.
        </p>

        {onToggleMobileSidebar && (
          <button
            onClick={onToggleMobileSidebar}
            className="md:hidden mt-4 inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-semibold shadow-md transition-all"
          >
            <Menu className="w-4 h-4" />
            <span>Open Conversations List</span>
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col bg-slate-950 h-full overflow-hidden w-full">
      {/* Header */}
      <div className="p-3.5 px-4 md:px-6 bg-slate-900 border-b border-slate-800 flex items-center justify-between shadow-sm">
        <div
          onClick={() => activeContact.isGroup && onOpenGroupMembersModal?.()}
          className={`flex items-center gap-2 md:gap-3 min-w-0 ${
            activeContact.isGroup
              ? "cursor-pointer group/header hover:opacity-90 transition-opacity"
              : ""
          }`}
          title={activeContact.isGroup ? "Click to view group members" : undefined}
        >
          {onToggleMobileSidebar && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onToggleMobileSidebar();
              }}
              title="Toggle conversations menu"
              className="md:hidden p-1.5 px-2.5 text-slate-300 hover:text-slate-100 bg-slate-800 hover:bg-slate-700 rounded-lg transition-colors flex items-center gap-1 border border-slate-700 text-xs font-semibold"
            >
              <Menu className="w-4 h-4 text-indigo-400" />
              <span>Chats</span>
            </button>
          )}

          {onBack && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onBack();
              }}
              title="Back to conversations"
              className="hidden md:hidden p-2 text-slate-400 hover:text-slate-100 hover:bg-slate-800 rounded-full transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
          )}

          <div className="relative flex-shrink-0">
            <img
              src={activeContact.avatar}
              alt={activeContact.name}
              className="w-9 h-9 md:w-10 md:h-10 rounded-full object-cover"
            />
            {activeContact.isGroup ? (
              <span className="absolute -bottom-1 -right-1 p-0.5 bg-indigo-600 text-white rounded-full ring-2 ring-slate-900 shadow">
                <Users className="w-2.5 h-2.5" />
              </span>
            ) : (
              <span
                className={`absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full ring-2 ring-slate-900 ${
                  activeContact.status === "online"
                    ? "bg-emerald-500"
                    : activeContact.status === "away"
                    ? "bg-amber-500"
                    : "bg-slate-500"
                }`}
              />
            )}
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h2 className="font-semibold text-slate-100 text-sm leading-snug truncate group-hover/header:text-indigo-300 transition-colors">
                {activeContact.name}
              </h2>
              {activeContact.isGroup && (
                <span className="text-[10px] font-semibold bg-indigo-500/20 text-indigo-300 px-1.5 py-0.2 rounded border border-indigo-500/30">
                  Group
                </span>
              )}
            </div>
            <p className="text-xs text-slate-400 flex items-center gap-1.5 truncate">
              {activeContact.isGroup ? (
                <span className="text-indigo-400 font-medium hover:underline">
                  {activeContact.memberCount || activeContact.members?.length || 2} members
                </span>
              ) : activeContact.status === "online" ? (
                <span className="text-emerald-400 font-medium">Online</span>
              ) : (
                <span>Offline</span>
              )}
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-1 text-slate-400 flex-shrink-0">
          {activeContact.isGroup && onOpenAddMemberModal && (
            <button
              onClick={onOpenAddMemberModal}
              className="flex items-center gap-1 px-2.5 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold rounded-lg shadow transition-all active:scale-95 mr-1"
            >
              <UserPlus className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Add Member</span>
            </button>
          )}
          <button className="p-2 hover:text-slate-100 hover:bg-slate-800 rounded-full transition-colors">
            <Phone className="w-4 h-4" />
          </button>
          <button className="p-2 hover:text-slate-100 hover:bg-slate-800 rounded-full transition-colors">
            <Video className="w-4 h-4" />
          </button>
          {/* Info & Options Popover Menu Button */}
          <div className="relative">
            <button
              onClick={() => setIsOptionsMenuOpen((prev) => !prev)}
              title="Chat Options & Details"
              className={`p-2 rounded-full transition-all ${
                isOptionsMenuOpen
                  ? "bg-indigo-600 text-white shadow-lg shadow-indigo-600/30"
                  : "hover:text-slate-100 hover:bg-slate-800"
              }`}
            >
              <Info className="w-4 h-4" />
            </button>

            {isOptionsMenuOpen && (
              <>
                {/* Invisible backdrop to dismiss popover when clicking outside */}
                <div
                  className="fixed inset-0 z-40"
                  onClick={() => setIsOptionsMenuOpen(false)}
                />

                {/* Popover Dropdown Menu */}
                <div className="absolute right-0 top-full mt-2 w-56 bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl z-50 p-1.5 animate-in fade-in zoom-in-95 duration-150">
                  {/* Header */}
                  <div className="px-3 py-2 border-b border-slate-800/80 mb-1">
                    <p className="text-xs font-bold text-slate-200 truncate">
                      {activeContact.name}
                    </p>
                    <p className="text-[10px] text-slate-400 truncate">
                      {activeContact.isGroup ? "Group Chat" : "Direct Message"}
                    </p>
                  </div>

                  {/* View Group Members Option */}
                  {activeContact.isGroup && onOpenGroupMembersModal && (
                    <button
                      onClick={() => {
                        setIsOptionsMenuOpen(false);
                        onOpenGroupMembersModal();
                      }}
                      className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-semibold text-slate-200 hover:bg-indigo-600/20 hover:text-indigo-300 rounded-xl transition-colors text-left mb-1"
                    >
                      <Users className="w-4 h-4 text-indigo-400" />
                      <span>View Group Members ({activeContact.memberCount || activeContact.members?.length || 2})</span>
                    </button>
                  )}

                  {/* Create Group Option */}
                  {onOpenCreateGroupModal && (
                    <button
                      onClick={() => {
                        setIsOptionsMenuOpen(false);
                        onOpenCreateGroupModal();
                      }}
                      className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-semibold text-slate-200 hover:bg-indigo-600/20 hover:text-indigo-300 rounded-xl transition-colors text-left"
                    >
                      <Users className="w-4 h-4 text-indigo-400" />
                      <span>Create Group Chat</span>
                    </button>
                  )}

                  {/* Add Member Option (if Group Chat) */}
                  {activeContact.isGroup && onOpenAddMemberModal && (
                    <button
                      onClick={() => {
                        setIsOptionsMenuOpen(false);
                        onOpenAddMemberModal();
                      }}
                      className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-semibold text-slate-200 hover:bg-indigo-600/20 hover:text-indigo-300 rounded-xl transition-colors text-left"
                    >
                      <UserPlus className="w-4 h-4 text-indigo-400" />
                      <span>Add Member to Group</span>
                    </button>
                  )}

                  {/* Divider */}
                  <div className="my-1 border-t border-slate-800" />

                  {/* Delete Conversation / Group from List Option */}
                  {onDeleteContact && (
                    <button
                      onClick={() => {
                        setIsOptionsMenuOpen(false);
                        onDeleteContact(activeContact.id);
                      }}
                      className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-semibold text-rose-400 hover:bg-rose-950/40 hover:text-rose-300 rounded-xl transition-colors text-left"
                    >
                      <Trash2 className="w-4 h-4 text-rose-400" />
                      <span>
                        {activeContact.isGroup
                          ? "Delete Group from List"
                          : "Delete Chat from List"}
                      </span>
                    </button>
                  )}
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Removed from group banner */}
      {activeContact.isGroup && isRemovedFromGroup && (
        <div className="bg-rose-950/80 border-b border-rose-800/80 p-3 px-4 text-center text-xs font-semibold text-rose-200 flex items-center justify-center gap-2 animate-in fade-in duration-150">
          <ShieldAlert className="w-4 h-4 text-rose-400 flex-shrink-0" />
          <span>You have been removed from this group. You are no longer available to send messages.</span>
        </div>
      )}

      {/* Message Stream */}
      <div className="flex-1 overflow-y-auto p-3 md:p-6 space-y-4 custom-scrollbar">
        <div className="flex justify-center my-2">
          <span className="text-[10px] md:text-[11px] bg-slate-900/90 text-slate-400 px-3 py-1 rounded-full border border-slate-800/80 shadow-inner text-center">
            {activeContact.isGroup ? "Group Encrypted Socket Channel" : "Encrypted with Socket.io End-to-End Channel"}
          </span>
        </div>

        {messages.map((msg) => {
          const isMe = msg.senderId === currentUserId;
          return (
            <div
              key={msg.id}
              className={`group flex flex-col ${isMe ? "items-end" : "items-start"}`}
            >
              {!isMe && activeContact.isGroup && (
                <span className="text-[10px] font-bold text-indigo-400 mb-0.5 ml-1 flex items-center gap-1">
                  {msg.senderName || "Group Member"}
                </span>
              )}
              <div className="relative flex items-center gap-2 max-w-[85%] sm:max-w-[75%] md:max-w-[65%]">
                {/* Delete trigger button */}
                <button
                  onClick={() => setDeletingMessage(msg)}
                  title="Delete message"
                  className={`opacity-0 group-hover:opacity-100 p-1.5 text-slate-400 hover:text-rose-400 hover:bg-slate-800 rounded-full transition-all ${
                    isMe ? "order-first" : "order-last"
                  }`}
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>

                <div
                  className={`w-full px-4 py-2.5 rounded-2xl shadow-sm text-sm ${
                    isMe
                      ? "bg-indigo-600 text-white rounded-br-none"
                      : "bg-slate-800/90 text-slate-100 rounded-bl-none border border-slate-700/50"
                  }`}
                >
                  <p className="leading-relaxed whitespace-pre-wrap">{msg.text}</p>
                  <div
                    className={`flex items-center justify-end gap-1 mt-1 text-[10px] ${
                      isMe ? "text-indigo-200" : "text-slate-400"
                    }`}
                  >
                    <span>{msg.timestamp}</span>
                    {isMe && (
                      <span>
                        {msg.status === "read" ? (
                          <CheckCheck className="w-3 h-3 text-sky-300" />
                        ) : msg.status === "delivered" ? (
                          <CheckCheck className="w-3 h-3 text-indigo-200" />
                        ) : (
                          <Check className="w-3 h-3 text-indigo-200" />
                        )}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          );
        })}

        {/* Typing Indicator */}
        {isTyping && (
          <div className="flex items-center gap-2 text-slate-400 text-xs py-1 px-2.5 bg-slate-900/80 rounded-xl w-fit border border-indigo-500/30 shadow-md animate-in fade-in duration-150">
            <span className="flex items-center gap-1">
              <span className="w-1.5 h-1.5 bg-indigo-400 rounded-full animate-bounce" />
              <span className="w-1.5 h-1.5 bg-indigo-400 rounded-full animate-bounce [animation-delay:0.2s]" />
              <span className="w-1.5 h-1.5 bg-indigo-400 rounded-full animate-bounce [animation-delay:0.4s]" />
            </span>
            <span className="text-indigo-300 font-medium italic text-[11px]">
              {typingUserName || activeContact.name} is typing...
            </span>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Message Input */}
      <MessageInput
        onSendMessage={onSendMessage}
        onTyping={onTyping}
        disabled={isRemovedFromGroup}
        isAuthenticated={isAuthenticated}
        onRequireAuth={onRequireAuth}
      />

      {/* Delete Modal */}
      <DeleteMessageModal
        isOpen={Boolean(deletingMessage)}
        onClose={() => setDeletingMessage(null)}
        isSender={deletingMessage?.senderId === currentUserId}
        onConfirm={(mode) => {
          if (deletingMessage) {
            onDeleteMessage?.(deletingMessage.id, mode);
          }
        }}
      />
    </div>
  );
};
