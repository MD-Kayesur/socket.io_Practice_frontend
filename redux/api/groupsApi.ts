import { createApi, fetchBaseQuery } from "@reduxjs/toolkit/query/react";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export const groupsApi = createApi({
  reducerPath: "groupsApi",
  baseQuery: fetchBaseQuery({
    baseUrl: API_URL,
    prepareHeaders: (headers) => {
      const token = localStorage.getItem("token");
      if (token) {
        headers.set("authorization", `Bearer ${token}`);
      }
      return headers;
    },
  }),
  tagTypes: ["Groups", "GroupMessages"],
  endpoints: (builder) => ({
    createGroup: builder.mutation<
      any,
      {
        creatorId: string;
        name: string;
        description?: string;
        avatar?: string;
        memberIds: string[];
      }
    >({
      query: (body) => ({
        url: "/groups",
        method: "POST",
        body,
      }),
      invalidatesTags: ["Groups"],
    }),

    getUserGroups: builder.query<any[], string>({
      query: (userId) => `/groups/user/${userId}`,
      providesTags: ["Groups"],
    }),

    getGroupById: builder.query<any, string>({
      query: (groupId) => `/groups/${groupId}`,
      providesTags: (result, error, id) => [{ type: "Groups", id }],
    }),

    addGroupMembers: builder.mutation<
      any,
      { groupId: string; memberIds: string[] }
    >({
      query: ({ groupId, memberIds }) => ({
        url: `/groups/${groupId}/members`,
        method: "POST",
        body: { memberIds },
      }),
      invalidatesTags: (result, error, { groupId }) => [
        "Groups",
        { type: "Groups", id: groupId },
      ],
    }),

    removeGroupMember: builder.mutation<
      any,
      { groupId: string; userId: string }
    >({
      query: ({ groupId, userId }) => ({
        url: `/groups/${groupId}/members/${userId}`,
        method: "DELETE",
      }),
      invalidatesTags: (result, error, { groupId }) => [
        "Groups",
        { type: "Groups", id: groupId },
      ],
    }),

    getGroupMessages: builder.query<any[], string>({
      query: (groupId) => `/groups/${groupId}/messages`,
      providesTags: (result, error, id) => [{ type: "GroupMessages", id }],
    }),
  }),
});

export const {
  useCreateGroupMutation,
  useGetUserGroupsQuery,
  useGetGroupByIdQuery,
  useAddGroupMembersMutation,
  useRemoveGroupMemberMutation,
  useGetGroupMessagesQuery,
  useLazyGetGroupMessagesQuery,
} = groupsApi;
