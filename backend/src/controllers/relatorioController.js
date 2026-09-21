const prisma = require("../services/prisma");
const ExcelJS = require("exceljs");
const PDFDocument = require("pdfkit");
const { Parser } = require("json2csv");
const { create } = require("xmlbuilder2");

// ============================================================
// FILTRO PADRÃO DE PRODUTOS
// ============================================================

function montarFiltro(req) {
  const {
    categoriaId,
    fornecedorId,
  } = req.query;

  const where = {
    ativo: true,
  };

  if (categoriaId) {
    where.categoriaId = Number(categoriaId);
  }

  if (fornecedorId) {
    where.fornecedorId = Number(fornecedorId);
  }

  return where;
}

// ============================================================
// IDENTIFICAR ORIGEM DA SAÍDA
// ============================================================

function identificarOrigemSaida(observacao) {
  const texto = String(observacao || "").toLowerCase();

  // Comanda vem primeiro porque uma saída de restaurante
  // pode possuir também a palavra "venda" na observação.
  if (texto.includes("comanda")) {
    return "RESTAURANTE";
  }

  if (texto.includes("venda")) {
    return "VENDA";
  }

  return "OUTRA SAÍDA";
}

function adicionarOrigemSaida(lista) {
  return lista.map((item) => ({
    ...item,
    origem: identificarOrigemSaida(item.observacao),
  }));
}

// ============================================================
// FILTRO DE MOVIMENTAÇÕES
// ============================================================

function montarFiltroMovimentacao(req, tipo = null) {
  const {
    categoriaId,
    fornecedorId,
    inicio,
    fim,
  } = req.query;

  const where = {};

  if (tipo) {
    where.tipo = tipo;
  }

  // Filtro por produto
  if (categoriaId || fornecedorId) {
    where.produto = {};

    if (categoriaId) {
      where.produto.categoriaId = Number(categoriaId);
    }

    if (fornecedorId) {
      where.produto.fornecedorId = Number(fornecedorId);
    }
  }

  // Filtro por período
  if (inicio || fim) {
    where.dataMovimentacao = {};

    if (inicio) {
      where.dataMovimentacao.gte = new Date(
        `${inicio}T00:00:00`
      );
    }

    if (fim) {
      where.dataMovimentacao.lte = new Date(
        `${fim}T23:59:59.999`
      );
    }
  }

  return where;
}

// ============================================================
// FILTRO DE VENDAS
// ============================================================

function montarFiltroVenda(req, contexto) {
  const {
    categoriaId,
    fornecedorId,
    inicio,
    fim,
  } = req.query;

  const where = {};

  // ----------------------------------------------------------
  // Origem da venda
  // ----------------------------------------------------------

  if (contexto === "vendas") {
    where.comandaId = null;
  }

  if (contexto === "restaurante") {
    where.comandaId = {
      not: null,
    };
  }

  // ----------------------------------------------------------
  // Período
  // ----------------------------------------------------------

  if (inicio || fim) {
    where.criadoEm = {};

    if (inicio) {
      where.criadoEm.gte = new Date(
        `${inicio}T00:00:00`
      );
    }

    if (fim) {
      where.criadoEm.lte = new Date(
        `${fim}T23:59:59.999`
      );
    }
  }

  // ----------------------------------------------------------
  // Categoria + fornecedor
  // ----------------------------------------------------------

  const filtroProduto = {};

  if (categoriaId) {
    filtroProduto.categoriaId = Number(categoriaId);
  }

  if (fornecedorId) {
    filtroProduto.fornecedorId = Number(fornecedorId);
  }

  if (
    Object.keys(filtroProduto).length > 0
  ) {
    where.itens = {
      some: {
        produto: filtroProduto,
      },
    };
  }

  return where;
}

// ============================================================
// BUSCAR VENDAS
// ============================================================

async function buscarVendas(req, contexto) {
  return prisma.venda.findMany({
    where: montarFiltroVenda(
      req,
      contexto
    ),

    include: {
      usuario: {
        select: {
          id: true,
          nome: true,
        },
      },

      comanda: {
        include: {
          mesa: true,
        },
      },

      itens: {
        include: {
          produto: {
            include: {
              categoria: true,
              fornecedor: true,
            },
          },
        },
      },
    },

    orderBy: {
      criadoEm: "desc",
    },
  });
}

// ============================================================
// BUSCAR DADOS DO RELATÓRIO
// ============================================================

