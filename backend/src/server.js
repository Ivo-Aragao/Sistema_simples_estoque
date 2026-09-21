const http = require("http");
const { Server } = require("socket.io");

const app = require("./app");

const {
  configurarSocketIO,
} = require("./socket");

const PORT =
  process.env.PORT || 3001;

// =========================================================
// SERVIDOR HTTP
// =========================================================

const server =
  http.createServer(app);

// =========================================================
// SOCKET.IO
// =========================================================

const io =
  new Server(server, {
    cors: {
      origin: [
        "http://localhost:5173",
        "https://sistemasimplesestoque.vercel.app",
      ],

      methods: [
        "GET",
        "POST",
      ],
    },

    // Permite WebSocket e fallback
    // para long-polling quando necessário.
    transports: [
      "websocket",
      "polling",
    ],
  });

// =========================================================
// CONFIGURAR SOCKET
// =========================================================

configurarSocketIO(io);

// =========================================================
// INICIAR SERVIDOR
// =========================================================

server.listen(
  PORT,
  "0.0.0.0",
  () => {
    console.log(
      `Servidor rodando na porta ${PORT}`
    );
  }
);