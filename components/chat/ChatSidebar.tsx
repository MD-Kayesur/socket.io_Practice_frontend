"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { Search, MoreVertical, Users, MessageSquarePlus, Trash2, Plus, X } from "lucide-react";

export interface Contact {
  id: string;
  name: string;
  avatar: string;
  status: "online" | "offline" | "away";
  lastMessage: string;
  lastMessageTime: string;
  unreadCount?: number;
}

interface ChatSidebarProps {
  contacts: Contact[];
  activeContactId: string;
  onSelectContact: (id: string) => void;
  onDeleteContact?: (id: string) => void;
  onOpenNewChatModal?: () => void;
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

  return (
    <div className="w-full md:w-80 lg:w-96 flex flex-col bg-slate-900 border-r border-slate-800 h-full select-none flex-shrink-0">
      {/* Header */}
      <div className="p-4 border-b border-slate-800 flex items-center justify-between">
        <div className="flex items-center gap-3 min-w-0">
          <div className="relative flex-shrink-0">
            <img
              src={currentUser.avatar}
              alt={currentUser.name}
              className="w-10 h-10 rounded-full object-cover ring-2 ring-indigo-500/40"
            />
            <span className="absolute bottom-0 right-0 w-3 h-3 bg-emerald-500 rounded-full ring-2 ring-slate-900" />
          </div>

          <div className="min-w-0">
            <h2 className="font-semibold text-slate-100 text-sm truncate">
              {currentUser.name}
            </h2>
            <p className="text-xs text-emerald-400">Active Now</p>
          </div>
        </div>

        <div className="flex items-center gap-1.5 flex-shrink-0">
          <button
            type="button"
            onClick={onOpenNewChatModal}
            title="Start new conversation"
            className="flex items-center gap-1 px-2.5 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-semibold shadow-md transition-all active:scale-95"
          >
            <Plus className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">New Chat</span>
          </button>
          <button
            type="button"
            onClick={() => router.push("/users")}
            title="Users Directory"
            className="flex items-center gap-1 px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs font-semibold border border-slate-700 transition-all"
          >
            <Users className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Users</span>
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

      {/* Search */}
      <div className="p-3">
        <div className="relative">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search conversations..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-slate-800/80 text-slate-200 placeholder-slate-500 text-xs rounded-lg pl-9 pr-4 py-2.5 border border-slate-800 focus:outline-none focus:border-indigo-500"
          />
        </div>
      </div>

      <div className="px-4 py-2 flex items-center justify-between text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
        <div className="flex items-center gap-2">
          <span>Direct Messages</span>
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
                Start a new conversation with a registered user.
              </p>
            </div>
            <button
              onClick={onOpenNewChatModal}
              className="mt-2 inline-flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-semibold shadow-md transition-all active:scale-95"
            >
              <Plus className="w-3.5 h-3.5" />
              New Conversation
            </button>
          </div>
        ) : (
          filteredContacts.map((contact) => {
            const isActive = contact.id === activeContactId;

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
                      : "hover:bg-slate-800/60 border border-transparent text-slate-300"
                  }`}
                >
                  <div className="relative flex-shrink-0">
                    <img
                      src={contact.avatar}
                      alt={contact.name}
                      className="w-11 h-11 rounded-full object-cover"
                    />
                    <span
                      className={`absolute bottom-0 right-0 w-3 h-3 rounded-full ring-2 ring-slate-900 ${
                        contact.status === "online"
                          ? "bg-emerald-500"
                          : contact.status === "away"
                          ? "bg-amber-500"
                          : "bg-slate-500"
                      }`}
                    />
                  </div>

                  <div className="flex-1 min-w-0 pr-6">
                    <div className="flex items-center justify-between mb-1">
                      <h3 className="font-medium text-sm text-slate-100 truncate">
                        {contact.name}
                      </h3>
                      <span className="text-[11px] text-slate-500">
                        {contact.lastMessageTime}
                      </span>
                    </div>

                    <div className="flex items-center justify-between">
                      <p className="text-xs text-slate-400 truncate pr-2">
                        {contact.lastMessage}
                      </p>
                      {contact.unreadCount && contact.unreadCount > 0 ? (
                        <span className="bg-indigo-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full min-w-[18px] text-center">
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
                  title="Remove conversation from sidebar"
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