let io = null;

function configurarSocketIO(socketIO) {
  io = socketIO;

  io.on(
    "connection",
    (socket) => {
      console.log(
        "================================="
      );

      console.log(
        "Socket conectado:"
      );

      console.log(
        "ID:",
        socket.id
      );

      console.log(
        "Transport:",
        socket.conn.transport.name
      );

      console.log(
        "================================="
      );

      socket.conn.on(
        "upgrade",
        () => {
          console.log(
            "Socket fez upgrade para:",
            socket.conn.transport.name
          );
        }
      );

      // =====================================================
      // TESTE DE COMUNICAÇÃO
      // =====================================================

      socket.on(
        "teste",
        (dados) => {
          console.log(
            "Mensagem de teste recebida:",
            dados
          );

          io.emit(
            "teste-resposta",
            {
              ...dados,

              recebidoEm:
                new Date().toISOString(),
            }
          );
        }
      );

      // =====================================================
      // DESCONECTAR
      // =====================================================

      socket.on(
        "disconnect",
        (motivo) => {
          console.log(
            "================================="
          );

          console.log(
            "Socket desconectado:"
          );

          console.log(
            "ID:",
            socket.id
          );

          console.log(
            "Motivo:",
            motivo
          );

          console.log(
            "================================="
          );
        }
      );
    }
  );
}

function obterIO() {
  if (!io) {
    throw new Error(
      "Socket.IO ainda não foi configurado."
    );
  }

  return io;
}

module.exports = {
  configurarSocketIO,
  obterIO,
};