async function buscarDados(req) {
  const tipo = req.query.tipo;

  switch (tipo) {
    // --------------------------------------------------------
    // VENDAS
    // --------------------------------------------------------

    case "vendas":
      return buscarVendas(
        req,
        "vendas"
      );

    // --------------------------------------------------------
    // RESTAURANTE
    // --------------------------------------------------------

    case "restaurante":
      return buscarVendas(
        req,
        "restaurante"
      );

    // --------------------------------------------------------
    // ESTOQUE
    // --------------------------------------------------------

    case "estoque":
      return prisma.produto.findMany({
        where: montarFiltro(req),

        include: {
          categoria: true,
          fornecedor: true,
        },

        orderBy: {
          nome: "asc",
        },
      });

    // --------------------------------------------------------
    // ESTOQUE MÍNIMO
    // --------------------------------------------------------

    case "minimo": {
      const produtos =
        await prisma.produto.findMany({
          where: montarFiltro(req),

          include: {
            categoria: true,
            fornecedor: true,
          },

          orderBy: {
            nome: "asc",
          },
        });

      return produtos.filter(
        (produto) =>
          produto.quantidade <=
          produto.estoqueMinimo
      );
    }

    // --------------------------------------------------------
    // PRODUTOS ZERADOS
    // --------------------------------------------------------

    case "zerado":
      return prisma.produto.findMany({
        where: {
          ...montarFiltro(req),
          quantidade: 0,
        },

        include: {
          categoria: true,
          fornecedor: true,
        },

        orderBy: {
          nome: "asc",
        },
      });

    // --------------------------------------------------------
    // POR CATEGORIA
    // --------------------------------------------------------

    case "categoria":
      return prisma.produto.findMany({
        where: montarFiltro(req),

        include: {
          categoria: true,
          fornecedor: true,
        },

        orderBy: {
          nome: "asc",
        },
      });

    // --------------------------------------------------------
    // POR FORNECEDOR
    // --------------------------------------------------------

    case "fornecedor":
      return prisma.produto.findMany({
        where: montarFiltro(req),

        include: {
          categoria: true,
          fornecedor: true,
        },

        orderBy: {
          nome: "asc",
        },
      });

    // --------------------------------------------------------
    // INVENTÁRIO
    // --------------------------------------------------------

    case "inventario":
      return prisma.produto.findMany({
        where: montarFiltro(req),

        include: {
          categoria: true,
          fornecedor: true,
        },

        orderBy: {
          nome: "asc",
        },
      });

    // --------------------------------------------------------
    // ENTRADAS
    // --------------------------------------------------------

    case "entradas":
      return prisma.movimentacao.findMany({
        where: montarFiltroMovimentacao(
          req,
          "ENTRADA"
        ),

        include: {
          produto: {
            include: {
              categoria: true,
              fornecedor: true,
            },
          },
        },

        orderBy: {
          dataMovimentacao: "desc",
        },
      });

    // --------------------------------------------------------
    // SAÍDAS
    // --------------------------------------------------------

    case "saidas": {
      const movimentacoes =
        await prisma.movimentacao.findMany({
          where: montarFiltroMovimentacao(
            req,
            "SAIDA"
          ),

          include: {
            produto: {
              include: {
                categoria: true,
                fornecedor: true,
              },
            },
          },

          orderBy: {
            dataMovimentacao: "desc",
          },
        });

      return adicionarOrigemSaida(
        movimentacoes
      );
    }

    // --------------------------------------------------------
    // HISTÓRICO
    // --------------------------------------------------------

    case "historico":
      return prisma.movimentacao.findMany({
        where: montarFiltroMovimentacao(req),

        include: {
          produto: {
            include: {
              categoria: true,
              fornecedor: true,
            },
          },
        },

        orderBy: {
          dataMovimentacao: "desc",
        },
      });

    // --------------------------------------------------------
    // MAIS MOVIMENTADOS
    // --------------------------------------------------------

    case "movimentados": {
      const movimentacoes =
        await prisma.movimentacao.findMany({
          where: montarFiltroMovimentacao(req),

          select: {
            produtoId: true,
            quantidade: true,
          },
        });

      const mapa = {};

      movimentacoes.forEach(
        (movimentacao) => {
          if (
            !mapa[movimentacao.produtoId]
          ) {
            mapa[movimentacao.produtoId] =
              0;
          }

          mapa[movimentacao.produtoId] +=
            Number(
              movimentacao.quantidade || 0
            );
        }
      );

      const agrupados =
        Object.entries(mapa)
          .map(
            ([
              produtoId,
              quantidade,
            ]) => ({
              produtoId:
                Number(produtoId),

              quantidade:
                Number(quantidade),
            })
          )
          .sort(
            (a, b) =>
              b.quantidade -
              a.quantidade
          );

      if (agrupados.length === 0) {
        return [];
      }

      const ids =
        agrupados.map(
          (item) =>
            item.produtoId
        );

      const produtos =
        await prisma.produto.findMany({
          where: {
            id: {
              in: ids,
            },
          },

          include: {
            categoria: true,
            fornecedor: true,
          },
        });

      return agrupados
        .map((item) => {
          const produto =
            produtos.find(
              (p) =>
                p.id ===
                item.produtoId
            );

          if (!produto) {
            return null;
          }

          return {
            id: produto.id,
            nome: produto.nome,
            categoria:
              produto.categoria,
            fornecedor:
              produto.fornecedor,
            quantidade:
              item.quantidade,
            precoVenda:
              produto.precoVenda,
          };
        })
        .filter(Boolean);
    }

    default:
      return [];
  }
}

// ============================================================
// RELATÓRIO DE VENDAS
// ============================================================

async function vendas(req, res) {
  try {
    const dados =
      await buscarVendas(
        req,
        "vendas"
      );

    res.json(dados);
  } catch (error) {
    console.error(
      "Erro no relatório de vendas:",
      error
    );

    res.status(500).json({
      error: error.message,
    });
  }
}

