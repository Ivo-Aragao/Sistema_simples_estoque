import {
  Navigate,
  Route,
  Routes,
} from "react-router-dom";

import {
  useEffect,
} from "react";

import Layout from "./components/Layout";

import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import Produtos from "./pages/Produtos";
import Movimentacoes from "./pages/Movimentacoes";
import Relatorios from "./pages/Relatorios";
import XmlNfe from "./pages/XmlNfe";
import EsqueciSenha from "./pages/EsqueciSenha";
import RedefinirSenha from "./pages/RedefinirSenha";
import Vendas from "./pages/Vendas";
import Configuracoes from "./pages/Configuracoes";
import Mesas from "./pages/Mesas";
import Comanda from "./pages/Comanda";
import TesteSocket from "./pages/TesteSocket";

import socket from "./services/socket";

function PrivateRoute({
  children,
}) {
  const token =
    localStorage.getItem("token");

  return token ? (
    children
  ) : (
    <Navigate
      to="/login"
      replace
    />
  );
}

export default function App() {
  useEffect(() => {
    // ========================================================
    // CONEXÃO GLOBAL DO SOCKET.IO
    // ========================================================

    if (!socket.connected) {
      socket.connect();
    }

    function aoConectar() {
      console.log(
        "Socket conectado:",
        socket.id
      );
    }

    function aoDesconectar(
      motivo
    ) {
      console.log(
        "Socket desconectado:",
        motivo
      );
    }

    function erroConexao(
      erro
    ) {
      console.error(
        "Erro no Socket.IO:",
        erro
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
      "connect_error",
      erroConexao
    );

    // ========================================================
    // LIMPEZA DOS LISTENERS
    // ========================================================

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
        "connect_error",
        erroConexao
      );

      // IMPORTANTE:
      // NÃO usar socket.disconnect() aqui.
      //
      // O socket deve continuar vivo enquanto
      // a aplicação React estiver aberta.
    };
  }, []);

  return (
    <Routes>

      {/* ================================================= */}
      {/* LOGIN */}
      {/* ================================================= */}

      <Route
        path="/login"
        element={<Login />}
      />

      {/* ================================================= */}
      {/* RECUPERAÇÃO DE SENHA */}
      {/* ================================================= */}

      <Route
        path="/esqueci-senha"
        element={
          <EsqueciSenha />
        }
      />

      <Route
        path="/redefinir-senha"
        element={
          <RedefinirSenha />
        }
      />

      {/* ================================================= */}
      {/* VENDAS */}
      {/* ================================================= */}

      <Route
        path="/vendas"
        element={
          <PrivateRoute>
            <Vendas />
          </PrivateRoute>
        }
      />

      {/* ================================================= */}
      {/* TESTE SOCKET */}
      {/* ================================================= */}

      <Route
        path="/teste-socket"
        element={
          <PrivateRoute>
            <TesteSocket />
          </PrivateRoute>
        }
      />

      {/* ================================================= */}
      {/* CONFIGURAÇÕES */}
      {/* ================================================= */}

      <Route
        path="/configuracoes"
        element={
          <PrivateRoute>
            <Configuracoes />
          </PrivateRoute>
        }
      />

      {/* ================================================= */}
      {/* SISTEMA PRINCIPAL */}
      {/* ================================================= */}

      <Route
        path="/"
        element={
          <PrivateRoute>
            <Layout />
          </PrivateRoute>
        }
      >
        <Route
          index
          element={
            <Dashboard />
          }
        />

        <Route
          path="produtos"
          element={
            <Produtos />
          }
        />

        <Route
          path="movimentacoes"
          element={
            <Movimentacoes />
          }
        />

        <Route
          path="xml-nfe"
          element={
            <XmlNfe />
          }
        />

        <Route
          path="relatorios"
          element={
            <Relatorios />
          }
        />
      </Route>

      {/* ================================================= */}
      {/* MESAS */}
      {/* ================================================= */}

      <Route
        path="/mesas"
        element={
          <PrivateRoute>
            <Mesas />
          </PrivateRoute>
        }
      />

      {/* ================================================= */}
      {/* COMANDA */}
      {/* ================================================= */}

      <Route
        path="/comandas/:id"
        element={
          <PrivateRoute>
            <Comanda />
          </PrivateRoute>
        }
      />

      {/* ================================================= */}
      {/* ROTA NÃO ENCONTRADA */}
      {/* ================================================= */}

      <Route
        path="*"
        element={
          <Navigate
            to="/"
            replace
          />
        }
      />

    </Routes>
  );
}