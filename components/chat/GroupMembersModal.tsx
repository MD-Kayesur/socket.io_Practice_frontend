"use client";

import React, { useState } from "react";
import {
  useGetGroupByIdQuery,
  useRemoveGroupMemberMutation,
} from "@/redux/api/groupsApi";
import {
  X,
  Users,
  Search,
  UserPlus,
  Crown,
  Trash2,
  Loader2,
  Shield,
} from "lucide-react";

interface GroupMembersModalProps {
  isOpen: boolean;
  onClose: () => void;
  groupId: string;
  currentUserId: string;
  onOpenAddMemberModal?: () => void;
}

export const GroupMembersModal: React.FC<GroupMembersModalProps> = ({
  isOpen,
  onClose,
  groupId,
  currentUserId,
  onOpenAddMemberModal,
}) => {
  const [searchQuery, setSearchQuery] = useState("");

  const {
    data: group,
    isLoading,
    refetch,
  } = useGetGroupByIdQuery(groupId, {
    skip: !isOpen || !groupId,
  });

  const [removeMember, { isLoading: isRemoving }] =
    useRemoveGroupMemberMutation();

  if (!isOpen) return null;

  const members: any[] = group?.members || [];
  const creatorId = group?.creatorId;
  const isCurrentUserCreator = creatorId === currentUserId;

  const filteredMembers = members.filter(
    (m) =>
      m.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      m.email?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleRemove = async (userId: string) => {
    try {
      await removeMember({ groupId, userId }).unwrap();
      refetch();
    } catch (err) {
      console.error("Failed to remove group member:", err);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-200 select-none">
      <div className="relative w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh]">
        {/* Header */}
        <div className="p-4 md:p-5 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-3 min-w-0">
            <div className="relative flex-shrink-0">
              <img
                src={
                  group?.avatar ||
                  "https://images.unsplash.com/photo-1522071820081-009f0129c71c?auto=format&fit=crop&w=250&q=80"
                }
                alt={group?.name}
                className="w-10 h-10 rounded-full object-cover ring-2 ring-indigo-500/40"
              />
              <span className="absolute -bottom-1 -right-1 p-0.5 bg-indigo-600 text-white rounded-full ring-2 ring-slate-900">
                <Users className="w-2.5 h-2.5" />
              </span>
            </div>

            <div className="min-w-0">
              <h2 className="text-base font-bold text-slate-100 truncate">
                {group?.name || "Group Members"}
              </h2>
              <p className="text-xs text-indigo-400 font-medium">
                {members.length} {members.length === 1 ? "member" : "members"}
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

        {/* Group Description if present */}
        {group?.description && (
          <div className="px-5 py-2.5 bg-slate-950/60 border-b border-slate-800/80 text-xs text-slate-300 italic">
            "{group.description}"
          </div>
        )}

        {/* Search & Actions Bar */}
        <div className="p-3 px-4 border-b border-slate-800/80 flex items-center gap-2">
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search group members..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-slate-950 text-slate-100 placeholder-slate-500 text-xs rounded-xl pl-9 pr-8 py-2 border border-slate-800 focus:outline-none focus:border-indigo-500 transition-colors"
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

          {onOpenAddMemberModal && (
            <button
              onClick={() => {
                onClose();
                onOpenAddMemberModal();
              }}
              className="flex items-center gap-1 px-3 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold rounded-xl shadow transition-all active:scale-95 flex-shrink-0"
            >
              <UserPlus className="w-3.5 h-3.5" />
              <span>Add</span>
            </button>
          )}
        </div>

        {/* Member List */}
        <div className="flex-1 overflow-y-auto p-3 space-y-1.5 custom-scrollbar">
          {isLoading ? (
            <div className="p-8 text-center text-slate-400 text-xs flex flex-col items-center justify-center gap-2">
              <Loader2 className="w-5 h-5 text-indigo-400 animate-spin" />
              <span>Loading group members...</span>
            </div>
          ) : filteredMembers.length === 0 ? (
            <div className="p-8 text-center text-slate-500 text-xs">
              No members found matching "{searchQuery}"
            </div>
          ) : (
            filteredMembers.map((member: any) => {
              const isCreator = member.id === creatorId;
              const isSelf = member.id === currentUserId;

              return (
                <div
                  key={member.id}
                  className="flex items-center justify-between p-2.5 px-3 rounded-xl bg-slate-950/40 border border-slate-800/60 hover:border-indigo-500/30 transition-all"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <img
                      src={
                        member.avatar ||
                        "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=250&q=80"
                      }
                      alt={member.name}
                      className="w-9 h-9 rounded-full object-cover ring-2 ring-slate-800 flex-shrink-0"
                    />
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5">
                        <h4 className="font-semibold text-xs text-slate-100 truncate">
                          {member.name} {isSelf && "(You)"}
                        </h4>
                        {isCreator && (
                          <span className="flex items-center gap-0.5 text-[9px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30 px-1.5 py-0.2 rounded-full">
                            <Crown className="w-2.5 h-2.5 text-amber-400" />
                            Admin
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-slate-400 truncate">
                        {member.email}
                      </p>
                    </div>
                  </div>

                  {/* Remove Button for Admin or removing non-creators */}
                  {isCurrentUserCreator && !isCreator && !isSelf && (
                    <button
                      onClick={() => handleRemove(member.id)}
                      disabled={isRemoving}
                      title="Remove member from group"
                      className="p-1.5 text-slate-500 hover:text-rose-400 hover:bg-rose-950/40 rounded-lg transition-colors flex-shrink-0"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};