// ============================================================
// RELATÓRIO RESTAURANTE
// ============================================================

async function restaurante(req, res) {
  try {
    const dados =
      await buscarVendas(
        req,
        "restaurante"
      );

    res.json(dados);
  } catch (error) {
    console.error(
      "Erro no relatório do restaurante:",
      error
    );

    res.status(500).json({
      error: error.message,
    });
  }
}

// ============================================================
// ESTOQUE
// ============================================================

async function estoque(req, res) {
  try {
    const dados =
      await prisma.produto.findMany({
        where: montarFiltro(req),

        include: {
          categoria: true,
          fornecedor: true,
        },

        orderBy: {
          nome: "asc",
        },
      });

    res.json(dados);
  } catch (error) {
    console.error(
      "Erro no relatório de estoque:",
      error
    );

    res.status(500).json({
      error: error.message,
    });
  }
}

// ============================================================
// ESTOQUE MÍNIMO
// ============================================================

async function estoqueMinimo(req, res) {
  try {
    const produtos =
      await prisma.produto.findMany({
        where: montarFiltro(req),

        include: {
          categoria: true,
          fornecedor: true,
        },

        orderBy: {
          nome: "asc",
        },
      });

    const resultado =
      produtos.filter(
        (produto) =>
          produto.quantidade <=
          produto.estoqueMinimo
      );

    res.json(resultado);
  } catch (error) {
    console.error(
      "Erro no relatório de estoque mínimo:",
      error
    );

    res.status(500).json({
      error: error.message,
    });
  }
}

// ============================================================
// PRODUTOS ZERADOS
// ============================================================

async function produtosSemEstoque(
  req,
  res
) {
  try {
    const produtos =
      await prisma.produto.findMany({
        where: {
          ...montarFiltro(req),
          quantidade: 0,
        },

        include: {
          categoria: true,
          fornecedor: true,
        },

        orderBy: {
          nome: "asc",
        },
      });

    res.json(produtos);
  } catch (error) {
    console.error(
      "Erro no relatório de produtos zerados:",
      error
    );

    res.status(500).json({
      error: error.message,
    });
  }
}

// ============================================================
// ENTRADAS
// ============================================================

async function entradas(req, res) {
  try {
    const dados =
      await prisma.movimentacao.findMany({
        where: montarFiltroMovimentacao(
          req,
          "ENTRADA"
        ),

        include: {
          produto: {
            include: {
              categoria: true,
              fornecedor: true,
            },
          },
        },

        orderBy: {
          dataMovimentacao: "desc",
        },
      });

    res.json(dados);
  } catch (error) {
    console.error(
      "Erro no relatório de entradas:",
      error
    );

    res.status(500).json({
      error: error.message,
    });
  }
}

// ============================================================
// SAÍDAS
// ============================================================

async function saidas(req, res) {
  try {
    const dados =
      await prisma.movimentacao.findMany({
        where: montarFiltroMovimentacao(
          req,
          "SAIDA"
        ),

        include: {
          produto: {
            include: {
              categoria: true,
              fornecedor: true,
            },
          },
        },

        orderBy: {
          dataMovimentacao: "desc",
        },
      });

    const resultado =
      adicionarOrigemSaida(dados);

    res.json(resultado);
  } catch (error) {
    console.error(
      "Erro no relatório de saídas:",
      error
    );

    res.status(500).json({
      error: error.message,
    });
  }
}

// ============================================================
// HISTÓRICO
// ============================================================

async function historico(req, res) {
  try {
    const dados =
      await prisma.movimentacao.findMany({
        where: montarFiltroMovimentacao(
          req
        ),

        include: {
          produto: {
            include: {
              categoria: true,
              fornecedor: true,
            },
          },
        },

        orderBy: {
          dataMovimentacao: "desc",
        },
      });

    res.json(dados);
  } catch (error) {
    console.error(
      "Erro no relatório histórico:",
      error
    );

    res.status(500).json({
      error: error.message,
    });
  }
}

// ============================================================
// PRODUTOS POR CATEGORIA
// ============================================================

async function categoria(req, res) {
  try {
    const dados =
      await prisma.produto.findMany({
        where: montarFiltro(req),

        include: {
          categoria: true,
          fornecedor: true,
        },

        orderBy: {
          nome: "asc",
        },
      });

    res.json(dados);
  } catch (error) {
    console.error(
      "Erro no relatório por categoria:",
      error
    );

    res.status(500).json({
      error: error.message,
    });
  }
}

// ============================================================
// PRODUTOS POR FORNECEDOR
// ============================================================

async function fornecedor(req, res) {
  try {
    const dados =
      await prisma.produto.findMany({
        where: montarFiltro(req),

        include: {
          categoria: true,
          fornecedor: true,
        },

        orderBy: {
          nome: "asc",
        },
      });

    res.json(dados);
  } catch (error) {
    console.error(
      "Erro no relatório por fornecedor:",
      error
    );

    res.status(500).json({
      error: error.message,
    });
  }
}

// ============================================================
// INVENTÁRIO
// ============================================================

async function inventario(req, res) {
  return estoque(req, res);
}

// ============================================================
// DASHBOARD
// ============================================================

