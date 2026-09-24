const http = require("http");
const { Server } = require("socket.io");
const cron = require("node-cron");

const app = require("./app");

const {
  configurarSocketIO,
} = require("./socket");

const {
  virarTodosOsCaixas,
} = require("./services/caixaService");

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
// VIRADA AUTOMÁTICA DOS CAIXAS
// =========================================================

cron.schedule(
  "0 0 * * *",
  async () => {
    console.log("=================================");
    console.log("Virada automática dos caixas");
    console.log("=================================");

    try {
      const resultado =
        await virarTodosOsCaixas();

      console.log(
        "Resultado:",
        resultado
      );
    } catch (error) {
      console.error(
        "Erro na virada automática dos caixas:",
        error
      );
    }
  },
  {
    timezone:
      "America/Fortaleza",

    noOverlap:
      true,
  }
);

// =========================================================
// INICIAR SERVIDOR
// =========================================================

async function iniciarServidor() {
  try {
    // ------------------------------------------------------
    // VERIFICAR CAIXAS ATRASADOS
    // ------------------------------------------------------

    const resultado =
      await virarTodosOsCaixas();

    console.log(
      "Verificação inicial dos caixas:",
      resultado
    );
  } catch (error) {
    console.error(
      "Erro na verificação inicial dos caixas:",
      error
    );
  }

  // --------------------------------------------------------
  // LISTEN
  // --------------------------------------------------------

  server.listen(
    PORT,
    "0.0.0.0",
    () => {
      console.log(
        `Servidor rodando na porta ${PORT}`
      );
    }
  );
}

iniciarServidor();