"use client";

import React, { useState } from "react";
import {
  Send,
  Paperclip,
  Smile,
  Image as ImageIcon,
} from "lucide-react";

interface MessageInputProps {
  onSendMessage: (text: string) => void;
  onTyping?: () => void;
  disabled?: boolean;
  isAuthenticated?: boolean;
  onRequireAuth?: () => void;
}

export const MessageInput: React.FC<MessageInputProps> = ({
  onSendMessage,
  onTyping,
  disabled = false,
  isAuthenticated = true,
  onRequireAuth,
}) => {
  const [text, setText] = useState("");

  const handleChange = (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    if (!isAuthenticated) {
      onRequireAuth?.();
      return;
    }

    const value = event.target.value;

    setText(value);

    if (value.trim()) {
      onTyping?.();
    }
  };

  const handleSend = (
    event: React.FormEvent<HTMLFormElement>
  ) => {
    event.preventDefault();

    if (!isAuthenticated) {
      onRequireAuth?.();
      return;
    }

    const message = text.trim();

    if (!message || disabled) {
      return;
    }
    console.log("message", message);
    onSendMessage(message);

    setText("");
  };

  return (
    <div className="p-3 bg-slate-900 border-t border-slate-800">
      {!isAuthenticated && (
        <div className="mb-2 p-2 bg-indigo-950/80 border border-indigo-500/30 rounded-lg flex items-center justify-between text-xs text-indigo-200">
          <span>🔒 You must create an account or log in to send messages.</span>
          <button
            type="button"
            onClick={onRequireAuth}
            className="px-2.5 py-1 bg-indigo-600 hover:bg-indigo-500 text-white font-medium rounded transition-colors"
          >
            Create Account
          </button>
        </div>
      )}
      <form
        onSubmit={handleSend}
        className="flex items-center gap-2"
      >
        <div className="flex items-center gap-1 text-slate-400">
          <button
            type="button"
            disabled={!isAuthenticated}
            className="p-2 hover:text-slate-200 hover:bg-slate-800 rounded-full disabled:opacity-40"
          >
            <Paperclip className="w-5 h-5" />
          </button>

          <button
            type="button"
            disabled={!isAuthenticated}
            className="p-2 hover:text-slate-200 hover:bg-slate-800 rounded-full hidden sm:block disabled:opacity-40"
          >
            <ImageIcon className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 relative">
          <input
            type="text"
            value={text}
            onChange={handleChange}
            onClick={() => {
              if (!isAuthenticated) onRequireAuth?.();
            }}
            placeholder={
              disabled
                ? "You are no longer a member of this group"
                : isAuthenticated
                ? "Type a message..."
                : "Create an account or log in to message..."
            }
            disabled={disabled}
            className="w-full bg-slate-800 text-slate-100 placeholder-slate-400 text-sm rounded-xl pl-4 pr-10 py-3 border border-slate-700/60 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/50 disabled:opacity-50"
          />

          <button
            type="button"
            className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200"
          >
            <Smile className="w-5 h-5" />
          </button>
        </div>

        <button
          type="submit"
          disabled={(!text.trim() && isAuthenticated) || disabled}
          className="p-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl disabled:opacity-40"
        >
          <Send className="w-5 h-5" />
        </button>
      </form>
    </div>
  );
};