async function dashboard(req, res) {
  try {
    const produtos =
      await prisma.produto.count({
        where: {
          ativo: true,
        },
      });

    const estoque =
      await prisma.produto.aggregate({
        _sum: {
          quantidade: true,
        },

        where: {
          ativo: true,
        },
      });

    const lista =
      await prisma.produto.findMany({
        where: {
          ativo: true,
        },

        select: {
          quantidade: true,
          estoqueMinimo: true,
        },
      });

    const baixoEstoque =
      lista.filter(
        (produto) =>
          produto.quantidade <=
          produto.estoqueMinimo
      ).length;

    const entradas =
      await prisma.movimentacao.aggregate({
        where: {
          tipo: "ENTRADA",
        },

        _sum: {
          quantidade: true,
        },
      });

    const saidas =
      await prisma.movimentacao.aggregate({
        where: {
          tipo: "SAIDA",
        },

        _sum: {
          quantidade: true,
        },
      });

    res.json({
      produtos,

      estoque:
        estoque._sum.quantidade || 0,

      entradas:
        entradas._sum.quantidade || 0,

      saidas:
        saidas._sum.quantidade || 0,

      baixoEstoque,
    });
  } catch (error) {
    console.error(
      "Erro no dashboard:",
      error
    );

    res.status(500).json({
      error: error.message,
    });
  }
}

// ============================================================
// CALCULAR TOTAIS DO RELATÓRIO
// ============================================================

function calcularTotais(
  dados,
  tipoRelatorio
) {
  let quantidadeTotal = 0;
  let valorTotal = 0;

  // ----------------------------------------------------------
  // VENDAS / RESTAURANTE
  // ----------------------------------------------------------

  if (
    tipoRelatorio === "vendas" ||
    tipoRelatorio === "restaurante"
  ) {
    dados.forEach((venda) => {
      const itens =
        venda.itens || [];

      const quantidadeVenda =
        itens.reduce(
          (total, item) =>
            total +
            Number(
              item.quantidade || 0
            ),
          0
        );

      quantidadeTotal +=
        quantidadeVenda;

      valorTotal +=
        Number(
          venda.total || 0
        );
    });

    return {
      registros: dados.length,
      quantidadeTotal,
      valorTotal,
    };
  }

  // ----------------------------------------------------------
  // OUTROS RELATÓRIOS
  // ----------------------------------------------------------

  dados.forEach((item) => {
    const produto =
      item.produto || item;

    const quantidade =
      Number(
        item.quantidade ??
        produto.quantidade ??
        0
      );

    const preco =
      Number(
        produto.precoVenda || 0
      );

    quantidadeTotal +=
      quantidade;

    valorTotal +=
      quantidade * preco;
  });

  return {
    registros: dados.length,
    quantidadeTotal,
    valorTotal,
  };
}

// ============================================================
// EXPORTAR RELATÓRIO
// ============================================================

