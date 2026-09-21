import { io } from "socket.io-client";

const URL =
  import.meta.env.VITE_API_URL ||
  "http://localhost:3001";

const SOCKET_KEY =
  "__SISTEMA_SIMPLES_ESTOQUE_SOCKET__";

if (!window[SOCKET_KEY]) {
  window[SOCKET_KEY] = io(URL, {
    autoConnect: false,

    reconnection: true,

    reconnectionAttempts: Infinity,

    reconnectionDelay: 1000,

    reconnectionDelayMax: 5000,

    transports: [
      "websocket",
      "polling",
    ],
  });
}

const socket =
  window[SOCKET_KEY];

export default socket;