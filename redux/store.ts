import { configureStore } from "@reduxjs/toolkit";
import { baseApi } from "./api/baseApi";
import { groupsApi } from "./api/groupsApi";
import authReducer from "./slices/authSlice";
import chatReducer from "./slices/chatSlice";

export const store = configureStore({
  reducer: {
    auth: authReducer,
    chat: chatReducer,
    [baseApi.reducerPath]: baseApi.reducer,
    [groupsApi.reducerPath]: groupsApi.reducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware().concat(baseApi.middleware, groupsApi.middleware),
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
