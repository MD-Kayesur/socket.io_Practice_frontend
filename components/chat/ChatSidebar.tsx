"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { Search, MoreVertical, Users, MessageSquarePlus } from "lucide-react";

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
  currentUser,
}) => {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState("");

  const filteredContacts = contacts.filter((contact) =>
    contact.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="w-80 md:w-96 flex flex-col bg-slate-900 border-r border-slate-800 h-full select-none">
      {/* Header */}
      <div className="p-4 border-b border-slate-800 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="relative">
            <img
              src={currentUser.avatar}
              alt={currentUser.name}
              className="w-10 h-10 rounded-full object-cover ring-2 ring-indigo-500/40"
            />
            <span className="absolute bottom-0 right-0 w-3 h-3 bg-emerald-500 rounded-full ring-2 ring-slate-900" />
          </div>

          <div>
            <h2 className="font-semibold text-slate-100 text-sm">
              {currentUser.name}
            </h2>
            <p className="text-xs text-emerald-400">Active Now</p>
          </div>
        </div>

        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => router.push("/users")}
            title="Users Directory"
            className="flex items-center gap-1 px-2.5 py-1.5 bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-400 hover:text-indigo-300 rounded-lg text-xs font-semibold border border-indigo-500/30 transition-all"
          >
            <Users className="w-4 h-4" />
            <span>Users</span>
          </button>
          <button
            type="button"
            title="Options"
            className="p-2 text-slate-400 hover:text-slate-100 hover:bg-slate-800 rounded-full"
          >
            <MoreVertical className="w-5 h-5" />
          </button>
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
        <span>Direct Messages</span>
        <span className="bg-slate-800 text-slate-400 px-2 py-0.5 rounded-full">
          {contacts.length}
        </span>
      </div>

      <div className="flex-1 overflow-y-auto px-2 space-y-1 custom-scrollbar">
        {filteredContacts.length === 0 ? (
          <div className="p-8 text-center text-slate-500 text-xs flex flex-col items-center justify-center gap-3 mt-6">
            <MessageSquarePlus className="w-10 h-10 text-slate-600" />
            <div>
              <p className="font-semibold text-slate-300">No conversations yet</p>
              <p className="text-[11px] text-slate-500 mt-1">
                Go to the Users Directory to start a chat with someone.
              </p>
            </div>
            <button
              onClick={() => router.push("/users")}
              className="mt-2 inline-flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-semibold shadow-md transition-all active:scale-95"
            >
              <Users className="w-3.5 h-3.5" />
              Find Users
            </button>
          </div>
        ) : (
          filteredContacts.map((contact) => {
            const isActive = contact.id === activeContactId;

            return (
              <button
                type="button"
                key={contact.id}
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

                <div className="flex-1 min-w-0">
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
            );
          })
        )}
      </div>
    </div>
  );
};