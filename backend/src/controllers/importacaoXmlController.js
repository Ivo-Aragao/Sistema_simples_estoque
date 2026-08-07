const { XMLParser } = require("fast-xml-parser");
const prisma = require("../services/prisma");

function toArray(value) {
  if (!value) return [];
  return Array.isArray(value) ? value : [value];
}

function texto(valor) {
  return String(valor || "").trim();
}

function num(valor) {
  const n = Number(String(valor || "0").replace(",", "."));
  return Number.isNaN(n) ? 0 : n;
}

function encontrarInfNFe(json) {
  return (
    json?.nfeProc?.NFe?.infNFe ||
    json?.nfeProc?.NFe?.[0]?.infNFe ||
    json?.procNFe?.NFe?.infNFe ||
    json?.NFe?.infNFe ||
    json?.infNFe ||
    null
  );
}

async function importarXml(req, res) {
  try {
    if (!req.file) {
      return res.status(400).json({
        error: "Envie um arquivo XML."
      });
    }

    const xml = req.file.buffer.toString("utf8");

    const parser = new XMLParser({
      ignoreAttributes: false,
      removeNSPrefix: true,
      trimValues: true,
      parseTagValue: true,
      parseAttributeValue: true,
    });

    const json = parser.parse(xml);

    const infNFe = encontrarInfNFe(json);

    if (!infNFe) {
      return res.status(400).json({
        error: "Estrutura da NFe não encontrada."
      });
    }

    const emit = infNFe.emit;
    const itens = toArray(infNFe.det);

    if (!emit) {
      return res.status(400).json({
        error: "Fornecedor não encontrado."
      });
    }

    if (!itens.length) {
      return res.status(400).json({
        error: "Nenhum item encontrado."
      });
    }

    let fornecedor = await prisma.fornecedor.findFirst({
      where: {
        nome: texto(emit.xNome)
      }
    });

    if (!fornecedor) {
      fornecedor = await prisma.fornecedor.create({
        data: {
          nome: texto(emit.xNome),
          email: emit.email ? texto(emit.email) : null,
          telefone: emit.fone ? texto(emit.fone) : null
        }
      });
    }

    const resultado = [];

    for (const item of itens) {

      const prod = item.prod || item;

      const codigo = texto(prod.cProd);
      const codigoBarra = texto(prod.cEAN) || codigo || null;
      const nome = texto(prod.xProd);

      const quantidade = num(prod.qCom);
      const precoCusto = num(prod.vUnCom);

      if (!nome) continue;

      const existente = await prisma.produto.findFirst({
        where: {
          OR: [
            codigoBarra
              ? { codigoBarra }
              : undefined,
            { nome }
          ].filter(Boolean)
        }
      });

      let acao = "";

      if (existente) {

        await prisma.produto.update({
          where: {
            id: existente.id
          },
          data: {
            quantidade: existente.quantidade + quantidade,
            precoCusto,
            fornecedorId: fornecedor.id
          }
        });

        await prisma.movimentacao.create({
          data: {
            produtoId: existente.id,
            tipo: "ENTRADA",
            quantidade,
            observacao: "Importação via XML de NFe"
          }
        });

        acao = "Atualizado";

      } else {

        const novo = await prisma.produto.create({
          data: {
            nome,
            codigoBarra,
            descricao: "Produto importado via XML",
            precoCusto,
            precoVenda: Number((precoCusto * 1.3).toFixed(2)),
            quantidade,
            estoqueMinimo: 5,
            fornecedorId: fornecedor.id
          }
        });

        await prisma.movimentacao.create({
          data: {
            produtoId: novo.id,
            tipo: "ENTRADA",
            quantidade,
            observacao: "Produto criado pela importação da NFe"
          }
        });

        acao = "Criado";
      }

      resultado.push({
        codigo: codigoBarra,
        nome,
        quantidade,
        valor: precoCusto,
        acao: "Criado",
      });

    }

    return res.json({

      message: "XML importado com sucesso.",

      itens: resultado

    });

  } catch (error) {

    console.error(error);

    return res.status(500).json({
      error: error.message
    });

  }
}

module.exports = {
  importarXml
};