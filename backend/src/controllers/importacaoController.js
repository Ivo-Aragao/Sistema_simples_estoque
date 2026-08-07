const fs = require("fs");
const xml2js = require("xml2js");
const prisma = require("../services/prisma");

async function importarXML(req, res) {
  try {
    const xml = fs.readFileSync(req.file.path, "utf-8");

    const parser = new xml2js.Parser({ explicitArray: false });
    const json = await parser.parseStringPromise(xml);

    const nfe = json.nfeProc?.NFe?.infNFe || json.NFe?.infNFe;

    if (!nfe) {
      return res.status(400).json({ error: "XML inválido" });
    }

    // =========================
    // FORNECEDOR
    // =========================
    const emit = nfe.emit;

    const fornecedor = await prisma.fornecedor.upsert({
      where: { nome: emit.xNome },
      update: {},
      create: {
        nome: emit.xNome,
        email: emit.email || null,
      },
    });

    // =========================
    // PRODUTOS
    // =========================
    const itens = Array.isArray(nfe.det) ? nfe.det : [nfe.det];

    for (const item of itens) {
      const prod = item.prod;

      const nome = prod.xProd;
      const codigo = prod.cProd;
      const quantidade = Number(prod.qCom);
      const preco = Number(prod.vUnCom);

      // cria ou atualiza produto
      const produto = await prisma.produto.upsert({
        where: { codigoBarra: codigo || undefined },
        update: {
          quantidade: { increment: quantidade },
          precoCusto: preco,
        },
        create: {
          nome,
          codigoBarra: codigo,
          precoCusto: preco,
          precoVenda: preco * 1.3, // margem simples
          quantidade,
          fornecedorId: fornecedor.id,
        },
      });

      // movimentação
      await prisma.movimentacao.create({
        data: {
          produtoId: produto.id,
          tipo: "ENTRADA",
          quantidade,
          observacao: "Importação via XML",
        },
      });
    }

    fs.unlinkSync(req.file.path);

    res.json({ message: "XML importado com sucesso!" });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}

module.exports = { importarXML };