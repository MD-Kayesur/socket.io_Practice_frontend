import { io, Socket } from "socket.io-client";

let socket: Socket | null = null;

export const getSocket = (serverUrl: string): Socket => {
  if (!socket) {
    socket = io(`${serverUrl}/realtime`, {
      autoConnect: false,
      withCredentials: true,
      transports: ["websocket", "polling"],
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