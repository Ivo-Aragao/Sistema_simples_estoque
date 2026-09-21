import { useEffect, useState } from "react";
import api from "../services/api";
import { BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid } from "recharts";

export default function Dashboard() {
  const [dados, setDados] = useState(null);
  const dataGrafico = dados
  ? [
      { nome: "Entradas", valor: dados.entradasMes },
      { nome: "Saídas", valor: dados.saidasMes },
    ]
  : [];
  useEffect(() => {
    const carregar = async () => {
      const resposta = await api.get("/dashboard");
      setDados(resposta.data);
    };

    carregar();
  }, []);

  if (!dados) {
    return <div>Carregando dashboard...</div>;
  }

  return (
    <div>
      <h2 className="page-title">Dashboard</h2>

      <div className="cards">
        <div className="card">
          <span>Total de produtos</span>
          <strong>{dados.totalProdutos}</strong>
        </div>

        <div className="card">
          <span>Estoque baixo</span>
          <strong>{dados.produtosBaixoEstoque}</strong>
        </div>

        <div className="card">
          <span>Movimentações no mês</span>
          <strong>{dados.movimentacoesMes}</strong>
        </div>

        <div className="card">
          <span>Entradas no mês</span>
          <strong>{dados.entradasMes}</strong>
        </div>

        <div className="card">
          <span>Saídas no mês</span>
          <strong>{dados.saidasMes}</strong>
        </div>
      </div>

      <div className="panel">
        <h3>Alertas de estoque</h3>
        {dados.alertas.length === 0 ? (
          <p>Nenhum produto com estoque baixo.</p>
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Produto</th>
                  <th>Qtd</th>
                  <th>Mínimo</th>
                </tr>
              </thead>
              <tbody>
                {dados.alertas.map((item) => (
                  <tr key={item.id}>
                    <td>{item.nome}</td>
                    <td>{item.quantidade}</td>
                    <td>{item.estoqueMinimo}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
        
      <div className="panel">
        <h3>Últimas movimentações</h3>
        <div className="list">
          {dados.ultimasMovimentacoes.map((mov) => (
            <div key={mov.id} className="list-item">
              <div>
                <strong>{mov.produto?.nome}</strong>
                <p>
                  {mov.tipo} — {mov.quantidade} unidade(s)
                </p>
              </div>
              <span>{new Date(mov.dataMovimentacao).toLocaleString("pt-BR")}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}