"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

import { ChatSidebar, Contact } from "@/components/chat/ChatSidebar";
import {
  ChatWindow,
  Message,
} from "@/components/chat/ChatWindow";
import { SocketStatusBadge } from "@/components/chat/SocketStatusBadge";
import {
  destroySocket,
  getSocket,
} from "@/lib/socket";

const API_URL =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export default function MessengerPage() {
  const [socketStatus, setSocketStatus] = useState<
    "connected" | "connecting" | "disconnected"
  >("disconnected");

  /**
   * Current logged-in user
   *
   * Later replace this with your Auth/JWT user.
   */
  const currentUser = useMemo(
    () => ({
      id: "user-me",
      name: "Kayesur (You)",
      avatar:
        "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=250&q=80",
      status: "online",
    }),
    []
  );

  const [contacts, setContacts] = useState<Contact[]>([
    {
      id: "contact-1",
      name: "Sarah Jenkins",
      avatar:
        "https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=250&q=80",
      status: "online",
      lastMessage:
        "Hey! Did you get the NestJS backend running on port 8000?",
      lastMessageTime: "12:42 PM",
      unreadCount: 2,
    },
    {
      id: "contact-2",
      name: "Alex Rivera",
      avatar:
        "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=250&q=80",
      status: "online",
      lastMessage:
        "Socket.io real-time connection is looking super smooth!",
      lastMessageTime: "11:15 AM",
      unreadCount: 0,
    },
    {
      id: "contact-3",
      name: "Elena Rostova",
      avatar:
        "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?auto=format&fit=crop&w=250&q=80",
      status: "away",
      lastMessage:
        "I'll review the database schema once Prisma is ready.",
      lastMessageTime: "Yesterday",
      unreadCount: 0,
    },
  ]);

  const [activeContactId, setActiveContactId] =
    useState("contact-1");

  const [messagesMap, setMessagesMap] = useState<
    Record<string, Message[]>
  >({
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
        text:
          "Hey! Did you get the NestJS backend running on port 8000?",
        timestamp: "12:42 PM",
        status: "read",
      },
    ],

    "contact-2": [
      {
        id: "m4",
        senderId: "contact-2",
        recipientId: "user-me",
        text:
          "Socket.io real-time connection is looking super smooth!",
        timestamp: "11:15 AM",
        status: "read",
      },
    ],

    "contact-3": [
      {
        id: "m5",
        senderId: "contact-3",
        recipientId: "user-me",
        text:
          "I'll review the database schema once Prisma is ready.",
        timestamp: "Yesterday",
        status: "read",
      },
    ],
  });

  const [isOtherTyping, setIsOtherTyping] = useState(false);

  /**
   * ---------------------------------------------------------
   * SOCKET CONNECTION
   * ---------------------------------------------------------
   *
   * This effect runs ONCE.
   *
   * Do NOT put activeContactId here.
   */
  useEffect(() => {
    const socket = getSocket(API_URL);

    setSocketStatus("connecting");

    const handleConnect = () => {
      console.log("Socket connected:", socket.id);

      setSocketStatus("connected");

      /**
       * Join personal user room.
       *
       * NestJS will use this room to send
       * messages specifically to this user.
       */
      socket.emit("join-user", {
        userId: currentUser.id,
      });
    };

    const handleDisconnect = () => {
      console.log("Socket disconnected");

      setSocketStatus("disconnected");
      setIsOtherTyping(false);
    };

    const handleConnectError = (error: Error) => {
      console.error("Socket connection error:", error);

      setSocketStatus("disconnected");
    };

    /**
     * Incoming message
     */
    const handleReceiveMessage = (data: {
      id?: string;
      senderId: string;
      recipientId: string;
      text: string;
      timestamp?: string;
    }) => {
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

      /**
       * Add message to the correct conversation.
       */
      setMessagesMap((prev) => ({
        ...prev,
        [data.senderId]: [
          ...(prev[data.senderId] || []),
          newMessage,
        ],
      }));

      /**
       * Update sidebar.
       */
      setContacts((prev) =>
        prev.map((contact) => {
          if (contact.id !== data.senderId) {
            return contact;
          }

          const isActive = activeContactId === data.senderId;

          return {
            ...contact,
            lastMessage: data.text,
            lastMessageTime: timestamp,
            unreadCount: isActive
              ? 0
              : (contact.unreadCount || 0) + 1,
          };
        })
      );

      /**
       * Stop typing indicator.
       */
      setIsOtherTyping(false);
    };

    /**
     * Typing event.
     */
    const handleUserTyping = (data: {
      senderId: string;
    }) => {
      if (data.senderId !== activeContactId) {
        return;
      }

      setIsOtherTyping(true);

      setTimeout(() => {
        setIsOtherTyping(false);
      }, 2500);
    };

    socket.on("connect", handleConnect);
    socket.on("disconnect", handleDisconnect);
    socket.on("connect_error", handleConnectError);
    socket.on("receiveMessage", handleReceiveMessage);
    socket.on("userTyping", handleUserTyping);

    socket.connect();

    return () => {
      socket.off("connect", handleConnect);
      socket.off("disconnect", handleDisconnect);
      socket.off("connect_error", handleConnectError);
      socket.off("receiveMessage", handleReceiveMessage);
      socket.off("userTyping", handleUserTyping);
    };
  }, [currentUser.id]);

  /**
   * ---------------------------------------------------------
   * RECONNECT
   * ---------------------------------------------------------
   */
  const handleReconnect = useCallback(() => {
    const socket = getSocket(API_URL);

    socket.disconnect();

    setSocketStatus("connecting");

    setTimeout(() => {
      socket.connect();
    }, 300);
  }, []);

  /**
   * ---------------------------------------------------------
   * SEND MESSAGE
   * ---------------------------------------------------------
   */
  const handleSendMessage = useCallback(
    (text: string) => {
      const socket = getSocket(API_URL);

      if (!socket.connected) {
        console.warn("Socket is not connected");

        return;
      }

      const timestamp = new Date().toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
      });

      /**
       * Optimistic UI.
       */
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
        [activeContactId]: [
          ...(prev[activeContactId] || []),
          tempMessage,
        ],
      }));

      /**
       * Update sidebar immediately.
       */
      setContacts((prev) =>
        prev.map((contact) =>
          contact.id === activeContactId
            ? {
                ...contact,
                lastMessage: text,
                lastMessageTime: timestamp,
                unreadCount: 0,
              }
            : contact
        )
      );

      /**
       * Send to NestJS.
       */
      socket.emit("sendMessage", {
        senderId: currentUser.id,
        recipientId: activeContactId,
        text,
      });
    },
    [activeContactId, currentUser.id]
  );

  /**
   * ---------------------------------------------------------
   * TYPING
   * ---------------------------------------------------------
   */
  const handleTyping = useCallback(() => {
    const socket = getSocket(API_URL);

    if (!socket.connected) {
      return;
    }

    socket.emit("typing", {
      senderId: currentUser.id,
      recipientId: activeContactId,
    });
  }, [activeContactId, currentUser.id]);

  /**
   * ---------------------------------------------------------
   * SELECT CONTACT
   * ---------------------------------------------------------
   */
  const handleSelectContact = (id: string) => {
    setActiveContactId(id);

    setIsOtherTyping(false);

    setContacts((prev) =>
      prev.map((contact) =>
        contact.id === id
          ? {
              ...contact,
              unreadCount: 0,
            }
          : contact
      )
    );
  };

  /**
   * ---------------------------------------------------------
   * ACTIVE CONTACT
   * ---------------------------------------------------------
   */
  const activeContact =
    contacts.find(
      (contact) => contact.id === activeContactId
    ) || null;

  const currentMessages =
    messagesMap[activeContactId] || [];

  return (
    <div className="flex flex-col h-screen w-screen bg-slate-950 text-slate-100 overflow-hidden font-sans">
      <SocketStatusBadge
        status={socketStatus}
        serverUrl={API_URL}
        onReconnect={handleReconnect}
         
      />

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
    </div>
  );
}





