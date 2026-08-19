import { baseApi } from "./baseApi";

export interface DBMessage {
  id: string;
  senderId: string;
  senderName?: string;
  senderAvatar?: string;
  recipientId: string;
  text: string;
  timestamp: string;
  createdAt: string;
  status: "sent" | "delivered" | "read";
}

export const messagesApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getConversationMessages: builder.query<
      DBMessage[],
      { user1Id: string; user2Id: string }
    >({
      query: ({ user1Id, user2Id }) =>
        `/messages/conversation?user1Id=${user1Id}&user2Id=${user2Id}`,
      providesTags: ["Message"],
    }),
    getUserConversations: builder.query<any[], string>({
      query: (userId) => `/messages/conversations/${userId}`,
      providesTags: ["Contact"],
    }),
    deleteMessage: builder.mutation<
      any,
      { messageId: string; userId: string; mode: "everyone" | "me" }
    >({
      query: ({ messageId, userId, mode }) => ({
        url: `/messages/${messageId}`,
        method: "DELETE",
        body: { userId, mode },
      }),
      invalidatesTags: ["Message", "Contact"],
    }),
  }),
});

export const {
  useGetConversationMessagesQuery,
  useLazyGetConversationMessagesQuery,
  useGetUserConversationsQuery,
  useLazyGetUserConversationsQuery,
  useDeleteMessageMutation,
} = messagesApi;
