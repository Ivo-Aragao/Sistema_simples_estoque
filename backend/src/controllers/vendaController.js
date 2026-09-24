const prisma = require("../services/prisma");

const {
  garantirCaixaDoDia,
} = require("../services/caixaService");

const FORMAS_PAGAMENTO = [
  "DINHEIRO",
  "PIX",
  "CARTAO",
  "CARTAO_CREDITO",
  "CARTAO_DEBITO",
  "TRANSFERENCIA",
  "OUTRO",
];

function arredondar(valor) {
  return Math.round(
    (Number(valor) || 0) * 100
  ) / 100;
}

// ============================================================
// CRIAR VENDA
// ============================================================

async function criarVenda(
  req,
  res
) {
  try {
    const {
      itens,
      desconto = 0,
      formaPagamento,
      observacao,
    } = req.body;

    // --------------------------------------------------------
    // VALIDAR USUÁRIO / EMPRESA
    // --------------------------------------------------------

    if (!req.usuario?.id) {
      return res.status(401).json({
        error:
          "Usuário não autenticado.",
      });
    }

    if (!req.usuario?.empresaId) {
      return res.status(400).json({
        error:
          "Usuário não está vinculado a uma empresa.",
      });
    }

    // --------------------------------------------------------
    // VALIDAR ITENS
    // --------------------------------------------------------

    if (
      !Array.isArray(itens) ||
      itens.length === 0
    ) {
      return res.status(400).json({
        error:
          "Adicione pelo menos um produto à venda.",
      });
    }

    // --------------------------------------------------------
    // VALIDAR PAGAMENTO
    // --------------------------------------------------------

    if (
      !FORMAS_PAGAMENTO.includes(
        formaPagamento
      )
    ) {
      return res.status(400).json({
        error:
          "Forma de pagamento inválida.",
      });
    }

    // --------------------------------------------------------
    // DESCONTO
    // --------------------------------------------------------

    const descontoNumerico =
      arredondar(
        desconto
      );

    if (
      !Number.isFinite(
        descontoNumerico
      ) ||
      descontoNumerico < 0
    ) {
      return res.status(400).json({
        error:
          "Desconto inválido.",
      });
    }

    // --------------------------------------------------------
    // NORMALIZAR ITENS
    // --------------------------------------------------------

    const itensNormalizados =
      itens.map(
        (item) => ({
          produtoId:
            Number(
              item.produtoId
            ),

          quantidade:
            Number(
              item.quantidade
            ),
        })
      );

    // --------------------------------------------------------
    // VALIDAR ITENS NORMALIZADOS
    // --------------------------------------------------------

    for (
      const item of
      itensNormalizados
    ) {
      if (
        !Number.isInteger(
          item.produtoId
        ) ||
        !Number.isInteger(
          item.quantidade
        ) ||
        item.quantidade <= 0
      ) {
        return res.status(400).json({
          error:
            "Produto ou quantidade inválida.",
        });
      }
    }

    // --------------------------------------------------------
    // IDS DOS PRODUTOS
    // --------------------------------------------------------

    const produtoIds = [
      ...new Set(
        itensNormalizados.map(
          (item) =>
            item.produtoId
        )
      ),
    ];

    // --------------------------------------------------------
    // TRANSAÇÃO
    // --------------------------------------------------------

    const venda =
      await prisma.$transaction(
        async (tx) => {
          // ==================================================
          // GARANTIR CAIXA DO DIA
          // ==================================================

          const caixa =
            await garantirCaixaDoDia(
              req.usuario.empresaId,
              tx
            );

          if (!caixa) {
            throw new Error(
              "Não existe caixa aberto. Abra o caixa antes de realizar vendas."
            );
          }

          // ==================================================
          // BUSCAR PRODUTOS
          // ==================================================

          const produtos =
            await tx.produto.findMany({
              where: {
                id: {
                  in:
                    produtoIds,
                },

                ativo:
                  true,

                disponivelVenda:
                  true,
              },
            });

          if (
            produtos.length !==
            produtoIds.length
          ) {
            throw new Error(
              "Um ou mais produtos não foram encontrados ou não estão disponíveis para venda."
            );
          }

          // ==================================================
          // MAPA DE PRODUTOS
          // ==================================================

          const mapaProdutos =
            new Map(
              produtos.map(
                (produto) => [
                  produto.id,
                  produto,
                ]
              )
            );

          // ==================================================
          // CALCULAR VENDA
          // ==================================================

          let subtotal =
            0;

          const itensVenda =
            [];

          for (
            const item of
            itensNormalizados
          ) {
            const produto =
              mapaProdutos.get(
                item.produtoId
              );

            if (!produto) {
              throw new Error(
                "Produto não encontrado."
              );
            }

            // ------------------------------------------------
            // ESTOQUE
            // ------------------------------------------------

            if (
              produto.quantidade <
              item.quantidade
            ) {
              throw new Error(
                `Estoque insuficiente para "${produto.nome}". Disponível: ${produto.quantidade}.`
              );
            }

            // ------------------------------------------------
            // PREÇO
            // ------------------------------------------------

            const precoUnitario =
              arredondar(
                produto.precoVenda
              );

            const subtotalItem =
              arredondar(
                precoUnitario *
                  item.quantidade
              );

            subtotal =
              arredondar(
                subtotal +
                  subtotalItem
              );

            itensVenda.push({
              produto,

              quantidade:
                item.quantidade,

              precoUnitario,

              subtotal:
                subtotalItem,
            });
          }

          // ==================================================
          // VALIDAR DESCONTO
          // ==================================================

          if (
            descontoNumerico >
            subtotal
          ) {
            throw new Error(
              "O desconto não pode ser maior que o subtotal."
            );
          }

          // ==================================================
          // TOTAL
          // ==================================================

          const total =
            arredondar(
              subtotal -
                descontoNumerico
            );

          // ==================================================
          // CRIAR VENDA
          // ==================================================

          const vendaCriada =
            await tx.venda.create({
              data: {
                usuarioId:
                  req.usuario.id,

                empresaId:
                  req.usuario.empresaId,

                // ==========================================
                // VINCULAÇÃO AO CAIXA
                // ==========================================

                caixaId:
                  caixa.id,

                subtotal,

                desconto:
                  descontoNumerico,

                total,

                formaPagamento,

                status:
                  "FINALIZADA",

                observacao:
                  observacao
                    ? String(
                        observacao
                      ).trim()
                    : null,
              },
            });

          // ==================================================
          // BAIXAR ESTOQUE / CRIAR ITENS
          // ==================================================

          for (
            const item of
            itensVenda
          ) {
            // ------------------------------------------------
            // BAIXA ATÔMICA
            // ------------------------------------------------

            const estoqueAtualizado =
              await tx.produto.updateMany({
                where: {
                  id:
                    item.produto.id,

                  quantidade: {
                    gte:
                      item.quantidade,
                  },
                },

                data: {
                  quantidade: {
                    decrement:
                      item.quantidade,
                  },
                },
              });

            if (
              estoqueAtualizado.count !==
              1
            ) {
              throw new Error(
                `Estoque insuficiente para "${item.produto.nome}".`
              );
            }

            // ------------------------------------------------
            // ITEM DA VENDA
            // ------------------------------------------------

            await tx.itemVenda.create({
              data: {
                vendaId:
                  vendaCriada.id,

                produtoId:
                  item.produto.id,

                nomeProduto:
                  item.produto.nome,

                quantidade:
                  item.quantidade,

                precoUnitario:
                  item.precoUnitario,

                subtotal:
                  item.subtotal,
              },
            });

            // ------------------------------------------------
            // MOVIMENTAÇÃO
            // ------------------------------------------------

            await tx.movimentacao.create({
              data: {
                produtoId:
                  item.produto.id,

                usuarioId:
                  req.usuario.id,

                tipo:
                  "SAIDA",

                quantidade:
                  item.quantidade,

                observacao:
                  `Venda ${vendaCriada.codigo}`,
              },
            });
          }

          // ==================================================
          // RETORNAR VENDA COMPLETA
          // ==================================================

          return tx.venda.findUnique({
            where: {
              id:
                vendaCriada.id,
            },

            include: {
              itens:
                true,
            },
          });
        },

        {
          maxWait:
            10000,

          timeout:
            20000,
        }
      );

    // ========================================================
    // RESPOSTA
    // ========================================================

    return res.status(201).json(
      venda
    );
  } catch (error) {
    console.error(
      "Erro ao criar venda:",
      error
    );

    return res.status(500).json({
      error:
        error.message ||
        "Não foi possível criar a venda.",
    });
  }
}

