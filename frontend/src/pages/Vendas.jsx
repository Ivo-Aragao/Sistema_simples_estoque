import {
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  useNavigate,
} from "react-router-dom";

import api from "../services/api";

import "./Vendas.css";

export default function Vendas() {
  const navigate =
    useNavigate();

  // =========================================================
  // PRODUTOS / CARRINHO
  // =========================================================

  const [produtos, setProdutos] =
    useState([]);

  const [carrinho, setCarrinho] =
    useState([]);

  // =========================================================
  // BUSCAS
  // =========================================================

  const [busca, setBusca] =
    useState("");

  const [codigoBarras, setCodigoBarras] =
    useState("");

  // =========================================================
  // VENDA
  // =========================================================

  const [desconto, setDesconto] =
    useState(0);

  const [formaPagamento, setFormaPagamento] =
    useState("DINHEIRO");

  const [observacao, setObservacao] =
    useState("");

  const [empresa, setEmpresa] =
    useState(null);

  // =========================================================
  // ESTADOS
  // =========================================================

  const [carregando, setCarregando] =
    useState(true);

  const [finalizando, setFinalizando] =
    useState(false);

  const [mensagem, setMensagem] =
    useState("");

  // =========================================================
  // CAIXA
  // =========================================================

  const [caixa, setCaixa] =
    useState(null);

  const [mostrarAbrirCaixa, setMostrarAbrirCaixa] =
    useState(false);

  const [mostrarFecharCaixa, setMostrarFecharCaixa] =
    useState(false);

  const [saldoInicialCaixa, setSaldoInicialCaixa] =
    useState("");

  const [saldoFinalCaixa, setSaldoFinalCaixa] =
    useState("");

  const [processandoCaixa, setProcessandoCaixa] =
    useState(false);

  // =========================================================
  // CARREGAR DADOS
  // =========================================================

  useEffect(() => {
    carregarDados();
  }, []);

  async function carregarCaixa() {
    try {
      const response =
        await api.get(
          "/caixas/aberto"
        );

      if (
        response.data?.aberto &&
        response.data?.caixa
      ) {
        setCaixa(
          response.data.caixa
        );
      } else {
        setCaixa(null);
      }
    } catch (error) {
      console.error(
        "Erro ao carregar caixa:",
        error
      );

      setCaixa(null);
    }
  }

  async function carregarDados() {
    try {
      setCarregando(true);
      setMensagem("");

      // ------------------------------------------------------
      // PRODUTOS
      // ------------------------------------------------------

      const produtosResponse =
        await api.get(
          "/produtos",
          {
            params: {
              contexto: "venda",
            },
          }
        );

      console.log(
        "RESPOSTA PRODUTOS:",
        produtosResponse.data
      );

      const listaProdutos =
        produtosResponse.data?.itens ||
        [];

      setProdutos(
        Array.isArray(
          listaProdutos
        )
          ? listaProdutos
          : []
      );

      // ------------------------------------------------------
      // EMPRESA
      // ------------------------------------------------------

      try {
        const empresaResponse =
          await api.get(
            "/empresa"
          );

        setEmpresa(
          empresaResponse.data ||
          null
        );
      } catch (empresaError) {
        console.warn(
          "Não foi possível carregar a empresa:",
          empresaError
        );

        setEmpresa(null);
      }

      // ------------------------------------------------------
      // CAIXA
      // ------------------------------------------------------

      await carregarCaixa();
    } catch (error) {
      console.error(
        "Erro ao carregar produtos:",
        error
      );

      setMensagem(
        error.response?.data?.error ||
          "Não foi possível carregar os produtos."
      );
    } finally {
      setCarregando(false);
    }
  }

  // =========================================================
  // PRODUTOS FILTRADOS
  // =========================================================

  const produtosFiltrados =
    useMemo(() => {
      const termo =
        busca
          .trim()
          .toLowerCase();

      if (!termo) {
        return produtos;
      }

      return produtos.filter(
        (produto) => {
          const nome =
            String(
              produto.nome ||
                ""
            ).toLowerCase();

          const codigo =
            String(
              produto.codigoBarra ||
                ""
            ).toLowerCase();

          return (
            nome.includes(
              termo
            ) ||
            codigo.includes(
              termo
            )
          );
        }
      );
    }, [produtos, busca]);

  // =========================================================
  // VALORES
  // =========================================================

  const subtotal =
    useMemo(() => {
      return carrinho.reduce(
        (total, item) => {
          return (
            total +
            item.quantidade *
              item.precoUnitario
          );
        },
        0
      );
    }, [carrinho]);

  const descontoNumerico =
    useMemo(() => {
      const valor =
        Number(desconto);

      if (
        !Number.isFinite(
          valor
        ) ||
        valor < 0
      ) {
        return 0;
      }

      return valor;
    }, [desconto]);

  const total =
    useMemo(() => {
      return Math.max(
        0,
        subtotal -
          descontoNumerico
      );
    }, [
      subtotal,
      descontoNumerico,
    ]);

  // =========================================================
  // FORMATAÇÃO
  // =========================================================

  function formatarMoeda(
    valor
  ) {
    return Number(
      valor || 0
    ).toLocaleString(
      "pt-BR",
      {
        style:
          "currency",

        currency:
          "BRL",
      }
    );
  }

  // =========================================================
  // ADICIONAR PRODUTO
  // =========================================================

  function adicionarProduto(
    produto
  ) {
    if (!produto) {
      return;
    }

    if (
      Number(
        produto.quantidade || 0
      ) <= 0
    ) {
      alert(
        "Este produto está sem estoque."
      );

      return;
    }

    setMensagem("");

    setCarrinho(
      (atual) => {
        const existente =
          atual.find(
            (item) =>
              item.id ===
              produto.id
          );

        if (existente) {
          if (
            existente.quantidade >=
            Number(
              produto.quantidade ||
                0
            )
          ) {
            alert(
              `Estoque máximo disponível: ${produto.quantidade}.`
            );

            return atual;
          }

          return atual.map(
            (item) => {
              if (
                item.id !==
                produto.id
              ) {
                return item;
              }

              return {
                ...item,

                quantidade:
                  item.quantidade +
                  1,
              };
            }
          );
        }

        return [
          ...atual,

          {
            id:
              produto.id,

            nome:
              produto.nome,

            codigoBarra:
              produto.codigoBarra,

            quantidade:
              1,

            estoqueDisponivel:
              Number(
                produto.quantidade ||
                  0
              ),

            precoUnitario:
              Number(
                produto.precoVenda ||
                  0
              ),
          },
        ];
      }
    );
  }

  // =========================================================
  // AUMENTAR QUANTIDADE
  // =========================================================

  function aumentarQuantidade(
    itemId
  ) {
    setCarrinho(
      (atual) => {
        return atual.map(
          (item) => {
            if (
              item.id !==
              itemId
            ) {
              return item;
            }

            if (
              item.quantidade >=
              item.estoqueDisponivel
            ) {
              alert(
                `Estoque máximo disponível: ${item.estoqueDisponivel}.`
              );

              return item;
            }

            return {
              ...item,

              quantidade:
                item.quantidade +
                1,
            };
          }
        );
      }
    );
  }

  // =========================================================
  // DIMINUIR QUANTIDADE
  // =========================================================

  function diminuirQuantidade(
    itemId
  ) {
    setCarrinho(
      (atual) => {
        return atual
          .map(
            (item) => {
              if (
                item.id !==
                itemId
              ) {
                return item;
              }

              return {
                ...item,

                quantidade:
                  item.quantidade -
                  1,
              };
            }
          )
          .filter(
            (item) =>
              item.quantidade >
              0
          );
      }
    );
  }

  // =========================================================
  // REMOVER ITEM
  // =========================================================

  function removerItem(
    itemId
  ) {
    setCarrinho(
      (atual) =>
        atual.filter(
          (item) =>
            item.id !==
            itemId
        )
    );
  }

  // =========================================================
  // BUSCAR CÓDIGO DE BARRAS
  // =========================================================

  function buscarCodigoBarras(
    event
  ) {
    event.preventDefault();

    const codigo =
      codigoBarras.trim();

    if (!codigo) {
      return;
    }

    const produto =
      produtos.find(
        (item) =>
          String(
            item.codigoBarra ||
              ""
          ).trim() ===
          codigo
      );

    if (!produto) {
      alert(
        "Produto não encontrado."
      );

      setCodigoBarras("");

      return;
    }

    adicionarProduto(
      produto
    );

    setCodigoBarras("");
  }

  // =========================================================
  // ABRIR CAIXA
  // =========================================================

  async function abrirCaixa() {
    try {
      setProcessandoCaixa(
        true
      );

      const valor =
        Number(
          String(
            saldoInicialCaixa
          ).replace(
            ",",
            "."
          )
        );

      if (
        !Number.isFinite(
          valor
        ) ||
        valor < 0
      ) {
        alert(
          "Informe um saldo inicial válido."
        );

        return;
      }

      const response =
        await api.post(
          "/caixas/abrir",
          {
            saldoInicial:
              valor,
          },
        );

      setCaixa(
        response.data.caixa
      );

      setMostrarAbrirCaixa(
        false
      );

      setSaldoInicialCaixa(
        ""
      );

      setMensagem(
        "Caixa aberto com sucesso."
      );
    } catch (error) {
      console.error(
        "Erro ao abrir caixa:",
        error
      );

      alert(
        error.response?.data?.error ||
        "Não foi possível abrir o caixa."
      );
    } finally {
      setProcessandoCaixa(
        false
      );
    }
  }

  // =========================================================
  // FECHAR CAIXA
  // =========================================================

  async function fecharCaixa() {
    try {
      setProcessandoCaixa(
        true
      );

      const valor =
        Number(
          String(
            saldoFinalCaixa
          ).replace(
            ",",
            "."
          )
        );

      if (
        !Number.isFinite(
          valor
        ) ||
        valor < 0
      ) {
        alert(
          "Informe o dinheiro contado no caixa."
        );

        return;
      }

      const response =
        await api.post(
          "/caixas/fechar",
          {
            saldoFinal:
              valor,
          },
        );

      const resultado =
        response.data.caixa;

      alert(
        `Caixa fechado.\n\n` +
        `Esperado: ${formatarMoeda(
          resultado.saldoEsperado
        )}\n` +
        `Contado: ${formatarMoeda(
          resultado.saldoFinal
        )}\n` +
        `Diferença: ${formatarMoeda(
          resultado.diferenca
        )}`
      );

      setCaixa(null);

      setSaldoFinalCaixa(
        ""
      );

      setMostrarFecharCaixa(
        false
      );

      setMensagem(
        "Caixa fechado com sucesso."
      );
    } catch (error) {
      console.error(
        "Erro ao fechar caixa:",
        error
      );

      alert(
        error.response?.data?.error ||
        "Não foi possível fechar o caixa."
      );
    } finally {
      setProcessandoCaixa(
        false
      );
    }
  }

  // =========================================================
  // FINALIZAR VENDA
  // =========================================================

  async function finalizarVenda() {
    // ------------------------------------------------------
    // CAIXA
    // ------------------------------------------------------

    if (!caixa?.id) {
      setMostrarAbrirCaixa(
        true
      );

      return;
    }

    // ------------------------------------------------------
    // CARRINHO
    // ------------------------------------------------------

    if (
      carrinho.length === 0
    ) {
      alert(
        "Adicione pelo menos um produto à venda."
      );

      return;
    }

    // ------------------------------------------------------
    // PAGAMENTO
    // ------------------------------------------------------

    if (!formaPagamento) {
      alert(
        "Selecione a forma de pagamento."
      );

      return;
    }

    // ------------------------------------------------------
    // DESCONTO
    // ------------------------------------------------------

    if (
      descontoNumerico >
      subtotal
    ) {
      alert(
        "O desconto não pode ser maior que o subtotal."
      );

      return;
    }

    try {
      setFinalizando(
        true
      );

      setMensagem("");

      const payload = {
        itens:
          carrinho.map(
            (item) => ({
              produtoId:
                item.id,

              quantidade:
                item.quantidade,

              precoUnitario:
                item.precoUnitario,
            })
          ),

        desconto:
          descontoNumerico,

        formaPagamento,

        observacao:
          observacao.trim() ||
          null,
      };

      const response =
        await api.post(
          "/vendas",
          payload
        );

      const vendaCriada =
        response.data?.venda ||
        response.data;

      setMensagem(
        "Venda finalizada com sucesso!"
      );

      imprimirComprovante(
        vendaCriada
      );

      setCarrinho([]);

      setDesconto(0);

      setFormaPagamento(
        "DINHEIRO"
      );

      setObservacao("");

      await carregarDados();
    } catch (error) {
      console.error(
        "Erro ao finalizar venda:",
        error
      );

      const erro =
        error.response?.data?.error ||
        error.response?.data?.message ||
        "Não foi possível finalizar a venda.";

      setMensagem(
        erro
      );

      alert(
        erro
      );
    } finally {
      setFinalizando(
        false
      );
    }
  }

  // =========================================================
// AÇÕES DOS ATALHOS
// =========================================================

function executarAtalhoF2() {
  document
    .getElementById("codigoBarras")
    ?.focus();
}

function executarAtalhoF3() {
  document
    .getElementById("buscaProduto")
    ?.focus();
}

function executarAtalhoF4() {
  if (
    mostrarAbrirCaixa ||
    mostrarFecharCaixa
  ) {
    return;
  }

  if (caixa) {
    setMostrarFecharCaixa(true);
  } else {
    setMostrarAbrirCaixa(true);
  }
}

function executarAtalhoF8() {
  if (
    mostrarAbrirCaixa ||
    mostrarFecharCaixa
  ) {
    return;
  }

  if (
    caixa &&
    carrinho.length > 0 &&
    !finalizando
  ) {
    finalizarVenda();
  }
}

function executarAtalhoF9() {
  if (
    mostrarAbrirCaixa ||
    mostrarFecharCaixa
  ) {
    return;
  }

  limparVenda();
}

function executarAtalhoEscape() {
  setMostrarAbrirCaixa(false);
  setMostrarFecharCaixa(false);
}
 // =========================================================
// ATALHOS DO TECLADO
// =========================================================

useEffect(() => {
  function handleTeclado(event) {
    // Evita interferir em atalhos do navegador,
    // sistema operacional ou Ctrl/Alt/Command.
    if (
      event.ctrlKey ||
      event.altKey ||
      event.metaKey
    ) {
      return;
    }

    // Evita disparar repetidamente quando
    // a tecla fica pressionada.
    if (event.repeat) {
      return;
    }

    switch (event.key) {
      // ===============================================
      // F2
      // ===============================================

      case "F2":
        event.preventDefault();
        executarAtalhoF2();
        break;

      // ===============================================
      // F3
      // ===============================================

      case "F3":
        event.preventDefault();
        executarAtalhoF3();
        break;

      // ===============================================
      // F4
      // ===============================================

      case "F4":
        event.preventDefault();
        executarAtalhoF4();
        break;

      // ===============================================
      // F8
      // ===============================================

      case "F8":
        event.preventDefault();
        executarAtalhoF8();
        break;

      // ===============================================
      // F9
      // ===============================================

      case "F9":
        event.preventDefault();
        executarAtalhoF9();
        break;

      // ===============================================
      // ESC
      // ===============================================

      case "Escape":
        event.preventDefault();
        executarAtalhoEscape();
        break;

      default:
        break;
    }
  }

  window.addEventListener(
    "keydown",
    handleTeclado
  );

  return () => {
    window.removeEventListener(
      "keydown",
      handleTeclado
    );
  };
}, [
  caixa,
  carrinho,
  mostrarAbrirCaixa,
  mostrarFecharCaixa,
  finalizando,
  descontoNumerico,
  subtotal,
  formaPagamento,
  observacao,
]);

  // =========================================================
  // IMPRIMIR COMPROVANTE
  // =========================================================

  function imprimirComprovante(
    venda = null
  ) {
    const numeroVenda =
      venda?.codigo ||
      venda?.id ||
      "NÃO INFORMADO";

    const dataVenda =
      new Date().toLocaleString(
        "pt-BR"
      );

    const nomeEmpresa =
      empresa?.nome ||
      "Sistema de Estoque";

    const logo =
      empresa?.logoUrl
        ? `<img src="${empresa.logoUrl}" alt="Logo" style="max-width:160px;max-height:80px;object-fit:contain;" />`
        : "";

    const itensHtml =
      carrinho
        .map(
          (item) => {
            const subtotalItem =
              item.quantidade *
              item.precoUnitario;

            return `
              <tr>
                <td style="padding:6px 0;">
                  ${item.nome}
                </td>

                <td style="padding:6px 0;text-align:center;">
                  ${item.quantidade}
                </td>

                <td style="padding:6px 0;text-align:right;">
                  ${formatarMoeda(
                    item.precoUnitario
                  )}
                </td>

                <td style="padding:6px 0;text-align:right;">
                  ${formatarMoeda(
                    subtotalItem
                  )}
                </td>
              </tr>
            `;
          }
        )
        .join("");

    const janela =
      window.open(
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
                <span>
                  Subtotal:
                </span>

                <strong>
                  ${formatarMoeda(
                    subtotal
                  )}
                </strong>
              </div>

              <div class="resumo-linha">
                <span>
                  Desconto:
                </span>

                <strong>
                  ${formatarMoeda(
                    descontoNumerico
                  )}
                </strong>
              </div>

              <div class="resumo-linha total">
                <span>
                  Total:
                </span>

                <strong>
                  ${formatarMoeda(
                    total
                  )}
                </strong>
              </div>

              <div class="resumo-linha">
                <span>
                  Pagamento:
                </span>

                <strong>
                  ${formaPagamento}
                </strong>
              </div>

              ${
                observacao.trim()
                  ? `
                    <div style="margin-top:15px;">
                      <strong>
                        Observação:
                      </strong>

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

              window.onafterprint =
                function () {
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
    if (
      carrinho.length === 0
    ) {
      return;
    }

    const confirmar =
      window.confirm(
        "Deseja realmente limpar a venda atual?"
      );

    if (!confirmar) {
      return;
    }

    setCarrinho([]);

    setDesconto(
      0
    );

    setFormaPagamento(
      "DINHEIRO"
    );

    setObservacao(
      ""
    );

    setMensagem(
      ""
    );
  }

  // =========================================================
  // CARREGANDO
  // =========================================================

  if (carregando) {
    return (
      <div className="vendas-page">
        <div className="vendas-container">
          <div className="vendas-card">
            <p>
              Carregando produtos...
            </p>
          </div>
        </div>
      </div>
    );
  }

  // =========================================================
  // TELA
  // =========================================================

  return (
    <div className="vendas-page">

      {empresa?.logoUrl && (
        <div
          className="vendas-logo-fundo"
          aria-hidden="true"
        >
          <img
            src={empresa.logoUrl}
            alt=""
          />
        </div>
      )}

      <div className="vendas-container">

        {/* ===================================================
            CABEÇALHO
        ==================================================== */}

        <div className="vendas-header">
          <div>
            <h1>
              Nova Venda
            </h1>

            <p>
              Registre uma nova venda e atualize o estoque.
            </p>
          </div>

          <div
            style={{
              display:
                "flex",

              alignItems:
                "center",

              gap:
                "10px",
            }}
          >
            {/* STATUS DO CAIXA */}

            <div
              style={{
                padding:
                  "10px 14px",

                borderRadius:
                  "8px",

                background:
                  caixa
                    ? "#e8f5e9"
                    : "#ffebee",

                border:
                  caixa
                    ? "1px solid #81c784"
                    : "1px solid #ef9a9a",

                fontWeight:
                  600,
              }}
            >
              {caixa
                ? `Caixa aberto${
                    caixa.numero
                      ? ` #${caixa.numero}`
                      : ` #${caixa.id}`
                  }`
                : "Caixa fechado"}
            </div>

            {/* BOTÃO CAIXA */}

            <button
              type="button"
              className="vendas-voltar"
              onClick={() => {
                if (caixa) {
                  setMostrarFecharCaixa(
                    true
                  );
                } else {
                  setMostrarAbrirCaixa(
                    true
                  );
                }
              }}
            >
              {caixa
                ? "Fechar Caixa"
                : "Abrir Caixa"}
            </button>

            {/* VOLTAR */}

            <button
              type="button"
              className="vendas-voltar"
              onClick={() =>
                navigate("/")
              }
            >
              ← Voltar
            </button>
          </div>
        </div>



              {/* =====================================================
    ATALHOS
====================================================== */}

<div className="atalhos-vendas">
  <div className="atalhos-vendas-titulo">
    Atalhos:
  </div>

  <button
    type="button"
    className="atalho-venda"
    onClick={executarAtalhoF2}
    title="Focar código de barras"
  >
    <span className="atalho-tecla">
      F2
    </span>

    <span>
      Código de barras
    </span>
  </button>

  <button
    type="button"
    className="atalho-venda"
    onClick={executarAtalhoF3}
    title="Focar busca de produto"
  >
    <span className="atalho-tecla">
      F3
    </span>

    <span>
      Buscar produto
    </span>
  </button>

  <button
    type="button"
    className="atalho-venda"
    onClick={executarAtalhoF4}
    title={
      caixa
        ? "Abrir fechamento do caixa"
        : "Abrir caixa"
    }
  >
    <span className="atalho-tecla">
      F4
    </span>

    <span>
      {caixa
        ? "Fechar caixa"
        : "Abrir caixa"}
    </span>
  </button>

  <button
    type="button"
    className="atalho-venda"
    onClick={executarAtalhoF8}
    disabled={
      !caixa ||
      carrinho.length === 0 ||
      finalizando
    }
    title={
      !caixa
        ? "Abra o caixa primeiro"
        : carrinho.length === 0
          ? "Adicione um produto"
          : "Finalizar venda"
    }
  >
    <span className="atalho-tecla">
      F8
    </span>

    <span>
      Finalizar venda
    </span>
  </button>

  <button
    type="button"
    className="atalho-venda"
    onClick={executarAtalhoF9}
    disabled={
      carrinho.length === 0
    }
    title="Limpar venda"
  >
    <span className="atalho-tecla">
      F9
    </span>

    <span>
      Limpar venda
    </span>
  </button>

  <button
    type="button"
    className="atalho-venda"
    onClick={executarAtalhoEscape}
    disabled={
      !mostrarAbrirCaixa &&
      !mostrarFecharCaixa
    }
    title="Fechar janela de caixa"
  >
    <span className="atalho-tecla">
      Esc
    </span>

    <span>
      Fechar
    </span>
  </button>
</div>
        {/* ===================================================
            MENSAGEM
        ==================================================== */}

        {mensagem && (
          <div className="mensagem-venda">
            {mensagem}
          </div>
        )}

        {/* ===================================================
            GRID PRINCIPAL
        ==================================================== */}

        <div className="vendas-grid">

          {/* =================================================
              PRODUTOS
          ================================================== */}

          <div className="vendas-card">

            <h2>
              Produtos
            </h2>

            {/* BUSCA POR CÓDIGO */}

            <form
              className="vendas-busca"
              onSubmit={
                buscarCodigoBarras
              }
            >
              <input
                id="codigoBarras"
                type="text"
                value={
                  codigoBarras
                }
                onChange={(
                  event
                ) =>
                  setCodigoBarras(
                    event.target
                      .value
                  )
                }
                placeholder="Digite ou leia o código de barras"
                autoFocus
              />

              <button
                type="submit"
              >
                Buscar
              </button>
            </form>

            {/* BUSCA POR NOME */}

            <div className="vendas-busca">
              <input
                id="buscaProduto"
                type="text"
                value={busca}
                onChange={(
                  event
                ) =>
                  setBusca(
                    event.target
                      .value
                  )
                }
                placeholder="Pesquisar produto..."
              />
            </div>

            {/* LISTA */}

            {produtosFiltrados.length ===
            0 ? (
              <div className="sem-produtos">
                Nenhum produto encontrado.
              </div>
            ) : (
              <div className="vendas-produtos">

                {produtosFiltrados.map(
                  (produto) => (
                    <div
                      key={
                        produto.id
                      }
                      className="produto-venda"
                      onClick={() =>
                        adicionarProduto(
                          produto
                        )
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
                          {
                            produto.quantidade
                          }
                        </span>

                      </div>

                      {produto.codigoBarra && (
                        <small>
                          Código:{" "}
                          {
                            produto.codigoBarra
                          }
                        </small>
                      )}

                    </div>
                  )
                )}

              </div>
            )}

          </div>

          {/* =================================================
              CARRINHO
          ================================================== */}

          <div className="vendas-card carrinho">

            <h2>
              Carrinho
            </h2>

            {carrinho.length ===
            0 ? (
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

                {carrinho.map(
                  (item) => (
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
                          {
                            item.quantidade
                          }
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
                            diminuirQuantidade(
                              item.id
                            )
                          }
                        >
                          −
                        </button>

                        <span className="carrinho-quantidade">
                          {
                            item.quantidade
                          }
                        </span>

                        <button
                          type="button"
                          onClick={() =>
                            aumentarQuantidade(
                              item.id
                            )
                          }
                        >
                          +
                        </button>

                        <button
                          type="button"
                          className="carrinho-remover"
                          onClick={() =>
                            removerItem(
                              item.id
                            )
                          }
                        >
                          ×
                        </button>

                      </div>

                    </div>
                  )
                )}

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
                    value={
                      desconto
                    }
                    onChange={(
                      event
                    ) =>
                      setDesconto(
                        event.target
                          .value
                      )
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
                    value={
                      formaPagamento
                    }
                    onChange={(
                      event
                    ) =>
                      setFormaPagamento(
                        event.target
                          .value
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
                    value={
                      observacao
                    }
                    onChange={(
                      event
                    ) =>
                      setObservacao(
                        event.target
                          .value
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
                      {formatarMoeda(
                        subtotal
                      )}
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
                      {formatarMoeda(
                        total
                      )}
                    </strong>
                  </div>

                </div>

                {/* FINALIZAR */}

                <button
                  type="button"
                  className="finalizar-venda"
                  onClick={
                    finalizarVenda
                  }
                  disabled={
                    finalizando ||
                    !caixa
                  }
                >
                  {finalizando
                    ? "Finalizando..."
                    : !caixa
                      ? "Abra o Caixa"
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
                  onClick={
                    limparVenda
                  }
                >
                  Limpar Venda
                </button>

              </>
            )}

          </div>

        </div>

      </div>

      {/* =====================================================
          MODAL ABRIR CAIXA
      ====================================================== */}

      {mostrarAbrirCaixa && ( <div className="caixa-modal-overlay" role="dialog" aria-modal="true" aria-labelledby="tituloAbrirCaixa" > <div className="caixa-modal"> <h2 id="tituloAbrirCaixa"> Abrir Caixa </h2> <p> Informe o dinheiro inicial disponível no caixa. </p> <div className="caixa-modal-campo"> <label htmlFor="saldoInicialCaixa"> Saldo inicial </label> <input id="saldoInicialCaixa" type="text" inputMode="decimal" value={saldoInicialCaixa} onChange={(event) => setSaldoInicialCaixa( event.target.value ) } placeholder="0,00" autoFocus /> </div> <div className="caixa-modal-acoes"> <button type="button" className="caixa-modal-botao" onClick={() => setMostrarAbrirCaixa(false) } disabled={processandoCaixa} > Cancelar </button> <button type="button" className="caixa-modal-botao principal" onClick={abrirCaixa} disabled={processandoCaixa} > {processandoCaixa ? "Abrindo..." : "Abrir Caixa"} </button> </div> </div> </div> )}

      {/* =====================================================
          MODAL FECHAR CAIXA
      ====================================================== */}

      {mostrarFecharCaixa && caixa && ( <div className="caixa-modal-overlay" role="dialog" aria-modal="true" aria-labelledby="tituloFecharCaixa" > <div className="caixa-modal"> <h2 id="tituloFecharCaixa"> Fechar Caixa </h2> <p> Conte o dinheiro físico disponível no caixa e informe o valor abaixo. </p> <div className="caixa-modal-info"> <div className="caixa-modal-linha"> <span className="caixa-modal-label"> Caixa </span> <strong className="caixa-modal-valor"> {caixa.numero ? `#${caixa.numero}` : `#${caixa.id}`} </strong> </div> {caixa.saldoInicial !== undefined && ( <div className="caixa-modal-linha"> <span className="caixa-modal-label"> Saldo inicial </span> <strong className="caixa-modal-valor"> {formatarMoeda( caixa.saldoInicial )} </strong> </div> )} {caixa.saldoEsperado !== undefined && ( <div className="caixa-modal-linha"> <span className="caixa-modal-label"> Saldo esperado </span> <strong className="caixa-modal-valor"> {formatarMoeda( caixa.saldoEsperado )} </strong> </div> )} </div> <div className="caixa-modal-campo"> <label htmlFor="saldoFinalCaixa"> Dinheiro contado </label> <input id="saldoFinalCaixa" type="text" inputMode="decimal" value={saldoFinalCaixa} onChange={(event) => setSaldoFinalCaixa( event.target.value ) } placeholder="0,00" autoFocus /> </div> <div className="caixa-modal-acoes"> <button type="button" className="caixa-modal-botao" onClick={() => setMostrarFecharCaixa(false) } disabled={processandoCaixa} > Cancelar </button> <button type="button" className="caixa-modal-botao principal" onClick={fecharCaixa} disabled={processandoCaixa} > {processandoCaixa ? "Fechando..." : "Fechar Caixa"} </button> </div> </div> </div> )}

    </div>
  );
}