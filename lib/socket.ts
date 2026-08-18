import { io, Socket } from "socket.io-client";

let socket: Socket | null = null;

export const getSocket = (serverUrl: string = "http://localhost:8000"): Socket => {
  if (!socket) {
    socket = io(`${serverUrl}/realtime`, {
      autoConnect: true,
      withCredentials: true,
      transports: ["websocket", "polling"],
      reconnection: true,
      reconnectionAttempts: 20,
      reconnectionDelay: 1000,
    });
  }

  return socket;
};

export const disconnectSocket = () => {
  if (socket) {
    socket.disconnect();
  }
};

export const destroySocket = () => {
  if (socket) {
    socket.removeAllListeners();
    socket.disconnect();
    socket = null;
  }
};