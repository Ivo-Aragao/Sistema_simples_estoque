import { Navigate, Route, Routes } from "react-router-dom";
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

function PrivateRoute({ children }) {
  const token = localStorage.getItem("token");
  return token ? children : <Navigate to="/login" replace />;
}

export default function App() {
  return (
   <Routes>

  <Route path="/login" element={<Login />} />

  <Route path="/esqueci-senha" element={<EsqueciSenha />} />

  <Route path="/redefinir-senha" element={<RedefinirSenha />} />

  <Route path="/vendas" element={<Vendas />} />
  <Route
    path="/"
    element={
      <PrivateRoute>
        <Layout />
      </PrivateRoute>
    }
  >
    <Route index element={<Dashboard />} />
    <Route path="produtos" element={<Produtos />} />
    <Route path="movimentacoes" element={<Movimentacoes />} />
    <Route path="xml-nfe" element={<XmlNfe />} />
    <Route path="relatorios" element={<Relatorios />} />
  </Route>

  <Route path="*" element={<Navigate to="/" replace />} />

</Routes>
  );
}