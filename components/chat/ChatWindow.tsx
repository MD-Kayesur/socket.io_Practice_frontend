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
  Trash2,
  ArrowLeft,
  Menu,
} from "lucide-react";

export interface Message {
  id: string;
  senderId: string;
  recipientId: string;
  text: string;
  timestamp: string;
  status: "sent" | "delivered" | "read";
}

interface ChatWindowProps {
  activeContact: Contact | null;
  messages: Message[];
  currentUserId: string;
  isTyping: boolean;
  onSendMessage: (text: string) => void;
  onTyping?: () => void;
  isAuthenticated?: boolean;
  onRequireAuth?: () => void;
  onDeleteMessage?: (messageId: string, mode: "everyone" | "me") => void;
  onBack?: () => void;
  onToggleMobileSidebar?: () => void;
}

export const ChatWindow: React.FC<ChatWindowProps> = ({
  activeContact,
  messages,
  currentUserId,
  isTyping,
  onSendMessage,
  onTyping,
  isAuthenticated = true,
  onRequireAuth,
  onDeleteMessage,
  onBack,
  onToggleMobileSidebar,
}) => {
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [deletingMessage, setDeletingMessage] = useState<Message | null>(null);

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
          Choose a contact from the sidebar to start chatting over real-time WebSockets.
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
        <div className="flex items-center gap-2 md:gap-3 min-w-0">
          {onToggleMobileSidebar && (
            <button
              type="button"
              onClick={onToggleMobileSidebar}
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
              onClick={onBack}
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
            <span
              className={`absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full ring-2 ring-slate-900 ${
                activeContact.status === "online"
                  ? "bg-emerald-500"
                  : activeContact.status === "away"
                  ? "bg-amber-500"
                  : "bg-slate-500"
              }`}
            />
          </div>
          <div className="min-w-0">
            <h2 className="font-semibold text-slate-100 text-sm leading-snug truncate">
              {activeContact.name}
            </h2>
            <p className="text-xs text-slate-400 flex items-center gap-1.5 truncate">
              {activeContact.status === "online" ? (
                <span className="text-emerald-400 font-medium">Online</span>
              ) : (
                <span>Offline</span>
              )}
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-0.5 md:gap-1 text-slate-400 flex-shrink-0">
          <button className="p-2 hover:text-slate-100 hover:bg-slate-800 rounded-full transition-colors">
            <Phone className="w-4 h-4" />
          </button>
          <button className="p-2 hover:text-slate-100 hover:bg-slate-800 rounded-full transition-colors">
            <Video className="w-4 h-4" />
          </button>
          <button className="p-2 hover:text-slate-100 hover:bg-slate-800 rounded-full transition-colors">
            <Info className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Message Stream */}
      <div className="flex-1 overflow-y-auto p-3 md:p-6 space-y-4 custom-scrollbar">
        <div className="flex justify-center my-2">
          <span className="text-[10px] md:text-[11px] bg-slate-900/90 text-slate-400 px-3 py-1 rounded-full border border-slate-800/80 shadow-inner text-center">
            Encrypted with Socket.io End-to-End Channel
          </span>
        </div>

        {messages.map((msg) => {
          const isMe = msg.senderId === currentUserId;
          return (
            <div
              key={msg.id}
              className={`group flex flex-col ${isMe ? "items-end" : "items-start"}`}
            >
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
          <div className="flex items-center gap-2 text-slate-400 text-xs py-1 px-2 bg-slate-900/60 rounded-lg w-fit border border-slate-800">
            <span className="flex items-center gap-1">
              <span className="w-1.5 h-1.5 bg-indigo-400 rounded-full animate-bounce" />
              <span className="w-1.5 h-1.5 bg-indigo-400 rounded-full animate-bounce [animation-delay:0.2s]" />
              <span className="w-1.5 h-1.5 bg-indigo-400 rounded-full animate-bounce [animation-delay:0.4s]" />
            </span>
            <span className="text-slate-400 italic text-[11px]">
              {activeContact.name} is typing...
            </span>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Message Input */}
      <MessageInput
        onSendMessage={onSendMessage}
        onTyping={onTyping}
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
