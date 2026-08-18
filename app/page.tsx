"use client";

import React, { useState, useEffect } from "react";
import { ChatSidebar, Contact } from "@/components/chat/ChatSidebar";
import { ChatWindow, Message } from "@/components/chat/ChatWindow";
import { SocketStatusBadge } from "@/components/chat/SocketStatusBadge";
import { getSocket, disconnectSocket } from "@/lib/socket";

export default function MessengerPage() {
  const [serverUrl, setServerUrl] = useState("http://localhost:8000");
  const [socketStatus, setSocketStatus] = useState<
    "connected" | "connecting" | "disconnected"
  >("connecting");

  const [currentUser] = useState({
    id: "user-me",
    name: "Kayesur (You)",
    avatar:
      "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=250&q=80",
    status: "online",
  });

  const [contacts, setContacts] = useState<Contact[]>([
    {
      id: "contact-1",
      name: "Sarah Jenkins",
      avatar:
        "https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=250&q=80",
      status: "online",
      lastMessage: "Hey! Did you get the NestJS backend running on port 8000?",
      lastMessageTime: "12:42 PM",
      unreadCount: 2,
    },
    {
      id: "contact-2",
      name: "Alex Rivera",
      avatar:
        "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=250&q=80",
      status: "online",
      lastMessage: "Socket.io real-time connection is looking super smooth!",
      lastMessageTime: "11:15 AM",
    },
    {
      id: "contact-3",
      name: "Elena Rostova",
      avatar:
        "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?auto=format&fit=crop&w=250&q=80",
      status: "away",
      lastMessage: "I'll review the database schema once Prisma is ready.",
      lastMessageTime: "Yesterday",
    },
  ]);

  const [activeContactId, setActiveContactId] = useState<string>("contact-1");

  const [messagesMap, setMessagesMap] = useState<Record<string, Message[]>>({
    "contact-1": [
      {
        id: "m1",
        senderId: "contact-1",
        recipientId: "user-me",
        text: "Hi Kayesur! Welcome to the new Messenger UI.",
        timestamp: "12:40 PM",
        status: "read",
      },
      {
        id: "m2",
        senderId: "user-me",
        recipientId: "contact-1",
        text: "Thanks Sarah! I built this with Next.js and Socket.io.",
        timestamp: "12:41 PM",
        status: "read",
      },
      {
        id: "m3",
        senderId: "contact-1",
        recipientId: "user-me",
        text: "Hey! Did you get the NestJS backend running on port 8000?",
        timestamp: "12:42 PM",
        status: "read",
      },
    ],
    "contact-2": [
      {
        id: "m4",
        senderId: "contact-2",
        recipientId: "user-me",
        text: "Socket.io real-time connection is looking super smooth!",
        timestamp: "11:15 AM",
        status: "read",
      },
    ],
    "contact-3": [
      {
        id: "m5",
        senderId: "contact-3",
        recipientId: "user-me",
        text: "I'll review the database schema once Prisma is ready.",
        timestamp: "Yesterday",
        status: "read",
      },
    ],
  });

  const [isOtherTyping, setIsOtherTyping] = useState<boolean>(false);

  // Initialize Socket.io Connection
  useEffect(() => {
    setSocketStatus("connecting");
    const socket = getSocket(serverUrl);

    socket.on("connect", () => {
      setSocketStatus("connected");
      console.log("Connected to Socket.io server:", socket.id);
    });

    socket.on("disconnect", () => {
      setSocketStatus("disconnected");
      console.log("Disconnected from Socket.io server");
    });

    socket.on("connect_error", () => {
      setSocketStatus("disconnected");
    });

    // Listen for incoming real-time messages
    socket.on(
      "receiveMessage",
      (data: { senderId: string; text: string; timestamp?: string }) => {
        const newMsg: Message = {
          id: `msg-${Date.now()}`,
          senderId: data.senderId,
          recipientId: currentUser.id,
          text: data.text,
          timestamp:
            data.timestamp ||
            new Date().toLocaleTimeString([], {
              hour: "2-digit",
              minute: "2-digit",
            }),
          status: "read",
        };

        setMessagesMap((prev) => ({
          ...prev,
          [data.senderId]: [...(prev[data.senderId] || []), newMsg],
        }));
      }
    );

    // Listen for typing events
    socket.on("userTyping", (data: { senderId: string }) => {
      if (data.senderId === activeContactId) {
        setIsOtherTyping(true);
        setTimeout(() => setIsOtherTyping(false), 3000);
      }
    });

    return () => {
      socket.off("connect");
      socket.off("disconnect");
      socket.off("connect_error");
      socket.off("receiveMessage");
      socket.off("userTyping");
    };
  }, [serverUrl, activeContactId]);

  const handleReconnect = () => {
    disconnectSocket();
    setSocketStatus("connecting");
    const socket = getSocket(serverUrl);
    socket.connect();
  };

  const handleSendMessage = (text: string) => {
    const timeNow = new Date().toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    });

    const newMsg: Message = {
      id: `msg-me-${Date.now()}`,
      senderId: currentUser.id,
      recipientId: activeContactId,
      text,
      timestamp: timeNow,
      status: "sent",
    };

    // Update Local UI state immediately
    setMessagesMap((prev) => ({
      ...prev,
      [activeContactId]: [...(prev[activeContactId] || []), newMsg],
    }));

    // Update last message in contact sidebar list
    setContacts((prev) =>
      prev.map((c) =>
        c.id === activeContactId
          ? { ...c, lastMessage: text, lastMessageTime: timeNow, unreadCount: 0 }
          : c
      )
    );

    // Emit over Socket.io
    const socket = getSocket(serverUrl);
    if (socket && socket.connected) {
      socket.emit("sendMessage", {
        recipientId: activeContactId,
        senderId: currentUser.id,
        text,
      });
    }
  };

  const handleTyping = () => {
    const socket = getSocket(serverUrl);
    if (socket && socket.connected) {
      socket.emit("typing", {
        senderId: currentUser.id,
        recipientId: activeContactId,
      });
    }
  };

  const activeContact =
    contacts.find((c) => c.id === activeContactId) || null;
  const currentMessages = messagesMap[activeContactId] || [];

  return (
    <div className="flex flex-col h-screen w-screen bg-slate-950 text-slate-100 overflow-hidden font-sans">
      {/* Top Socket.io Connection Status Bar */}
      <SocketStatusBadge
        status={socketStatus}
        serverUrl={serverUrl}
        onUrlChange={(newUrl) => setServerUrl(newUrl)}
        onReconnect={handleReconnect}
      />

      {/* Main Messenger Layout */}
      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar */}
        <ChatSidebar
          contacts={contacts}
          activeContactId={activeContactId}
          onSelectContact={(id) => {
            setActiveContactId(id);
            // Clear unread count when opening
            setContacts((prev) =>
              prev.map((c) => (c.id === id ? { ...c, unreadCount: 0 } : c))
            );
          }}
          currentUser={currentUser}
        />

        {/* Chat Window */}
        <ChatWindow
          activeContact={activeContact}
          messages={currentMessages}
          currentUserId={currentUser.id}
          isTyping={isOtherTyping}
          onSendMessage={handleSendMessage}
          onTyping={handleTyping}
        />
      </div>
    </div>
  );
}
