import {
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import {
  useNavigate,
  useParams,
} from "react-router-dom";

import api from "../services/api";
import socket from "../services/socket";
import "./Comanda.css";

// ============================================================
// AUXILIARES
// ============================================================

function arredondar(valor) {
  return (
    Math.round(
      (Number(valor) || 0) * 100
    ) / 100
  );
}

function formatarMoeda(valor) {
  return Number(
    valor || 0
  ).toLocaleString(
    "pt-BR",
    {
      style: "currency",
      currency: "BRL",
    }
  );
}

// ============================================================
// CALCULAR RESUMO LOCAL
// ============================================================

function calcularResumoLocal(
  comanda
) {
  const itens =
    Array.isArray(
      comanda?.itens
    )
      ? comanda.itens
      : [];

  const pagamentos =
    Array.isArray(
      comanda?.pagamentos
    )
      ? comanda.pagamentos
      : [];

  const subtotal =
    arredondar(
      itens.reduce(
        (
          total,
          item
        ) => {
          if (
            item.cobrar ===
            false
          ) {
            return total;
          }

          return (
            total +
            Number(
              item.subtotal ||
                0
            )
          );
        },
        0
      )
    );

  const taxaServicoPercentual =
    comanda
      ?.taxaServicoAtiva
      ? Number(
          comanda.taxaServicoPercentual ||
            0
        )
      : 0;

  const taxaServico =
    comanda
      ?.taxaServicoAtiva
      ? arredondar(
          subtotal *
            (
              taxaServicoPercentual /
              100
            )
        )
      : 0;

  const total =
    arredondar(
      subtotal +
        taxaServico
    );

  const totalPago =
    arredondar(
      pagamentos.reduce(
        (
          totalAtual,
          pagamento
        ) => {
          if (
            pagamento.status &&
            pagamento.status !==
              "PAGO"
          ) {
            return totalAtual;
          }

          return (
            totalAtual +
            Number(
              pagamento.valor ||
                0
            )
          );
        },
        0
      )
    );

  const restante =
    arredondar(
      Math.max(
        0,
        total -
          totalPago
      )
    );

  return {
    subtotal,
    taxaServicoPercentual,
    taxaServico,
    total,
    totalPago,
    restante,
  };
}

// ============================================================
// COMPONENTE
// ============================================================

export default function Comanda() {
  const { id } =
    useParams();

  const navigate =
    useNavigate();

  // ==========================================================
  // REF PARA EVITAR GETs SIMULTÂNEOS
  // ==========================================================

  const carregamentoComandaRef =
    useRef(null);

  // ==========================================================
  // ESTADOS
  // ==========================================================

  const [
    comanda,
    setComanda,
  ] = useState(null);

  const [
    produtos,
    setProdutos,
  ] = useState([]);

  const [
    busca,
    setBusca,
  ] = useState("");

  const [
    quantidades,
    setQuantidades,
  ] = useState({});

  const [
    carregando,
    setCarregando,
  ] = useState(true);

  const [
    salvando,
    setSalvando,
  ] = useState(false);

  // ==========================================================
  // PAGAMENTO
  // ==========================================================

  const [
    mostrarPagamento,
    setMostrarPagamento,
  ] = useState(false);

  const [
    formaPagamento,
    setFormaPagamento,
  ] = useState("DINHEIRO");

  const [
    valorPagamento,
    setValorPagamento,
  ] = useState("");

  const [
    processandoPagamento,
    setProcessandoPagamento,
  ] = useState(false);

  // ==========================================================
  // ATUALIZAR RESUMO
  // ==========================================================

  function aplicarResumo(
    comandaBase
  ) {
    return {
      ...comandaBase,

      resumo:
        calcularResumoLocal(
          comandaBase
        ),
    };
  }

  // ==========================================================
  // ATUALIZAR ITEM LOCALMENTE
  // ==========================================================

  function atualizarItemLocal(
    itemAtualizado
  ) {
    setComanda(
      (estadoAtual) => {
        if (!estadoAtual) {
          return estadoAtual;
        }

        const itens =
          Array.isArray(
            estadoAtual.itens
          )
            ? estadoAtual.itens
            : [];

        const existe =
          itens.some(
            (item) =>
              Number(
                item.id
              ) ===
              Number(
                itemAtualizado.id
              )
          );

        let novosItens;

        if (existe) {
          novosItens =
            itens.map(
              (item) =>
                Number(
                  item.id
                ) ===
                Number(
                  itemAtualizado.id
                )
                  ? {
                      ...item,
                      ...itemAtualizado,
                    }
                  : item
            );
        } else {
          novosItens = [
            ...itens,
            itemAtualizado,
          ];
        }

        return aplicarResumo({
          ...estadoAtual,
          itens:
            novosItens,
        });
      }
    );
  }

  // ==========================================================
  // ADICIONAR ITEM LOCALMENTE
  // ==========================================================

  function adicionarItemLocal(
    itemNovo
  ) {
    setComanda(
      (estadoAtual) => {
        if (!estadoAtual) {
          return estadoAtual;
        }

        const itens =
          Array.isArray(
            estadoAtual.itens
          )
            ? estadoAtual.itens
            : [];

        const existe =
          itens.some(
            (item) =>
              Number(
                item.id
              ) ===
              Number(
                itemNovo.id
              )
          );

        if (existe) {
          return estadoAtual;
        }

        return aplicarResumo({
          ...estadoAtual,

          itens: [
            ...itens,
            itemNovo,
          ],
        });
      }
    );
  }

  // ==========================================================
  // REMOVER ITEM LOCALMENTE
  // ==========================================================

  function removerItemLocal(
    itemId
  ) {
    setComanda(
      (estadoAtual) => {
        if (!estadoAtual) {
          return estadoAtual;
        }

        const novosItens =
          (
            estadoAtual.itens ||
            []
          ).filter(
            (item) =>
              Number(
                item.id
              ) !==
              Number(itemId)
          );

        return aplicarResumo({
          ...estadoAtual,
          itens:
            novosItens,
        });
      }
    );
  }

  // ==========================================================
  // ATUALIZAR PAGAMENTO LOCALMENTE
  // ==========================================================

  function atualizarPagamentoLocal(
    pagamento,
    resumo
  ) {
    setComanda(
      (estadoAtual) => {
        if (!estadoAtual) {
          return estadoAtual;
        }

        const pagamentos =
          Array.isArray(
            estadoAtual.pagamentos
          )
            ? estadoAtual.pagamentos
            : [];

        const existe =
          pagamentos.some(
            (item) =>
              Number(
                item.id
              ) ===
              Number(
                pagamento?.id
              )
          );

        const novosPagamentos =
          existe
            ? pagamentos.map(
                (item) =>
                  Number(
                    item.id
                  ) ===
                  Number(
                    pagamento?.id
                  )
                    ? {
                        ...item,
                        ...pagamento,
                      }
                    : item
              )
            : [
                ...pagamentos,
                pagamento,
              ];

        return {
          ...estadoAtual,

          pagamentos:
            novosPagamentos,

          resumo: {
            ...estadoAtual.resumo,

            ...(resumo ||
              {}),
          },
        };
      }
    );
  }

  // ==========================================================
  // CARREGAR COMANDA
  // ==========================================================

  async function carregarComanda() {
    if (
      carregamentoComandaRef.current
    ) {
      return carregamentoComandaRef.current;
    }

    const promessa =
      (async () => {
        try {
          const response =
            await api.get(
              `/comandas/${id}`,
              {
                timeout: 10000,
              }
            );

          setComanda(
            response.data
          );

          return response.data;
        } catch (error) {
          console.error(
            "[COMANDA] Erro ao carregar:",
            error
          );

          alert(
            error.response
              ?.data?.error ||
              "Não foi possível carregar a comanda."
          );

          navigate(
            "/mesas"
          );

          return null;
        } finally {
          carregamentoComandaRef.current =
            null;
        }
      })();

    carregamentoComandaRef.current =
      promessa;

    return promessa;
  }

  // ==========================================================
  // CARREGAR PRODUTOS
  // ==========================================================

  async function carregarProdutos() {
    try {
      const response =
        await api.get(
          "/produtos",
          {
            params: {
              contexto:
                "comanda",
            },

            timeout: 10000,
          }
        );

      const lista =
        response.data?.itens ||
        response.data?.produtos ||
        response.data?.data ||
        response.data ||
        [];

      setProdutos(
        Array.isArray(lista)
          ? lista.filter(
              (produto) =>
                produto.ativo !==
                  false &&
                produto.disponivelComanda !==
                  false
            )
          : []
      );

      return true;
    } catch (error) {
      console.error(
        "[PRODUTOS] Erro ao carregar:",
        error
      );

      setProdutos([]);

      return false;
    }
  }

  // ==========================================================
  // CARREGAR DADOS
  // ==========================================================

  async function carregarDados() {
    setCarregando(true);

    try {
      const comandaCarregada =
        await carregarComanda();

      if (!comandaCarregada) {
        return;
      }

      // Produtos podem carregar em paralelo com outras
      // atualizações futuras sem bloquear a comanda.
      await carregarProdutos();
    } catch (error) {
      console.error(
        "[COMANDA] Erro em carregarDados:",
        error
      );
    } finally {
      setCarregando(false);
    }
  }

  // ==========================================================
  // CARREGAMENTO INICIAL
  // ==========================================================

  useEffect(() => {
    if (!id) {
      setCarregando(false);

      alert(
        "ID da comanda não informado."
      );

      navigate(
        "/mesas"
      );

      return;
    }

    carregarDados();
  }, [id]);

  // ==========================================================
  // SOCKET.IO
  // ==========================================================

  useEffect(() => {
    function atualizarComanda(
      dados
    ) {
      if (
        dados?.comandaId ==
        null
      ) {
        return;
      }

      if (
        Number(
          dados.comandaId
        ) !==
        Number(id)
      ) {
        return;
      }

      setComanda(
        (estadoAtual) => {
          if (!estadoAtual) {
            return estadoAtual;
          }

          const novoEstado = {
            ...estadoAtual,
          };

          if (
            dados.taxaServicoAtiva !==
            undefined
          ) {
            novoEstado.taxaServicoAtiva =
              dados.taxaServicoAtiva;
          }

          if (
            dados.taxaServicoPercentual !==
            undefined
          ) {
            novoEstado.taxaServicoPercentual =
              dados.taxaServicoPercentual;
          }

          const resumoAtual =
            estadoAtual.resumo ||
            {};

          novoEstado.resumo = {
            ...resumoAtual,

            ...(dados.subtotal !==
            undefined
              ? {
                  subtotal:
                    dados.subtotal,
                }
              : {}),

            ...(dados.taxaServico !==
            undefined
              ? {
                  taxaServico:
                    dados.taxaServico,
                }
              : {}),

            ...(dados.total !==
            undefined
              ? {
                  total:
                    dados.total,
                }
              : {}),

            ...(dados.totalPago !==
            undefined
              ? {
                  totalPago:
                    dados.totalPago,
                }
              : {}),

            ...(dados.restante !==
            undefined
              ? {
                  restante:
                    dados.restante,
                }
              : {}),
          };

          return novoEstado;
        }
      );
    }

    function atualizarItemSocket(
      dados
    ) {
      if (
        dados?.comandaId ==
        null
      ) {
        return;
      }

      if (
        Number(
          dados.comandaId
        ) !==
        Number(id)
      ) {
        return;
      }

      setComanda(
        (estadoAtual) => {
          if (!estadoAtual) {
            return estadoAtual;
          }

          const itens =
            Array.isArray(
              estadoAtual.itens
            )
              ? estadoAtual.itens
              : [];

          const itemExistente =
            itens.find(
              (item) =>
                Number(
                  item.id
                ) ===
                Number(
                  dados.itemId
                )
            );

          const precoUnitario =
            Number(
              dados.precoUnitario ??
                itemExistente?.precoUnitario ??
                dados.produto
                  ?.precoVenda ??
                0
            );

          const quantidade =
            Number(
              dados.quantidade ??
                itemExistente?.quantidade ??
                0
            );

          const subtotal =
            arredondar(
              dados.subtotal ??
                itemExistente?.subtotal ??
                precoUnitario *
                  quantidade
            );

          const novoItem = {
            ...(itemExistente ||
              {}),

            ...dados,

            id:
              dados.itemId ??
              itemExistente?.id,

            produtoId:
              dados.produtoId ??
              itemExistente?.produtoId,

            precoUnitario,

            subtotal,

            produto:
              dados.produto ??
              itemExistente?.produto,
          };

          const existe =
            Boolean(
              itemExistente
            );

          const novosItens =
            existe
              ? itens.map(
                  (item) =>
                    Number(
                      item.id
                    ) ===
                    Number(
                      dados.itemId
                    )
                      ? novoItem
                      : item
                )
              : [
                  ...itens,
                  novoItem,
                ];

          return aplicarResumo({
            ...estadoAtual,

            itens:
              novosItens,
          });
        }
      );
    }

    function removerItemSocket(
      dados
    ) {
      if (
        dados?.comandaId ==
        null
      ) {
        return;
      }

      if (
        Number(
          dados.comandaId
        ) !==
        Number(id)
      ) {
        return;
      }

      setComanda(
        (estadoAtual) => {
          if (!estadoAtual) {
            return estadoAtual;
          }

          const novosItens =
            (
              estadoAtual.itens ||
              []
            ).filter(
              (item) =>
                Number(
                  item.id
                ) !==
                Number(
                  dados.itemId
                )
            );

          return aplicarResumo({
            ...estadoAtual,

            itens:
              novosItens,
          });
        }
      );
    }

    function atualizarPagamentoSocket(
      dados
    ) {
      if (
        dados?.comandaId ==
        null
      ) {
        return;
      }

      if (
        Number(
          dados.comandaId
        ) !==
        Number(id)
      ) {
        return;
      }

      if (
        dados.pagamento
      ) {
        atualizarPagamentoLocal(
          dados.pagamento,
          {
            ...(dados.subtotal !==
            undefined
              ? {
                  subtotal:
                    dados.subtotal,
                }
              : {}),

            ...(dados.taxaServico !==
            undefined
              ? {
                  taxaServico:
                    dados.taxaServico,
                }
              : {}),

            ...(dados.taxaServicoPercentual !==
            undefined
              ? {
                  taxaServicoPercentual:
                    dados.taxaServicoPercentual,
                }
              : {}),

            ...(dados.total !==
            undefined
              ? {
                  total:
                    dados.total,
                }
              : {}),

            ...(dados.totalPago !==
            undefined
              ? {
                  totalPago:
                    dados.totalPago,
                }
              : {}),

            ...(dados.restante !==
            undefined
              ? {
                  restante:
                    dados.restante,
                }
              : {}),
          }
        );
      }
    }

    function comandaFechadaSocket(
      dados
    ) {
      if (
        dados?.comandaId ==
        null
      ) {
        return;
      }

      if (
        Number(
          dados.comandaId
        ) !==
        Number(id)
      ) {
        return;
      }

      setComanda(
        (estadoAtual) => {
          if (!estadoAtual) {
            return estadoAtual;
          }

          return {
            ...estadoAtual,

            status:
              "FECHADA",

            vendaId:
              dados.vendaId ??
              estadoAtual.vendaId,
          };
        }
      );
    }

    socket.on(
      "item-comanda-adicionado",
      atualizarItemSocket
    );

    socket.on(
      "item-comanda-atualizado",
      atualizarItemSocket
    );

    socket.on(
      "item-comanda-removido",
      removerItemSocket
    );

    socket.on(
      "pagamento-comanda-atualizado",
      atualizarPagamentoSocket
    );

    socket.on(
      "comanda-atualizada",
      atualizarComanda
    );

    socket.on(
      "comanda-fechada",
      comandaFechadaSocket
    );

    return () => {
      socket.off(
        "item-comanda-adicionado",
        atualizarItemSocket
      );

      socket.off(
        "item-comanda-atualizado",
        atualizarItemSocket
      );

      socket.off(
        "item-comanda-removido",
        removerItemSocket
      );

      socket.off(
        "pagamento-comanda-atualizado",
        atualizarPagamentoSocket
      );

      socket.off(
        "comanda-atualizada",
        atualizarComanda
      );

      socket.off(
        "comanda-fechada",
        comandaFechadaSocket
      );
    };
  }, [id]);

  // ==========================================================
  // FILTRAR PRODUTOS
  // ==========================================================

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
    }, [
      produtos,
      busca,
    ]);

  // ==========================================================
  // QUANTIDADE PARA ADICIONAR
  // ==========================================================

  function obterQuantidadeProduto(
    produtoId
  ) {
    return Number(
      quantidades[
        produtoId
      ] || 1
    );
  }

  function alterarQuantidadeProduto(
    produtoId,
    valor
  ) {
    const quantidade =
      Math.max(
        1,
        Number(valor) || 1
      );

    setQuantidades(
      (estadoAtual) => ({
        ...estadoAtual,

        [produtoId]:
          quantidade,
      })
    );
  }

  // ==========================================================
  // ADICIONAR PRODUTO
  // ==========================================================

  async function adicionarProduto(
    produto
  ) {
    const quantidade =
      obterQuantidadeProduto(
        produto.id
      );

    if (
      quantidade <= 0
    ) {
      alert(
        "Informe uma quantidade válida."
      );

      return;
    }

    if (
      Number(
        produto.quantidade ||
          0
      ) <
      quantidade
    ) {
      alert(
        `Estoque insuficiente. Disponível: ${produto.quantidade}.`
      );

      return;
    }

    if (
      produto.disponivelComanda ===
      false
    ) {
      alert(
        "Este produto não está disponível para comandas."
      );

      return;
    }

    if (
      comanda?.status !==
      "ABERTA"
    ) {
      alert(
        "Esta comanda não está aberta."
      );

      return;
    }

    try {
      setSalvando(true);

      const response =
        await api.post(
          `/comandas/${id}/itens`,
          {
            produtoId:
              produto.id,

            quantidade,
          }
        );

      // Atualiza imediatamente sem fazer GET.
      adicionarItemLocal(
        response.data
      );

      setQuantidades(
        (estadoAtual) => ({
          ...estadoAtual,

          [produto.id]: 1,
        })
      );
    } catch (error) {
      console.error(
        "Erro ao adicionar item:",
        error
      );

      alert(
        error.response
          ?.data?.error ||
          "Não foi possível adicionar o item."
      );
    } finally {
      setSalvando(false);
    }
  }

  // ==========================================================
  // ALTERAR QUANTIDADE
  // ==========================================================

  async function alterarQuantidadeItem(
    item,
    novaQuantidade
  ) {
    const quantidade =
      Number(
        novaQuantidade
      );

    if (
      !Number.isInteger(
        quantidade
      ) ||
      quantidade <= 0
    ) {
      return;
    }

    if (
      item.cobrar ===
      false
    ) {
      alert(
        "Este item está marcado como não cobrável."
      );

      return;
    }

    if (
      (item.status ||
        "PENDENTE") !==
      "PENDENTE"
    ) {
      alert(
        "Este item já foi enviado para atendimento e não pode mais ter a quantidade alterada."
      );

      return;
    }

    try {
      setSalvando(true);

      const response =
        await api.put(
          `/comandas/${id}/itens/${item.id}`,
          {
            quantidade,
          }
        );

      atualizarItemLocal(
        response.data
      );
    } catch (error) {
      console.error(
        "Erro ao alterar item:",
        error
      );

      alert(
        error.response
          ?.data?.error ||
          "Não foi possível alterar a quantidade."
      );
    } finally {
      setSalvando(false);
    }
  }

  // ==========================================================
  // NÃO COBRAR ITEM
  // ==========================================================

  async function marcarNaoEntregue(
    item
  ) {
    if (
      item.cobrar ===
      false
    ) {
      return;
    }

    if (
      comanda?.status !==
      "ABERTA"
    ) {
      alert(
        "A comanda não está aberta."
      );

      return;
    }

    const nome =
      item.produto?.nome ||
      item.nomeProduto ||
      "este item";

    const motivo =
      window.prompt(
        `Por que "${nome}" não deve ser cobrado?`,
        "Cliente informou que não recebeu o produto."
      );

    if (
      motivo === null
    ) {
      return;
    }

    const motivoFinal =
      motivo.trim();

    if (
      !motivoFinal
    ) {
      alert(
        "Informe o motivo do ajuste."
      );

      return;
    }

    const confirmar =
      window.confirm(
        `O item "${nome}" será retirado da cobrança.\n\nMotivo:\n${motivoFinal}\n\nDeseja continuar?`
      );

    if (
      !confirmar
    ) {
      return;
    }

    try {
      setSalvando(true);

      const response =
        await api.patch(
          `/comandas/${id}/itens/${item.id}/nao-cobravel`,
          {
            motivo:
              motivoFinal,
          }
        );

      const resultado =
        response.data;

      atualizarItemLocal(
        resultado.item
      );

      setComanda(
        (estadoAtual) => {
          if (!estadoAtual) {
            return estadoAtual;
          }

          return {
            ...estadoAtual,

            resumo: {
              ...estadoAtual.resumo,

              subtotal:
                resultado.subtotal,

              taxaServico:
                resultado.taxaServico,

              total:
                resultado.total,

              totalPago:
                resultado.totalPago,

              restante:
                resultado.restante,
            },
          };
        }
      );
    } catch (error) {
      console.error(
        "Erro ao marcar item como não cobrável:",
        error
      );

      alert(
        error.response
          ?.data?.error ||
          "Não foi possível ajustar o item."
      );
    } finally {
      setSalvando(false);
    }
  }

  // ==========================================================
  // STATUS DO ITEM
  // ==========================================================

  function obterStatusItem(
    item
  ) {
    return (
      item.status ||
      "PENDENTE"
    );
  }

  function obterTextoStatus(
    status
  ) {
    const textos = {
      PENDENTE:
        "Pendente",

      ENVIADO:
        "Enviado",

      PREPARANDO:
        "Preparando",

      PRONTO:
        "Pronto",

      PARCIALMENTE_SERVIDO:
        "Parcialmente servido",

      SERVIDO:
        "Servido",
    };

    return (
      textos[status] ||
      status
    );
  }

  function obterProximoStatus(
    status
  ) {
    const proximos = {
      PENDENTE:
        "ENVIADO",

      ENVIADO:
        "PREPARANDO",

      PREPARANDO:
        "PRONTO",
    };

    return (
      proximos[status] ||
      null
    );
  }

  // ==========================================================
  // ATUALIZAR STATUS
  // ==========================================================

  async function atualizarStatusItem(
    item,
    novoStatus,
    novaQuantidadeServida
  ) {
    try {
      setSalvando(true);

      const response =
        await api.patch(
          `/comandas/${id}/itens/${item.id}/status`,
          {
            status:
              novoStatus,

            ...(novaQuantidadeServida !==
            undefined
              ? {
                  quantidadeServida:
                    novaQuantidadeServida,
                }
              : {}),
          }
        );

      atualizarItemLocal(
        response.data.item
      );
    } catch (error) {
      console.error(
        "Erro ao atualizar status:",
        error
      );

      alert(
        error.response
          ?.data?.error ||
          "Não foi possível atualizar o status do item."
      );
    } finally {
      setSalvando(false);
    }
  }

  // ==========================================================
  // AVANÇAR ITEM
  // ==========================================================

  async function avancarItem(
    item
  ) {
    const status =
      obterStatusItem(
        item
      );

    if (
      status ===
        "PRONTO" ||
      status ===
        "PARCIALMENTE_SERVIDO"
    ) {
      const quantidadeAtual =
        Number(
          item.quantidadeServida ||
            0
        );

      const quantidadeTotal =
        Number(
          item.quantidade ||
            0
        );

      const novaQuantidade =
        quantidadeAtual + 1;

      if (
        novaQuantidade >=
        quantidadeTotal
      ) {
        await atualizarStatusItem(
          item,
          "SERVIDO",
          quantidadeTotal
        );

        return;
      }

      await atualizarStatusItem(
        item,
        "PARCIALMENTE_SERVIDO",
        novaQuantidade
      );

      return;
    }

    const proximo =
      obterProximoStatus(
        status
      );

    if (!proximo) {
      return;
    }

    await atualizarStatusItem(
      item,
      proximo
    );
  }

  // ==========================================================
  // REMOVER ITEM
  // ==========================================================

  async function removerItem(
    item
  ) {
    const status =
      item.status ||
      "PENDENTE";

    if (
      status !==
      "PENDENTE"
    ) {
      alert(
        "Este item já foi enviado para atendimento e não pode mais ser removido."
      );

      return;
    }

    const nome =
      item.produto?.nome ||
      item.nomeProduto ||
      "este item";

    const confirmar =
      window.confirm(
        `Remover "${nome}" da comanda?`
      );

    if (
      !confirmar
    ) {
      return;
    }

    try {
      setSalvando(true);

      await api.delete(
        `/comandas/${id}/itens/${item.id}`
      );

      removerItemLocal(
        item.id
      );
    } catch (error) {
      console.error(
        "Erro ao remover item:",
        error
      );

      alert(
        error.response
          ?.data?.error ||
          "Não foi possível remover o item."
      );
    } finally {
      setSalvando(false);
    }
  }

  // ==========================================================
  // TAXA DE SERVIÇO
  // ==========================================================

  async function alterarTaxaServico() {
    if (
      comanda?.status !==
      "ABERTA"
    ) {
      alert(
        "A comanda não está aberta."
      );

      return;
    }

    const atualmenteAtiva =
      Boolean(
        comanda.taxaServicoAtiva
      );

    // --------------------------------------------------------
    // REMOVER
    // --------------------------------------------------------

    if (
      atualmenteAtiva
    ) {
      const confirmar =
        window.confirm(
          "Deseja remover a taxa de serviço desta comanda?"
        );

      if (
        !confirmar
      ) {
        return;
      }

      try {
        setSalvando(true);

        const response =
          await api.patch(
            `/comandas/${id}/taxa-servico`,
            {
              ativa:
                false,

              percentual:
                0,
            }
          );

        const resultado =
          response.data;

        setComanda(
          (estadoAtual) => {
            if (!estadoAtual) {
              return estadoAtual;
            }

            return {
              ...estadoAtual,

              taxaServicoAtiva:
                resultado.comanda
                  ?.taxaServicoAtiva ??
                false,

              taxaServicoPercentual:
                resultado.comanda
                  ?.taxaServicoPercentual ??
                0,

              resumo: {
                ...estadoAtual.resumo,

                subtotal:
                  resultado.subtotal,

                taxaServico:
                  resultado.taxaServico,

                taxaServicoPercentual:
                  resultado.taxaServicoPercentual,

                total:
                  resultado.total,

                totalPago:
                  resultado.totalPago,

                restante:
                  resultado.restante,
              },
            };
          }
        );
      } catch (error) {
        console.error(
          "Erro ao remover taxa:",
          error
        );

        alert(
          error.response
            ?.data?.error ||
            "Não foi possível remover a taxa de serviço."
        );
      } finally {
        setSalvando(false);
      }

      return;
    }

    // --------------------------------------------------------
    // ADICIONAR
    // --------------------------------------------------------

    const percentualAtual =
      Number(
        comanda.taxaServicoPercentual ||
          10
      );

    const valorDigitado =
      window.prompt(
        "Informe o percentual da taxa de serviço:",
        String(
          percentualAtual
        )
      );

    if (
      valorDigitado ===
      null
    ) {
      return;
    }

    const percentual =
      Number(
        String(
          valorDigitado
        ).replace(
          ",",
          "."
        )
      );

    if (
      !Number.isFinite(
        percentual
      ) ||
      percentual < 0 ||
      percentual > 100
    ) {
      alert(
        "Informe uma taxa entre 0% e 100%."
      );

      return;
    }

    try {
      setSalvando(true);

      const response =
        await api.patch(
          `/comandas/${id}/taxa-servico`,
          {
            ativa:
              true,

            percentual,
          }
        );

      const resultado =
        response.data;

      setComanda(
        (estadoAtual) => {
          if (!estadoAtual) {
            return estadoAtual;
          }

          return {
            ...estadoAtual,

            taxaServicoAtiva:
              resultado.comanda
                ?.taxaServicoAtiva ??
              true,

            taxaServicoPercentual:
              resultado.comanda
                ?.taxaServicoPercentual ??
              percentual,

            resumo: {
              ...estadoAtual.resumo,

              subtotal:
                resultado.subtotal,

              taxaServico:
                resultado.taxaServico,

              taxaServicoPercentual:
                resultado.taxaServicoPercentual,

              total:
                resultado.total,

              totalPago:
                resultado.totalPago,

              restante:
                resultado.restante,
            },
          };
        }
      );
    } catch (error) {
      console.error(
        "Erro ao adicionar taxa:",
        error
      );

      alert(
        error.response
          ?.data?.error ||
          "Não foi possível adicionar a taxa de serviço."
      );
    } finally {
      setSalvando(false);
    }
  }

  // ==========================================================
  // INICIAR FECHAMENTO
  // ==========================================================

  function iniciarFechamento() {
    if (
      !comanda?.itens
        ?.length
    ) {
      alert(
        "A comanda não possui itens."
      );

      return;
    }

    if (
      comanda.status !==
      "ABERTA"
    ) {
      alert(
        "Esta comanda já foi fechada."
      );

      return;
    }

    const valorRestante =
      Number(
        comanda.resumo
          ?.restante ??
          0
      );

    if (
      valorRestante <=
      0
    ) {
      alert(
        "Esta comanda já está totalmente paga."
      );

      return;
    }

    setValorPagamento(
      valorRestante.toFixed(
        2
      )
    );

    setFormaPagamento(
      "DINHEIRO"
    );

    setMostrarPagamento(
      true
    );
  }

  // ==========================================================
  // REGISTRAR PAGAMENTO
  // ==========================================================

  async function registrarPagamento() {
    const valor =
      Number(
        String(
          valorPagamento
        ).replace(
          ",",
          "."
        )
      );

    const restanteAtual =
      Number(
        comanda.resumo
          ?.restante ??
          0
      );

    if (
      !Number.isFinite(
        valor
      ) ||
      valor <= 0
    ) {
      alert(
        "Informe um valor válido."
      );

      return;
    }

    if (
      valor >
      restanteAtual +
        0.01
    ) {
      alert(
        `O valor máximo permitido é ${formatarMoeda(
          restanteAtual
        )}.`
      );

      return;
    }

    try {
      setProcessandoPagamento(
        true
      );

      const response =
        await api.post(
          `/comandas/${id}/pagamentos`,
          {
            valor,
            forma:
              formaPagamento,
          }
        );

      const resultado =
        response.data;

      // ------------------------------------------------------
      // COMANDA QUITADA
      // ------------------------------------------------------

      if (
        resultado.quitada
      ) {
        setMostrarPagamento(
          false
        );

        alert(
          "Comanda fechada com sucesso!"
        );

        navigate(
          "/mesas"
        );

        return;
      }

      // ------------------------------------------------------
      // PAGAMENTO PARCIAL
      // ------------------------------------------------------

      atualizarPagamentoLocal(
        resultado.pagamento,
        {
          subtotal:
            resultado.subtotal,

          taxaServico:
            resultado.taxaServico,

          taxaServicoPercentual:
            resultado.taxaServicoPercentual,

          total:
            resultado.total,

          totalPago:
            resultado.totalPago,

          restante:
            resultado.restante,
        }
      );

      setMostrarPagamento(
        false
      );

      alert(
        `Pagamento registrado.\n\nTotal pago: ${formatarMoeda(
          resultado.totalPago
        )}\nRestante: ${formatarMoeda(
          resultado.restante
        )}`
      );
    } catch (error) {
      console.error(
        "Erro ao registrar pagamento:",
        error
      );

      alert(
        error.response
          ?.data?.error ||
          "Não foi possível registrar o pagamento."
      );
    } finally {
      setProcessandoPagamento(
        false
      );
    }
  }

  // ==========================================================
  // PREENCHER VALOR RESTANTE
  // ==========================================================

  function preencherValorRestante() {
    const valor =
      Number(
        comanda.resumo
          ?.restante ??
          0
      );

    setValorPagamento(
      valor > 0
        ? valor.toFixed(
            2
          )
        : ""
    );
  }

  // ==========================================================
  // PREENCHER METADE
  // ==========================================================

  function preencherMetade() {
    const valor =
      Number(
        comanda.resumo
          ?.restante ??
          0
      );

    if (
      valor <= 0
    ) {
      return;
    }

    setValorPagamento(
      (
        valor / 2
      ).toFixed(2)
    );
  }

  // ==========================================================
  // CARREGANDO
  // ==========================================================

  if (carregando) {
    return (
      <div className="comanda-page">
        <div className="comanda-loading">
          Carregando comanda...
        </div>
      </div>
    );
  }

  if (!comanda) {
    return null;
  }

  // ==========================================================
  // TOTAIS
  // ==========================================================

  const subtotal =
    Number(
      comanda.resumo
        ?.subtotal ??
        0
    );

  const taxaServico =
    Number(
      comanda.resumo
        ?.taxaServico ??
        0
    );

  const taxaServicoPercentual =
    Number(
      comanda.resumo
        ?.taxaServicoPercentual ??
        comanda.taxaServicoPercentual ??
        0
    );

  const totalComanda =
    Number(
      comanda.resumo
        ?.total ??
        subtotal +
          taxaServico
    );

  const totalPago =
    Number(
      comanda.resumo
        ?.totalPago ??
        0
    );

  const restante =
    Math.max(
      0,
      Number(
        comanda.resumo
          ?.restante ??
          totalComanda -
            totalPago
      )
    );

  const quantidadePagamentos =
    Array.isArray(
      comanda.pagamentos
    )
      ? comanda.pagamentos.length
      : 0;

  // ==========================================================
  // RENDER
  // ==========================================================

  return (
    <div className="comanda-page">
      <div className="comanda-container">

        {/* ===================================================
            CABEÇALHO
        =================================================== */}

        <header className="comanda-header">
          <button
            type="button"
            className="comanda-btn-voltar"
            onClick={() =>
              navigate(
                "/mesas"
              )
            }
          >
            ← Mesas
          </button>

          <div className="comanda-titulo">
            <h1>
              Comanda #
              {String(
                comanda.id
              ).padStart(
                4,
                "0"
              )}
            </h1>

            <div className="comanda-subtitulo">
              {comanda.mesa ? (
                <span>
                  Mesa{" "}
                  {
                    comanda
                      .mesa
                      .numero
                  }
                </span>
              ) : (
                <span>
                  Comanda sem mesa
                </span>
              )}

              <span
                className={`comanda-status ${
                  comanda.status ===
                  "ABERTA"
                    ? "aberta"
                    : "fechada"
                }`}
              >
                {
                  comanda.status
                }
              </span>
            </div>
          </div>

          <div className="comanda-header-acoes">
            <button
              type="button"
              className="comanda-btn-fechar"
              onClick={
                iniciarFechamento
              }
              disabled={
                salvando ||
                comanda.status !==
                  "ABERTA" ||
                !comanda
                  .itens
                  ?.length
              }
            >
              Fechar comanda
            </button>
          </div>
        </header>

        {/* ===================================================
            CONTEÚDO
        =================================================== */}

        <main className="comanda-grid">

          {/* =================================================
              PRODUTOS
          ================================================= */}

          <section className="comanda-produtos">
            <div className="comanda-card">

              <div className="comanda-card-header">
                <div>
                  <h2>
                    Adicionar produtos
                  </h2>

                  <p>
                    Pesquise por nome
                    ou código de
                    barras.
                  </p>
                </div>
              </div>

              <div className="comanda-busca">
                <input
                  type="text"
                  placeholder="Buscar produto..."
                  value={
                    busca
                  }
                  onChange={(
                    event
                  ) =>
                    setBusca(
                      event
                        .target
                        .value
                    )
                  }
                />
              </div>

              <div className="comanda-produtos-lista">
                {produtosFiltrados.length ===
                0 ? (
                  <div className="comanda-vazio">
                    Nenhum produto
                    disponível para
                    comanda.
                  </div>
                ) : (
                  produtosFiltrados.map(
                    (
                      produto
                    ) => {
                      const estoque =
                        Number(
                          produto.quantidade ||
                            0
                        );

                      const quantidade =
                        obterQuantidadeProduto(
                          produto.id
                        );

                      const semEstoque =
                        estoque <=
                        0;

                      return (
                        <div
                          key={
                            produto.id
                          }
                          className="produto-comanda"
                        >
                          <div className="produto-comanda-info">
                            <strong>
                              {
                                produto.nome
                              }
                            </strong>

                            <span>
                              {formatarMoeda(
                                produto.precoVenda
                              )}
                            </span>

                            <small>
                              Estoque:{" "}
                              {
                                estoque
                              }
                            </small>
                          </div>

                          <div className="produto-comanda-acoes">
                            <input
                              type="number"
                              min="1"
                              value={
                                quantidade
                              }
                              disabled={
                                semEstoque ||
                                salvando ||
                                comanda.status !==
                                  "ABERTA"
                              }
                              onChange={(
                                event
                              ) =>
                                alterarQuantidadeProduto(
                                  produto.id,
                                  event
                                    .target
                                    .value
                                )
                              }
                            />

                            <button
                              type="button"
                              onClick={() =>
                                adicionarProduto(
                                  produto
                                )
                              }
                              disabled={
                                semEstoque ||
                                salvando ||
                                comanda.status !==
                                  "ABERTA" ||
                                quantidade >
                                  estoque
                              }
                            >
                              {semEstoque
                                ? "Sem estoque"
                                : "Adicionar"}
                            </button>
                          </div>
                        </div>
                      );
                    }
                  )
                )}
              </div>
            </div>
          </section>

          {/* =================================================
              RESUMO
          ================================================= */}

          <aside className="comanda-resumo">
            <div className="comanda-card">

              <div className="comanda-card-header">
                <div>
                  <h2>
                    Itens da comanda
                  </h2>

                  <p>
                    {comanda.itens
                      ?.length ||
                      0}{" "}
                    item(ns)
                  </p>
                </div>
              </div>

              {/* =============================================
                  ITENS
              ============================================= */}

              <div className="comanda-itens">
                {!comanda
                  .itens
                  ?.length ? (
                  <div className="comanda-vazio">
                    Nenhum item
                    adicionado.
                  </div>
                ) : (
                  comanda.itens.map(
                    (item) => {
                      const nomeProduto =
                        item.produto
                          ?.nome ||
                        item.nomeProduto ||
                        "Produto";

                      const status =
                        obterStatusItem(
                          item
                        );

                      const quantidade =
                        Number(
                          item.quantidade ||
                            0
                        );

                      const quantidadeServida =
                        Number(
                          item.quantidadeServida ||
                            0
                        );

                      const itemCobravel =
                        item.cobrar !==
                        false;

                      const podeEditar =
                        status ===
                          "PENDENTE" &&
                        itemCobravel;

                      const itemServido =
                        status ===
                        "SERVIDO";

                      return (
                        <div
                          key={
                            item.id
                          }
                          className={`comanda-item status-${String(
                            status
                          ).toLowerCase()}`}
                        >

                          {/* --------------------------------
                              TOPO
                          -------------------------------- */}

                          <div className="comanda-item-topo">
                            <div>
                              <strong>
                                {
                                  nomeProduto
                                }
                              </strong>

                              <div className="comanda-item-status">
                                <span
                                  className={`status-item-badge status-${String(
                                    status
                                  ).toLowerCase()}`}
                                >
                                  {obterTextoStatus(
                                    status
                                  )}
                                </span>
                              </div>

                              {!itemCobravel && (
                                <div
                                  style={{
                                    marginTop:
                                      "6px",

                                    fontSize:
                                      "12px",

                                    color:
                                      "#b45309",
                                  }}
                                >
                                  ⚠ Não cobrado
                                </div>
                              )}
                            </div>

                            <button
                              type="button"
                              className="comanda-item-remover"
                              onClick={() =>
                                removerItem(
                                  item
                                )
                              }
                              disabled={
                                salvando ||
                                !podeEditar
                              }
                              title={
                                !podeEditar
                                  ? "Este item já foi enviado ou está fora da cobrança."
                                  : "Remover item"
                              }
                            >
                              ×
                            </button>
                          </div>

                          {/* --------------------------------
                              MOTIVO
                          -------------------------------- */}

                          {!itemCobravel &&
                            item.motivoNaoCobranca && (
                              <div
                                style={{
                                  marginTop:
                                    "8px",

                                  padding:
                                    "8px 10px",

                                  borderRadius:
                                    "8px",

                                  background:
                                    "#fffbeb",

                                  fontSize:
                                    "12px",

                                  color:
                                    "#92400e",
                                }}
                              >
                                <strong>
                                  Motivo:
                                </strong>{" "}
                                {
                                  item.motivoNaoCobranca
                                }
                              </div>
                            )}

                          {/* --------------------------------
                              PREÇO
                          -------------------------------- */}

                          <div className="comanda-item-info">
                            <span
                              style={
                                !itemCobravel
                                  ? {
                                      textDecoration:
                                        "line-through",

                                      opacity:
                                        0.6,
                                    }
                                  : undefined
                              }
                            >
                              {formatarMoeda(
                                item.precoUnitario
                              )}{" "}
                              cada
                            </span>

                            <span
                              style={
                                !itemCobravel
                                  ? {
                                      textDecoration:
                                        "line-through",

                                      opacity:
                                        0.6,
                                    }
                                  : undefined
                              }
                            >
                              {formatarMoeda(
                                item.subtotal
                              )}
                            </span>
                          </div>

                          {/* --------------------------------
                              SERVIDO
                          -------------------------------- */}

                          <div className="comanda-item-servico">
                            <span>
                              Servido:{" "}
                              <strong>
                                {
                                  quantidadeServida
                                }
                              </strong>
                              {" / "}
                              <strong>
                                {
                                  quantidade
                                }
                              </strong>
                            </span>
                          </div>

                          {/* --------------------------------
                              AÇÕES
                          -------------------------------- */}

                          <div className="comanda-item-acoes">

                            {podeEditar && (
                              <>
                                <button
                                  type="button"
                                  onClick={() =>
                                    alterarQuantidadeItem(
                                      item,
                                      quantidade -
                                        1
                                    )
                                  }
                                  disabled={
                                    salvando ||
                                    quantidade <=
                                      1
                                  }
                                >
                                  −
                                </button>

                                <span>
                                  {
                                    quantidade
                                  }
                                </span>

                                <button
                                  type="button"
                                  onClick={() =>
                                    alterarQuantidadeItem(
                                      item,
                                      quantidade +
                                        1
                                    )
                                  }
                                  disabled={
                                    salvando
                                  }
                                >
                                  +
                                </button>
                              </>
                            )}

                            {!itemServido &&
                              itemCobravel && (
                                <button
                                  type="button"
                                  className="comanda-btn-status"
                                  onClick={() =>
                                    avancarItem(
                                      item
                                    )
                                  }
                                  disabled={
                                    salvando
                                  }
                                >
                                  {status ===
                                    "PENDENTE" &&
                                    "Enviar para cozinha"}

                                  {status ===
                                    "ENVIADO" &&
                                    "Iniciar preparo"}

                                  {status ===
                                    "PREPARANDO" &&
                                    "Marcar como pronto"}

                                  {status ===
                                    "PRONTO" &&
                                    "Servir 1"}

                                  {status ===
                                    "PARCIALMENTE_SERVIDO" &&
                                    "Servir +1"}
                                </button>
                              )}

                            {itemServido && (
                              <span className="comanda-item-servido">
                                ✓ Servido
                              </span>
                            )}
                          </div>

                          {/* --------------------------------
                              NÃO COBRAR
                          -------------------------------- */}

                          {itemCobravel &&
                            comanda.status ===
                              "ABERTA" && (
                              <div
                                style={{
                                  marginTop:
                                    "10px",
                                }}
                              >
                                <button
                                  type="button"
                                  className="btn btn-outline btn-small"
                                  onClick={() =>
                                    marcarNaoEntregue(
                                      item
                                    )
                                  }
                                  disabled={
                                    salvando
                                  }
                                >
                                  Não cobrar item
                                </button>
                              </div>
                            )}

                          {!itemCobravel && (
                            <div
                              style={{
                                marginTop:
                                  "10px",

                                fontSize:
                                  "12px",

                                color:
                                  "#64748b",
                              }}
                            >
                              Este item
                              permanece no
                              histórico, mas
                              não entra na
                              cobrança.
                            </div>
                          )}
                        </div>
                      );
                    }
                  )
                )}
              </div>

              {/* =============================================
                  TAXA DE SERVIÇO
              ============================================= */}

              <div
                style={{
                  marginTop:
                    "18px",

                  paddingTop:
                    "16px",

                  borderTop:
                    "1px solid #e5e7eb",
                }}
              >
                <div
                  style={{
                    display:
                      "flex",

                    alignItems:
                      "center",

                    justifyContent:
                      "space-between",

                    gap:
                      "12px",
                  }}
                >
                  <div>
                    <strong>
                      Taxa de serviço
                    </strong>

                    <div
                      style={{
                        marginTop:
                          "4px",

                        fontSize:
                          "12px",

                        color:
                          "#64748b",
                      }}
                    >
                      {comanda.taxaServicoAtiva
                        ? `${taxaServicoPercentual}% aplicada`
                        : "Não aplicada"}
                    </div>
                  </div>

                  <button
                    type="button"
                    className="btn btn-outline btn-small"
                    onClick={
                      alterarTaxaServico
                    }
                    disabled={
                      salvando ||
                      comanda.status !==
                        "ABERTA"
                    }
                  >
                    {comanda.taxaServicoAtiva
                      ? "Remover"
                      : "Adicionar"}
                  </button>
                </div>
              </div>

              {/* =============================================
                  TOTAIS
              ============================================= */}

              <div className="comanda-totais">

                <div className="comanda-total-linha">
                  <span>
                    Subtotal
                  </span>

                  <strong>
                    {formatarMoeda(
                      subtotal
                    )}
                  </strong>
                </div>

                {comanda.taxaServicoAtiva &&
                  taxaServico >
                    0 && (
                    <div className="comanda-total-linha">
                      <span>
                        Taxa de serviço{" "}
                        {
                          taxaServicoPercentual
                        }%
                      </span>

                      <strong>
                        {formatarMoeda(
                          taxaServico
                        )}
                      </strong>
                    </div>
                  )}

                <div className="comanda-total-linha comanda-total-final">
                  <span>
                    Total
                  </span>

                  <strong>
                    {formatarMoeda(
                      totalComanda
                    )}
                  </strong>
                </div>

                {totalPago >
                  0 && (
                  <>
                    <div className="comanda-total-linha">
                      <span>
                        Pago
                      </span>

                      <strong>
                        {formatarMoeda(
                          totalPago
                        )}
                      </strong>
                    </div>

                    <div className="comanda-total-linha">
                      <span>
                        Restante
                      </span>

                      <strong>
                        {formatarMoeda(
                          restante
                        )}
                      </strong>
                    </div>
                  </>
                )}
              </div>

              {/* =============================================
                  PAGAMENTOS
              ============================================= */}

              {quantidadePagamentos >
                0 && (
                <div
                  style={{
                    marginTop:
                      "16px",

                    paddingTop:
                      "14px",

                    borderTop:
                      "1px solid #e5e7eb",
                  }}
                >
                  <strong>
                    Pagamentos
                  </strong>

                  <div
                    style={{
                      marginTop:
                        "8px",

                      display:
                        "flex",

                      flexDirection:
                        "column",

                      gap:
                        "6px",
                    }}
                  >
                    {comanda.pagamentos.map(
                      (
                        pagamento
                      ) => (
                        <div
                          key={
                            pagamento.id
                          }
                          style={{
                            display:
                              "flex",

                            justifyContent:
                              "space-between",

                            gap:
                              "10px",

                            fontSize:
                              "13px",
                          }}
                        >
                          <span>
                            {pagamento.forma ===
                            "DINHEIRO"
                              ? "Dinheiro"
                              : pagamento.forma ===
                                "PIX"
                              ? "PIX"
                              : pagamento.forma ===
                                "CARTAO"
                              ? "Cartão"
                              : pagamento.forma}
                          </span>

                          <strong>
                            {formatarMoeda(
                              pagamento.valor
                            )}
                          </strong>
                        </div>
                      )
                    )}
                  </div>
                </div>
              )}

              {/* =============================================
                  FECHAR
              ============================================= */}

              <button
                type="button"
                className="comanda-btn-principal"
                onClick={
                  iniciarFechamento
                }
                disabled={
                  salvando ||
                  comanda.status !==
                    "ABERTA" ||
                  !comanda.itens
                    ?.length ||
                  restante <= 0
                }
              >
                {restante > 0
                  ? "Fechar e receber"
                  : "Comanda paga"}
              </button>
            </div>
          </aside>
        </main>
      </div>

      {/* =====================================================
          MODAL DE PAGAMENTO
      ===================================================== */}

      {mostrarPagamento && (
        <div className="pagamento-overlay">
          <div className="pagamento-modal">

            <div className="pagamento-header">
              <div>
                <h2>
                  Receber comanda
                </h2>

                <p>
                  Mesa{" "}
                  {
                    comanda
                      .mesa
                      ?.numero
                  }
                </p>
              </div>

              <button
                type="button"
                className="pagamento-fechar"
                onClick={() =>
                  setMostrarPagamento(
                    false
                  )
                }
                disabled={
                  processandoPagamento
                }
              >
                ×
              </button>
            </div>

            <div className="pagamento-total">
              <span>
                Total da comanda
              </span>

              <strong>
                {formatarMoeda(
                  totalComanda
                )}
              </strong>
            </div>

            {taxaServico >
              0 && (
              <div
                style={{
                  marginTop:
                    "8px",

                  fontSize:
                    "13px",

                  color:
                    "#64748b",
                }}
              >
                Inclui taxa de serviço de{" "}
                {
                  taxaServicoPercentual
                }
                %:{" "}
                {formatarMoeda(
                  taxaServico
                )}
              </div>
            )}

            <div className="pagamento-restante">
              <span>
                Restante
              </span>

              <strong>
                {formatarMoeda(
                  restante
                )}
              </strong>
            </div>

            {quantidadePagamentos >
              0 && (
              <div
                style={{
                  marginTop:
                    "14px",

                  padding:
                    "12px",

                  borderRadius:
                    "10px",

                  background:
                    "#f8fafc",
                }}
              >
                <strong>
                  Já recebido
                </strong>

                <div
                  style={{
                    marginTop:
                      "8px",

                    display:
                      "flex",

                    flexDirection:
                      "column",

                    gap:
                      "6px",
                  }}
                >
                  {comanda.pagamentos.map(
                    (
                      pagamento
                    ) => (
                      <div
                        key={
                          pagamento.id
                        }
                        style={{
                          display:
                            "flex",

                          justifyContent:
                            "space-between",

                          fontSize:
                            "13px",
                        }}
                      >
                        <span>
                          {
                            pagamento.forma
                          }
                        </span>

                        <strong>
                          {formatarMoeda(
                            pagamento.valor
                          )}
                        </strong>
                      </div>
                    )
                  )}
                </div>
              </div>
            )}

            <div className="pagamento-form">

              <label htmlFor="formaPagamento">
                Forma de pagamento
              </label>

              <div className="formas-pagamento">

                <button
                  type="button"
                  className={
                    formaPagamento ===
                    "DINHEIRO"
                      ? "forma-selecionada"
                      : ""
                  }
                  onClick={() =>
                    setFormaPagamento(
                      "DINHEIRO"
                    )
                  }
                  disabled={
                    processandoPagamento
                  }
                >
                  💵
                  <span>
                    Dinheiro
                  </span>
                </button>

                <button
                  type="button"
                  className={
                    formaPagamento ===
                    "PIX"
                      ? "forma-selecionada"
                      : ""
                  }
                  onClick={() =>
                    setFormaPagamento(
                      "PIX"
                    )
                  }
                  disabled={
                    processandoPagamento
                  }
                >
                  🔑
                  <span>
                    PIX
                  </span>
                </button>

                <button
                  type="button"
                  className={
                    formaPagamento ===
                    "CARTAO"
                      ? "forma-selecionada"
                      : ""
                  }
                  onClick={() =>
                    setFormaPagamento(
                      "CARTAO"
                    )
                  }
                  disabled={
                    processandoPagamento
                  }
                >
                  💳
                  <span>
                    Cartão
                  </span>
                </button>

              </div>

              <div
                style={{
                  marginTop:
                    "14px",

                  marginBottom:
                    "8px",
                }}
              >
                <strong>
                  Valor a receber
                </strong>

                <p
                  style={{
                    margin:
                      "4px 0 0",

                    fontSize:
                      "12px",

                    color:
                      "#64748b",
                  }}
                >
                  Você pode receber
                  apenas uma parte
                  agora e o restante
                  depois.
                </p>
              </div>

              <input
                id="valorPagamento"
                type="number"
                min="0.01"
                max={
                  restante
                }
                step="0.01"
                value={
                  valorPagamento
                }
                onChange={(
                  event
                ) =>
                  setValorPagamento(
                    event.target
                      .value
                  )
                }
                disabled={
                  processandoPagamento
                }
              />

              <div
                style={{
                  display:
                    "flex",

                  gap:
                    "8px",

                  marginTop:
                    "10px",

                  flexWrap:
                    "wrap",
                }}
              >
                <button
                  type="button"
                  className="btn btn-outline btn-small"
                  onClick={
                    preencherMetade
                  }
                  disabled={
                    processandoPagamento ||
                    restante <=
                      0
                  }
                >
                  50%
                </button>

                <button
                  type="button"
                  className="btn btn-outline btn-small"
                  onClick={
                    preencherValorRestante
                  }
                  disabled={
                    processandoPagamento ||
                    restante <=
                      0
                  }
                >
                  Pagar restante
                </button>
              </div>

              {Number(
                valorPagamento
              ) > 0 &&
                Number(
                  valorPagamento
                ) <
                  restante -
                    0.01 && (
                  <div
                    style={{
                      marginTop:
                        "12px",

                      padding:
                        "10px",

                      borderRadius:
                        "8px",

                      background:
                        "#eff6ff",

                      color:
                        "#1d4ed8",

                      fontSize:
                        "13px",
                    }}
                  >
                    Pagamento parcial.
                    Após o recebimento,
                    ficará restante:{" "}
                    <strong>
                      {formatarMoeda(
                        Math.max(
                          0,
                          restante -
                            Number(
                              valorPagamento
                            )
                        )
                      )}
                    </strong>
                  </div>
                )}
            </div>

            <div className="pagamento-acoes">

              <button
                type="button"
                className="pagamento-cancelar"
                onClick={() =>
                  setMostrarPagamento(
                    false
                  )
                }
                disabled={
                  processandoPagamento
                }
              >
                Cancelar
              </button>

              <button
                type="button"
                className="pagamento-confirmar"
                onClick={
                  registrarPagamento
                }
                disabled={
                  processandoPagamento ||
                  !valorPagamento ||
                  Number(
                    valorPagamento
                  ) <= 0
                }
              >
                {processandoPagamento
                  ? "Processando..."
                  : Number(
                        valorPagamento
                      ) <
                      restante -
                        0.01
                  ? "Registrar pagamento parcial"
                  : "Confirmar pagamento"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}