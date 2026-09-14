import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../services/api";
import "./Vendas.css";

export default function Vendas() {
  const navigate = useNavigate();

  const [produtos, setProdutos] = useState([]);
  const [carrinho, setCarrinho] = useState([]);

  const [busca, setBusca] = useState("");
  const [codigoBarras, setCodigoBarras] = useState("");

  const [desconto, setDesconto] = useState(0);
  const [formaPagamento, setFormaPagamento] = useState("DINHEIRO");
  const [observacao, setObservacao] = useState("");

  const [empresa, setEmpresa] = useState(null);

  const [carregando, setCarregando] = useState(true);
  const [finalizando, setFinalizando] = useState(false);
  const [mensagem, setMensagem] = useState("");

  // =========================================================
  // CARREGAR DADOS
  // =========================================================

  useEffect(() => {
    carregarDados();
  }, []);

  async function carregarDados() {
    try {
      setCarregando(true);

      const [produtosResponse, empresaResponse] = await Promise.all([
        api.get("/produtos", {
          params: {
            page: 1,
            limit: 1000,
            status: "ok",
          },
        }),
        api.get("/empresa"),
      ]);

      const listaProdutos =
        produtosResponse.data?.produtos ||
        produtosResponse.data?.data ||
        produtosResponse.data ||
        [];

      setProdutos(Array.isArray(listaProdutos) ? listaProdutos : []);

      setEmpresa(empresaResponse.data || null);
    } catch (error) {
      console.error("Erro ao carregar dados da venda:", error);

      setMensagem(
        error.response?.data?.error ||
          "Não foi possível carregar os dados da venda."
      );
    } finally {
      setCarregando(false);
    }
  }

  // =========================================================
  // PRODUTOS FILTRADOS
  // =========================================================

  const produtosFiltrados = useMemo(() => {
    const termo = busca.trim().toLowerCase();

    if (!termo) {
      return produtos;
    }

    return produtos.filter((produto) => {
      const nome = String(produto.nome || "").toLowerCase();
      const codigo = String(produto.codigoBarra || "").toLowerCase();

      return nome.includes(termo) || codigo.includes(termo);
    });
  }, [produtos, busca]);

  // =========================================================
  // VALORES
  // =========================================================

  const subtotal = useMemo(() => {
    return carrinho.reduce((total, item) => {
      return total + item.quantidade * item.precoUnitario;
    }, 0);
  }, [carrinho]);

  const descontoNumerico = useMemo(() => {
    const valor = Number(desconto);

    if (!Number.isFinite(valor) || valor < 0) {
      return 0;
    }

    return valor;
  }, [desconto]);

  const total = useMemo(() => {
    return Math.max(0, subtotal - descontoNumerico);
  }, [subtotal, descontoNumerico]);

  // =========================================================
  // FORMATAÇÃO
  // =========================================================

  function formatarMoeda(valor) {
    return Number(valor || 0).toLocaleString("pt-BR", {
      style: "currency",
      currency: "BRL",
    });
  }

  // =========================================================
  // ADICIONAR PRODUTO
  // =========================================================

  function adicionarProduto(produto) {
    if (!produto) {
      return;
    }

    if (Number(produto.quantidade || 0) <= 0) {
      alert("Este produto está sem estoque.");
      return;
    }

    setMensagem("");

    setCarrinho((atual) => {
      const existente = atual.find(
        (item) => item.id === produto.id
      );

      if (existente) {
        if (
          existente.quantidade >=
          Number(produto.quantidade || 0)
        ) {
          alert(
            `Estoque máximo disponível: ${produto.quantidade}.`
          );

          return atual;
        }

        return atual.map((item) => {
          if (item.id !== produto.id) {
            return item;
          }

          return {
            ...item,
            quantidade: item.quantidade + 1,
          };
        });
      }

      return [
        ...atual,
        {
          id: produto.id,
          nome: produto.nome,
          codigoBarra: produto.codigoBarra,
          quantidade: 1,
          estoqueDisponivel: Number(produto.quantidade || 0),
          precoUnitario: Number(produto.precoVenda || 0),
        },
      ];
    });
  }

  // =========================================================
  // AUMENTAR QUANTIDADE
  // =========================================================

  function aumentarQuantidade(itemId) {
    setCarrinho((atual) => {
      return atual.map((item) => {
        if (item.id !== itemId) {
          return item;
        }

        if (item.quantidade >= item.estoqueDisponivel) {
          alert(
            `Estoque máximo disponível: ${item.estoqueDisponivel}.`
          );

          return item;
        }

        return {
          ...item,
          quantidade: item.quantidade + 1,
        };
      });
    });
  }

  // =========================================================
  // DIMINUIR QUANTIDADE
  // =========================================================

  function diminuirQuantidade(itemId) {
    setCarrinho((atual) => {
      return atual
        .map((item) => {
          if (item.id !== itemId) {
            return item;
          }

          return {
            ...item,
            quantidade: item.quantidade - 1,
          };
        })
        .filter((item) => item.quantidade > 0);
    });
  }

  // =========================================================
  // REMOVER ITEM
  // =========================================================

  function removerItem(itemId) {
    setCarrinho((atual) =>
      atual.filter((item) => item.id !== itemId)
    );
  }

  // =========================================================
  // BUSCAR CÓDIGO DE BARRAS
  // =========================================================

  function buscarCodigoBarras(event) {
    event.preventDefault();

    const codigo = codigoBarras.trim();

    if (!codigo) {
      return;
    }

    const produto = produtos.find(
      (item) =>
        String(item.codigoBarra || "").trim() === codigo
    );

    if (!produto) {
      alert("Produto não encontrado.");
      setCodigoBarras("");
      return;
    }

    adicionarProduto(produto);
    setCodigoBarras("");
  }

  // =========================================================
  // FINALIZAR VENDA
  // =========================================================

  async function finalizarVenda() {
    if (carrinho.length === 0) {
      alert("Adicione pelo menos um produto à venda.");
      return;
    }

    if (!formaPagamento) {
      alert("Selecione a forma de pagamento.");
      return;
    }

    if (descontoNumerico > subtotal) {
      alert("O desconto não pode ser maior que o subtotal.");
      return;
    }

    try {
      setFinalizando(true);
      setMensagem("");

      const payload = {
        itens: carrinho.map((item) => ({
          produtoId: item.id,
          quantidade: item.quantidade,
          precoUnitario: item.precoUnitario,
        })),

        desconto: descontoNumerico,
        formaPagamento,
        observacao: observacao.trim() || null,
      };

      const response = await api.post("/vendas", payload);

      const vendaCriada = response.data?.venda || response.data;

      setMensagem("Venda finalizada com sucesso!");

      imprimirComprovante(vendaCriada);

      setCarrinho([]);
      setDesconto(0);
      setFormaPagamento("DINHEIRO");
      setObservacao("");

      await carregarDados();
    } catch (error) {
      console.error("Erro ao finalizar venda:", error);

      const erro =
        error.response?.data?.error ||
        error.response?.data?.message ||
        "Não foi possível finalizar a venda.";

      setMensagem(erro);
      alert(erro);
    } finally {
      setFinalizando(false);
    }
  }

  // =========================================================
  // IMPRIMIR COMPROVANTE
  // =========================================================

  function imprimirComprovante(venda = null) {
    const numeroVenda =
      venda?.codigo ||
      venda?.id ||
      "NÃO INFORMADO";

    const dataVenda = new Date().toLocaleString("pt-BR");

    const nomeEmpresa =
      empresa?.nome ||
      "Sistema de Estoque";

    const logo =
      empresa?.logoUrl
        ? `<img src="${empresa.logoUrl}" alt="Logo" style="max-width:160px;max-height:80px;object-fit:contain;" />`
        : "";

    const itensHtml = carrinho
      .map((item) => {
        const subtotalItem =
          item.quantidade * item.precoUnitario;

        return `
          <tr>
            <td style="padding:6px 0;">
              ${item.nome}
            </td>

            <td style="padding:6px 0;text-align:center;">
              ${item.quantidade}
            </td>

            <td style="padding:6px 0;text-align:right;">
              ${formatarMoeda(item.precoUnitario)}
            </td>

            <td style="padding:6px 0;text-align:right;">
              ${formatarMoeda(subtotalItem)}
            </td>
          </tr>
        `;
      })
      .join("");

    const janela = window.open(
      "",
      "_blank",
      "width=700,height=800"
    );

    if (!janela) {
      alert(
        "O navegador bloqueou a janela de impressão. Permita pop-ups para este site."
      );
      return;
    }

    janela.document.write(`
      <!DOCTYPE html>
      <html lang="pt-BR">
        <head>
          <meta charset="UTF-8" />

          <title>
            Comprovante da Venda
          </title>

          <style>
            * {
              box-sizing: border-box;
            }

            body {
              font-family: Arial, sans-serif;
              margin: 0;
              padding: 30px;
              color: #222;
            }

            .comprovante {
              max-width: 700px;
              margin: 0 auto;
            }

            .cabecalho {
              text-align: center;
              margin-bottom: 20px;
            }

            .cabecalho h1 {
              margin: 10px 0 5px;
              font-size: 22px;
            }

            .cabecalho p {
              margin: 4px 0;
              color: #666;
            }

            .linha {
              border-top: 1px dashed #999;
              margin: 15px 0;
            }

            table {
              width: 100%;
              border-collapse: collapse;
            }

            th {
              border-bottom: 1px solid #222;
              padding: 8px 0;
              text-align: left;
            }

            .resumo {
              margin-top: 20px;
            }

            .resumo-linha {
              display: flex;
              justify-content: space-between;
              margin: 7px 0;
            }

            .total {
              font-size: 20px;
              font-weight: bold;
              margin-top: 12px;
            }

            .rodape {
              margin-top: 30px;
              text-align: center;
              font-size: 13px;
              color: #666;
            }

            @media print {
              body {
                padding: 10px;
              }
            }
          </style>
        </head>

        <body>
          <div class="comprovante">

            <div class="cabecalho">
              ${logo}

              <h1>
                ${nomeEmpresa}
              </h1>

              <p>
                Comprovante de Venda
              </p>

              <p>
                Venda: ${numeroVenda}
              </p>

              <p>
                ${dataVenda}
              </p>
            </div>

            <div class="linha"></div>

            <table>
              <thead>
                <tr>
                  <th>Produto</th>
                  <th style="text-align:center;">
                    Qtd.
                  </th>
                  <th style="text-align:right;">
                    Unit.
                  </th>
                  <th style="text-align:right;">
                    Total
                  </th>
                </tr>
              </thead>

              <tbody>
                ${itensHtml}
              </tbody>
            </table>

            <div class="linha"></div>

            <div class="resumo">

              <div class="resumo-linha">
                <span>Subtotal:</span>
                <strong>
                  ${formatarMoeda(subtotal)}
                </strong>
              </div>

              <div class="resumo-linha">
                <span>Desconto:</span>
                <strong>
                  ${formatarMoeda(descontoNumerico)}
                </strong>
              </div>

              <div class="resumo-linha total">
                <span>Total:</span>
                <strong>
                  ${formatarMoeda(total)}
                </strong>
              </div>

              <div class="resumo-linha">
                <span>Pagamento:</span>
                <strong>
                  ${formaPagamento}
                </strong>
              </div>

              ${
                observacao.trim()
                  ? `
                    <div style="margin-top:15px;">
                      <strong>Observação:</strong>
                      <p>
                        ${observacao}
                      </p>
                    </div>
                  `
                  : ""
              }

            </div>

            <div class="rodape">
              Obrigado pela preferência!
            </div>

          </div>

          <script>
            window.onload = function () {
              window.print();

              window.onafterprint = function () {
                window.close();
              };
            };
          </script>

        </body>
      </html>
    `);

    janela.document.close();
  }

  // =========================================================
  // LIMPAR VENDA
  // =========================================================

  function limparVenda() {
    if (carrinho.length === 0) {
      return;
    }

    const confirmar = window.confirm(
      "Deseja realmente limpar a venda atual?"
    );

    if (!confirmar) {
      return;
    }

    setCarrinho([]);
    setDesconto(0);
    setFormaPagamento("DINHEIRO");
    setObservacao("");
    setMensagem("");
  }

  // =========================================================
  // TELA
  // =========================================================

  if (carregando) {
    return (
      <div className="vendas-page">
        <div className="vendas-container">
          <div className="vendas-card">
            <p>Carregando produtos...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="vendas-page">
      <div className="vendas-container">

        {/* =====================================================
            CABEÇALHO
        ====================================================== */}

        <div className="vendas-header">
          <div>
            <h1>Nova Venda</h1>

            <p>
              Registre uma nova venda e atualize o estoque.
            </p>
          </div>

          <button
            type="button"
            className="vendas-voltar"
            onClick={() => navigate("/")}
          >
            ← Voltar
          </button>
        </div>

        {/* =====================================================
            MENSAGEM
        ====================================================== */}

        {mensagem && (
          <div className="mensagem-venda">
            {mensagem}
          </div>
        )}

        {/* =====================================================
            GRID PRINCIPAL
        ====================================================== */}

        <div className="vendas-grid">

          {/* ===================================================
              PRODUTOS
          ==================================================== */}

          <div className="vendas-card">

            <h2>Produtos</h2>

            {/* BUSCA POR CÓDIGO */}

            <form
              className="vendas-busca"
              onSubmit={buscarCodigoBarras}
            >
              <input
                type="text"
                value={codigoBarras}
                onChange={(event) =>
                  setCodigoBarras(event.target.value)
                }
                placeholder="Digite ou leia o código de barras"
                autoFocus
              />

              <button type="submit">
                Buscar
              </button>
            </form>

            {/* BUSCA POR NOME */}

            <div className="vendas-busca">
              <input
                type="text"
                value={busca}
                onChange={(event) =>
                  setBusca(event.target.value)
                }
                placeholder="Pesquisar produto..."
              />
            </div>

            {/* LISTA */}

            {produtosFiltrados.length === 0 ? (
              <div className="sem-produtos">
                Nenhum produto encontrado.
              </div>
            ) : (
              <div className="vendas-produtos">

                {produtosFiltrados.map((produto) => (
                  <div
                    key={produto.id}
                    className="produto-venda"
                    onClick={() =>
                      adicionarProduto(produto)
                    }
                  >
                    <h3>
                      {produto.nome}
                    </h3>

                    <div className="produto-venda-info">

                      <span className="produto-preco">
                        {formatarMoeda(
                          produto.precoVenda
                        )}
                      </span>

                      <span className="produto-estoque">
                        Estoque:{" "}
                        {produto.quantidade}
                      </span>

                    </div>

                    {produto.codigoBarra && (
                      <small>
                        Código:{" "}
                        {produto.codigoBarra}
                      </small>
                    )}

                  </div>
                ))}

              </div>
            )}

          </div>

          {/* ===================================================
              CARRINHO
          ==================================================== */}

          <div className="vendas-card carrinho">

            <h2>
              Carrinho
            </h2>

            {carrinho.length === 0 ? (
              <div className="carrinho-vazio">
                <p>
                  Nenhum produto adicionado.
                </p>

                <p>
                  Clique em um produto para
                  adicioná-lo à venda.
                </p>
              </div>
            ) : (
              <>
                {/* ITENS */}

                {carrinho.map((item) => (
                  <div
                    key={item.id}
                    className="carrinho-item"
                  >

                    <div className="carrinho-item-info">

                      <div className="carrinho-item-nome">
                        {item.nome}
                      </div>

                      <div className="carrinho-item-preco">
                        {formatarMoeda(
                          item.precoUnitario
                        )}{" "}
                        ×{" "}
                        {item.quantidade}
                      </div>

                      <strong>
                        {formatarMoeda(
                          item.precoUnitario *
                            item.quantidade
                        )}
                      </strong>

                    </div>

                    <div className="carrinho-controles">

                      <button
                        type="button"
                        onClick={() =>
                          diminuirQuantidade(item.id)
                        }
                      >
                        −
                      </button>

                      <span className="carrinho-quantidade">
                        {item.quantidade}
                      </span>

                      <button
                        type="button"
                        onClick={() =>
                          aumentarQuantidade(item.id)
                        }
                      >
                        +
                      </button>

                      <button
                        type="button"
                        className="carrinho-remover"
                        onClick={() =>
                          removerItem(item.id)
                        }
                      >
                        ×
                      </button>

                    </div>

                  </div>
                ))}

                {/* DESCONTO */}

                <div className="desconto">

                  <label htmlFor="desconto">
                    Desconto:
                  </label>

                  <input
                    id="desconto"
                    type="number"
                    min="0"
                    step="0.01"
                    value={desconto}
                    onChange={(event) =>
                      setDesconto(event.target.value)
                    }
                  />

                </div>

                {/* PAGAMENTO */}

                <div className="forma-pagamento">

                  <label htmlFor="formaPagamento">
                    Forma de pagamento
                  </label>

                  <select
                    id="formaPagamento"
                    value={formaPagamento}
                    onChange={(event) =>
                      setFormaPagamento(
                        event.target.value
                      )
                    }
                  >
                    <option value="DINHEIRO">
                      Dinheiro
                    </option>

                    <option value="PIX">
                      PIX
                    </option>

                    <option value="CARTAO_CREDITO">
                      Cartão de Crédito
                    </option>

                    <option value="CARTAO_DEBITO">
                      Cartão de Débito
                    </option>

                    <option value="TRANSFERENCIA">
                      Transferência
                    </option>

                    <option value="OUTRO">
                      Outro
                    </option>
                  </select>

                </div>

                {/* OBSERVAÇÃO */}

                <div className="observacao">

                  <label htmlFor="observacao">
                    Observação
                  </label>

                  <textarea
                    id="observacao"
                    value={observacao}
                    onChange={(event) =>
                      setObservacao(
                        event.target.value
                      )
                    }
                    placeholder="Observação da venda..."
                  />

                </div>

                {/* RESUMO */}

                <div className="venda-resumo">

                  <div className="resumo-linha">
                    <span>
                      Subtotal
                    </span>

                    <strong>
                      {formatarMoeda(subtotal)}
                    </strong>
                  </div>

                  <div className="resumo-linha">
                    <span>
                      Desconto
                    </span>

                    <strong>
                      -{" "}
                      {formatarMoeda(
                        descontoNumerico
                      )}
                    </strong>
                  </div>

                  <div className="resumo-linha resumo-total">
                    <span>
                      Total
                    </span>

                    <strong>
                      {formatarMoeda(total)}
                    </strong>
                  </div>

                </div>

                {/* FINALIZAR */}

                <button
                  type="button"
                  className="finalizar-venda"
                  onClick={finalizarVenda}
                  disabled={finalizando}
                >
                  {finalizando
                    ? "Finalizando..."
                    : "Finalizar Venda"}
                </button>

                {/* IMPRIMIR */}

                <button
                  type="button"
                  className="btn-imprimir"
                  onClick={() =>
                    imprimirComprovante()
                  }
                >
                  🖨️ Imprimir Comprovante
                </button>

                {/* LIMPAR */}

                <button
                  type="button"
                  className="btn-imprimir"
                  onClick={limparVenda}
                >
                  Limpar Venda
                </button>

              </>
            )}

          </div>

        </div>

      </div>
    </div>
  );
}