// ============================================================
// LISTAR VENDAS
// ============================================================

async function listarVendas(
  req,
  res
) {
  try {
    const vendas =
      await prisma.venda.findMany({
        orderBy: {
          criadoEm:
            "desc",
        },

        take:
          50,

        include: {
          itens:
            true,

          usuario: {
            select: {
              id:
                true,

              nome:
                true,
            },
          },

          caixa: {
            select: {
              id:
                true,

              empresaId:
                true,

              aberturaEm:
                true,

              fechamentoEm:
                true,

              status:
                true,
            },
          },
        },
      });

    return res.json(
      vendas
    );
  } catch (error) {
    console.error(
      "Erro ao listar vendas:",
      error
    );

    return res.status(500).json({
      error:
        error.message ||
        "Não foi possível listar as vendas.",
    });
  }
}

// ============================================================
// CANCELAR VENDA
// ============================================================

async function cancelarVenda(
  req,
  res
) {
  try {
    const id =
      Number(
        req.params.id
      );

    if (
      !Number.isInteger(
        id
      )
    ) {
      return res.status(400).json({
        error:
          "ID da venda inválido.",
      });
    }

    const venda =
      await prisma.$transaction(
        async (tx) => {
          // ==================================================
          // BUSCAR VENDA
          // ==================================================

          const vendaAtual =
            await tx.venda.findUnique({
              where: {
                id,
              },

              include: {
                itens:
                  true,
              },
            });

          if (!vendaAtual) {
            throw new Error(
              "Venda não encontrada."
            );
          }

          if (
            vendaAtual.status ===
            "CANCELADA"
          ) {
            throw new Error(
              "Esta venda já foi cancelada."
            );
          }

          // ==================================================
          // DEVOLVER ESTOQUE
          // ==================================================

          for (
            const item of
            vendaAtual.itens
          ) {
            await tx.produto.update({
              where: {
                id:
                  item.produtoId,
              },

              data: {
                quantidade: {
                  increment:
                    item.quantidade,
                },
              },
            });

            await tx.movimentacao.create({
              data: {
                produtoId:
                  item.produtoId,

                usuarioId:
                  req.usuario.id,

                tipo:
                  "ENTRADA",

                quantidade:
                  item.quantidade,

                observacao:
                  `Cancelamento da venda ${vendaAtual.codigo}`,
              },
            });
          }

          // ==================================================
          // CANCELAR VENDA
          // ==================================================

          return tx.venda.update({
            where: {
              id,
            },

            data: {
              status:
                "CANCELADA",
            },

            include: {
              itens:
                true,

              caixa: {
                select: {
                  id:
                    true,

                  status:
                    true,
                },
              },
            },
          });
        }
      );

    return res.json(
      venda
    );
  } catch (error) {
    console.error(
      "Erro ao cancelar venda:",
      error
    );

    return res.status(500).json({
      error:
        error.message ||
        "Não foi possível cancelar a venda.",
    });
  }
}

// ============================================================
// EXPORTAÇÕES
// ============================================================

module.exports = {
  criarVenda,
  listarVendas,
  cancelarVenda,
};