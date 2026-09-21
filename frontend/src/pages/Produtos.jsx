import { useEffect, useState } from "react";
import api from "../services/api";
import ProdutoForm from "./ProdutoForm";

export default function Produtos() {
  const [produtos, setProdutos] = useState([]);
  const [categorias, setCategorias] = useState([]);
  const [fornecedores, setFornecedores] = useState([]);

  const [meta, setMeta] = useState({
    total: 0,
    page: 1,
    limit: 10,
    totalPages: 1,
  });

  const [editando, setEditando] = useState(null);
  const [busca, setBusca] = useState("");
  const [status, setStatus] = useState("todos");
  const [categoriaId, setCategoriaId] = useState("");
  const [fornecedorId, setFornecedorId] = useState("");
  const [salvando, setSalvando] = useState(false);

  const carregarFiltros = async () => {
    try {
      const [catRes, fornRes] = await Promise.all([
        api.get("/categorias"),
        api.get("/fornecedores"),
      ]);

      setCategorias(catRes.data || []);
      setFornecedores(fornRes.data || []);
    } catch (error) {
      console.error(error);
    }
  };

  const carregarProdutos = async (page = 1) => {
  try {
    const res = await api.get("/produtos", {
      params: {
        q: busca,
        status,
        categoriaId,
        fornecedorId,
        page,
        limit: meta.limit,
      },
    });

    setProdutos(res.data?.itens || []);

    setMeta(
      res.data?.meta || {
        total: 0,
        page: 1,
        limit: 10,
        totalPages: 1,
      }
    );
  } catch (error) {
    console.error(
      "Erro ao carregar produtos:",
      error
    );

    alert(
      error.response?.data?.error ||
        "Erro ao carregar produtos."
    );
  }
};

  useEffect(() => {
    carregarFiltros();
  }, []);

  useEffect(() => {
    carregarProdutos(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [busca, status, categoriaId, fornecedorId]);

  const salvar = async (dados) => {
    try {
      setSalvando(true);

      if (editando) {
        await api.put(`/produtos/${editando.id}`, dados);
      } else {
        await api.post("/produtos", dados);
      }

      setEditando(null);
      await carregarProdutos(meta.page);
    } catch (error) {
      alert(error.response?.data?.error || "Erro ao salvar produto.");
    } finally {
      setSalvando(false);
    }
  };

  const inativar = async (id) => {
    if (!confirm("Deseja inativar este produto?")) return;

    try {
      await api.patch(`/produtos/${id}/inativar`);
      await carregarProdutos(meta.page);
    } catch (error) {
      alert(error.response?.data?.error || "Erro ao inativar produto.");
    }
  };

  const exportarCSV = async () => {
    const res = await api.get("/relatorios/produtos.csv", {
      params: { q: busca, status, categoriaId, fornecedorId },
      responseType: "blob",
    });

    baixarArquivo(res.data, "produtos.csv", "text/csv");
  };

  const exportarPDF = async () => {
    const res = await api.get("/relatorios/produtos.pdf", {
      params: { q: busca, status, categoriaId, fornecedorId },
      responseType: "blob",
    });

    baixarArquivo(res.data, "produtos.pdf", "application/pdf");
  };

  const importarXML = async (e) => {
    const arquivo = e.target.files?.[0];
    if (!arquivo) return;

    try {
      const formData = new FormData();
      formData.append("xml", arquivo);

      await api.post("/importacoes/xml", formData, {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      });

      alert("XML importado com sucesso!");
      await carregarProdutos(meta.page);
    } catch (error) {
      console.error(error.response?.data);
      alert(error.response?.data?.error || "Erro ao importar XML.");
    } finally {
      e.target.value = "";
    }
  };

  const baixarArquivo = (data, nome, tipo) => {
    const blob = new Blob([data], { type: tipo });
    const url = window.URL.createObjectURL(blob);

    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", nome);
    document.body.appendChild(link);
    link.click();
    link.remove();

    window.URL.revokeObjectURL(url);
  };

  const irPagina = (pagina) => carregarProdutos(pagina);

  return (
    <div>
      <h2 className="page-title">Produtos</h2>

      <ProdutoForm
        initialData={editando}
        onSave={salvar}
        onCancel={() => setEditando(null)}
        salvando={salvando}
      />

      <div className="panel">
        <div className="panel-head">
          <h3>Lista de produtos</h3>

          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            <input
              className="input search"
              placeholder="Buscar..."
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
            />

            <select className="input" value={status} onChange={(e) => setStatus(e.target.value)}>
              <option value="todos">Todos</option>
              <option value="ok">OK</option>
              <option value="baixo">Baixo</option>
            </select>

            <select className="input" value={categoriaId} onChange={(e) => setCategoriaId(e.target.value)}>
              <option value="">Categoria</option>
              {categorias.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.nome}
                </option>
              ))}
            </select>

            <select className="input" value={fornecedorId} onChange={(e) => setFornecedorId(e.target.value)}>
              <option value="">Fornecedor</option>
              {fornecedores.map((f) => (
                <option key={f.id} value={f.id}>
                  {f.nome}
                </option>
              ))}
            </select>

          </div>
        </div>

        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Produto</th>
                <th>Categoria</th>
                <th>Fornecedor</th>
                <th>Qtd</th>
                <th>Mínimo</th>
                <th>Situação</th>
                <th>Preço</th>
                <th>Ações</th>
              </tr>
            </thead>

            <tbody>
              {produtos.map((p) => {
                const saldo = p.quantidade;
                const minimo = p.estoqueMinimo;
                const diff = saldo - minimo;

                let situacao = "OK";
                if (saldo <= 0) situacao = "Sem estoque";
                else if (saldo <= minimo) situacao = "Atenção";

                return (
                  <tr key={p.id}>
                    <td>{p.nome}</td>
                    <td>{p.categoria?.nome || "-"}</td>
                    <td>{p.fornecedor?.nome || "-"}</td>
                    <td>{saldo}</td>
                    <td>{minimo}</td>

                    <td>
                      <span
                        className={
                          saldo <= 0
                            ? "badge badge-danger"
                            : saldo <= minimo
                            ? "badge badge-warning"
                            : "badge badge-success"
                        }
                      >
                        {situacao}
                      </span>

                      <div style={{ fontSize: 12, marginTop: 4, color: "#64748b" }}>
                        {saldo <= minimo ? `Faltam ${Math.abs(diff)}` : `${diff} acima`}
                      </div>
                    </td>

                    <td>R$ {Number(p.precoVenda).toFixed(2)}</td>

                    <td className="actions-inline">
                      <button className="btn btn-small" type="button" onClick={() => setEditando(p)}>
                        Editar
                      </button>
                      <button className="btn btn-small btn-outline" type="button" onClick={() => inativar(p.id)}>
                        Inativar
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        <div className="pagination">
          <button
            className="btn btn-pagination"
            disabled={meta.page <= 1}
            onClick={() => irPagina(meta.page - 1)}
            type="button"
          >
            ← Anterior
          </button>

          <div className="pagination-info">
            Página <strong>{meta.page}</strong> de <strong>{meta.totalPages}</strong>
          </div>

          <button
            className="btn btn-pagination"
            disabled={meta.page >= meta.totalPages}
            onClick={() => irPagina(meta.page + 1)}
            type="button"
          >
            Próxima →
          </button>
        </div>
      </div>
    </div>
  );
}