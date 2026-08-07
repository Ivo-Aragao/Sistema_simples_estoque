const prisma = require("../services/prisma");

async function resumoDashboard(req, res) {
  try {
    const inicioMes = new Date();
    inicioMes.setDate(1);
    inicioMes.setHours(0, 0, 0, 0);

    const [totalProdutos, movimentacoesMes, entradasMes, saidasMes, produtos] =
      await Promise.all([
        prisma.produto.count(),
        prisma.movimentacao.count({
          where: { dataMovimentacao: { gte: inicioMes } },
        }),
        prisma.movimentacao.count({
          where: {
            dataMovimentacao: { gte: inicioMes },
            tipo: "ENTRADA",
          },
        }),
        prisma.movimentacao.count({
          where: {
            dataMovimentacao: { gte: inicioMes },
            tipo: "SAIDA",
          },
        }),
        prisma.produto.findMany({
          orderBy: [{ quantidade: "asc" }, { nome: "asc" }],
        }),
      ]);

    const produtosBaixoEstoque = produtos.filter(
      (p) => p.quantidade <= p.estoqueMinimo
    );

    const ultimasMovimentacoes = await prisma.movimentacao.findMany({
      include: { produto: true },
      orderBy: { dataMovimentacao: "desc" },
      take: 5,
    });

    res.json({
      totalProdutos,
      produtosBaixoEstoque: produtosBaixoEstoque.length,
      movimentacoesMes,
      entradasMes,
      saidasMes,
      alertas: produtosBaixoEstoque.slice(0, 5),
      ultimasMovimentacoes,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}

module.exports = { resumoDashboard };