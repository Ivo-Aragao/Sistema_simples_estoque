const PDFDocument = require("pdfkit");
const prisma = require("../services/prisma");

async function gerarPDF(req, res) {
  try {
    const { q = "", status = "todos", categoriaId = "", fornecedorId = "" } = req.query;

    const produtos = await prisma.produto.findMany({
      include: {
        categoria: true,
        fornecedor: true,
      },
      orderBy: [{ nome: "asc" }],
    });

    let filtrados = produtos;

    if (q) {
      const termo = q.toLowerCase();
      filtrados = filtrados.filter(
        (p) =>
          p.nome.toLowerCase().includes(termo) ||
          (p.codigoBarra || "").toLowerCase().includes(termo)
      );
    }

    if (status === "baixo") {
      filtrados = filtrados.filter((p) => p.quantidade <= p.estoqueMinimo);
    }

    if (status === "ok") {
      filtrados = filtrados.filter((p) => p.quantidade > p.estoqueMinimo);
    }

    if (categoriaId) {
      filtrados = filtrados.filter((p) => String(p.categoriaId) === String(categoriaId));
    }

    if (fornecedorId) {
      filtrados = filtrados.filter((p) => String(p.fornecedorId) === String(fornecedorId));
    }

    const doc = new PDFDocument({ margin: 40 });

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", 'attachment; filename="relatorio-produtos.pdf"');

    doc.pipe(res);

    doc.fontSize(18).text("Relatório de Produtos", { align: "center" });
    doc.moveDown();

    filtrados.forEach((p) => {
      doc.fontSize(11).text(
        `Produto: ${p.nome} | Qtd: ${p.quantidade} | Mín: ${p.estoqueMinimo} | Venda: R$ ${Number(p.precoVenda).toFixed(2)} | Cat: ${p.categoria?.nome || "-"} | Forn: ${p.fornecedor?.nome || "-"}`
      );
      doc.moveDown(0.5);
    });

    doc.end();
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}

module.exports = { gerarPDF };