async function exportarRelatorio(
  req,
  res
) {
  try {
    const {
      formato,
      tipo,
    } = req.query;

    if (!formato) {
      return res.status(400).json({
        error:
          "Formato de exportação não informado.",
      });
    }

    if (!tipo) {
      return res.status(400).json({
        error:
          "Tipo de relatório não informado.",
      });
    }

    console.log(
      "================================="
    );

    console.log(
      "EXPORTAR RELATÓRIO"
    );

    console.log(
      "Tipo:",
      tipo
    );

    console.log(
      "Formato:",
      formato
    );

    console.log(
      "================================="
    );

    const dados =
      await buscarDados(req);

    const totais =
      calcularTotais(
        dados,
        tipo
      );

    // Evita cache de arquivos antigos
    res.setHeader(
      "Cache-Control",
      "no-store, no-cache, must-revalidate, proxy-revalidate"
    );

    res.setHeader(
      "Pragma",
      "no-cache"
    );

    // ========================================================
    // CSV
    // ========================================================

    if (formato === "csv") {
      let linhas = [];

      if (
        tipo === "vendas" ||
        tipo === "restaurante"
      ) {
        linhas = dados.map(
          (venda) => {
            const quantidade =
              (venda.itens || []).reduce(
                (
                  total,
                  item
                ) =>
                  total +
                  Number(
                    item.quantidade || 0
                  ),
                0
              );

            return {
              venda:
                venda.id || "",

              quantidade,

              valor:
                Number(
                  venda.total || 0
                ).toFixed(2),

              origem:
                tipo ===
                "restaurante"
                  ? "RESTAURANTE"
                  : "VENDA",

              data:
                venda.criadoEm
                  ? new Date(
                      venda.criadoEm
                    ).toLocaleString(
                      "pt-BR"
                    )
                  : "",
            };
          }
        );
      } else {
        linhas = dados.map(
          (item) => {
            const produto =
              item.produto ||
              item;

            const quantidade =
              Number(
                item.quantidade ??
                produto.quantidade ??
                0
              );

            const preco =
              Number(
                produto.precoVenda ||
                  0
              );

            return {
              produto:
                produto.nome ||
                "-",

              quantidade,

              preco:
                preco.toFixed(2),

              valorTotal:
                (
                  quantidade * preco
                ).toFixed(2),

              tipo:
                tipo ===
                "saidas"
                  ? (
                      item.origem ||
                      "OUTRA SAÍDA"
                    )
                  : (
                      item.tipo ||
                      ""
                    ),

              observacao:
                item.observacao ||
                "",

              data:
                item.dataMovimentacao
                  ? new Date(
                      item.dataMovimentacao
                    ).toLocaleString(
                      "pt-BR"
                    )
                  : "",
            };
          }
        );
      }

      linhas.push({
        resumo:
          "TOTAL DO RELATÓRIO",

        registros:
          totais.registros,

        quantidade:
          totais.quantidadeTotal,

        valor:
          totais.valorTotal.toFixed(2),
      });

      const parser =
        new Parser();

      const csv =
        parser.parse(linhas);

      res.setHeader(
        "Content-Type",
        "text/csv; charset=utf-8"
      );

      res.setHeader(
        "Content-Disposition",
        "attachment; filename=relatorio.csv"
      );

      return res.send(
        "\uFEFF" + csv
      );
    }

    // ========================================================
    // XLSX
    // ========================================================

    if (formato === "xlsx") {
      const workbook =
        new ExcelJS.Workbook();

      const sheet =
        workbook.addWorksheet(
          "Relatório"
        );

      if (
        tipo === "vendas" ||
        tipo === "restaurante"
      ) {
        sheet.columns = [
          {
            header: "Venda",
            key: "venda",
            width: 15,
          },

          {
            header: "Quantidade",
            key: "quantidade",
            width: 15,
          },

          {
            header: "Valor",
            key: "valor",
            width: 18,
          },

          {
            header: "Origem",
            key: "origem",
            width: 20,
          },

          {
            header: "Data",
            key: "data",
            width: 22,
          },
        ];

        dados.forEach(
          (venda) => {
            const quantidade =
              (venda.itens || []).reduce(
                (
                  total,
                  item
                ) =>
                  total +
                  Number(
                    item.quantidade || 0
                  ),
                0
              );

            sheet.addRow({
              venda:
                venda.id || "-",

              quantidade,

              valor:
                Number(
                  venda.total || 0
                ),

              origem:
                tipo ===
                "restaurante"
                  ? "RESTAURANTE"
                  : "VENDA",

              data:
                venda.criadoEm
                  ? new Date(
                      venda.criadoEm
                    )
                  : null,
            });
          }
        );
      } else {
        sheet.columns = [
          {
            header: "Produto",
            key: "produto",
            width: 30,
          },

          {
            header: "Quantidade",
            key: "quantidade",
            width: 15,
          },

          {
            header: "Preço",
            key: "preco",
            width: 18,
          },

          {
            header: "Valor Total",
            key: "valorTotal",
            width: 18,
          },

          {
            header:
              tipo ===
              "saidas"
                ? "Origem"
                : "Tipo",

            key: "tipo",

            width: 20,
          },

          {
            header: "Observação",
            key: "observacao",
            width: 35,
          },

          {
            header: "Data",
            key: "data",
            width: 22,
          },
        ];

        dados.forEach(
          (item) => {
            const produto =
              item.produto ||
              item;

            const quantidade =
              Number(
                item.quantidade ??
                produto.quantidade ??
                0
              );

            const preco =
              Number(
                produto.precoVenda ||
                  0
              );

            sheet.addRow({
              produto:
                produto.nome ||
                "-",

              quantidade,

              preco,

              valorTotal:
                quantidade *
                preco,

              tipo:
                tipo ===
                "saidas"
                  ? (
                      item.origem ||
                      "OUTRA SAÍDA"
                    )
                  : (
                      item.tipo ||
                      ""
                    ),

              observacao:
                item.observacao ||
                "",

              data:
                item.dataMovimentacao
                  ? new Date(
                      item.dataMovimentacao
                    )
                  : null,
            });
          }
        );
      }

      // ------------------------------------------------------
      // FORMATAÇÃO
      // ------------------------------------------------------

      sheet.getRow(1).font = {
        bold: true,
      };

      sheet.getRow(1).alignment = {
        vertical: "middle",
        horizontal: "center",
      };

      sheet.views = [
        {
          state: "frozen",
          ySplit: 1,
        },
      ];

      // ------------------------------------------------------
      // RESUMO
      // ------------------------------------------------------

      sheet.addRow([]);
      sheet.addRow([
        "TOTAL DO RELATÓRIO",
      ]);

      sheet.addRow([
        "Registros",
        totais.registros,
      ]);

      sheet.addRow([
        "Quantidade total",
        totais.quantidadeTotal,
      ]);

      sheet.addRow([
        "Valor total",
        totais.valorTotal,
      ]);

      const ultimaLinha =
        sheet.lastRow.number;

      sheet.getRow(
        ultimaLinha - 3
      ).font = {
        bold: true,
      };

      sheet.getRow(
        ultimaLinha - 2
      ).font = {
        bold: true,
      };

      sheet.getRow(
        ultimaLinha - 1
      ).font = {
        bold: true,
      };

      sheet.getRow(
        ultimaLinha
      ).font = {
        bold: true,
      };

      sheet.getColumn(
        "valor"
      ).numFmt =
        'R$ #,##0.00';

      sheet.getColumn(
        "preco"
      ).numFmt =
        'R$ #,##0.00';

      sheet.getColumn(
        "valorTotal"
      ).numFmt =
        'R$ #,##0.00';

      const dataColuna =
        tipo ===
          "vendas" ||
        tipo ===
          "restaurante"
          ? "data"
          : "data";

      sheet.getColumn(
        dataColuna
      ).numFmt =
        "dd/mm/yyyy hh:mm";

      res.setHeader(
        "Content-Type",
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
      );

      res.setHeader(
        "Content-Disposition",
        "attachment; filename=relatorio.xlsx"
      );

      await workbook.xlsx.write(
        res
      );

      return res.end();
    }

    // ========================================================
    // XML
    // ========================================================

    if (formato === "xml") {
      const root =
        create({
          version: "1.0",
          encoding: "UTF-8",
        }).ele(
          "relatorio"
        );

      root.ele("tipo")
        .txt(String(tipo))
        .up();

      const dadosNode =
        root.ele("dados");

      dados.forEach(
        (item) => {
          const produto =
            item.produto ||
            item;

          const quantidade =
            Number(
              item.quantidade ??
              produto.quantidade ??
              0
            );

          const preco =
            Number(
              produto.precoVenda ||
                0
            );

          const registro =
            dadosNode.ele(
              "registro"
            );

          registro.ele("id")
            .txt(
              String(
                item.id ??
                produto.id ??
                ""
              )
            )
            .up();

          registro.ele("produto")
            .txt(
              produto.nome ||
                ""
            )
            .up();

          registro.ele(
            "quantidade"
          )
            .txt(
              String(
                quantidade
              )
            )
            .up();

          registro.ele(
            "precoVenda"
          )
            .txt(
              String(
                preco
              )
            )
            .up();

          registro.ele(
            "valorTotal"
          )
            .txt(
              String(
                quantidade *
                  preco
              )
            )
            .up();

          registro.ele(
            "tipo"
          )
            .txt(
              item.tipo ||
                ""
            )
            .up();

          registro.ele(
            "origem"
          )
            .txt(
              item.origem ||
                (
                  tipo ===
                  "saidas"
                    ? "OUTRA SAÍDA"
                    : ""
                )
            )
            .up();

          registro.ele(
            "observacao"
          )
            .txt(
              item.observacao ||
                ""
            )
            .up();

          registro.ele(
            "data"
          )
            .txt(
              item.dataMovimentacao
                ? new Date(
                    item.dataMovimentacao
                  ).toISOString()
                : (
                    item.criadoEm
                      ? new Date(
                          item.criadoEm
                        ).toISOString()
                      : ""
                  )
            )
            .up();
        }
      );

      const resumo =
        root.ele(
          "resumo"
        );

      resumo.ele(
        "registros"
      )
        .txt(
          String(
            totais.registros
          )
        )
        .up();

      resumo.ele(
        "quantidadeTotal"
      )
        .txt(
          String(
            totais.quantidadeTotal
          )
        )
        .up();

      resumo.ele(
        "valorTotal"
      )
        .txt(
          String(
            totais.valorTotal
          )
        )
        .up();

      const xml =
        root.end({
          prettyPrint: true,
        });

      res.setHeader(
        "Content-Type",
        "application/xml; charset=utf-8"
      );

      res.setHeader(
        "Content-Disposition",
        "attachment; filename=relatorio.xml"
      );

      return res.send(xml);
    }

    // ========================================================
    // PDF
    // ========================================================

    if (formato === "pdf") {
      console.log(
        "PDF NOVO DO RELATORIO"
      );

      console.log(
        "Tipo:",
        tipo
      );

      console.log(
        "Registros:",
        dados.length
      );

      console.log(
        "Quantidade total:",
        totais.quantidadeTotal
      );

      console.log(
        "Valor total:",
        totais.valorTotal
      );

      const pdf =
        new PDFDocument({
          size: "A4",
          margin: 40,
          bufferPages: true,
        });

      res.setHeader(
        "Content-Type",
        "application/pdf"
      );

      res.setHeader(
        "Content-Disposition",
        `attachment; filename=${tipo}.pdf`
      );

      pdf.pipe(res);

      // ------------------------------------------------------
      // CABEÇALHO
      // ------------------------------------------------------

      function desenharCabecalho() {
        pdf
          .rect(
            0,
            0,
            595,
            80
          )
          .fill("#1E3A8A");

        pdf
          .fillColor("#FFFFFF")
          .font("Helvetica-Bold")
          .fontSize(20)
          .text(
            "SISTEMA DE CONTROLE DE ESTOQUE",
            40,
            25,
            {
              width: 515,
              align: "left",
            }
          );

        pdf
          .font("Helvetica")
          .fontSize(12)
          .text(
            `Relatório: ${String(
              tipo
            ).toUpperCase()}`,
            40,
            52
          );

        pdf.fillColor("#000000");
      }

      desenharCabecalho();

      pdf.y = 100;

      pdf
        .font("Helvetica")
        .fontSize(10)
        .fillColor("#000000");

      pdf.text(
        `Gerado em: ${new Date().toLocaleString(
          "pt-BR"
        )}`
      );

      pdf.text(
        `Categoria: ${
          req.query.categoriaId ||
          "Todas"
        }`
      );

      pdf.text(
        `Fornecedor: ${
          req.query.fornecedorId ||
          "Todos"
        }`
      );

      pdf.text(
        `Período: ${
          req.query.inicio ||
          "--"
        } até ${
          req.query.fim ||
          "--"
        }`
      );

      pdf.moveDown();

      pdf
        .moveTo(
          40,
          pdf.y
        )
        .lineTo(
          555,
          pdf.y
        )
        .strokeColor(
          "#1E3A8A"
        )
        .stroke();

      pdf.moveDown();

      let y =
        pdf.y + 15;

      // ------------------------------------------------------
      // CABEÇALHO DA TABELA
      // ------------------------------------------------------

      function desenharCabecalhoTabela() {
        pdf
          .font("Helvetica-Bold")
          .fontSize(9)
          .fillColor("#000000");

        pdf.text(
          "Produto / Venda",
          40,
          y,
          {
            width: 215,
          }
        );

        pdf.text(
          "Quantidade",
          275,
          y,
          {
            width: 70,
            align: "center",
          }
        );

        pdf.text(
          "Preço / Valor",
          355,
          y,
          {
            width: 90,
            align: "right",
          }
        );

        pdf.text(
          tipo === "saidas"
            ? "Origem"
            : "Tipo",
          455,
          y,
          {
            width: 100,
            align: "center",
          }
        );

        y += 17;

        pdf
          .moveTo(
            40,
            y
          )
          .lineTo(
            555,
            y
          )
          .strokeColor(
            "#1E3A8A"
          )
          .lineWidth(1)
          .stroke();

        y += 10;

        pdf
          .font("Helvetica")
          .fontSize(9)
          .fillColor("#000000");
      }

      // ------------------------------------------------------
      // RODAPÉ
      // ------------------------------------------------------

      function desenharRodape() {
        const rodapeY = 755;

        pdf
          .moveTo(
            40,
            rodapeY - 10
          )
          .lineTo(
            555,
            rodapeY - 10
          )
          .strokeColor(
            "#1E3A8A"
          )
          .lineWidth(1)
          .stroke();

        pdf
          .font("Helvetica")
          .fontSize(8)
          .fillColor("#555555");

        pdf.text(
          `Total de registros: ${dados.length}`,
          40,
          rodapeY,
          {
            width: 160,
          }
        );

        pdf.text(
          `Emitido em ${new Date().toLocaleString(
            "pt-BR"
          )}`,
          190,
          rodapeY,
          {
            width: 210,
            align: "center",
          }
        );

        pdf.text(
          "Sistema de Controle de Estoque",
          415,
          rodapeY,
          {
            width: 140,
            align: "right",
          }
        );

        pdf.fillColor(
          "#000000"
        );
      }

      // ------------------------------------------------------
      // INICIAR TABELA
      // ------------------------------------------------------

      desenharCabecalhoTabela();

      // ------------------------------------------------------
      // PERCORRER DADOS
      // ------------------------------------------------------

      dados.forEach(
        (item, index) => {
          const ALTURA_LINHA = 22;
          const LIMITE_TABELA = 715;

          // ----------------------------------------------------
          // VENDAS / RESTAURANTE
          // ----------------------------------------------------

          if (
            tipo === "vendas" ||
            tipo === "restaurante"
          ) {
            const venda =
              item;

            const itens =
              venda.itens ||
              [];

            const quantidadeVenda =
              itens.reduce(
                (
                  total,
                  produto
                ) =>
                  total +
                  Number(
                    produto.quantidade ||
                      0
                  ),
                0
              );

            const totalVenda =
              Number(
                venda.total ||
                  0
              );

            if (
              y +
                ALTURA_LINHA >
              LIMITE_TABELA
            ) {
              desenharRodape();

              pdf.addPage();

              y = 55;

              desenharCabecalhoTabela();
            }

            if (
              index % 2 ===
              0
            ) {
              pdf
                .rect(
                  40,
                  y - 3,
                  515,
                  18
                )
                .fill(
                  "#F5F5F5"
                );

              pdf.fillColor(
                "#000000"
              );
            }

            pdf.text(
              `Venda #${
                venda.id ||
                "-"
              }`,
              45,
              y,
              {
                width: 215,
                ellipsis: true,
              }
            );

            pdf.text(
              String(
                quantidadeVenda
              ),
              275,
              y,
              {
                width: 70,
                align: "center",
              }
            );

            pdf.text(
              `R$ ${totalVenda.toFixed(
                2
              )}`,
              355,
              y,
              {
                width: 90,
                align: "right",
              }
            );

            pdf.text(
              tipo ===
                "restaurante"
                ? "RESTAURANTE"
                : "VENDA",
              455,
              y,
              {
                width: 100,
                align: "center",
              }
            );

            y +=
              ALTURA_LINHA;

            return;
          }

          // ----------------------------------------------------
          // OUTROS RELATÓRIOS
          // ----------------------------------------------------

          const produto =
            item.produto ||
            item;

          const quantidade =
            Number(
              item.quantidade ??
                produto.quantidade ??
                0
            );

          const preco =
            Number(
              produto.precoVenda ||
                0
            );

          if (
            y +
              ALTURA_LINHA >
            LIMITE_TABELA
          ) {
            desenharRodape();

            pdf.addPage();

            y = 55;

            desenharCabecalhoTabela();
          }

          if (
            index % 2 ===
            0
          ) {
            pdf
              .rect(
                40,
                y - 3,
                515,
                18
              )
              .fill(
                "#F5F5F5"
              );

            pdf.fillColor(
              "#000000"
            );
          }

          pdf.text(
            produto.nome ||
              "-",
            45,
            y,
            {
              width: 215,
              ellipsis: true,
            }
          );

          pdf.text(
            String(
              quantidade
            ),
            275,
            y,
            {
              width: 70,
              align: "center",
            }
          );

          pdf.text(
            `R$ ${preco.toFixed(
              2
            )}`,
            355,
            y,
            {
              width: 90,
              align: "right",
            }
          );

          pdf.text(
            tipo === "saidas"
              ? (
                  item.origem ||
                  "OUTRA SAÍDA"
                )
              : (
                  item.tipo ||
                  "-"
                ),
            455,
            y,
            {
              width: 100,
              align: "center",
              ellipsis: true,
            }
          );

          y +=
            ALTURA_LINHA;
        }
      );

      // ========================================================
      // TOTAL FINAL
      // ========================================================

      if (
        y + 75 >
        715
      ) {
        desenharRodape();

        pdf.addPage();

        y = 55;

        desenharCabecalhoTabela();
      }

      y += 10;

      // Linha superior do resumo
      pdf
        .moveTo(
          40,
          y
        )
        .lineTo(
          555,
          y
        )
        .strokeColor(
          "#1E3A8A"
        )
        .lineWidth(1.5)
        .stroke();

      y += 14;

      pdf
        .font(
          "Helvetica-Bold"
        )
        .fontSize(11)
        .fillColor(
          "#1E3A8A"
        );

      pdf.text(
        "TOTAL DO RELATÓRIO",
        40,
        y,
        {
          width: 190,
        }
      );

      pdf.text(
        `Registros: ${totais.registros}`,
        230,
        y,
        {
          width: 100,
          align: "center",
        }
      );

      pdf.text(
        `Quantidade: ${totais.quantidadeTotal}`,
        330,
        y,
        {
          width: 100,
          align: "center",
        }
      );

      pdf.text(
        `R$ ${totais.valorTotal.toFixed(
          2
        )}`,
        430,
        y,
        {
          width: 125,
          align: "right",
        }
      );

      y += 20;

      pdf
        .font("Helvetica")
        .fontSize(9)
        .fillColor(
          "#333333"
        );

      pdf.text(
        `Registros: ${totais.registros}`,
        40,
        y,
        {
          width: 150,
        }
      );

      pdf.text(
        `Quantidade total: ${totais.quantidadeTotal}`,
        200,
        y,
        {
          width: 160,
        }
      );

      pdf.text(
        `Valor total: R$ ${totais.valorTotal.toFixed(
          2
        )}`,
        380,
        y,
        {
          width: 175,
          align: "right",
        }
      );

      // --------------------------------------------------------
      // FINAL
      // --------------------------------------------------------

      desenharRodape();

      pdf.end();

      return;
    }

    // ========================================================
    // FORMATO INVÁLIDO
    // ========================================================

    return res.status(400).json({
      error:
        "Formato inválido. Use csv, xlsx, xml ou pdf.",
    });
  } catch (error) {
    console.error(
      "Erro ao exportar relatório:",
      error
    );

    if (!res.headersSent) {
      return res.status(500).json({
        error: error.message,
      });
    }

    return res.end();
  }
}

