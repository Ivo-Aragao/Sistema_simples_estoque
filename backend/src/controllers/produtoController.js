const prisma = require("../services/prisma");

function montarProduto(body) {
  return {
    nome: String(body.nome || "").trim(),

    codigoBarra: body.codigoBarra
      ? String(body.codigoBarra).trim()
      : null,

    descricao: body.descricao
      ? String(body.descricao).trim()
      : null,

    precoCusto: Number(body.precoCusto || 0),

    precoVenda: Number(body.precoVenda || 0),

    quantidade: Number(body.quantidade || 0),

    estoqueMinimo: Number(body.estoqueMinimo || 5),

    categoriaId: body.categoriaId
      ? Number(body.categoriaId)
      : null,

    fornecedorId: body.fornecedorId
      ? Number(body.fornecedorId)
      : null,

    disponivelVenda:
      body.disponivelVenda !== undefined
        ? Boolean(body.disponivelVenda)
        : true,

    disponivelComanda:
      body.disponivelComanda !== undefined
        ? Boolean(body.disponivelComanda)
        : false,
  };
}

function aplicarFiltroStatus(produtos, status) {
  if (status === "baixo") {
    return produtos.filter(
      (p) => p.quantidade <= p.estoqueMinimo
    );
  }

  if (status === "ok") {
    return produtos.filter(
      (p) => p.quantidade > p.estoqueMinimo
    );
  }

  return produtos;
}

async function listarProdutos(req, res) {
  try {
    const {
      q = "",
      status = "todos",
      page = 1,
      limit = 10,
      categoriaId = "",
      fornecedorId = "",
      contexto = "",
    } = req.query;

    const where = {
      ativo: true,
    };

    // ==========================================
    // CONTEXTO DO PRODUTO
    // ==========================================

    if (contexto === "comanda") {
      where.disponivelComanda = true;
    }

    if (contexto === "venda") {
      where.disponivelVenda = true;
    }

    // ==========================================
    // CATEGORIA
    // ==========================================

    if (categoriaId) {
      where.categoriaId = Number(categoriaId);
    }

    // ==========================================
    // FORNECEDOR
    // ==========================================

    if (fornecedorId) {
      where.fornecedorId = Number(fornecedorId);
    }

    // ==========================================
    // BUSCA
    // ==========================================

    if (q.trim()) {
      where.OR = [
        {
          nome: {
            contains: q.trim(),
            mode: "insensitive",
          },
        },
        {
          codigoBarra: {
            contains: q.trim(),
            mode: "insensitive",
          },
        },
      ];
    }

    // ==========================================
    // BUSCAR PRODUTOS
    // ==========================================

    const todos = await prisma.produto.findMany({
      where,

      include: {
        categoria: true,
        fornecedor: true,
      },

      orderBy: [
        {
          nome: "asc",
        },
      ],
    });

    // ==========================================
    // FILTRO DE ESTOQUE
    // ==========================================

    const filtrados = aplicarFiltroStatus(
      todos,
      status
    );

    // ==========================================
    // PAGINAÇÃO
    // ==========================================

    const total = filtrados.length;

    const paginaAtual = Math.max(
      1,
      Number(page)
    );

    const porPagina = Math.max(
      1,
      Number(limit)
    );

    const inicio =
      (paginaAtual - 1) * porPagina;

    const fim =
      inicio + porPagina;

    const itens = filtrados.slice(
      inicio,
      fim
    );

    return res.json({
      itens,

      meta: {
        total,
        page: paginaAtual,
        limit: porPagina,
        totalPages: Math.max(
          1,
          Math.ceil(total / porPagina)
        ),
      },
    });
  } catch (error) {
    console.error(
      "Erro ao listar produtos:",
      error
    );

    return res.status(500).json({
      error: error.message,
    });
  }
}

async function criarProduto(req, res) {
  try {
    const data = montarProduto(req.body);

    if (!data.nome) {
      return res.status(400).json({
        error:
          "Nome do produto é obrigatório.",
      });
    }

    const produto =
      await prisma.produto.create({
        data: {
          ...data,
          ativo: true,
        },
      });

    return res.status(201).json(produto);
  } catch (error) {
    console.error(
      "Erro ao criar produto:",
      error
    );

    return res.status(500).json({
      error: error.message,
    });
  }
}

async function editarProduto(req, res) {
  try {
    const { id } = req.params;

    const data = montarProduto(req.body);

    if (!data.nome) {
      return res.status(400).json({
        error:
          "Nome do produto é obrigatório.",
      });
    }

    const produto =
      await prisma.produto.update({
        where: {
          id: Number(id),
        },

        data,
      });

    return res.json(produto);
  } catch (error) {
    console.error(
      "Erro ao editar produto:",
      error
    );

    return res.status(500).json({
      error: error.message,
    });
  }
}

async function inativarProduto(req, res) {
  try {
    const { id } = req.params;

    await prisma.produto.update({
      where: {
        id: Number(id),
      },

      data: {
        ativo: false,
      },
    });

    return res.json({
      message:
        "Produto inativado com sucesso.",
    });
  } catch (error) {
    console.error(
      "Erro ao inativar produto:",
      error
    );

    return res.status(500).json({
      error: error.message,
    });
  }
}

module.exports = {
  listarProdutos,
  criarProduto,
  editarProduto,
  inativarProduto,
};