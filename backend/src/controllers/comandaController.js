const prisma = require("../services/prisma");

const {
  obterIO,
} = require("../socket");

// ============================================================
// STATUS DOS ITENS DA COMANDA
// ============================================================

const STATUS_ITEM_COMANDA = [
  "PENDENTE",
  "ENVIADO",
  "PREPARANDO",
  "PRONTO",
  "PARCIALMENTE_SERVIDO",
  "SERVIDO",
];

// ============================================================
// TRANSIÇÕES PERMITIDAS
// ============================================================

const TRANSICOES_ITEM = {
  PENDENTE: [
    "ENVIADO",
  ],

  ENVIADO: [
    "PREPARANDO",
  ],

  PREPARANDO: [
    "PRONTO",
  ],

  PRONTO: [
    "PARCIALMENTE_SERVIDO",
    "SERVIDO",
  ],

  PARCIALMENTE_SERVIDO: [
    "PARCIALMENTE_SERVIDO",
    "SERVIDO",
  ],

  SERVIDO: [],
};

// ============================================================
// FORMAS DE PAGAMENTO
// ============================================================

const FORMAS_PAGAMENTO = [
  "DINHEIRO",
  "PIX",
  "CARTAO",
];

// ============================================================
// SOCKET.IO
// ============================================================

function emitirSocket(
  evento,
  dados
) {
  try {
    const io = obterIO();

    io.emit(
      evento,
      dados
    );
  } catch (error) {
    console.error(
      `Erro ao emitir evento Socket.IO "${evento}":`,
      error.message
    );
  }
}

// ============================================================
// BUSCAR USUÁRIO
// ============================================================

async function buscarUsuario(req) {
  return prisma.usuario.findUnique({
    where: {
      id: req.usuario.id,
    },
  });
}

// ============================================================
// PAGAMENTO DA COMANDA
// ============================================================

