"use client";

import React, { useState, useEffect, useCallback, useMemo, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { ChatSidebar, Contact } from "@/components/chat/ChatSidebar";
import { ChatWindow, Message } from "@/components/chat/ChatWindow";
import { SocketStatusBadge } from "@/components/chat/SocketStatusBadge";
import { AuthModal } from "@/components/auth/AuthModal";
import { getSocket } from "@/lib/socket";
import { useAppDispatch, useAppSelector } from "@/redux/hooks";
import { setActiveContactId, setSocketStatus } from "@/redux/slices/chatSlice";
import { logout, setUser } from "@/redux/slices/authSlice";
import { useGetMeQuery } from "@/redux/api/authApi";
import { LogIn, LogOut, User as UserIcon, Users } from "lucide-react";
import Link from "next/link";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

function MessengerContent() {
  const searchParams = useSearchParams();
  const dispatch = useAppDispatch();
  const { activeContactId, socketStatus } = useAppSelector((state) => state.chat);
  const { user: authUser, isAuthenticated } = useAppSelector((state) => state.auth);

  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);

  // Fetch logged in user details
  const { data: meData } = useGetMeQuery(undefined, {
    skip: !isAuthenticated,
  });

  useEffect(() => {
    if (meData?.user) {
      dispatch(setUser(meData.user));
    }
  }, [meData, dispatch]);

  const currentUser = useMemo(
    () => ({
      id: authUser?.id || "user-me",
      name: authUser?.name || "Guest User",
      avatar:
        authUser?.avatar ||
        "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=250&q=80",
      status: "online",
    }),
    [authUser]
  );

  const contactsStorageKey = `messenger_contacts_${currentUser.id}`;
  const messagesStorageKey = `messenger_messages_${currentUser.id}`;
  const activeStorageKey = `messenger_active_${currentUser.id}`;

  const [contacts, setContacts] = useState<Contact[]>([]);
  const [messagesMap, setMessagesMap] = useState<Record<string, Message[]>>({});
  const [isInitialized, setIsInitialized] = useState(false);

  // 1. Load persisted state from localStorage on mount / user change
  useEffect(() => {
    try {
      const savedContacts = localStorage.getItem(contactsStorageKey);
      const savedMessages = localStorage.getItem(messagesStorageKey);
      const savedActive = localStorage.getItem(activeStorageKey);

      if (savedContacts) {
        const parsed = JSON.parse(savedContacts);
        setContacts(parsed);
      } else {
        setContacts([]);
      }

      if (savedMessages) {
        const parsed = JSON.parse(savedMessages);
        setMessagesMap(parsed);
      } else {
        setMessagesMap({});
      }

      if (savedActive) {
        dispatch(setActiveContactId(savedActive));
      }
    } catch (e) {
      console.error("Failed to load state from localStorage", e);
    } finally {
      setIsInitialized(true);
    }
  }, [currentUser.id, contactsStorageKey, messagesStorageKey, activeStorageKey, dispatch]);

  // 2. Persist state changes to localStorage
  useEffect(() => {
    if (!isInitialized) return;
    try {
      localStorage.setItem(contactsStorageKey, JSON.stringify(contacts));
    } catch (e) {
      console.error("Failed to save contacts to localStorage", e);
    }
  }, [contacts, contactsStorageKey, isInitialized]);

  useEffect(() => {
    if (!isInitialized) return;
    try {
      localStorage.setItem(messagesStorageKey, JSON.stringify(messagesMap));
    } catch (e) {
      console.error("Failed to save messages to localStorage", e);
    }
  }, [messagesMap, messagesStorageKey, isInitialized]);

  useEffect(() => {
    if (!isInitialized || !activeContactId) return;
    try {
      localStorage.setItem(activeStorageKey, activeContactId);
    } catch (e) {
      console.error("Failed to save activeContactId to localStorage", e);
    }
  }, [activeContactId, activeStorageKey, isInitialized]);

  const [isOtherTyping, setIsOtherTyping] = useState(false);

  // 3. Handle URL query parameters when a user selects "Message" from /users page
  useEffect(() => {
    const chatWith = searchParams.get("chatWith");
    const rawUserData = searchParams.get("userData");

    if (chatWith) {
      let targetUser = {
        id: chatWith,
        name: "User",
        avatar:
          "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=250&q=80",
        status: "online" as const,
      };

      if (rawUserData) {
        try {
          const parsed = JSON.parse(decodeURIComponent(rawUserData));
          targetUser = {
            id: parsed.id,
            name: parsed.name,
            avatar:
              parsed.avatar ||
              "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=250&q=80",
            status: "online",
          };
        } catch (e) {
          console.error("Failed to parse user data param", e);
        }
      }

      // Add selected user from /users table to top of sidebar
      setContacts((prev) => {
        const target = prev.find((c) => c.id === targetUser.id);
        const remaining = prev.filter((c) => c.id !== targetUser.id);

        if (target) {
          return [target, ...remaining];
        }

        const newContact: Contact = {
          id: targetUser.id,
          name: targetUser.name,
          avatar: targetUser.avatar,
          status: "online",
          lastMessage: "Conversation started",
          lastMessageTime: "Just now",
          unreadCount: 0,
        };

        return [newContact, ...remaining];
      });

      dispatch(setActiveContactId(targetUser.id));
    }
  }, [searchParams, dispatch]);

  // 4. Initialize Socket Connection & Event Handlers
  useEffect(() => {
    const socket = getSocket(API_URL);

    if (socket.connected) {
      dispatch(setSocketStatus("connected"));
      socket.emit("join-user", { userId: currentUser.id });
    } else {
      dispatch(setSocketStatus("connecting"));
    }

    const handleConnect = () => {
      console.log("Socket connected:", socket.id);
      dispatch(setSocketStatus("connected"));
      socket.emit("join-user", { userId: currentUser.id });
    };

    const handleDisconnect = () => {
      console.log("Socket disconnected");
      dispatch(setSocketStatus("disconnected"));
      setIsOtherTyping(false);
    };

    const handleConnectError = (error: Error) => {
      console.error("Socket connection error:", error);
      dispatch(setSocketStatus("disconnected"));
    };

    // Incoming real-time message handler
    const handleReceiveMessage = (data: {
      id?: string;
      senderId: string;
      senderName?: string;
      senderAvatar?: string;
      recipientId: string;
      text: string;
      timestamp?: string;
    }) => {
      console.log("Received incoming socket message:", data);

      const timestamp =
        data.timestamp ||
        new Date().toLocaleTimeString([], {
          hour: "2-digit",
          minute: "2-digit",
        });

      const newMessage: Message = {
        id: data.id || crypto.randomUUID(),
        senderId: data.senderId,
        recipientId: data.recipientId,
        text: data.text,
        timestamp,
        status: "delivered",
      };

      setMessagesMap((prev) => ({
        ...prev,
        [data.senderId]: [...(prev[data.senderId] || []), newMessage],
      }));

      // Dynamically add sender to sidebar if not present, and move to top with unread badge
      setContacts((prev) => {
        const exists = prev.some((c) => c.id === data.senderId);
        const isActive = activeContactId === data.senderId;

        if (!exists) {
          const newContact: Contact = {
            id: data.senderId,
            name: data.senderName || `User (${data.senderId.slice(0, 6)})`,
            avatar:
              data.senderAvatar ||
              "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=250&q=80",
            status: "online",
            lastMessage: data.text,
            lastMessageTime: timestamp,
            unreadCount: isActive ? 0 : 1,
          };
          return [newContact, ...prev];
        }

        const target = prev.find((c) => c.id === data.senderId)!;
        const remaining = prev.filter((c) => c.id !== data.senderId);

        const updatedTarget: Contact = {
          ...target,
          lastMessage: data.text,
          lastMessageTime: timestamp,
          unreadCount: isActive ? 0 : (target.unreadCount || 0) + 1,
        };

        return [updatedTarget, ...remaining];
      });

      setIsOtherTyping(false);
    };

    const handleUserTyping = (data: { senderId: string }) => {
      if (data.senderId === activeContactId) {
        setIsOtherTyping(true);
        setTimeout(() => setIsOtherTyping(false), 2500);
      }
    };

    socket.on("connect", handleConnect);
    socket.on("disconnect", handleDisconnect);
    socket.on("connect_error", handleConnectError);
    socket.on("receiveMessage", handleReceiveMessage);
    socket.on("userTyping", handleUserTyping);

    return () => {
      socket.off("connect", handleConnect);
      socket.off("disconnect", handleDisconnect);
      socket.off("connect_error", handleConnectError);
      socket.off("receiveMessage", handleReceiveMessage);
      socket.off("userTyping", handleUserTyping);
    };
  }, [currentUser.id, activeContactId, dispatch]);

  const handleReconnect = useCallback(() => {
    const socket = getSocket(API_URL);
    socket.disconnect();
    dispatch(setSocketStatus("connecting"));
    setTimeout(() => socket.connect(), 300);
  }, [dispatch]);

  // Send message and bump active conversation to the top of the sidebar
  const handleSendMessage = useCallback(
    (text: string) => {
      const socket = getSocket(API_URL);

      const timestamp = new Date().toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
      });

      const tempMessage: Message = {
        id: `temp-${crypto.randomUUID()}`,
        senderId: currentUser.id,
        recipientId: activeContactId,
        text,
        timestamp,
        status: "sent",
      };

      setMessagesMap((prev) => ({
        ...prev,
        [activeContactId]: [...(prev[activeContactId] || []), tempMessage],
      }));

      // Move active contact to top of sidebar
      setContacts((prev) => {
        const target = prev.find((c) => c.id === activeContactId);
        const remaining = prev.filter((c) => c.id !== activeContactId);

        if (target) {
          const updatedTarget: Contact = {
            ...target,
            lastMessage: text,
            lastMessageTime: timestamp,
            unreadCount: 0,
          };
          return [updatedTarget, ...remaining];
        }

        return prev;
      });

      if (socket.connected) {
        socket.emit("sendMessage", {
          senderId: currentUser.id,
          senderName: currentUser.name,
          senderAvatar: currentUser.avatar,
          recipientId: activeContactId,
          text,
        });
      }
    },
    [activeContactId, currentUser.id, currentUser.name, currentUser.avatar]
  );

  const handleTyping = useCallback(() => {
    const socket = getSocket(API_URL);
    if (socket.connected) {
      socket.emit("typing", {
        senderId: currentUser.id,
        recipientId: activeContactId,
      });
    }
  }, [activeContactId, currentUser.id]);

  const handleSelectContact = (id: string) => {
    dispatch(setActiveContactId(id));
    setIsOtherTyping(false);
    setContacts((prev) =>
      prev.map((c) => (c.id === id ? { ...c, unreadCount: 0 } : c))
    );
  };

  const activeContact =
    contacts.find((c) => c.id === activeContactId) || null;
  const currentMessages = messagesMap[activeContactId] || [];

  return (
    <div className="flex flex-col h-screen w-screen bg-slate-950 text-slate-100 overflow-hidden font-sans">
      {/* Top Socket & Redux Auth Status Bar */}
      <div className="flex items-center justify-between border-b border-slate-800 bg-slate-900/90 px-4 py-1.5">
        <SocketStatusBadge
          status={socketStatus}
          serverUrl={API_URL}
          onReconnect={handleReconnect}
        />

        <div className="flex items-center gap-3 text-xs">
          <Link
            href="/users"
            className="flex items-center gap-1 px-2.5 py-1 bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-400 font-medium rounded border border-indigo-500/30 transition-all"
          >
            <Users className="w-3.5 h-3.5" />
            Users Directory Table
          </Link>

          {isAuthenticated ? (
            <div className="flex items-center gap-2">
              <span className="text-emerald-400 font-medium flex items-center gap-1">
                <UserIcon className="w-3.5 h-3.5" />
                {authUser?.name}
              </span>
              <button
                onClick={() => dispatch(logout())}
                className="flex items-center gap-1 px-2.5 py-1 bg-slate-800 hover:bg-rose-950 hover:text-rose-300 text-slate-300 rounded border border-slate-700 transition-colors"
              >
                <LogOut className="w-3 h-3" />
                Logout
              </button>
            </div>
          ) : (
            <button
              onClick={() => setIsAuthModalOpen(true)}
              className="flex items-center gap-1.5 px-3 py-1 bg-indigo-600 hover:bg-indigo-500 text-white font-medium rounded transition-colors shadow-sm"
            >
              <LogIn className="w-3.5 h-3.5" />
              Log In / Sign Up
            </button>
          )}
        </div>
      </div>

      {/* Main Layout */}
      <div className="flex flex-1 overflow-hidden">
        <ChatSidebar
          contacts={contacts}
          activeContactId={activeContactId}
          onSelectContact={handleSelectContact}
          currentUser={currentUser}
        />

        <ChatWindow
          activeContact={activeContact}
          messages={currentMessages}
          currentUserId={currentUser.id}
          isTyping={isOtherTyping}
          onSendMessage={handleSendMessage}
          onTyping={handleTyping}
        />
      </div>

      {/* Redux Auth Modal */}
      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
      />
    </div>
  );
}

export default function MessengerPage() {
  return (
    <Suspense fallback={<div className="h-screen w-screen bg-slate-950 flex items-center justify-center text-slate-400">Loading Messenger...</div>}>
      <MessengerContent />
    </Suspense>
  );
}

// Realtime receiveMessage sync update
// Unread notification badge tracking update
// Chronological sidebar contacts sorting update
// LocalStorage state persistence update
