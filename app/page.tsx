"use client";

import React, { useState, useEffect, useCallback, useMemo, useRef, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { ChatSidebar, Contact } from "@/components/chat/ChatSidebar";
import { ChatWindow, Message } from "@/components/chat/ChatWindow";
import { SocketStatusBadge } from "@/components/chat/SocketStatusBadge";
import { AuthModal } from "@/components/auth/AuthModal";
import { NewConversationModal } from "@/components/chat/NewConversationModal";
import { CreateGroupModal } from "@/components/chat/CreateGroupModal";
import { AddMemberModal } from "@/components/chat/AddMemberModal";
import { GroupMembersModal } from "@/components/chat/GroupMembersModal";
import { getSocket } from "@/lib/socket";
import { useAppDispatch, useAppSelector } from "@/redux/hooks";
import { setActiveContactId, setSocketStatus } from "@/redux/slices/chatSlice";
import { logout, setUser } from "@/redux/slices/authSlice";
import { useGetMeQuery } from "@/redux/api/authApi";
import {
  useGetUserConversationsQuery,
  useLazyGetConversationMessagesQuery,
  useDeleteMessageMutation,
} from "@/redux/api/messagesApi";
import {
  useGetUserGroupsQuery,
  useLazyGetGroupMessagesQuery,
} from "@/redux/api/groupsApi";
import { LogIn, LogOut, User as UserIcon, Users } from "lucide-react";
import Link from "next/link";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

const playNotificationSound = () => {
  try {
    if (typeof window === "undefined") return;
    const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "sine";
    osc.frequency.setValueAtTime(587.33, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(880, ctx.currentTime + 0.15);
    gain.gain.setValueAtTime(0.15, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.25);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.25);
  } catch (e) {}
};

function MessengerContent() {
  const searchParams = useSearchParams();
  const dispatch = useAppDispatch();
  const { activeContactId, socketStatus } = useAppSelector((state) => state.chat);
  const { user: authUser, isAuthenticated } = useAppSelector((state) => state.auth);

  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [isNewChatModalOpen, setIsNewChatModalOpen] = useState(false);
  const [isCreateGroupModalOpen, setIsCreateGroupModalOpen] = useState(false);
  const [isAddMemberModalOpen, setIsAddMemberModalOpen] = useState(false);
  const [isGroupMembersModalOpen, setIsGroupMembersModalOpen] = useState(false);
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const [removedGroupIds, setRemovedGroupIds] = useState<string[]>([]);

  const [typingInfo, setTypingInfo] = useState<{
    senderId: string;
    senderName?: string;
    groupId?: string;
  } | null>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Keep ref of activeContactId so socket listener always checks latest active chat
  const activeContactIdRef = useRef(activeContactId);
  useEffect(() => {
    activeContactIdRef.current = activeContactId;
  }, [activeContactId]);

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

  // Fetch database 1-on-1 conversations and groups for current user
  const { data: dbConversations } = useGetUserConversationsQuery(currentUser.id, {
    skip: !isAuthenticated || currentUser.id === "user-me",
  });
  const { data: dbGroups, refetch: refetchGroups } = useGetUserGroupsQuery(currentUser.id, {
    skip: !isAuthenticated || currentUser.id === "user-me",
  });

  // Lazy queries for fetching message history from DB
  const [triggerGetMessages] = useLazyGetConversationMessagesQuery();
  const [triggerGetGroupMessages] = useLazyGetGroupMessagesQuery();
  const [deleteMessageApi] = useDeleteMessageMutation();

  const contactsStorageKey = `messenger_contacts_${currentUser.id}`;
  const messagesStorageKey = `messenger_messages_${currentUser.id}`;
  const activeStorageKey = `messenger_active_${currentUser.id}`;
  const hiddenContactsStorageKey = `messenger_hidden_contacts_${currentUser.id}`;

  const [contacts, setContacts] = useState<Contact[]>([]);
  const [messagesMap, setMessagesMap] = useState<Record<string, Message[]>>({});
  const [hiddenContactIds, setHiddenContactIds] = useState<string[]>([]);
  const [isInitialized, setIsInitialized] = useState(false);

  // Auto-join socket rooms for all user groups
  useEffect(() => {
    if (dbGroups && dbGroups.length > 0) {
      const socket = getSocket(API_URL);
      if (socket.connected) {
        for (const g of dbGroups) {
          socket.emit("join-group", { groupId: g.id });
        }
      }
    }
  }, [dbGroups]);

  // Sync DB conversations & Groups into contacts list
  useEffect(() => {
    let currentHidden = hiddenContactIds;
    try {
      const savedHidden = localStorage.getItem(hiddenContactsStorageKey);
      if (savedHidden) {
        currentHidden = JSON.parse(savedHidden);
      }
    } catch (e) {}

    setContacts((prev) => {
      const cleanPrev = prev.filter(
        (c) => c.id !== currentUser.id && !currentHidden.includes(c.id)
      );
      const map = new Map<string, Contact>();

      // 1. Add DB Groups first
      if (dbGroups && dbGroups.length > 0) {
        for (const g of dbGroups) {
          if (!currentHidden.includes(g.id)) {
            const existing = cleanPrev.find((c) => c.id === g.id);
            map.set(g.id, {
              id: g.id,
              name: g.name,
              avatar:
                g.avatar ||
                "https://images.unsplash.com/photo-1522071820081-009f0129c71c?auto=format&fit=crop&w=250&q=80",
              status: "online",
              lastMessage: existing?.lastMessage || g.lastMessage || "Group created",
              lastMessageTime: existing?.lastMessageTime || g.lastMessageTime || "Just now",
              unreadCount:
                existing?.unreadCount !== undefined
                  ? existing.unreadCount
                  : (g.unreadCount || 0),
              isGroup: true,
              memberCount: g.memberCount,
              members: g.members,
              description: g.description,
            });
          }
        }
      }

      // 2. Add 1-on-1 DB Conversations
      if (dbConversations && dbConversations.length > 0) {
        for (const dbContact of dbConversations) {
          if (dbContact.id !== currentUser.id && !currentHidden.includes(dbContact.id)) {
            if (!map.has(dbContact.id)) {
              const existingLocal = cleanPrev.find((c) => c.id === dbContact.id);
              map.set(dbContact.id, {
                ...dbContact,
                unreadCount:
                  existingLocal?.unreadCount !== undefined
                    ? existingLocal.unreadCount
                    : (dbContact.unreadCount || 0),
                lastMessage: existingLocal?.lastMessage || dbContact.lastMessage,
                lastMessageTime: existingLocal?.lastMessageTime || dbContact.lastMessageTime,
              });
            }
          }
        }
      }

      // 3. Retain local contacts
      for (const c of cleanPrev) {
        if (!map.has(c.id) && !currentHidden.includes(c.id)) {
          map.set(c.id, c);
        }
      }
      return Array.from(map.values());
    });
  }, [dbGroups, dbConversations, currentUser.id, hiddenContactsStorageKey, hiddenContactIds]);

  // Fetch message history from PostgreSQL when active contact changes (Direct vs Group)
  useEffect(() => {
    if (
      isAuthenticated &&
      currentUser.id !== "user-me" &&
      activeContactId &&
      activeContactId !== currentUser.id
    ) {
      const activeContact = contacts.find((c) => c.id === activeContactId);

      if (activeContact?.isGroup) {
        // Auto-join group room
        const socket = getSocket(API_URL);
        if (socket.connected) {
          socket.emit("join-group", { groupId: activeContactId });
        }

        triggerGetGroupMessages(activeContactId)
          .unwrap()
          .then((groupMsgs) => {
            if (groupMsgs) {
              setMessagesMap((prev) => ({
                ...prev,
                [activeContactId]: groupMsgs as Message[],
              }));
            }
          })
          .catch((err) => console.error("Failed to load group messages:", err));
      } else {
        triggerGetMessages({
          user1Id: currentUser.id,
          user2Id: activeContactId,
        })
          .unwrap()
          .then((dbMsgs) => {
            if (dbMsgs) {
              setMessagesMap((prev) => ({
                ...prev,
                [activeContactId]: dbMsgs as Message[],
              }));
            }
          })
          .catch((err) => console.error("Failed to load message history from DB:", err));
      }
    }
  }, [activeContactId, currentUser.id, isAuthenticated, triggerGetMessages, triggerGetGroupMessages, contacts]);

  // 1. Load persisted state from localStorage on mount / user change
  useEffect(() => {
    try {
      const savedContacts = localStorage.getItem(contactsStorageKey);
      const savedMessages = localStorage.getItem(messagesStorageKey);
      const savedActive = localStorage.getItem(activeStorageKey);
      const savedHidden = localStorage.getItem(hiddenContactsStorageKey);

      let activeHidden: string[] = [];
      if (savedHidden) {
        activeHidden = JSON.parse(savedHidden);
        setHiddenContactIds(activeHidden);
      } else {
        setHiddenContactIds([]);
      }

      if (savedContacts) {
        const parsed: Contact[] = JSON.parse(savedContacts);
        const cleanContacts = parsed.filter(
          (c) =>
            c.id !== currentUser.id &&
            c.name?.toLowerCase() !== currentUser.name?.toLowerCase() &&
            !activeHidden.includes(c.id)
        );
        setContacts(cleanContacts);
      } else {
        setContacts([]);
      }

      if (savedMessages) {
        const parsed = JSON.parse(savedMessages);
        setMessagesMap(parsed);
      } else {
        setMessagesMap({});
      }

      if (savedActive && savedActive !== currentUser.id && !activeHidden.includes(savedActive)) {
        dispatch(setActiveContactId(savedActive));
      }
    } catch (e) {
      console.error("Failed to load state from localStorage", e);
    } finally {
      setIsInitialized(true);
    }
  }, [currentUser.id, currentUser.name, contactsStorageKey, messagesStorageKey, activeStorageKey, hiddenContactsStorageKey, dispatch]);

  useEffect(() => {
    if (!isInitialized) return;
    try {
      localStorage.setItem(contactsStorageKey, JSON.stringify(contacts));
    } catch (e) {
      console.error("Failed to save contacts to localStorage", e);
    }

    // Dynamic browser title notification
    const totalUnread = contacts.reduce((sum, c) => sum + (c.unreadCount || 0), 0);
    if (totalUnread > 0) {
      document.title = `(${totalUnread}) New Message${totalUnread > 1 ? "s" : ""} - Socket.io Messenger`;
    } else {
      document.title = "Real-Time Socket.io Messenger";
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

    if (chatWith && chatWith !== currentUser.id) {
      // Unhide contact if it was hidden previously
      setHiddenContactIds((prev) => {
        const next = prev.filter((id) => id !== chatWith);
        try {
          localStorage.setItem(hiddenContactsStorageKey, JSON.stringify(next));
        } catch (e) {}
        return next;
      });

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
          if (parsed.id === currentUser.id) return;
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
        const cleanPrev = prev.filter((c) => c.id !== currentUser.id);
        const target = cleanPrev.find((c) => c.id === targetUser.id);
        const remaining = cleanPrev.filter((c) => c.id !== targetUser.id);

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

      // Clear query string from URL so refreshing won't re-trigger chatWith
      if (typeof window !== "undefined") {
        window.history.replaceState(null, "", "/");
      }
    }
  }, [searchParams, currentUser.id, hiddenContactsStorageKey, dispatch]);

  const handleSelectNewChatUser = useCallback(
    (user: { id: string; name: string; avatar: string }) => {
      // Unhide contact if it was hidden previously
      setHiddenContactIds((prev) => {
        const next = prev.filter((id) => id !== user.id);
        try {
          localStorage.setItem(hiddenContactsStorageKey, JSON.stringify(next));
        } catch (e) {}
        return next;
      });

      setContacts((prev) => {
        const cleanPrev = prev.filter((c) => c.id !== currentUser.id);
        const target = cleanPrev.find((c) => c.id === user.id);
        const remaining = cleanPrev.filter((c) => c.id !== user.id);

        if (target) {
          return [target, ...remaining];
        }

        const newContact: Contact = {
          id: user.id,
          name: user.name,
          avatar: user.avatar,
          status: "online",
          lastMessage: "Started new conversation",
          lastMessageTime: "Just now",
          unreadCount: 0,
        };

        return [newContact, ...remaining];
      });

      dispatch(setActiveContactId(user.id));
    },
    [currentUser.id, hiddenContactsStorageKey, dispatch]
  );

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

      if (data.senderId === currentUser.id) {
        return;
      }

      // Play audio notification chime
      playNotificationSound();

      // Unhide contact if it was hidden previously
      setHiddenContactIds((prev) => prev.filter((id) => id !== data.senderId));

      const timestamp =
        data.timestamp ||
        new Date().toLocaleTimeString([], {
          hour: "2-digit",
          minute: "2-digit",
        });

      const isActive = activeContactIdRef.current === data.senderId;

      // Send read receipt if recipient is actively viewing this sender's chat
      if (isActive) {
        socket.emit("markAsRead", {
          senderId: data.senderId,
          recipientId: currentUser.id,
          messageId: data.id,
        });
      }

      const newMessage: Message = {
        id: data.id || crypto.randomUUID(),
        senderId: data.senderId,
        recipientId: data.recipientId,
        text: data.text,
        timestamp,
        status: isActive ? "read" : "delivered",
      };

      setMessagesMap((prev) => {
        const contactId = data.senderId;
        const existingMsgs = prev[contactId] || [];
        if (existingMsgs.some((m) => m.id === newMessage.id)) {
          return prev;
        }
        return {
          ...prev,
          [contactId]: [...existingMsgs, newMessage],
        };
      });

      // Dynamically add sender to sidebar if not present, and move to top with unread badge if not active
      setContacts((prev) => {
        const exists = prev.some((c) => c.id === data.senderId);

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

      setTypingInfo(null);
    };

    const handleUserTyping = (data: {
      senderId: string;
      senderName?: string;
      groupId?: string;
    }) => {
      if (data.senderId === currentUser.id) return;

      const currentActiveId = activeContactIdRef.current;
      const isCurrentGroup = data.groupId && data.groupId === currentActiveId;
      const isCurrentDirect = !data.groupId && data.senderId === currentActiveId;

      if (isCurrentGroup || isCurrentDirect) {
        setTypingInfo(data);

        if (typingTimeoutRef.current) {
          clearTimeout(typingTimeoutRef.current);
        }

        typingTimeoutRef.current = setTimeout(() => {
          setTypingInfo(null);
        }, 2500);
      }
    };

    const handleMessageSent = (data: {
      id: string;
      senderId: string;
      recipientId: string;
      text: string;
      timestamp: string;
    }) => {
      console.log("Received messageSent confirmation:", data);
      setMessagesMap((prev) => {
        const contactId = data.recipientId;
        const existing = prev[contactId] || [];

        if (existing.some((m) => m.id === data.id)) {
          return prev;
        }

        const hasTemp = existing.some((m) => m.id.startsWith("temp-"));

        if (hasTemp) {
          let replaced = false;
          const updated = existing.map((m) => {
            if (!replaced && m.id.startsWith("temp-") && m.text === data.text) {
              replaced = true;
              return {
                ...m,
                id: data.id,
                timestamp: data.timestamp,
                status: "sent" as const,
              };
            }
            return m;
          });
          return { ...prev, [contactId]: updated };
        }

        return {
          ...prev,
          [contactId]: [
            ...existing,
            {
              id: data.id,
              senderId: data.senderId,
              recipientId: data.recipientId,
              text: data.text,
              timestamp: data.timestamp,
              status: "sent" as const,
            },
          ],
        };
      });
    };

    const handleMessagesRead = (data: {
      senderId: string;
      recipientId: string;
      messageId?: string;
    }) => {
      console.log("Recipient read your messages:", data);
      setMessagesMap((prev) => {
        const contactId = data.recipientId;
        const existing = prev[contactId] || [];
        const updated = existing.map((m) => {
          if (m.senderId === currentUser.id) {
            return { ...m, status: "read" as const };
          }
          return m;
        });
        return { ...prev, [contactId]: updated };
      });
    };

    const handleMessageDeleted = (data: { messageId: string; mode: string }) => {
      console.log("Real-time message deleted event:", data);
      setMessagesMap((prev) => {
        const updated: Record<string, Message[]> = {};
        for (const key of Object.keys(prev)) {
          updated[key] = prev[key].filter((m) => m.id !== data.messageId);
        }
        return updated;
      });
    };

    const handleReceiveGroupMessage = (data: {
      id: string;
      groupId: string;
      senderId: string;
      senderName?: string;
      senderAvatar?: string;
      text: string;
      timestamp: string;
    }) => {
      console.log("Received incoming group message:", data);

      if (data.senderId !== currentUser.id) {
        playNotificationSound();
      }

      const timestamp =
        data.timestamp ||
        new Date().toLocaleTimeString([], {
          hour: "2-digit",
          minute: "2-digit",
        });

      const isActive = activeContactIdRef.current === data.groupId;

      const newMessage: Message = {
        id: data.id,
        groupId: data.groupId,
        senderId: data.senderId,
        senderName: data.senderName,
        senderAvatar: data.senderAvatar,
        text: data.text,
        timestamp,
        status: "delivered",
        isGroup: true,
      };

      setMessagesMap((prev) => {
        const existing = prev[data.groupId] || [];
        if (existing.some((m) => m.id === data.id)) return prev;
        return {
          ...prev,
          [data.groupId]: [...existing, newMessage],
        };
      });

      setContacts((prev) => {
        const target = prev.find((c) => c.id === data.groupId);
        const remaining = prev.filter((c) => c.id !== data.groupId);

        if (target) {
          const updatedTarget: Contact = {
            ...target,
            lastMessage: `${data.senderName || "Member"}: ${data.text}`,
            lastMessageTime: timestamp,
            unreadCount: isActive ? 0 : (target.unreadCount || 0) + 1,
          };
          return [updatedTarget, ...remaining];
        } else {
          const newGroup: Contact = {
            id: data.groupId,
            name: "Group Chat",
            avatar:
              "https://images.unsplash.com/photo-1522071820081-009f0129c71c?auto=format&fit=crop&w=250&q=80",
            status: "online",
            lastMessage: `${data.senderName || "Member"}: ${data.text}`,
            lastMessageTime: timestamp,
            unreadCount: isActive ? 0 : 1,
            isGroup: true,
          };
          return [newGroup, ...prev];
        }
      });
    };

    const handleAddedToGroup = (group: any) => {
      console.log("You were added to group:", group);
      playNotificationSound();

      const socket = getSocket(API_URL);
      if (socket.connected) {
        socket.emit("join-group", { groupId: group.id });
      }

      setContacts((prev) => {
        const exists = prev.some((c) => c.id === group.id);
        if (!exists) {
          const groupContact: Contact = {
            id: group.id,
            name: group.name,
            avatar:
              group.avatar ||
              "https://images.unsplash.com/photo-1522071820081-009f0129c71c?auto=format&fit=crop&w=250&q=80",
            status: "online",
            lastMessage: "You were added to this group",
            lastMessageTime: "Just now",
            unreadCount: 1,
            isGroup: true,
            memberCount: group.memberCount || group.members?.length || 2,
            members: group.members,
          };
          return [groupContact, ...prev];
        }
        return prev;
      });
    };

    const handleRemovedFromGroup = (data: { groupId: string; userId: string }) => {
      console.log("Removed from group event:", data);
      if (data.userId === currentUser.id) {
        setRemovedGroupIds((prev) => Array.from(new Set([...prev, data.groupId])));
      }
      refetchGroups();
    };

    const handleMemberRemovedFromGroup = (data: { groupId: string; userId: string }) => {
      console.log("Group member removed event:", data);
      refetchGroups();
    };

    socket.on("connect", handleConnect);
    socket.on("disconnect", handleDisconnect);
    socket.on("connect_error", handleConnectError);
    socket.on("receiveMessage", handleReceiveMessage);
    socket.on("receiveGroupMessage", handleReceiveGroupMessage);
    socket.on("addedToGroup", handleAddedToGroup);
    socket.on("removedFromGroup", handleRemovedFromGroup);
    socket.on("memberRemovedFromGroup", handleMemberRemovedFromGroup);
    socket.on("messageSent", handleMessageSent);
    socket.on("messagesRead", handleMessagesRead);
    socket.on("userTyping", handleUserTyping);
    socket.on("messageDeleted", handleMessageDeleted);

    return () => {
      socket.off("connect", handleConnect);
      socket.off("disconnect", handleDisconnect);
      socket.off("connect_error", handleConnectError);
      socket.off("receiveMessage", handleReceiveMessage);
      socket.off("receiveGroupMessage", handleReceiveGroupMessage);
      socket.off("addedToGroup", handleAddedToGroup);
      socket.off("removedFromGroup", handleRemovedFromGroup);
      socket.off("memberRemovedFromGroup", handleMemberRemovedFromGroup);
      socket.off("messageSent", handleMessageSent);
      socket.off("messagesRead", handleMessagesRead);
      socket.off("userTyping", handleUserTyping);
      socket.off("messageDeleted", handleMessageDeleted);
    };
  }, [currentUser.id, dispatch]);

  const handleReconnect = useCallback(() => {
    const socket = getSocket(API_URL);
    socket.disconnect();
    dispatch(setSocketStatus("connecting"));
    setTimeout(() => socket.connect(), 300);
  }, [dispatch]);

  // Send message and bump active conversation to the top of the sidebar
  const handleSendMessage = useCallback(
    (text: string) => {
      if (!isAuthenticated) {
        setIsAuthModalOpen(true);
        return;
      }

      // Unhide active contact if it was hidden previously
      setHiddenContactIds((prev) => prev.filter((id) => id !== activeContactId));

      const socket = getSocket(API_URL);

      const timestamp = new Date().toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
      });

      const activeContact = contacts.find((c) => c.id === activeContactId);

      const tempMessage: Message = {
        id: `temp-${crypto.randomUUID()}`,
        senderId: currentUser.id,
        senderName: currentUser.name,
        senderAvatar: currentUser.avatar,
        recipientId: activeContact?.isGroup ? undefined : activeContactId,
        groupId: activeContact?.isGroup ? activeContactId : undefined,
        text,
        timestamp,
        status: "sent",
        isGroup: activeContact?.isGroup,
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
            lastMessage: activeContact?.isGroup ? `${currentUser.name}: ${text}` : text,
            lastMessageTime: timestamp,
            unreadCount: 0,
          };
          return [updatedTarget, ...remaining];
        }

        return prev;
      });

      if (!socket.connected) {
        socket.connect();
      }

      if (activeContact?.isGroup) {
        socket.emit("sendGroupMessage", {
          groupId: activeContactId,
          senderId: currentUser.id,
          text,
        });
      } else {
        socket.emit("sendMessage", {
          senderId: currentUser.id,
          senderName: currentUser.name,
          senderAvatar: currentUser.avatar,
          recipientId: activeContactId,
          text,
        });
      }
    },
    [activeContactId, contacts, currentUser.id, currentUser.name, currentUser.avatar, isAuthenticated]
  );

  const handleDeleteMessage = useCallback(
    async (messageId: string, mode: "everyone" | "me") => {
      // 1. Remove from local state immediately for instant feedback
      setMessagesMap((prev) => ({
        ...prev,
        [activeContactId]: (prev[activeContactId] || []).filter((m) => m.id !== messageId),
      }));

      // 2. Broadcast socket deleteMessage event
      const socket = getSocket(API_URL);
      if (socket.connected) {
        socket.emit("deleteMessage", {
          messageId,
          userId: currentUser.id,
          recipientId: activeContactId,
          mode,
        });
      }

      // 3. Persist deletion in DB via REST API
      try {
        await deleteMessageApi({
          messageId,
          userId: currentUser.id,
          mode,
        }).unwrap();
      } catch (err) {
        console.error("Failed to delete message via DB API:", err);
      }
    },
    [activeContactId, currentUser.id, deleteMessageApi]
  );

  const handleTyping = useCallback(() => {
    if (!isAuthenticated) return;
    const socket = getSocket(API_URL);
    if (socket.connected) {
      const activeContact = contacts.find((c) => c.id === activeContactId);
      socket.emit("typing", {
        senderId: currentUser.id,
        senderName: currentUser.name,
        recipientId: activeContact?.isGroup ? undefined : activeContactId,
        groupId: activeContact?.isGroup ? activeContactId : undefined,
      });
    }
  }, [activeContactId, contacts, currentUser.id, currentUser.name, isAuthenticated]);

  const handleSelectContact = (id: string) => {
    dispatch(setActiveContactId(id));
    setTypingInfo(null);
    setIsMobileSidebarOpen(false);
    setContacts((prev) =>
      prev.map((c) => (c.id === id ? { ...c, unreadCount: 0 } : c))
    );

    const socket = getSocket(API_URL);
    if (socket.connected) {
      socket.emit("markAsRead", {
        senderId: id,
        recipientId: currentUser.id,
      });
    }
  };

  const handleDeleteContact = useCallback(
    (contactId: string) => {
      setHiddenContactIds((prev) => {
        const next = Array.from(new Set([...prev, contactId]));
        try {
          localStorage.setItem(hiddenContactsStorageKey, JSON.stringify(next));
        } catch (e) {}
        return next;
      });
      setContacts((prev) => {
        const nextContacts = prev.filter((c) => c.id !== contactId);
        try {
          localStorage.setItem(contactsStorageKey, JSON.stringify(nextContacts));
        } catch (e) {}
        return nextContacts;
      });
      if (activeContactId === contactId) {
        dispatch(setActiveContactId(""));
      }
      if (typeof window !== "undefined") {
        window.history.replaceState(null, "", "/");
      }
    },
    [activeContactId, hiddenContactsStorageKey, contactsStorageKey, dispatch]
  );

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
      <div className="flex flex-1 overflow-hidden relative">
        {/* Desktop Sidebar (hidden on mobile, visible on md screens) */}
        <div className="hidden md:flex h-full w-80 lg:w-96 flex-shrink-0">
          <ChatSidebar
            contacts={contacts}
            activeContactId={activeContactId}
            onSelectContact={handleSelectContact}
            onDeleteContact={handleDeleteContact}
            onOpenNewChatModal={() => setIsNewChatModalOpen(true)}
            onOpenCreateGroupModal={() => setIsCreateGroupModalOpen(true)}
            currentUser={currentUser}
          />
        </div>

        {/* Primary Chat Window */}
        <div className="h-full w-full flex-1 flex">
          <ChatWindow
            activeContact={activeContact}
            messages={currentMessages}
            currentUserId={currentUser.id}
            isTyping={Boolean(typingInfo)}
            typingUserName={typingInfo?.senderName}
            isRemovedFromGroup={
              Boolean(
                activeContact?.isGroup &&
                  (removedGroupIds.includes(activeContact.id) ||
                    (activeContact.members &&
                      !activeContact.members.some((m: any) => m.id === currentUser.id)))
              )
            }
            onSendMessage={handleSendMessage}
            onTyping={handleTyping}
            isAuthenticated={isAuthenticated}
            onRequireAuth={() => setIsAuthModalOpen(true)}
            onDeleteMessage={handleDeleteMessage}
            onDeleteContact={handleDeleteContact}
            onOpenCreateGroupModal={() => setIsCreateGroupModalOpen(true)}
            onOpenAddMemberModal={() => setIsAddMemberModalOpen(true)}
            onOpenGroupMembersModal={() => setIsGroupMembersModalOpen(true)}
            onBack={() => dispatch(setActiveContactId(""))}
            onToggleMobileSidebar={() => setIsMobileSidebarOpen((prev) => !prev)}
          />
        </div>

        {/* Mobile Slide-Over Sidebar Menu Drawer */}
        {isMobileSidebarOpen && (
          <div className="fixed inset-0 z-50 md:hidden flex">
            <div
              className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm transition-opacity"
              onClick={() => setIsMobileSidebarOpen(false)}
            />
            <div className="relative z-50 w-[85%] max-w-sm h-full bg-slate-900 shadow-2xl animate-in slide-in-from-left duration-200">
              <ChatSidebar
                contacts={contacts}
                activeContactId={activeContactId}
                onSelectContact={handleSelectContact}
                onDeleteContact={handleDeleteContact}
                onOpenNewChatModal={() => {
                  setIsMobileSidebarOpen(false);
                  setIsNewChatModalOpen(true);
                }}
                onOpenCreateGroupModal={() => {
                  setIsMobileSidebarOpen(false);
                  setIsCreateGroupModalOpen(true);
                }}
                onCloseMobileSidebar={() => setIsMobileSidebarOpen(false)}
                currentUser={currentUser}
              />
            </div>
          </div>
        )}
      </div>

      {/* Redux Auth Modal */}
      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
      />

      {/* New Conversation User Picker Modal */}
      <NewConversationModal
        isOpen={isNewChatModalOpen}
        onClose={() => setIsNewChatModalOpen(false)}
        currentUserId={currentUser.id}
        onSelectUser={handleSelectNewChatUser}
      />

      {/* Create Group Modal */}
      <CreateGroupModal
        isOpen={isCreateGroupModalOpen}
        onClose={() => setIsCreateGroupModalOpen(false)}
        currentUserId={currentUser.id}
        onGroupCreated={(group) => {
          dispatch(setActiveContactId(group.id));
        }}
      />

      {/* Add Member to Group Modal */}
      {activeContact?.isGroup && (
        <AddMemberModal
          isOpen={isAddMemberModalOpen}
          onClose={() => setIsAddMemberModalOpen(false)}
          groupId={activeContact.id}
          groupName={activeContact.name}
          existingMemberIds={activeContact.members?.map((m: any) => m.id) || [currentUser.id]}
        />
      )}

      {/* View Group Members Modal */}
      {activeContact?.isGroup && (
        <GroupMembersModal
          isOpen={isGroupMembersModalOpen}
          onClose={() => setIsGroupMembersModalOpen(false)}
          groupId={activeContact.id}
          currentUserId={currentUser.id}
          onOpenAddMemberModal={() => setIsAddMemberModalOpen(true)}
        />
      )}
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
// Final Redux RTK Query & Socket.io integration update
