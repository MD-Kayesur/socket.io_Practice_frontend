"use client";

import React, { useState, useRef, useEffect } from "react";
import { Send, Paperclip, Smile, Image as ImageIcon, Mic } from "lucide-react";

interface MessageInputProps {
  onSendMessage: (text: string) => void;
  onTyping?: () => void;
  disabled?: boolean;
}

export const MessageInput: React.FC<MessageInputProps> = ({
  onSendMessage,
  onTyping,
  disabled = false,
}) => {
  const [text, setText] = useState("");
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setText(e.target.value);

    if (onTyping) {
      onTyping();
    }
  };

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (!text.trim() || disabled) return;

    onSendMessage(text.trim());
    setText("");
  };

  return (
    <div className="p-3 bg-slate-900 border-t border-slate-800">
      <form onSubmit={handleSend} className="flex items-center gap-2">
        <div className="flex items-center gap-1 text-slate-400">
          <button
            type="button"
            className="p-2 hover:text-slate-200 hover:bg-slate-800 rounded-full transition-colors"
            title="Attach file"
          >
            <Paperclip className="w-5 h-5" />
          </button>
          <button
            type="button"
            className="p-2 hover:text-slate-200 hover:bg-slate-800 rounded-full transition-colors hidden sm:block"
            title="Send image"
          >
            <ImageIcon className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 relative flex items-center">
          <input
            type="text"
            value={text}
            onChange={handleChange}
            placeholder="Type a message..."
            disabled={disabled}
            className="w-full bg-slate-800 text-slate-100 placeholder-slate-400 text-sm rounded-xl pl-4 pr-10 py-3 border border-slate-700/60 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/50 transition-all disabled:opacity-50"
          />
          <button
            type="button"
            className="absolute right-3 text-slate-400 hover:text-slate-200 transition-colors"
            title="Add Emoji"
          >
            <Smile className="w-5 h-5" />
          </button>
        </div>

        <button
          type="submit"
          disabled={!text.trim() || disabled}
          className="p-3 bg-indigo-600 hover:bg-indigo-500 active:scale-95 text-white rounded-xl font-medium disabled:opacity-40 disabled:hover:bg-indigo-600 disabled:active:scale-100 transition-all shadow-md shadow-indigo-600/20 flex items-center justify-center"
        >
          <Send className="w-5 h-5" />
        </button>
      </form>
    </div>
  );
};
