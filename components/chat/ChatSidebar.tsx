"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { Search, MoreVertical, Users, MessageSquarePlus, Trash2, Plus, X, UserPlus, Users2 } from "lucide-react";

export interface Contact {
  id: string;
  name: string;
  avatar: string;
  status: "online" | "offline" | "away";
  lastMessage: string;
  lastMessageTime: string;
  unreadCount?: number;
  isGroup?: boolean;
  memberCount?: number;
  members?: any[];
  description?: string;
}

interface ChatSidebarProps {
  contacts: Contact[];
  activeContactId: string;
  onSelectContact: (id: string) => void;
  onDeleteContact?: (id: string) => void;
  onOpenNewChatModal?: () => void;
  onOpenCreateGroupModal?: () => void;
  onCloseMobileSidebar?: () => void;
  currentUser: {
    id: string;
    name: string;
    avatar: string;
    status: string;
  };
}

export const ChatSidebar: React.FC<ChatSidebarProps> = ({
  contacts,
  activeContactId,
  onSelectContact,
  onDeleteContact,
  onOpenNewChatModal,
  onOpenCreateGroupModal,
  onCloseMobileSidebar,
  currentUser,
}) => {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState("");

  const filteredContacts = contacts.filter(
    (contact) =>
      contact.id !== currentUser.id &&
      contact.name?.toLowerCase() !== currentUser.name?.toLowerCase() &&
      contact.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const totalUnread = contacts.reduce((sum, c) => sum + (c.unreadCount || 0), 0);

  return (
    <div className="w-full md:w-80 lg:w-96 flex flex-col bg-slate-900 border-r border-slate-800 h-full select-none flex-shrink-0">
      {/* Header */}
      <div className="p-4 border-b border-slate-800 flex items-center justify-between">
        <div className="flex items-center gap-3 min-w-0">
          <div className="relative flex-shrink-0">
            <img
              src="/Screenshot_2026-08-19_at_11.41.20_AM-removebg-preview.png"
              alt="App Logo"
              className="w-10 h-10 object-contain drop-shadow-md"
            />
          </div>

          <div className="min-w-0">
            <h2 className="font-semibold text-slate-100 text-sm truncate flex items-center gap-1.5">
              <span>{currentUser.name}</span>
            </h2>
            <p className="text-xs text-emerald-400">Active Now</p>
          </div>
        </div>

        <div className="flex items-center gap-1 flex-shrink-0">
          <button
            type="button"
            onClick={onOpenNewChatModal}
            title="Start 1-on-1 chat"
            className="flex items-center gap-1 px-2.5 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-semibold shadow-md transition-all active:scale-95"
          >
            <Plus className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">New Chat</span>
          </button>
          <button
            type="button"
            onClick={onOpenCreateGroupModal}
            title="Create new group chat"
            className="flex items-center gap-1 px-2.5 py-1.5 bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-300 rounded-lg text-xs font-semibold border border-indigo-500/30 transition-all"
          >
            <Users className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">+ Group</span>
          </button>
          {onCloseMobileSidebar && (
            <button
              type="button"
              onClick={onCloseMobileSidebar}
              title="Close menu"
              className="md:hidden p-1.5 text-slate-400 hover:text-slate-100 hover:bg-slate-800 rounded-lg transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>
      </div>

      {/* Search Input */}
      <div className="p-3">
        <div className="relative">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
          <input
            type="text"
            placeholder="Search chats & groups..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-slate-950 border border-slate-800/80 rounded-xl pl-9 pr-4 py-2 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-indigo-500/50 transition-all"
          />
        </div>
      </div>

      <div className="px-4 py-2 flex items-center justify-between text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
        <div className="flex items-center gap-2">
          <span>Conversations</span>
          {totalUnread > 0 && (
            <span className="bg-indigo-600 text-white text-[10px] font-bold px-2 py-0.5 rounded-full animate-pulse lowercase font-sans">
              {totalUnread} new
            </span>
          )}
        </div>
        <span className="bg-slate-800 text-slate-400 px-2 py-0.5 rounded-full">
          {filteredContacts.length}
        </span>
      </div>

      <div className="flex-1 overflow-y-auto px-2 space-y-1 custom-scrollbar">
        {filteredContacts.length === 0 ? (
          <div className="p-8 text-center text-slate-500 text-xs flex flex-col items-center justify-center gap-3 mt-6">
            <MessageSquarePlus className="w-10 h-10 text-slate-600" />
            <div>
              <p className="font-semibold text-slate-300">No conversations yet</p>
              <p className="text-[11px] text-slate-500 mt-1">
                Start a 1-on-1 chat or create a group with registered users.
              </p>
            </div>
            <div className="flex items-center gap-2 mt-2">
              <button
                onClick={onOpenNewChatModal}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-semibold shadow-md transition-all active:scale-95"
              >
                <Plus className="w-3.5 h-3.5" />
                New Chat
              </button>
              <button
                onClick={onOpenCreateGroupModal}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-indigo-400 rounded-xl text-xs font-semibold border border-slate-700 transition-all active:scale-95"
              >
                <Users className="w-3.5 h-3.5" />
                Create Group
              </button>
            </div>
          </div>
        ) : (
          filteredContacts.map((contact) => {
            const isActive = contact.id === activeContactId;
            const hasUnread = Boolean(contact.unreadCount && contact.unreadCount > 0);

            return (
              <div
                key={contact.id}
                className="relative group/contact flex items-center w-full"
              >
                <button
                  type="button"
                  onClick={() => onSelectContact(contact.id)}
                  className={`w-full flex items-center gap-3 p-3 rounded-xl text-left transition-all ${
                    isActive
                      ? "bg-indigo-600/20 border border-indigo-500/30 text-slate-100"
                      : hasUnread
                      ? "bg-slate-800/80 border border-indigo-500/30 text-slate-100"
                      : "hover:bg-slate-800/60 border border-transparent text-slate-300"
                  }`}
                >
                  <div className="relative flex-shrink-0">
                    <img
                      src={contact.avatar}
                      alt={contact.name}
                      className="w-11 h-11 rounded-full object-cover"
                    />
                    {contact.isGroup ? (
                      <span className="absolute -bottom-1 -right-1 p-1 bg-indigo-600 text-white rounded-full ring-2 ring-slate-900 shadow">
                        <Users className="w-2.5 h-2.5" />
                      </span>
                    ) : (
                      <span
                        className={`absolute bottom-0 right-0 w-3 h-3 rounded-full ring-2 ring-slate-900 ${
                          contact.status === "online"
                            ? "bg-emerald-500"
                            : contact.status === "away"
                            ? "bg-amber-500"
                            : "bg-slate-500"
                        }`}
                      />
                    )}
                  </div>

                  <div className="flex-1 min-w-0 pr-6">
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center gap-1.5 min-w-0">
                        <h3 className={`text-sm truncate ${hasUnread ? "font-bold text-slate-100" : "font-medium text-slate-200"}`}>
                          {contact.name}
                        </h3>
                        {contact.isGroup && (
                          <span className="text-[10px] font-semibold bg-indigo-500/20 text-indigo-300 px-1.5 py-0.2 rounded border border-indigo-500/30">
                            Group
                          </span>
                        )}
                      </div>
                      <span className={`text-[11px] flex-shrink-0 ${hasUnread ? "text-indigo-400 font-semibold" : "text-slate-500"}`}>
                        {contact.lastMessageTime}
                      </span>
                    </div>

                    <div className="flex items-center justify-between">
                      <p className={`text-xs truncate pr-2 ${hasUnread ? "font-semibold text-indigo-200" : "text-slate-400"}`}>
                        {contact.lastMessage}
                      </p>
                      {hasUnread ? (
                        <span className="bg-indigo-600 text-white text-[10px] font-bold px-2 py-0.5 rounded-full min-w-[20px] text-center shadow-lg shadow-indigo-600/40 animate-pulse">
                          {contact.unreadCount}
                        </span>
                      ) : null}
                    </div>
                  </div>
                </button>

                {/* Delete Sidebar Contact Button */}
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onDeleteContact?.(contact.id);
                  }}
                  title="Remove from sidebar"
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 opacity-0 group-hover/contact:opacity-100 p-1.5 text-slate-400 hover:text-rose-400 hover:bg-slate-800 rounded-lg transition-all"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};