const prisma = require("../services/prisma");

async function listarMesas(req, res) {
  try {
    const usuario = await prisma.usuario.findUnique({
      where: {
        id: req.usuario.id,
      },
    });

    if (!usuario) {
      return res.status(404).json({
        error: "Usuário não encontrado.",
      });
    }

    const mesas = await prisma.mesa.findMany({
      where: {
        empresaId: usuario.empresaId || undefined,
      },
      include: {
        comandas: {
          where: {
            status: "ABERTA",
          },
          include: {
            itens: true,
          },
          orderBy: {
            criadoEm: "desc",
          },
          take: 1,
        },
      },
      orderBy: {
        numero: "asc",
      },
    });

    const resultado = mesas.map((mesa) => {
      const comanda = mesa.comandas[0] || null;

      const total = comanda
        ? comanda.itens.reduce(
            (soma, item) => soma + Number(item.subtotal),
            0
          )
        : 0;

      return {
        id: mesa.id,
        numero: mesa.numero,
        capacidade: mesa.capacidade,
        status: mesa.status,
        observacao: mesa.observacao,
        empresaId: mesa.empresaId,
        comandaAberta: comanda
          ? {
              id: comanda.id,
              codigo: comanda.codigo,
              status: comanda.status,
              total,
            }
          : null,
      };
    });

    return res.json(resultado);
  } catch (error) {
    console.error("Erro ao listar mesas:", error);

    return res.status(500).json({
      error: "Erro ao listar mesas.",
    });
  }
}

async function criarMesa(req, res) {
  try {
    const {
      numero,
      capacidade,
      observacao,
    } = req.body;

    if (
      numero === undefined ||
      numero === null ||
      numero === ""
    ) {
      return res.status(400).json({
        error: "Informe o número da mesa.",
      });
    }

    const usuario = await prisma.usuario.findUnique({
      where: {
        id: req.usuario.id,
      },
    });

    if (!usuario) {
      return res.status(404).json({
        error: "Usuário não encontrado.",
      });
    }

    const mesa = await prisma.mesa.create({
      data: {
        numero: Number(numero),
        capacidade:
          capacidade === undefined ||
          capacidade === null ||
          capacidade === ""
            ? null
            : Number(capacidade),
        observacao: observacao || null,
        empresaId: usuario.empresaId || null,
      },
    });

    return res.status(201).json(mesa);
  } catch (error) {
    console.error("Erro ao criar mesa:", error);

    if (error.code === "P2002") {
      return res.status(400).json({
        error: "Já existe uma mesa com esse número nesta empresa.",
      });
    }

    return res.status(500).json({
      error: "Erro ao criar mesa.",
    });
  }
}

async function atualizarMesa(req, res) {
  try {
    const id = Number(req.params.id);

    if (!Number.isInteger(id)) {
      return res.status(400).json({
        error: "ID da mesa inválido.",
      });
    }

    const {
      numero,
      capacidade,
      observacao,
      status,
    } = req.body;

    const mesaAtual = await prisma.mesa.findUnique({
      where: { id },
    });

    if (!mesaAtual) {
      return res.status(404).json({
        error: "Mesa não encontrada.",
      });
    }

    const mesa = await prisma.mesa.update({
      where: { id },
      data: {
        ...(numero !== undefined
          ? { numero: Number(numero) }
          : {}),

        ...(capacidade !== undefined
          ? {
              capacidade:
                capacidade === null || capacidade === ""
                  ? null
                  : Number(capacidade),
            }
          : {}),

        ...(observacao !== undefined
          ? { observacao: observacao || null }
          : {}),

        ...(status !== undefined
          ? { status }
          : {}),
      },
    });

    return res.json(mesa);
  } catch (error) {
    console.error("Erro ao atualizar mesa:", error);

    if (error.code === "P2002") {
      return res.status(400).json({
        error: "Já existe uma mesa com esse número nesta empresa.",
      });
    }

    return res.status(500).json({
      error: "Erro ao atualizar mesa.",
    });
  }
}

async function excluirMesa(req, res) {
  try {
    const id = Number(req.params.id);

    if (!Number.isInteger(id)) {
      return res.status(400).json({
        error: "ID da mesa inválido.",
      });
    }

    const mesa = await prisma.mesa.findUnique({
      where: { id },
      include: {
        comandas: {
          where: {
            status: "ABERTA",
          },
        },
      },
    });

    if (!mesa) {
      return res.status(404).json({
        error: "Mesa não encontrada.",
      });
    }

    if (mesa.comandas.length > 0) {
      return res.status(400).json({
        error: "Não é possível excluir uma mesa com comanda aberta.",
      });
    }

    await prisma.mesa.delete({
      where: { id },
    });

    return res.json({
      message: "Mesa excluída com sucesso.",
    });
  } catch (error) {
    console.error("Erro ao excluir mesa:", error);

    return res.status(500).json({
      error: "Erro ao excluir mesa.",
    });
  }
}

module.exports = {
  listarMesas,
  criarMesa,
  atualizarMesa,
  excluirMesa,
};