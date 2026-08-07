const prisma = require("../services/prisma");

async function listarMovimentacoes(req, res) {
  try {
    const movimentacoes = await prisma.movimentacao.findMany({
      include: {
        produto: true,
      },
      orderBy: {
        dataMovimentacao: "desc",
      },
    });

    return res.json(movimentacoes);
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      error: "Erro ao listar movimentações.",
    });
  }
}

async function criarMovimentacao(req, res) {
  try {
    const { produtoId, tipo, quantidade, observacao } = req.body;

    const movimentacao = await prisma.movimentacao.create({
      data: {
        produtoId: Number(produtoId),
        tipo,
        quantidade: Number(quantidade),
        observacao,
      },
      include: {
        produto: true,
      },
    });

    return res.status(201).json(movimentacao);
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      error: "Erro ao criar movimentação.",
    });
  }
}

module.exports = {
  listarMovimentacoes,
  criarMovimentacao,
};