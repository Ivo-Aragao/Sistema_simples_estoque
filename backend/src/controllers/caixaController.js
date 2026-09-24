const prisma = require("../services/prisma");

const {
  garantirCaixaDoDia,
  calcularResumoCaixa,
} = require("../services/caixaService");

async function obterCaixaAtual(req, res) {
  try {
    const empresaId = req.usuario.empresaId;

    if (!empresaId) {
      return res.status(400).json({
        error: "Usuário não está vinculado a uma empresa.",
      });
    }

    const caixa = await garantirCaixaDoDia(empresaId);

    if (!caixa) {
      return res.json({
        aberto: false,
        caixa: null,
      });
    }

    const resumo = await calcularResumoCaixa(caixa.id);

    const saldoInicial = Number(caixa.saldoInicial) || 0;

    const saldoEsperado =
      saldoInicial + resumo.totalDinheiro;

    return res.json({
      aberto: true,

      caixa: {
        ...caixa,

        saldoEsperado,

        totalVendas: resumo.totalVendas,
        totalDinheiro: resumo.totalDinheiro,
        totalPix: resumo.totalPix,
        totalCartao: resumo.totalCartao,
        totalOutros: resumo.totalOutros,
      },
    });
  } catch (error) {
    console.error("Erro ao consultar caixa:", error);

    return res.status(500).json({
      error: "Erro ao consultar caixa.",
    });
  }
}

async function abrirCaixa(req, res) {
  try {
    const empresaId = req.usuario.empresaId;

    if (!empresaId) {
      return res.status(400).json({
        error: "Usuário não está vinculado a uma empresa.",
      });
    }

    const saldoInicial = Number(req.body?.saldoInicial ?? 0);

    if (!Number.isFinite(saldoInicial) || saldoInicial < 0) {
      return res.status(400).json({
        error: "Saldo inicial inválido.",
      });
    }

    const caixa = await prisma.$transaction(async (tx) => {
      const caixaExistente =
  await tx.caixa.findFirst({
    where: {
      empresaId,
      status: "ABERTO",
    },
  });

if (caixaExistente) {
  throw new Error(
    "Já existe um caixa aberto para esta empresa."
  );
}
      return tx.caixa.create({
        data: {
          empresaId,

          usuarioAberturaId: req.usuario.id,

          saldoInicial,

          saldoEsperado: saldoInicial,

          status: "ABERTO",

          aberturaAutomatica: false,
          fechamentoAutomatico: false,
        },
      });
    });

    return res.status(201).json({
      message: "Caixa aberto com sucesso.",
      caixa,
    });
  } catch (error) {
    console.error("Erro ao abrir caixa:", error);

    return res.status(400).json({
      error: error.message,
    });
  }
}

async function fecharCaixa(req, res) {
  try {
    const empresaId = req.usuario.empresaId;

    if (!empresaId) {
      return res.status(400).json({
        error: "Usuário não está vinculado a uma empresa.",
      });
    }

    const saldoFinal = Number(req.body?.saldoFinal);

    if (!Number.isFinite(saldoFinal) || saldoFinal < 0) {
      return res.status(400).json({
        error: "Saldo final inválido.",
      });
    }

    const resultado = await prisma.$transaction(async (tx) => {
      const caixa = await garantirCaixaDoDia(empresaId, tx);

      if (!caixa) {
        throw new Error("Não existe caixa aberto.");
      }

      const resumo = await calcularResumoCaixa(caixa.id, tx);

      const saldoInicial = Number(caixa.saldoInicial) || 0;

      const saldoEsperado =
        saldoInicial + resumo.totalDinheiro;

      const diferenca =
        saldoFinal - saldoEsperado;

      const caixaFechado = await tx.caixa.update({
        where: {
          id: caixa.id,
        },

        data: {
          usuarioFechamentoId: req.usuario.id,

          fechamentoEm: new Date(),

          saldoEsperado,

          saldoFinal,

          diferenca,

          totalVendas: resumo.totalVendas,
          totalDinheiro: resumo.totalDinheiro,
          totalPix: resumo.totalPix,
          totalCartao: resumo.totalCartao,
          totalOutros: resumo.totalOutros,

          status: "FECHADO",

          observacao:
            req.body?.observacao || null,
        },
      });

      return {
        caixa: caixaFechado,
        resumo,
      };
    });

    return res.json({
      message: "Caixa fechado com sucesso.",
      ...resultado,
    });
  } catch (error) {
    console.error("Erro ao fechar caixa:", error);

    return res.status(400).json({
      error: error.message,
    });
  }
}

module.exports = {
  obterCaixaAtual,
  abrirCaixa,
  fecharCaixa,
};