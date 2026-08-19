"use client";

import React from "react";
import { Trash2, Users, User, X } from "lucide-react";

interface DeleteMessageModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (mode: "everyone" | "me") => void;
  isSender: boolean;
}

export const DeleteMessageModal: React.FC<DeleteMessageModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  isSender,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-200 select-none">
      <div className="relative w-full max-w-sm bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden p-6">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1 text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded-full transition-colors"
        >
          <X className="w-4 h-4" />
        </button>

        <div className="w-12 h-12 rounded-full bg-rose-500/10 border border-rose-500/20 text-rose-400 flex items-center justify-center mb-4">
          <Trash2 className="w-6 h-6" />
        </div>

        <h3 className="text-lg font-bold text-slate-100 mb-1">
          Delete Message?
        </h3>
        <p className="text-xs text-slate-400 mb-6 leading-relaxed">
          Choose whether you want to delete this message only for yourself or for everyone in this chat.
        </p>

        <div className="space-y-2.5">
          {isSender && (
            <button
              onClick={() => {
                onConfirm("everyone");
                onClose();
              }}
              className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-rose-600 hover:bg-rose-500 text-white text-xs font-semibold rounded-xl shadow-lg shadow-rose-600/20 active:scale-95 transition-all"
            >
              <Users className="w-4 h-4" />
              Delete for Everyone
            </button>
          )}

          <button
            onClick={() => {
              onConfirm("me");
              onClose();
            }}
            className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold rounded-xl border border-slate-700 active:scale-95 transition-all"
          >
            <User className="w-4 h-4" />
            Delete for Me
          </button>

          <button
            onClick={onClose}
            className="w-full py-2 text-slate-400 hover:text-slate-200 text-xs font-medium transition-colors mt-1"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
};
