"use client";

import React, { useState } from "react";
import { useGetUsersQuery } from "@/redux/api/usersApi";
import { Search, X, MessageSquarePlus, User as UserIcon } from "lucide-react";

interface NewConversationModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUserId: string;
  onSelectUser: (user: { id: string; name: string; avatar: string }) => void;
}

export const NewConversationModal: React.FC<NewConversationModalProps> = ({
  isOpen,
  onClose,
  currentUserId,
  onSelectUser,
}) => {
  const [searchQuery, setSearchQuery] = useState("");
  const { data: users = [], isLoading } = useGetUsersQuery(undefined, {
    skip: !isOpen,
  });

  if (!isOpen) return null;

  const filteredUsers = users.filter(
    (u) =>
      u.id !== currentUserId &&
      (u.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        u.email.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4 animate-in fade-in duration-200 select-none">
      <div className="relative w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh]">
        {/* Header */}
        <div className="p-4 px-6 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2 text-indigo-400">
            <MessageSquarePlus className="w-5 h-5" />
            <h3 className="text-base font-semibold text-slate-100">
              New Conversation
            </h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 text-slate-400 hover:text-slate-100 hover:bg-slate-800 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Search Bar */}
        <div className="p-4 border-b border-slate-800/80 bg-slate-900/60">
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search user by name or email..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-slate-800/90 text-slate-100 placeholder-slate-500 text-xs rounded-xl pl-9 pr-4 py-2.5 border border-slate-700/60 focus:outline-none focus:border-indigo-500 transition-colors"
            />
          </div>
        </div>

        {/* Users List */}
        <div className="flex-1 overflow-y-auto p-3 space-y-1.5 custom-scrollbar">
          {isLoading ? (
            <div className="p-8 text-center text-slate-400 text-xs flex flex-col items-center justify-center gap-2">
              <div className="w-5 h-5 border-2 border-indigo-400 border-t-transparent rounded-full animate-spin" />
              <span>Loading registered users...</span>
            </div>
          ) : filteredUsers.length === 0 ? (
            <div className="p-8 text-center text-slate-500 text-xs flex flex-col items-center justify-center gap-2">
              <UserIcon className="w-8 h-8 text-slate-600" />
              <span>No users found</span>
            </div>
          ) : (
            filteredUsers.map((user) => {
              const avatar =
                user.avatar ||
                "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=250&q=80";

              return (
                <button
                  key={user.id}
                  onClick={() => {
                    onSelectUser({
                      id: user.id,
                      name: user.name,
                      avatar,
                    });
                    onClose();
                  }}
                  className="w-full flex items-center justify-between p-3 rounded-xl hover:bg-indigo-600/10 hover:border-indigo-500/30 border border-transparent transition-all group text-left"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <img
                      src={avatar}
                      alt={user.name}
                      className="w-10 h-10 rounded-full object-cover ring-2 ring-slate-800 group-hover:ring-indigo-500/40 transition-all"
                    />
                    <div className="min-w-0">
                      <h4 className="font-semibold text-sm text-slate-100 group-hover:text-indigo-400 transition-colors truncate">
                        {user.name}
                      </h4>
                      <p className="text-xs text-slate-400 truncate">
                        {user.email}
                      </p>
                    </div>
                  </div>

                  <span className="text-xs font-semibold px-3 py-1.5 bg-slate-800 group-hover:bg-indigo-600 text-slate-300 group-hover:text-white rounded-lg transition-all flex-shrink-0">
                    Chat
                  </span>
                </button>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};
