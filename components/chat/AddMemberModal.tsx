"use client";

import React, { useState } from "react";
import { useGetUsersQuery } from "@/redux/api/usersApi";
import { useAddGroupMembersMutation } from "@/redux/api/groupsApi";
import { getSocket } from "@/lib/socket";
import { X, UserPlus, Check, Search, Loader2 } from "lucide-react";

interface AddMemberModalProps {
  isOpen: boolean;
  onClose: () => void;
  groupId: string;
  groupName: string;
  existingMemberIds: string[];
}

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export const AddMemberModal: React.FC<AddMemberModalProps> = ({
  isOpen,
  onClose,
  groupId,
  groupName,
  existingMemberIds = [],
}) => {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedUserIds, setSelectedUserIds] = useState<string[]>([]);

  const { data: users, isLoading: isLoadingUsers } = useGetUsersQuery();
  const [addGroupMembers, { isLoading: isAdding }] = useAddGroupMembersMutation();

  if (!isOpen) return null;

  const eligibleUsers =
    users?.filter((u: any) => !existingMemberIds.includes(u.id)) || [];

  const selectedUsers = eligibleUsers.filter((u: any) =>
    selectedUserIds.includes(u.id)
  );

  const filteredUsers = eligibleUsers.filter(
    (u: any) =>
      u.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      u.email?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const toggleUserSelection = (id: string) => {
    setSelectedUserIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  };

  const removeSelectedUser = (id: string) => {
    setSelectedUserIds((prev) => prev.filter((i) => i !== id));
  };

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedUserIds.length === 0) return;

    try {
      const updatedGroup = await addGroupMembers({
        groupId,
        memberIds: selectedUserIds,
      }).unwrap();

      // Emit socket notification to newly added members
      const socket = getSocket(API_URL);
      if (socket.connected) {
        socket.emit("notifyGroupCreated", {
          group: updatedGroup,
          memberIds: selectedUserIds,
        });
      }

      setSelectedUserIds([]);
      setSearchQuery("");
      onClose();
    } catch (err) {
      console.error("Failed to add members to group:", err);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="p-4 md:p-5 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-indigo-600/20 text-indigo-400 rounded-xl border border-indigo-500/30">
              <UserPlus className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-100 truncate max-w-[240px]">
                Add to "{groupName}"
              </h2>
              <p className="text-xs text-slate-400">
                Search and select users to add
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
        <form onSubmit={handleAdd} className="p-4 md:p-5 space-y-4">
          <div>
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
                placeholder="Search user by name or email..."
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
            <div className="max-h-56 overflow-y-auto space-y-1 pr-1 custom-scrollbar border border-slate-800/80 rounded-xl bg-slate-950/60 p-2">
              {isLoadingUsers ? (
                <div className="p-4 text-center text-slate-500 text-xs flex items-center justify-center gap-2">
                  <Loader2 className="w-4 h-4 animate-spin text-indigo-500" />
                  Loading directory...
                </div>
              ) : filteredUsers.length === 0 ? (
                <p className="p-4 text-center text-slate-500 text-xs">
                  {searchQuery
                    ? "No users matching search"
                    : "All available users are already in this group"}
                </p>
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
              disabled={isAdding || selectedUserIds.length === 0}
              className="flex items-center gap-1.5 px-5 py-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-xs font-bold rounded-xl shadow-lg shadow-indigo-600/20 active:scale-95 transition-all"
            >
              {isAdding ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" /> Adding...
                </>
              ) : (
                <>
                  <UserPlus className="w-4 h-4" /> Add Selected ({selectedUserIds.length})
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
