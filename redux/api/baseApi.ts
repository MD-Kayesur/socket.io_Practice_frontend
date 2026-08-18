import { createApi, fetchBaseQuery } from "@reduxjs/toolkit/query/react";
import { RootState } from "../store";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export const baseApi = createApi({
  reducerPath: "api",
  baseQuery: fetchBaseQuery({
    baseUrl: API_URL,
    prepareHeaders: (headers, { getState }) => {
      const state = getState() as RootState;
      const token = state.auth.token || (typeof window !== "undefined" ? localStorage.getItem("accessToken") : null);

      if (token) {
        headers.set("Authorization", `Bearer ${token}`);
      }
      return headers;
    },
  }),
  tagTypes: ["User", "Message", "Contact"],
  endpoints: () => ({}),
});
