const prisma = require("./prisma");

const TIMEZONE = "America/Fortaleza";

function obterInicioDoDiaLocal(data = new Date()) {
  const partes = new Intl.DateTimeFormat("en-US", {
    timeZone: TIMEZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(data);

  const ano = Number(partes.find((p) => p.type === "year").value);
  const mes = Number(partes.find((p) => p.type === "month").value);
  const dia = Number(partes.find((p) => p.type === "day").value);

  // Meia-noite de Fortaleza = 03:00 UTC
  return new Date(Date.UTC(ano, mes - 1, dia, 3, 0, 0, 0));
}

async function obterCaixaAberto(empresaId, tx = prisma) {
  if (!empresaId) return null;

  return tx.caixa.findFirst({
    where: {
      empresaId,
      status: "ABERTO",
    },
    orderBy: {
      aberturaEm: "desc",
    },
  });
}

async function calcularResumoCaixa(caixaId, tx = prisma) {
  const vendas = await tx.venda.findMany({
    where: {
      caixaId,
      status: "FINALIZADA",
    },
    select: {
      total: true,
      formaPagamento: true,
    },
  });

  let totalVendas = 0;
  let totalDinheiro = 0;
  let totalPix = 0;
  let totalCartao = 0;
  let totalOutros = 0;

  for (const venda of vendas) {
    const total = Number(venda.total) || 0;

    totalVendas += total;

    switch (venda.formaPagamento) {
      case "DINHEIRO":
        totalDinheiro += total;
        break;

      case "PIX":
        totalPix += total;
        break;

      case "CARTAO":
      case "CARTAO_CREDITO":
      case "CARTAO_DEBITO":
        totalCartao += total;
        break;

      default:
        totalOutros += total;
        break;
    }
  }

  return {
    totalVendas,
    totalDinheiro,
    totalPix,
    totalCartao,
    totalOutros,
  };
}

async function virarCaixaDaEmpresa(empresaId, tx = prisma) {
  const caixaAberto = await obterCaixaAberto(empresaId, tx);

  if (!caixaAberto) {
    return null;
  }

  const inicioDoDia = obterInicioDoDiaLocal();

  const abertura = new Date(caixaAberto.aberturaEm);

  // Já é o caixa do dia atual
  if (abertura >= inicioDoDia) {
    return caixaAberto;
  }

  const resumo = await calcularResumoCaixa(caixaAberto.id, tx);

  const saldoInicial = Number(caixaAberto.saldoInicial) || 0;

  const saldoEsperado =
    saldoInicial + resumo.totalDinheiro;

  await tx.caixa.update({
    where: {
      id: caixaAberto.id,
    },
    data: {
      fechamentoEm: new Date(),
      saldoEsperado,
      saldoFinal: saldoEsperado,
      diferenca: 0,
      totalVendas: resumo.totalVendas,
      totalDinheiro: resumo.totalDinheiro,
      totalPix: resumo.totalPix,
      totalCartao: resumo.totalCartao,
      totalOutros: resumo.totalOutros,
      status: "FECHADO",
      fechamentoAutomatico: true,
    },
  });

  const novoCaixa = await tx.caixa.create({
    data: {
      empresaId,

      saldoInicial: saldoEsperado,

      status: "ABERTO",

      aberturaAutomatica: true,
      fechamentoAutomatico: false,
    },
  });

  return novoCaixa;
}

async function garantirCaixaDoDia(empresaId, tx = prisma) {
  if (!empresaId) {
    return null;
  }

  let caixa = await obterCaixaAberto(empresaId, tx);

  if (!caixa) {
    return null;
  }

  const inicioDoDia = obterInicioDoDiaLocal();

  if (new Date(caixa.aberturaEm) < inicioDoDia) {
    caixa = await virarCaixaDaEmpresa(empresaId, tx);
  }

  return caixa;
}

async function virarTodosOsCaixas() {
  const empresas = await prisma.empresa.findMany({
    select: {
      id: true,
    },
  });

  let processadas = 0;

  for (const empresa of empresas) {
    try {
      await prisma.$transaction(async (tx) => {
        const caixa = await obterCaixaAberto(empresa.id, tx);

        if (!caixa) {
          return;
        }

        const inicioDoDia = obterInicioDoDiaLocal();

        if (new Date(caixa.aberturaEm) < inicioDoDia) {
          await virarCaixaDaEmpresa(empresa.id, tx);
          processadas++;
        }
      });
    } catch (error) {
      console.error(
        `Erro ao virar caixa da empresa ${empresa.id}:`,
        error.message
      );
    }
  }

  return {
    empresas: empresas.length,
    caixasVirados: processadas,
  };
}

module.exports = {
  obterInicioDoDiaLocal,
  obterCaixaAberto,
  calcularResumoCaixa,
  virarCaixaDaEmpresa,
  garantirCaixaDoDia,
  virarTodosOsCaixas,
};