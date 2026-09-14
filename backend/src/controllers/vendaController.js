const prisma = require("../services/prisma");

const FORMAS_PAGAMENTO = [
  "DINHEIRO",
  "PIX",
  "CARTAO",
];

async function criarVenda(req, res) {
  try {
    const { itens, desconto = 0, formaPagamento, observacao } = req.body;

    if (!Array.isArray(itens) || itens.length === 0) {
      return res.status(400).json({
        error: "Adicione pelo menos um produto à venda.",
      });
    }

    if (!FORMAS_PAGAMENTO.includes(formaPagamento)) {
      return res.status(400).json({
        error: "Forma de pagamento inválida.",
      });
    }

    const descontoNumerico = Number(desconto);

    if (
      !Number.isFinite(descontoNumerico) ||
      descontoNumerico < 0
    ) {
      return res.status(400).json({
        error: "Desconto inválido.",
      });
    }

    const itensNormalizados = itens.map((item) => ({
      produtoId: Number(item.produtoId),
      quantidade: Number(item.quantidade),
    }));

    for (const item of itensNormalizados) {
      if (
        !Number.isInteger(item.produtoId) ||
        !Number.isInteger(item.quantidade) ||
        item.quantidade <= 0
      ) {
        return res.status(400).json({
          error: "Produto ou quantidade inválida.",
        });
      }
    }

    const produtoIds = [
      ...new Set(itensNormalizados.map((item) => item.produtoId)),
    ];

    const venda = await prisma.$transaction(async (tx) => {
      const produtos = await tx.produto.findMany({
        where: {
          id: {
            in: produtoIds,
          },
          ativo: true,
        },
      });

      if (produtos.length !== produtoIds.length) {
        throw new Error("Um ou mais produtos não foram encontrados.");
      }

      const mapaProdutos = new Map(
        produtos.map((produto) => [produto.id, produto])
      );

      let subtotal = 0;

      const itensVenda = [];

      for (const item of itensNormalizados) {
        const produto = mapaProdutos.get(item.produtoId);

        if (!produto) {
          throw new Error("Produto não encontrado.");
        }

        if (produto.quantidade < item.quantidade) {
          throw new Error(
            `Estoque insuficiente para "${produto.nome}". Disponível: ${produto.quantidade}.`
          );
        }

        const precoUnitario = Number(produto.precoVenda);
        const subtotalItem = precoUnitario * item.quantidade;

        subtotal += subtotalItem;

        itensVenda.push({
          produto,
          quantidade: item.quantidade,
          precoUnitario,
          subtotal: subtotalItem,
        });
      }

      if (descontoNumerico > subtotal) {
        throw new Error(
          "O desconto não pode ser maior que o subtotal."
        );
      }

      const total = subtotal - descontoNumerico;

      const vendaCriada = await tx.venda.create({
        data: {
          usuarioId: req.usuario.id,
          empresaId: req.usuario.empresaId || null,
          subtotal,
          desconto: descontoNumerico,
          total,
          formaPagamento,
          observacao: observacao || null,
        },
      });

      for (const item of itensVenda) {
        const estoqueAtualizado =
          await tx.produto.updateMany({
            where: {
              id: item.produto.id,
              quantidade: {
                gte: item.quantidade,
              },
            },
            data: {
              quantidade: {
                decrement: item.quantidade,
              },
            },
          });

        if (estoqueAtualizado.count !== 1) {
          throw new Error(
            `Estoque insuficiente para "${item.produto.nome}".`
          );
        }

        await tx.itemVenda.create({
          data: {
            vendaId: vendaCriada.id,
            produtoId: item.produto.id,
            nomeProduto: item.produto.nome,
            quantidade: item.quantidade,
            precoUnitario: item.precoUnitario,
            subtotal: item.subtotal,
          },
        });

        await tx.movimentacao.create({
          data: {
            produtoId: item.produto.id,
            usuarioId: req.usuario.id,
            tipo: "SAIDA",
            quantidade: item.quantidade,
            observacao: `Venda ${vendaCriada.codigo}`,
          },
        });
      }

      return tx.venda.findUnique({
        where: {
          id: vendaCriada.id,
        },
        include: {
          itens: true,
        },
      });
    });

    res.status(201).json(venda);
  } catch (error) {
    res.status(500).json({
      error: error.message,
    });
  }
}

async function listarVendas(req, res) {
  try {
    const vendas = await prisma.venda.findMany({
      orderBy: {
        criadoEm: "desc",
      },
      take: 50,
      include: {
        itens: true,
        usuario: {
          select: {
            id: true,
            nome: true,
          },
        },
      },
    });

    res.json(vendas);
  } catch (error) {
    res.status(500).json({
      error: error.message,
    });
  }
}

async function cancelarVenda(req, res) {
  try {
    const id = Number(req.params.id);

    const venda = await prisma.$transaction(async (tx) => {
      const vendaAtual = await tx.venda.findUnique({
        where: { id },
        include: {
          itens: true,
        },
      });

      if (!vendaAtual) {
        throw new Error("Venda não encontrada.");
      }

      if (vendaAtual.status === "CANCELADA") {
        throw new Error("Esta venda já foi cancelada.");
      }

      for (const item of vendaAtual.itens) {
        await tx.produto.update({
          where: {
            id: item.produtoId,
          },
          data: {
            quantidade: {
              increment: item.quantidade,
            },
          },
        });

        await tx.movimentacao.create({
          data: {
            produtoId: item.produtoId,
            usuarioId: req.usuario.id,
            tipo: "ENTRADA",
            quantidade: item.quantidade,
            observacao: `Cancelamento da venda ${vendaAtual.codigo}`,
          },
        });
      }

      return tx.venda.update({
        where: {
          id,
        },
        data: {
          status: "CANCELADA",
        },
        include: {
          itens: true,
        },
      });
    });

    res.json(venda);
  } catch (error) {
    res.status(500).json({
      error: error.message,
    });
  }
}

module.exports = {
  criarVenda,
  listarVendas,
  cancelarVenda,
};