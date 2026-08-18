import { baseApi } from "./baseApi";
import { User } from "./authApi";

export const usersApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getUsers: builder.query<User[], void>({
      query: () => "/users",
      providesTags: ["User"],
    }),
  }),
});

export const { useGetUsersQuery } = usersApi;
