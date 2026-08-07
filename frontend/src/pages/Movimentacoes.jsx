import { useEffect, useState } from "react";
import api from "../services/api";

const formInicial = {
  produtoId: "",
  tipo: "ENTRADA",
  quantidade: "",
  observacao: "",
};

export default function Movimentacoes() {
  const [produtos, setProdutos] = useState([]);
  const [movimentacoes, setMovimentacoes] = useState([]);
  const [form, setForm] = useState(formInicial);
  const [salvando, setSalvando] = useState(false);

  const carregar = async () => {
    const [prodRes, movRes] = await Promise.all([
      api.get("/produtos", { params: { page: 1, limit: 1000 } }),
      api.get("/movimentacoes"),
    ]);

    setProdutos(prodRes.data.itens || []);
    setMovimentacoes(movRes.data || []);
  };

  useEffect(() => {
    carregar();
  }, []);

  const alterar = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const salvar = async (e) => {
    e.preventDefault();

    try {
      setSalvando(true);

      await api.post("/movimentacoes", {
        produtoId: Number(form.produtoId),
        tipo: form.tipo,
        quantidade: Number(form.quantidade),
        observacao: form.observacao,
      });

      setForm(formInicial);
      await carregar();
    } catch (error) {
      alert(error.response?.data?.error || "Erro ao registrar movimentação.");
    } finally {
      setSalvando(false);
    }
  };

  return (
    <div>
      <h2 className="page-title">Movimentações</h2>

      <form className="panel form" onSubmit={salvar}>
        <h3>Nova movimentação</h3>

        <div className="form-grid">
          <select
            className="input"
            name="produtoId"
            value={form.produtoId}
            onChange={alterar}
          >
            <option value="">Selecione um produto</option>
            {produtos.map((p) => (
              <option key={p.id} value={p.id}>
                {p.nome}
              </option>
            ))}
          </select>

          <select className="input" name="tipo" value={form.tipo} onChange={alterar}>
            <option value="ENTRADA">Entrada</option>
            <option value="SAIDA">Saída</option>
          </select>

          <input
            className="input"
            name="quantidade"
            type="number"
            value={form.quantidade}
            onChange={alterar}
            placeholder="Quantidade"
          />

          <input
            className="input"
            name="observacao"
            value={form.observacao}
            onChange={alterar}
            placeholder="Observação"
          />
        </div>

        <button className="btn btn-primary" type="submit" disabled={salvando}>
          {salvando ? "Salvando..." : "Registrar"}
        </button>
      </form>

      <div className="panel">
        <h3>Histórico</h3>

        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Produto</th>
                <th>Tipo</th>
                <th>Qtd</th>
                <th>Observação</th>
                <th>Data</th>
              </tr>
            </thead>
            <tbody>
              {movimentacoes.map((mov) => (
                <tr key={mov.id}>
                  <td>{mov.produto?.nome}</td>
                  <td>
                    <span
                      className={
                        mov.tipo === "ENTRADA"
                          ? "badge badge-success"
                          : "badge badge-danger"
                      }
                    >
                      {mov.tipo}
                    </span>
                  </td>
                  <td>{mov.quantidade}</td>
                  <td>{mov.observacao || "-"}</td>
                  <td>{new Date(mov.dataMovimentacao).toLocaleString("pt-BR")}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}