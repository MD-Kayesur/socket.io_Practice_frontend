"use client";

import React, { useState } from "react";
import { useGetUsersQuery } from "@/redux/api/usersApi";
import { useCreateGroupMutation } from "@/redux/api/groupsApi";
import { getSocket } from "@/lib/socket";
import {
  X,
  Users,
  Check,
  Search,
  Loader2,
  PlusCircle,
  UserCheck,
  UserPlus,
} from "lucide-react";

interface CreateGroupModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUserId: string;
  onGroupCreated?: (group: any) => void;
}

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export const CreateGroupModal: React.FC<CreateGroupModalProps> = ({
  isOpen,
  onClose,
  currentUserId,
  onGroupCreated,
}) => {
  const [groupName, setGroupName] = useState("");
  const [description, setDescription] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedUserIds, setSelectedUserIds] = useState<string[]>([]);
  const [filterMode, setFilterMode] = useState<"all" | "selected">("all");

  const { data: users, isLoading: isLoadingUsers } = useGetUsersQuery();
  const [createGroup, { isLoading: isCreating }] = useCreateGroupMutation();

  if (!isOpen) return null;

  const availableUsers =
    users?.filter((u: any) => u.id !== currentUserId) || [];

  const selectedUsers = availableUsers.filter((u: any) =>
    selectedUserIds.includes(u.id)
  );

  const filteredUsers = availableUsers.filter((u: any) => {
    const matchesSearch =
      u.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      u.email?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesFilter =
      filterMode === "all" || selectedUserIds.includes(u.id);
    return matchesSearch && matchesFilter;
  });

  const toggleUserSelection = (id: string) => {
    setSelectedUserIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  };

  const removeSelectedUser = (id: string) => {
    setSelectedUserIds((prev) => prev.filter((i) => i !== id));
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!groupName.trim()) return;

    try {
      const createdGroup = await createGroup({
        creatorId: currentUserId,
        name: groupName.trim(),
        description: description.trim() || undefined,
        memberIds: selectedUserIds,
      }).unwrap();

      // Emit socket event so backend notifies member rooms
      const socket = getSocket(API_URL);
      if (socket.connected) {
        socket.emit("notifyGroupCreated", {
          group: createdGroup,
          memberIds: [...selectedUserIds, currentUserId],
        });
      }

      onGroupCreated?.(createdGroup);
      setGroupName("");
      setDescription("");
      setSelectedUserIds([]);
      setSearchQuery("");
      setFilterMode("all");
      onClose();
    } catch (err) {
      console.error("Failed to create group:", err);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-lg bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="p-4 md:p-5 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-indigo-600/20 text-indigo-400 rounded-xl border border-indigo-500/30">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-100">
                Create Group Chat
              </h2>
              <p className="text-xs text-slate-400">
                Search and add members to your new group
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-100 hover:bg-slate-800 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body Form */}
        <form onSubmit={handleCreate} className="p-4 md:p-5 space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">
              Group Name <span className="text-rose-400">*</span>
            </label>
            <input
              type="text"
              required
              placeholder="e.g. Project Specs, Team Lounge..."
              value={groupName}
              onChange={(e) => setGroupName(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-indigo-500 transition-colors"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">
              Group Description (Optional)
            </label>
            <input
              type="text"
              placeholder="Brief topic or goal for this group..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-indigo-500 transition-colors"
            />
          </div>

          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-semibold text-slate-300">
                Add Group Members ({selectedUserIds.length} selected)
              </label>

              {selectedUserIds.length > 0 && (
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => setFilterMode("all")}
                    className={`text-[10px] font-semibold px-2 py-0.5 rounded-md transition-colors ${
                      filterMode === "all"
                        ? "bg-indigo-600 text-white"
                        : "bg-slate-800 text-slate-400 hover:text-slate-200"
                    }`}
                  >
                    All
                  </button>
                  <button
                    type="button"
                    onClick={() => setFilterMode("selected")}
                    className={`text-[10px] font-semibold px-2 py-0.5 rounded-md transition-colors ${
                      filterMode === "selected"
                        ? "bg-indigo-600 text-white"
                        : "bg-slate-800 text-slate-400 hover:text-slate-200"
                    }`}
                  >
                    Selected ({selectedUserIds.length})
                  </button>
                </div>
              )}
            </div>

            {/* Selected User Chips Horizontal Bar */}
            {selectedUsers.length > 0 && (
              <div className="flex items-center gap-1.5 overflow-x-auto py-1 mb-2 custom-scrollbar">
                {selectedUsers.map((u: any) => (
                  <div
                    key={u.id}
                    className="flex items-center gap-1 px-2 py-1 bg-indigo-600/30 border border-indigo-500/40 rounded-lg text-slate-200 text-[11px] font-medium flex-shrink-0 animate-in fade-in zoom-in-95 duration-150"
                  >
                    <img
                      src={
                        u.avatar ||
                        "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=250&q=80"
                      }
                      alt={u.name}
                      className="w-4 h-4 rounded-full object-cover"
                    />
                    <span className="truncate max-w-[90px]">{u.name}</span>
                    <button
                      type="button"
                      onClick={() => removeSelectedUser(u.id)}
                      className="text-slate-400 hover:text-rose-300 p-0.5 rounded-full hover:bg-rose-950/50 transition-colors"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* Interactive Search User Input */}
            <div className="relative mb-2">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-indigo-400" />
              <input
                type="text"
                placeholder="Search user name or email to add..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-8 py-2 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-indigo-500 shadow-inner transition-colors"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery("")}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 p-0.5 rounded-full"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* User Directory Checklist */}
            <div className="max-h-48 overflow-y-auto space-y-1 pr-1 custom-scrollbar border border-slate-800/80 rounded-xl bg-slate-950/60 p-2">
              {isLoadingUsers ? (
                <div className="p-4 text-center text-slate-500 text-xs flex items-center justify-center gap-2">
                  <Loader2 className="w-4 h-4 animate-spin text-indigo-500" />
                  Loading directory...
                </div>
              ) : filteredUsers.length === 0 ? (
                <div className="p-4 text-center text-slate-500 text-xs">
                  <p className="font-semibold text-slate-400">No matching users</p>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    Try typing a different name in the search box above
                  </p>
                </div>
              ) : (
                filteredUsers.map((user: any) => {
                  const isSelected = selectedUserIds.includes(user.id);
                  return (
                    <div
                      key={user.id}
                      onClick={() => toggleUserSelection(user.id)}
                      className={`flex items-center justify-between p-2 rounded-lg cursor-pointer transition-colors ${
                        isSelected
                          ? "bg-indigo-600/20 border border-indigo-500/40 text-slate-100"
                          : "hover:bg-slate-800/60 text-slate-300 border border-transparent"
                      }`}
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <img
                          src={
                            user.avatar ||
                            "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=250&q=80"
                          }
                          alt={user.name}
                          className="w-8 h-8 rounded-full object-cover"
                        />
                        <div className="min-w-0">
                          <p className="text-xs font-medium text-slate-100 truncate">
                            {user.name}
                          </p>
                          <p className="text-[10px] text-slate-500 truncate">
                            {user.email}
                          </p>
                        </div>
                      </div>

                      <div
                        className={`w-5 h-5 rounded-md flex items-center justify-center border transition-all ${
                          isSelected
                            ? "bg-indigo-600 border-indigo-500 text-white"
                            : "border-slate-700 bg-slate-900"
                        }`}
                      >
                        {isSelected && <Check className="w-3.5 h-3.5" />}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Footer Actions */}
          <div className="pt-2 flex items-center justify-end gap-2 border-t border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded-xl transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isCreating || !groupName.trim()}
              className="flex items-center gap-1.5 px-5 py-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-xs font-bold rounded-xl shadow-lg shadow-indigo-600/20 active:scale-95 transition-all"
            >
              {isCreating ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" /> Creating...
                </>
              ) : (
                <>
                  <PlusCircle className="w-4 h-4" /> Create Group
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