async function registrarPagamento(
  req,
  res
) {
  try {
    const comandaId = Number(
      req.params.id
    );

    const {
      valor,
      forma,
    } = req.body;

    // --------------------------------------------------------
    // VALIDAÇÕES
    // --------------------------------------------------------

    if (
      !Number.isInteger(
        comandaId
      )
    ) {
      return res.status(400).json({
        error:
          "ID da comanda inválido.",
      });
    }

    if (
      !forma ||
      !FORMAS_PAGAMENTO.includes(
        forma
      )
    ) {
      return res.status(400).json({
        error:
          "Forma de pagamento inválida.",
      });
    }

    const valorPagamento =
      Number(valor);

    if (
      !Number.isFinite(
        valorPagamento
      ) ||
      valorPagamento <= 0
    ) {
      return res.status(400).json({
        error:
          "Informe um valor de pagamento válido.",
      });
    }

    // --------------------------------------------------------
    // USUÁRIO
    // --------------------------------------------------------

    const usuario =
      await buscarUsuario(req);

    if (!usuario) {
      return res.status(404).json({
        error:
          "Usuário não encontrado.",
      });
    }

    if (!usuario.empresaId) {
      return res.status(400).json({
        error:
          "Usuário não está vinculado a uma empresa.",
      });
    }

    // --------------------------------------------------------
    // COMANDA
    // --------------------------------------------------------

    const comanda =
      await prisma.comanda.findFirst({
        where: {
          id: comandaId,

          status: "ABERTA",

          mesa: {
            empresaId:
              usuario.empresaId,
          },
        },

        include: {
          mesa: true,

          itens: {
            include: {
              produto: true,
            },
          },

          pagamentos: true,
        },
      });

    if (!comanda) {
      return res.status(404).json({
        error:
          "Comanda aberta não encontrada.",
      });
    }

    // --------------------------------------------------------
    // SUBTOTAL
    // --------------------------------------------------------

    const subtotal =
      comanda.itens.reduce(
        (
          total,
          item
        ) =>
          total +
          Number(
            item.subtotal || 0
          ),
        0
      );

    // --------------------------------------------------------
    // TOTAL JÁ PAGO
    // --------------------------------------------------------

    const totalPago =
      comanda.pagamentos.reduce(
        (
          total,
          pagamento
        ) =>
          total +
          Number(
            pagamento.valor || 0
          ),
        0
      );

    // --------------------------------------------------------
    // RESTANTE
    // --------------------------------------------------------

    const restante =
      Math.max(
        0,
        subtotal -
          totalPago
      );

    if (restante <= 0) {
      return res.status(400).json({
        error:
          "Esta comanda já está totalmente paga.",
      });
    }

    if (
      valorPagamento >
      restante + 0.01
    ) {
      return res.status(400).json({
        error: `O valor máximo permitido é R$ ${restante
          .toFixed(2)
          .replace(".", ",")}.`,
      });
    }

    // --------------------------------------------------------
    // TRANSAÇÃO
    // --------------------------------------------------------

    const resultado =
      await prisma.$transaction(
        async (tx) => {
          // ================================================
          // CRIAR PAGAMENTO
          // ================================================

          const pagamento =
            await tx.pagamento.create({
              data: {
                comandaId:
                  comanda.id,

                valor:
                  Number(
                    valorPagamento.toFixed(
                      2
                    )
                  ),

                forma,

                status:
                  "PAGO",
              },
            });

          const novoTotalPago =
            totalPago +
            valorPagamento;

          const quitada =
            novoTotalPago >=
            subtotal - 0.01;

          // ================================================
          // PAGAMENTO PARCIAL
          // ================================================

          if (!quitada) {
            return {
              pagamento,

              quitada: false,

              comandaId:
                comanda.id,

              totalPago:
                novoTotalPago,

              restante:
                Math.max(
                  0,
                  subtotal -
                    novoTotalPago
                ),
            };
          }

          // ================================================
          // VALIDAR ESTOQUE
          // ================================================

          for (
            const item of
            comanda.itens
          ) {
            const produto =
              await tx.produto.findUnique(
                {
                  where: {
                    id:
                      item.produtoId,
                  },
                }
              );

            if (!produto) {
              throw new Error(
                `Produto ${item.produtoId} não encontrado.`
              );
            }

            if (!produto.ativo) {
              throw new Error(
                `O produto "${produto.nome}" está inativo.`
              );
            }

            if (
              produto.quantidade <
              item.quantidade
            ) {
              throw new Error(
                `Estoque insuficiente para "${produto.nome}". Disponível: ${produto.quantidade}.`
              );
            }
          }

          // ================================================
          // PAGAMENTOS ATUALIZADOS
          // ================================================

          const pagamentosAtualizados =
            await tx.pagamento.findMany(
              {
                where: {
                  comandaId:
                    comanda.id,
                },

                orderBy: {
                  criadoEm: "asc",
                },
              }
            );

          const formas =
            [
              ...new Set(
                pagamentosAtualizados.map(
                  (
                    pagamento
                  ) =>
                    pagamento.forma
                )
              ),
            ];

          const formaPagamento =
            formas.length === 1
              ? formas[0]
              : "MISTO";

          // ================================================
          // CRIAR VENDA
          // ================================================

          const venda =
            await tx.venda.create({
              data: {
                usuarioId:
                  comanda.usuarioId,

                empresaId:
                  usuario.empresaId,

                comandaId:
                  comanda.id,

                subtotal,

                desconto: 0,

                total: subtotal,

                formaPagamento,

                status:
                  "FINALIZADA",

                observacao:
                  comanda.observacao ||
                  null,

                itens: {
                  create:
                    comanda.itens.map(
                      (item) => ({
                        produtoId:
                          item.produtoId,

                        nomeProduto:
                          item.produto.nome,

                        quantidade:
                          item.quantidade,

                        precoUnitario:
                          item.precoUnitario,

                        subtotal:
                          item.subtotal,
                      })
                    ),
                },
              },

              include: {
                itens: true,
              },
            });

          // ================================================
          // BAIXA DO ESTOQUE
          // ================================================

          for (
            const item of
            comanda.itens
          ) {
            const alterado =
              await tx.produto.updateMany(
                {
                  where: {
                    id:
                      item.produtoId,

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
                }
              );

            if (
              alterado.count !==
              1
            ) {
              throw new Error(
                "O estoque foi alterado durante o fechamento. Tente novamente."
              );
            }

            await tx.movimentacao.create(
              {
                data: {
                  produtoId:
                    item.produtoId,

                  usuarioId:
                    comanda.usuarioId,

                  tipo: "SAIDA",

                  quantidade:
                    item.quantidade,

                  observacao:
                    `Venda da comanda #${comanda.id}`,
                },
              }
            );
          }

          // ================================================
          // FECHAR COMANDA
          // ================================================

          const comandaFechada =
            await tx.comanda.update({
              where: {
                id:
                  comanda.id,
              },

              data: {
                status:
                  "FECHADA",

                fechadoEm:
                  new Date(),

                vendaId:
                  venda.id,
              },
            });

          // ================================================
          // LIBERAR MESA
          // ================================================

          let mesaLiberada =
            null;

          if (
            comanda.mesaId
          ) {
            mesaLiberada =
              await tx.mesa.update({
                where: {
                  id:
                    comanda.mesaId,
                },

                data: {
                  status:
                    "LIVRE",
                },
              });
          }

          // ================================================
          // RETORNO
          // ================================================

          return {
            pagamento,

            quitada: true,

            comandaId:
              comanda.id,

            totalPago:
              novoTotalPago,

            restante: 0,

            venda,

            comanda:
              comandaFechada,

            mesa:
              mesaLiberada,
          };
        },
        {
          maxWait: 10000,
          timeout: 20000,
        }
      );

    // ======================================================
    // SOCKET - PAGAMENTO
    // ======================================================

    emitirSocket(
      "pagamento-comanda-atualizado",
      {
        comandaId:
          resultado.comandaId,

        pagamento:
          resultado.pagamento,

        totalPago:
          resultado.totalPago,

        restante:
          resultado.restante,

        quitada:
          resultado.quitada,
      }
    );

    // ======================================================
    // SOCKET - COMANDA FECHADA
    // ======================================================

    if (
      resultado.quitada
    ) {
      emitirSocket(
        "comanda-fechada",
        {
          comandaId:
            resultado.comandaId,

          vendaId:
            resultado.venda?.id ||
            null,

          mesaId:
            resultado.comanda
              ?.mesaId ||
            null,
        }
      );

      if (
        resultado.mesa
      ) {
        emitirSocket(
          "mesa-liberada",
          {
            mesaId:
              resultado.mesa.id,

            status:
              resultado.mesa.status,
          }
        );
      }
    }

    return res.status(200).json({
      success: true,
      ...resultado,
    });
  } catch (error) {
    console.error(
      "Erro ao registrar pagamento:",
      error
    );

    return res.status(400).json({
      error:
        error.message ||
        "Não foi possível registrar o pagamento.",
    });
  }
}

// ============================================================
// ABRIR COMANDA
// ============================================================

async function abrirComanda(
  req,
  res
) {
  try {
    const usuario =
      await buscarUsuario(req);

    if (!usuario) {
      return res.status(404).json({
        error:
          "Usuário não encontrado.",
      });
    }

    if (!usuario.empresaId) {
      return res.status(400).json({
        error:
          "Usuário não está vinculado a uma empresa.",
      });
    }

    const mesaId =
      Number(
        req.body.mesaId
      );

    if (
      !Number.isInteger(
        mesaId
      )
    ) {
      return res.status(400).json({
        error:
          "Mesa inválida.",
      });
    }

    // --------------------------------------------------------
    // BUSCAR MESA
    // --------------------------------------------------------

    const mesa =
      await prisma.mesa.findFirst({
        where: {
          id: mesaId,

          empresaId:
            usuario.empresaId,
        },

        include: {
          comandas: {
            where: {
              status:
                "ABERTA",
            },
          },
        },
      });

    if (!mesa) {
      return res.status(404).json({
        error:
          "Mesa não encontrada.",
      });
    }

    if (
      mesa.status ===
      "RESERVADA"
    ) {
      return res.status(400).json({
        error:
          "Esta mesa está reservada.",
      });
    }

    // --------------------------------------------------------
    // COMANDA EXISTENTE
    // --------------------------------------------------------

    const comandaExistente =
      mesa.comandas[0];

    if (
      comandaExistente
    ) {
      return res.status(400).json({
        error:
          "Esta mesa já possui uma comanda aberta.",

        comanda:
          comandaExistente,
      });
    }

    // --------------------------------------------------------
    // TRANSAÇÃO
    // --------------------------------------------------------

    const comanda =
      await prisma.$transaction(
        async (tx) => {
          const novaComanda =
            await tx.comanda.create({
              data: {
                mesaId:
                  mesa.id,

                usuarioId:
                  usuario.id,

                status:
                  "ABERTA",
              },

              include: {
                mesa: true,

                usuario: {
                  select: {
                    id: true,
                    nome: true,
                  },
                },

                itens: true,
              },
            });

          await tx.mesa.update({
            where: {
              id:
                mesa.id,
            },

            data: {
              status:
                "OCUPADA",
            },
          });

          return novaComanda;
        }
      );

    // --------------------------------------------------------
    // SOCKET
    // --------------------------------------------------------

    emitirSocket(
      "comanda-aberta",
      {
        comandaId:
          comanda.id,

        mesaId:
          comanda.mesaId,

        usuarioId:
          comanda.usuarioId,

        status:
          comanda.status,
      }
    );

    emitirSocket(
      "mesa-atualizada",
      {
        mesaId:
          comanda.mesaId,

        status:
          "OCUPADA",
      }
    );

    return res.status(201).json(
      comanda
    );
  } catch (error) {
    console.error(
      "Erro ao abrir comanda:",
      error
    );

    return res.status(500).json({
      error:
        "Erro ao abrir comanda.",
    });
  }
}

// ============================================================
// OBTER COMANDA
// ============================================================

async function obterComanda(req, res) {
  try {
    const id = Number(req.params.id);

    console.log(
      "[COMANDA API] GET /comandas/",
      id
    );

    if (!Number.isInteger(id)) {
      return res.status(400).json({
        error: "ID da comanda inválido.",
      });
    }

    const usuario =
      await buscarUsuario(req);

    if (!usuario) {
      return res.status(404).json({
        error:
          "Usuário não encontrado.",
      });
    }

    if (!usuario.empresaId) {
      return res.status(400).json({
        error:
          "Usuário não está vinculado a uma empresa.",
      });
    }

    const comanda =
      await prisma.comanda.findFirst({
        where: {
          id,

          mesa: {
            empresaId:
              usuario.empresaId,
          },
        },

        include: {
          mesa: true,

          usuario: {
            select: {
              id: true,
              nome: true,
            },
          },

          itens: {
            include: {
              produto: {
                select: {
                  id: true,
                  nome: true,
                  codigoBarra: true,
                  precoVenda: true,
                },
              },
            },

            orderBy: {
              criadoEm:
                "asc",
            },
          },

          pagamentos: {
            orderBy: {
              criadoEm:
                "asc",
            },
          },
        },
      });

    if (!comanda) {
      return res.status(404).json({
        error:
          "Comanda não encontrada.",
      });
    }

    // --------------------------------------------------------
    // SUBTOTAL
    // --------------------------------------------------------

    const subtotal =
      comanda.itens.reduce(
        (
          soma,
          item
        ) =>
          soma +
          Number(
            item.quantidade
          ) *
          Number(
            item.precoUnitario
          ),
        0
      );

    // --------------------------------------------------------
    // TOTAL PAGO
    // --------------------------------------------------------

    const totalPago =
      comanda.pagamentos.reduce(
        (
          soma,
          pagamento
        ) =>
          soma +
          Number(
            pagamento.valor
          ),
        0
      );

    const total =
      subtotal;

    const restante =
      Math.max(
        0,
        total -
          totalPago
      );

    return res.json({
      ...comanda,

      resumo: {
        subtotal,
        totalPago,
        total,
        restante,
      },
    });
  } catch (error) {
    console.error(
      "Erro ao obter comanda:",
      error
    );

    return res.status(500).json({
      error:
        "Erro ao obter comanda.",
    });
  }
}

// ============================================================
// ADICIONAR ITEM
// ============================================================

async function adicionarItem(
  req,
  res
) {
  try {
    const comandaId =
      Number(
        req.params.id
      );

    const produtoId =
      Number(
        req.body.produtoId
      );

    const quantidade =
      Number(
        req.body.quantidade
      );

    const observacao =
      req.body.observacao ||
      null;

    // --------------------------------------------------------
    // VALIDAÇÕES
    // --------------------------------------------------------

    if (
      !Number.isInteger(
        comandaId
      ) ||
      !Number.isInteger(
        produtoId
      ) ||
      !Number.isInteger(
        quantidade
      ) ||
      quantidade <= 0
    ) {
      return res.status(400).json({
        error:
          "Dados do item inválidos.",
      });
    }

    // --------------------------------------------------------
    // USUÁRIO
    // --------------------------------------------------------

    const usuario =
      await buscarUsuario(req);

    if (!usuario) {
      return res.status(404).json({
        error:
          "Usuário não encontrado.",
      });
    }

    if (!usuario.empresaId) {
      return res.status(400).json({
        error:
          "Usuário não está vinculado a uma empresa.",
      });
    }

    // --------------------------------------------------------
    // COMANDA
    // --------------------------------------------------------

    const comanda =
      await prisma.comanda.findFirst({
        where: {
          id:
            comandaId,

          status:
            "ABERTA",

          mesa: {
            empresaId:
              usuario.empresaId,
          },
        },
      });

    if (!comanda) {
      return res.status(404).json({
        error:
          "Comanda aberta não encontrada.",
      });
    }

    // --------------------------------------------------------
    // PRODUTO
    // --------------------------------------------------------

    const produto =
      await prisma.produto.findFirst({
        where: {
          id:
            produtoId,

          ativo: true,
        },
      });

    if (!produto) {
      return res.status(404).json({
        error:
          "Produto não encontrado.",
      });
    }

    // --------------------------------------------------------
    // ESTOQUE
    // --------------------------------------------------------

    if (
      produto.quantidade <
      quantidade
    ) {
      return res.status(400).json({
        error: `Estoque insuficiente. Disponível: ${produto.quantidade}.`,
      });
    }

    // --------------------------------------------------------
    // SUBTOTAL
    // --------------------------------------------------------

    const subtotal =
      Number(
        produto.precoVenda
      ) *
      quantidade;

    // --------------------------------------------------------
    // CRIAR ITEM
    // --------------------------------------------------------

    const item =
      await prisma.comandaItem.create(
        {
          data: {
            comandaId,

            produtoId,

            quantidade,

            quantidadeServida:
              0,

            precoUnitario:
              Number(
                produto.precoVenda
              ),

            subtotal,

            observacao,

            status:
              "PENDENTE",
          },

          include: {
            produto: {
              select: {
                id: true,
                nome: true,
                precoVenda: true,
              },
            },
          },
        }
      );

    // --------------------------------------------------------
    // SOCKET
    // --------------------------------------------------------

    emitirSocket(
      "item-comanda-adicionado",
      {
        comandaId:
          comanda.id,

        itemId:
          item.id,

        produtoId:
          item.produtoId,

        produto:
          item.produto,

        quantidade:
          item.quantidade,

        quantidadeServida:
          item.quantidadeServida,

        status:
          item.status,
      }
    );

    return res.status(201).json(
      item
    );
  } catch (error) {
    console.error(
      "Erro ao adicionar item:",
      error
    );

    return res.status(500).json({
      error:
        "Erro ao adicionar item à comanda.",
    });
  }
}

// ============================================================
// ALTERAR QUANTIDADE DO ITEM
// ============================================================

async function alterarItem(
  req,
  res
) {
  try {
    const itemId =
      Number(
        req.params.itemId
      );

    const quantidade =
      Number(
        req.body.quantidade
      );

    if (
      !Number.isInteger(
        itemId
      ) ||
      !Number.isInteger(
        quantidade
      ) ||
      quantidade <= 0
    ) {
      return res.status(400).json({
        error:
          "Quantidade inválida.",
      });
    }

    const usuario =
      await buscarUsuario(req);

    if (!usuario) {
      return res.status(404).json({
        error:
          "Usuário não encontrado.",
      });
    }

    if (!usuario.empresaId) {
      return res.status(400).json({
        error:
          "Usuário não está vinculado a uma empresa.",
      });
    }

    const item =
      await prisma.comandaItem.findFirst(
        {
          where: {
            id:
              itemId,

            comanda: {
              status:
                "ABERTA",

              mesa: {
                empresaId:
                  usuario.empresaId,
              },
            },
          },

          include: {
            produto: true,
          },
        }
      );

    if (!item) {
      return res.status(404).json({
        error:
          "Item não encontrado.",
      });
    }

    // --------------------------------------------------------
    // ITEM JÁ ENVIADO
    // --------------------------------------------------------

    if (
      (item.status ||
        "PENDENTE") !==
      "PENDENTE"
    ) {
      return res.status(400).json({
        error:
          "Este item já foi enviado para atendimento e não pode mais ter a quantidade alterada.",
      });
    }

    // --------------------------------------------------------
    // ESTOQUE
    // --------------------------------------------------------

    if (
      item.produto.quantidade <
      quantidade
    ) {
      return res.status(400).json({
        error: `Estoque insuficiente. Disponível: ${item.produto.quantidade}.`,
      });
    }

    // --------------------------------------------------------
    // ATUALIZAR
    // --------------------------------------------------------

    const atualizado =
      await prisma.comandaItem.update(
        {
          where: {
            id:
              itemId,
          },

          data: {
            quantidade,

            subtotal:
              Number(
                item.precoUnitario
              ) *
              quantidade,
          },

          include: {
            produto: {
              select: {
                id: true,
                nome: true,
                precoVenda: true,
              },
            },
          },
        }
      );

    // --------------------------------------------------------
    // SOCKET
    // --------------------------------------------------------

    emitirSocket(
      "item-comanda-atualizado",
      {
        comandaId:
          item.comandaId,

        itemId:
          atualizado.id,

        produtoId:
          atualizado.produtoId,

        produto:
          atualizado.produto,

        quantidade:
          atualizado.quantidade,

        quantidadeServida:
          atualizado.quantidadeServida,

        status:
          atualizado.status ||
          "PENDENTE",
      }
    );

    return res.json(
      atualizado
    );
  } catch (error) {
    console.error(
      "Erro ao alterar item:",
      error
    );

    return res.status(500).json({
      error:
        "Erro ao alterar item.",
    });
  }
}

// ============================================================
// REMOVER ITEM
// ============================================================

async function removerItem(
  req,
  res
) {
  try {
    const itemId =
      Number(
        req.params.itemId
      );

    if (
      !Number.isInteger(
        itemId
      )
    ) {
      return res.status(400).json({
        error:
          "ID do item inválido.",
      });
    }

    const usuario =
      await buscarUsuario(req);

    if (!usuario) {
      return res.status(404).json({
        error:
          "Usuário não encontrado.",
      });
    }

    if (!usuario.empresaId) {
      return res.status(400).json({
        error:
          "Usuário não está vinculado a uma empresa.",
      });
    }

    const item =
      await prisma.comandaItem.findFirst(
        {
          where: {
            id:
              itemId,

            comanda: {
              status:
                "ABERTA",

              mesa: {
                empresaId:
                  usuario.empresaId,
              },
            },
          },

          include: {
            produto: {
              select: {
                id: true,
                nome: true,
              },
            },
          },
        }
      );

    if (!item) {
      return res.status(404).json({
        error:
          "Item não encontrado.",
      });
    }

    // --------------------------------------------------------
    // ITEM JÁ ENVIADO
    // --------------------------------------------------------

    if (
      (item.status ||
        "PENDENTE") !==
      "PENDENTE"
    ) {
      return res.status(400).json({
        error:
          "Este item já foi enviado para atendimento e não pode mais ser removido.",
      });
    }

    // --------------------------------------------------------
    // REMOVER
    // --------------------------------------------------------

    await prisma.comandaItem.delete(
      {
        where: {
          id:
            itemId,
        },
      }
    );

    // --------------------------------------------------------
    // SOCKET
    // --------------------------------------------------------

    emitirSocket(
      "item-comanda-removido",
      {
        comandaId:
          item.comandaId,

        itemId:
          item.id,

        produtoId:
          item.produtoId,

        produto:
          item.produto,
      }
    );

    return res.json({
      message:
        "Item removido com sucesso.",
    });
  } catch (error) {
    console.error(
      "Erro ao remover item:",
      error
    );

    return res.status(500).json({
      error:
        "Erro ao remover item.",
    });
  }
}

// ============================================================
// ATUALIZAR STATUS DO ITEM
// ============================================================

async function atualizarStatusItem(
  req,
  res
) {
  try {
    const comandaId =
      Number(
        req.params.id
      );

    const itemId =
      Number(
        req.params.itemId
      );

    const {
      status,
      quantidadeServida,
    } = req.body;

    // --------------------------------------------------------
    // VALIDAR IDS
    // --------------------------------------------------------

    if (
      !Number.isInteger(
        comandaId
      ) ||
      !Number.isInteger(
        itemId
      )
    ) {
      return res.status(400).json({
        error:
          "ID da comanda ou item inválido.",
      });
    }

    // --------------------------------------------------------
    // VALIDAR STATUS
    // --------------------------------------------------------

    if (
      !STATUS_ITEM_COMANDA.includes(
        status
      )
    ) {
      return res.status(400).json({
        error:
          "Status do item inválido.",
      });
    }

    // --------------------------------------------------------
    // USUÁRIO
    // --------------------------------------------------------

    const usuario =
      await buscarUsuario(req);

    if (!usuario) {
      return res.status(404).json({
        error:
          "Usuário não encontrado.",
      });
    }

    if (!usuario.empresaId) {
      return res.status(400).json({
        error:
          "Usuário não está vinculado a uma empresa.",
      });
    }

    // --------------------------------------------------------
    // ITEM
    // --------------------------------------------------------

    const item =
      await prisma.comandaItem.findFirst(
        {
          where: {
            id:
              itemId,

            comandaId,

            comanda: {
              status:
                "ABERTA",

              mesa: {
                empresaId:
                  usuario.empresaId,
              },
            },
          },

          include: {
            produto: true,
            comanda: true,
          },
        }
      );

    if (!item) {
      return res.status(404).json({
        error:
          "Item da comanda não encontrado.",
      });
    }

    // --------------------------------------------------------
    // STATUS ATUAL
    // --------------------------------------------------------

    const statusAtual =
      item.status ||
      "PENDENTE";

    const transicoes =
      TRANSICOES_ITEM[
        statusAtual
      ] || [];

    if (
      !transicoes.includes(
        status
      )
    ) {
      return res.status(400).json({
        error: `Não é possível mudar o item de "${statusAtual}" para "${status}".`,
      });
    }

    // --------------------------------------------------------
    // QUANTIDADE SERVIDA ATUAL
    // --------------------------------------------------------

    let novaQuantidadeServida =
      Number(
        item.quantidadeServida ||
          0
      );

    // --------------------------------------------------------
    // ETAPAS ANTES DE SERVIR
    // --------------------------------------------------------

    if (
      status === "ENVIADO" ||
      status === "PREPARANDO" ||
      status === "PRONTO"
    ) {
      novaQuantidadeServida =
        Number(
          item.quantidadeServida ||
            0
        );

      if (
        novaQuantidadeServida >
        0
      ) {
        return res.status(400).json({
          error:
            "O item já possui quantidade servida registrada.",
        });
      }
    }

    // --------------------------------------------------------
    // SERVIÇO PARCIAL
    // --------------------------------------------------------

    if (
      status ===
      "PARCIALMENTE_SERVIDO"
    ) {
      novaQuantidadeServida =
        Number(
          quantidadeServida
        );

      if (
        !Number.isInteger(
          novaQuantidadeServida
        )
      ) {
        return res.status(400).json({
          error:
            "Informe uma quantidade servida válida.",
        });
      }

      if (
        novaQuantidadeServida <=
        Number(
          item.quantidadeServida ||
            0
        )
      ) {
        return res.status(400).json({
          error:
            "A quantidade servida deve ser maior que a anterior.",
        });
      }

      if (
        novaQuantidadeServida >=
        item.quantidade
      ) {
        return res.status(400).json({
          error:
            "Quando toda a quantidade for servida, use o status SERVIDO.",
        });
      }
    }

    // --------------------------------------------------------
    // SERVIDO COMPLETAMENTE
    // --------------------------------------------------------

    if (
      status === "SERVIDO"
    ) {
      novaQuantidadeServida =
        item.quantidade;
    }

    // --------------------------------------------------------
    // DATAS
    // --------------------------------------------------------

    const agora =
      new Date();

    const dataAtualizacao =
      {
        status,

        quantidadeServida:
          novaQuantidadeServida,
      };

    if (
      status === "ENVIADO" &&
      !item.enviadoEm
    ) {
      dataAtualizacao.enviadoEm =
        agora;
    }

    if (
      status === "PREPARANDO" &&
      !item.preparandoEm
    ) {
      dataAtualizacao.preparandoEm =
        agora;
    }

    if (
      status === "PRONTO" &&
      !item.prontoEm
    ) {
      dataAtualizacao.prontoEm =
        agora;
    }

    if (
      status === "SERVIDO"
    ) {
      dataAtualizacao.servidoEm =
        agora;
    }

    // --------------------------------------------------------
    // ATUALIZAR
    // --------------------------------------------------------

    const atualizado =
      await prisma.comandaItem.update(
        {
          where: {
            id:
              item.id,
          },

          data:
            dataAtualizacao,

          include: {
            produto: {
              select: {
                id: true,
                nome: true,
                precoVenda: true,
              },
            },
          },
        }
      );

    // --------------------------------------------------------
    // SOCKET
    // --------------------------------------------------------

    emitirSocket(
      "item-comanda-atualizado",
      {
        comandaId:
          item.comandaId,

        itemId:
          atualizado.id,

        produtoId:
          atualizado.produtoId,

        produto:
          atualizado.produto,

        status:
          atualizado.status,

        quantidade:
          atualizado.quantidade,

        quantidadeServida:
          atualizado.quantidadeServida,

        enviadoEm:
          atualizado.enviadoEm,

        preparandoEm:
          atualizado.preparandoEm,

        prontoEm:
          atualizado.prontoEm,

        servidoEm:
          atualizado.servidoEm,
      }
    );

    return res.json({
      success: true,

      item:
        atualizado,
    });
  } catch (error) {
    console.error(
      "Erro ao atualizar status do item:",
      error
    );

    return res.status(500).json({
      error:
        "Erro ao atualizar status do item.",
    });
  }
}

// ============================================================
// EXPORTAÇÕES
// ============================================================

module.exports = {
  abrirComanda,
  obterComanda,
  adicionarItem,
  alterarItem,
  removerItem,
  atualizarStatusItem,
  registrarPagamento,
};