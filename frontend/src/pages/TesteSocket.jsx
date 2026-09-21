import {
  useEffect,
  useState,
} from "react";

import socket from "../services/socket";

export default function TesteSocket() {
  const [conectado, setConectado] =
    useState(socket.connected);

  const [socketId, setSocketId] =
    useState(socket.id || "");

  const [mensagem, setMensagem] =
    useState("");

  const [historico, setHistorico] =
    useState([]);

  useEffect(() => {
    function aoConectar() {
      console.log(
        "Socket conectado:",
        socket.id
      );

      setConectado(true);
      setSocketId(
        socket.id || ""
      );
    }

    function aoDesconectar() {
      console.log(
        "Socket desconectado"
      );

      setConectado(false);
      setSocketId("");
    }

    function receberMensagem(
      dados
    ) {
      console.log(
        "Mensagem recebida:",
        dados
      );

      setMensagem(
        JSON.stringify(
          dados,
          null,
          2
        )
      );

      setHistorico(
        (atual) => [
          ...atual,
          dados,
        ]
      );
    }

    socket.on(
      "connect",
      aoConectar
    );

    socket.on(
      "disconnect",
      aoDesconectar
    );

    socket.on(
      "teste-resposta",
      receberMensagem
    );

    if (socket.connected) {
      aoConectar();
    }

    return () => {
      socket.off(
        "connect",
        aoConectar
      );

      socket.off(
        "disconnect",
        aoDesconectar
      );

      socket.off(
        "teste-resposta",
        receberMensagem
      );
    };
  }, []);

  function enviarTeste() {
    const dados = {
      mensagem:
        "Comunicação funcionando!",
      origem:
        "frontend",
      horario:
        new Date().toISOString(),
    };

    socket.emit(
      "teste",
      dados
    );
  }

  return (
    <div
      style={{
        minHeight: "100vh",
        padding: "30px",
        background: "#f5f7fb",
        fontFamily:
          "Arial, sans-serif",
      }}
    >
      <div
        style={{
          maxWidth: "800px",
          margin: "0 auto",
          background:
            "#ffffff",
          padding: "30px",
          borderRadius: "16px",
          boxShadow:
            "0 4px 20px rgba(0,0,0,0.08)",
        }}
      >
        <h1>
          Teste de comunicação
        </h1>

        <p>
          Socket.IO
        </p>

        <div
          style={{
            marginTop: "20px",
            padding: "15px",
            borderRadius: "10px",
            background:
              conectado
                ? "#dcfce7"
                : "#fee2e2",
            color:
              conectado
                ? "#166534"
                : "#991b1b",
          }}
        >
          <strong>
            Status:
          </strong>{" "}
          {conectado
            ? "CONECTADO"
            : "DESCONECTADO"}
        </div>

        <div
          style={{
            marginTop: "15px",
            padding: "15px",
            borderRadius: "10px",
            background:
              "#f8fafc",
          }}
        >
          <strong>
            Socket ID:
          </strong>

          <div
            style={{
              marginTop: "6px",
              wordBreak:
                "break-all",
            }}
          >
            {socketId ||
              "Nenhum"}
          </div>
        </div>

        <button
          type="button"
          onClick={
            enviarTeste
          }
          disabled={!conectado}
          style={{
            marginTop: "20px",
            padding:
              "12px 18px",
            border: "none",
            borderRadius:
              "10px",
            background:
              "#101828",
            color:
              "#ffffff",
            fontWeight:
              "700",
            cursor:
              conectado
                ? "pointer"
                : "not-allowed",
            opacity:
              conectado
                ? 1
                : 0.5,
          }}
        >
          Enviar mensagem de teste
        </button>

        <div
          style={{
            marginTop: "25px",
          }}
        >
          <h2>
            Última mensagem
          </h2>

          <pre
            style={{
              marginTop: "10px",
              padding: "15px",
              background:
                "#111827",
              color:
                "#ffffff",
              borderRadius:
                "10px",
              overflow:
                "auto",
              minHeight:
                "100px",
            }}
          >
            {mensagem ||
              "Nenhuma mensagem recebida."}
          </pre>
        </div>

        <div
          style={{
            marginTop: "25px",
          }}
        >
          <h2>
            Mensagens recebidas
          </h2>

          {historico.length ===
          0 ? (
            <p>
              Nenhuma mensagem
              ainda.
            </p>
          ) : (
            <div
              style={{
                display:
                  "flex",
                flexDirection:
                  "column",
                gap: "10px",
                marginTop:
                  "10px",
              }}
            >
              {historico.map(
                (
                  item,
                  index
                ) => (
                  <pre
                    key={
                      `${item.horario || ""}-${index}`
                    }
                    style={{
                      margin: 0,
                      padding:
                        "12px",
                      background:
                        "#f8fafc",
                      border:
                        "1px solid #eaecf0",
                      borderRadius:
                        "8px",
                      overflow:
                        "auto",
                    }}
                  >
                    {JSON.stringify(
                      item,
                      null,
                      2
                    )}
                  </pre>
                )
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}