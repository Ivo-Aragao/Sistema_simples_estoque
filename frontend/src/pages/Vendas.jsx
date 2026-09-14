import { useEffect, useMemo, useState } from "react";
import api from "../services/api";

export default function Vendas() {
  const [produtos, setProdutos] = useState([]);
  const [empresa, setEmpresa] = useState(null);
  const [busca, setBusca] = useState("");
  const [carrinho, setCarrinho] = useState([]);
  const [finalizando, setFinalizando] = useState(false);

  useEffect(() => {
    carregarProdutos();
    carregarEmpresa();
  }, []);

  async function carregarProdutos() {
    try {
      const resposta = await api.get("/produtos", {
        params: {
          page: 1,
          limit: 1000,
          status: "ok",
        },
      });

      setProdutos(resposta.data.itens || []);
    } catch (error) {
      alert(
        error.response?.data?.error ||
          "Erro ao carregar produtos."
      );
    }
  }

  async function carregarEmpresa() {
    try {
      const resposta = await api.get("/empresa");
      setEmpresa(resposta.data);
    } catch (error) {
      console.error("Erro ao carregar empresa:", error);
    }
  }

  const produtosFiltrados = useMemo(() => {
    const termo = busca.trim().toLowerCase();

    if (!termo) {
      return produtos;
    }

    return produtos.filter((produto) => {
      return (
        produto.nome?.toLowerCase().includes(termo) ||
        produto.codigoBarra?.toLowerCase().includes(termo)
      );
    });
  }, [produtos, busca]);

  function adicionarProduto(produto) {
    if (produto.quantidade <= 0) {
      alert("Produto sem estoque.");
      return;
    }

    setCarrinho((atual) => {
      const existente = atual.find(
        (item) => item.id === produto.id
      );

      if (existente) {
        if (existente.quantidade >= produto.quantidade) {
          alert("Quantidade maior que o estoque disponível.");
          return atual;
        }

        return atual.map((item) =>
          item.id === produto.id
            ? {
                ...item,
                quantidade: item.quantidade + 1,
              }
            : item
        );
      }

      return [
        ...atual,
        {
          id: produto.id,
          nome: produto.nome,
          precoVenda: Number(produto.precoVenda),
          quantidade: 1,
          estoqueDisponivel: produto.quantidade,
        },
      ];
    });
  }

  function alterarQuantidade(id, novaQuantidade) {
    setCarrinho((atual) =>
      atual.map((item) => {
        if (item.id !== id) return item;

        const quantidade = Number(novaQuantidade);

        if (quantidade <= 0) {
          return null;
        }

        if (quantidade > item.estoqueDisponivel) {
          alert("Quantidade maior que o estoque disponível.");
          return item;
        }

        return {
          ...item,
          quantidade,
        };
      }).filter(Boolean)
    );
  }

  function removerItem(id) {
    setCarrinho((atual) =>
      atual.filter((item) => item.id !== id)
    );
  }

  const total = useMemo(() => {
    return carrinho.reduce(
      (soma, item) =>
        soma + item.precoVenda * item.quantidade,
      0
    );
  }, [carrinho]);

  async function finalizarVenda() {
    if (carrinho.length === 0) {
      alert("Adicione pelo menos um produto.");
      return;
    }

    try {
      setFinalizando(true);

      for (const item of carrinho) {
        await api.post("/movimentacoes", {
          produtoId: item.id,
          tipo: "SAIDA",
          quantidade: item.quantidade,
          observacao: "Venda no PDV",
        });
      }

      alert(
        `Venda realizada com sucesso!\nTotal: R$ ${total.toFixed(2)}`
      );

      setCarrinho([]);

      await carregarProdutos();
    } catch (error) {
      alert(
        error.response?.data?.error ||
          "Erro ao finalizar venda."
      );
    } finally {
      setFinalizando(false);
    }
  }

  return (
    <div>
      <div className="page-title">
        <div>
          <h2>Vendas</h2>
          <p style={{ marginTop: 5, color: "#64748b" }}>
            Frente de caixa
          </p>
        </div>

        {empresa?.logoUrl && (
          <img
            src={empresa.logoUrl}
            alt={empresa.nome || "Logo da empresa"}
            style={{
              height: 60,
              maxWidth: 180,
              objectFit: "contain",
            }}
          />
        )}
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "minmax(0, 1fr) 380px",
          gap: 20,
          alignItems: "start",
        }}
      >
        <div className="panel">
          <div className="panel-head">
            <h3>Produtos</h3>

            <input
              className="input search"
              placeholder="Buscar por nome ou código de barras..."
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
            />
          </div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns:
                "repeat(auto-fill, minmax(200px, 1fr))",
              gap: 12,
            }}
          >
            {produtosFiltrados.map((produto) => (
              <button
                key={produto.id}
                type="button"
                onClick={() => adicionarProduto(produto)}
                disabled={produto.quantidade <= 0}
                style={{
                  textAlign: "left",
                  padding: 16,
                  border: "1px solid #e2e8f0",
                  borderRadius: 10,
                  background: "#fff",
                  cursor:
                    produto.quantidade > 0
                      ? "pointer"
                      : "not-allowed",
                }}
              >
                <strong>{produto.nome}</strong>

                <div style={{ marginTop: 8 }}>
                  R$ {Number(produto.precoVenda).toFixed(2)}
                </div>

                <div
                  style={{
                    marginTop: 5,
                    fontSize: 13,
                    color:
                      produto.quantidade <= 0
                        ? "#dc2626"
                        : "#64748b",
                  }}
                >
                  Estoque: {produto.quantidade}
                </div>
              </button>
            ))}
          </div>
        </div>

        <div
          className="panel"
          style={{
            position: "sticky",
            top: 20,
          }}
        >
          <h3>Carrinho</h3>

          {carrinho.length === 0 ? (
            <p style={{ color: "#64748b" }}>
              Nenhum produto adicionado.
            </p>
          ) : (
            <>
              <div>
                {carrinho.map((item) => (
                  <div
                    key={item.id}
                    style={{
                      padding: "12px 0",
                      borderBottom:
                        "1px solid #e2e8f0",
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        justifyContent:
                          "space-between",
                        gap: 10,
                      }}
                    >
                      <strong>{item.nome}</strong>

                      <button
                        type="button"
                        className="btn btn-small btn-outline"
                        onClick={() =>
                          removerItem(item.id)
                        }
                      >
                        Remover
                      </button>
                    </div>

                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 10,
                        marginTop: 8,
                      }}
                    >
                      <input
                        className="input"
                        type="number"
                        min="1"
                        max={item.estoqueDisponivel}
                        value={item.quantidade}
                        onChange={(e) =>
                          alterarQuantidade(
                            item.id,
                            e.target.value
                          )
                        }
                        style={{ width: 90 }}
                      />

                      <span>
                        R${" "}
                        {(
                          item.precoVenda *
                          item.quantidade
                        ).toFixed(2)}
                      </span>
                    </div>
                  </div>
                ))}
              </div>

              <div
                style={{
                  display: "flex",
                  justifyContent:
                    "space-between",
                  marginTop: 20,
                  fontSize: 20,
                }}
              >
                <strong>Total</strong>
                <strong>
                  R$ {total.toFixed(2)}
                </strong>
              </div>

              <button
                type="button"
                className="btn btn-primary"
                style={{
                  width: "100%",
                  marginTop: 20,
                }}
                onClick={finalizarVenda}
                disabled={finalizando}
              >
                {finalizando
                  ? "Finalizando..."
                  : "Finalizar venda"}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}