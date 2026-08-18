import { createSlice, PayloadAction } from "@reduxjs/toolkit";

interface ChatState {
  activeContactId: string;
  socketStatus: "connected" | "connecting" | "disconnected";
  serverUrl: string;
}

const initialState: ChatState = {
  activeContactId: "contact-1",
  socketStatus: "disconnected",
  serverUrl: process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000",
};

export const chatSlice = createSlice({
  name: "chat",
  initialState,
  reducers: {
    setActiveContactId: (state, action: PayloadAction<string>) => {
      state.activeContactId = action.payload;
    },
    setSocketStatus: (
      state,
      action: PayloadAction<"connected" | "connecting" | "disconnected">
    ) => {
      state.socketStatus = action.payload;
    },
    setServerUrl: (state, action: PayloadAction<string>) => {
      state.serverUrl = action.payload;
    },
  },
});

export const { setActiveContactId, setSocketStatus, setServerUrl } =
  chatSlice.actions;
export default chatSlice.reducer;
