const prisma = require("./prisma");

async function atualizarEstoque(produtoId, tipo, quantidade) {
  const produto = await prisma.produto.findUnique({
    where: { id: Number(produtoId) },
  });

  if (!produto) {
    throw new Error("Produto não encontrado");
  }

  let novoSaldo = produto.quantidade;

  if (tipo === "ENTRADA") {
    novoSaldo += quantidade;
  } else if (tipo === "SAIDA") {
    if (produto.quantidade < quantidade) {
      throw new Error("Estoque insuficiente");
    }
    novoSaldo -= quantidade;
  } else {
    throw new Error("Tipo inválido");
  }

  return prisma.produto.update({
    where: { id: Number(produtoId) },
    data: { quantidade: novoSaldo },
  });
}

module.exports = { atualizarEstoque };