// ============================================================
// GERADOR PRINCIPAL
// ============================================================

async function gerarRelatorio(
  req,
  res
) {
  try {
    const {
      tipo,
    } = req.query;

    switch (tipo) {
      case "vendas":
        return vendas(
          req,
          res
        );

      case "restaurante":
        return restaurante(
          req,
          res
        );

      case "estoque":
        return estoque(
          req,
          res
        );

      case "minimo":
        return estoqueMinimo(
          req,
          res
        );

      case "zerado":
        return produtosSemEstoque(
          req,
          res
        );

      case "entradas":
        return entradas(
          req,
          res
        );

      case "saidas":
        return saidas(
          req,
          res
        );

      case "historico":
        return historico(
          req,
          res
        );

      case "movimentados":
        return movimentados(
          req,
          res
        );

      case "categoria":
        return categoria(
          req,
          res
        );

      case "fornecedor":
        return fornecedor(
          req,
          res
        );

      case "inventario":
        return inventario(
          req,
          res
        );

      default:
        return res.status(400).json({
          error:
            "Tipo de relatório inválido.",
        });
    }
  } catch (error) {
    console.error(
      "Erro ao gerar relatório:",
      error
    );

    return res.status(500).json({
      error: error.message,
    });
  }
}

// ============================================================
// EXPORTAÇÕES
// ============================================================

module.exports = {
  dashboard,
  gerarRelatorio,
  exportarRelatorio,
  estoque,
  estoqueMinimo,
  vendas,
  restaurante,
};