const prisma = require("../services/prisma");

async function obterEmpresa(req, res) {
  try {
    const usuario = await prisma.usuario.findUnique({
      where: {
        id: req.usuario.id,
      },
      include: {
        empresa: true,
      },
    });

    if (!usuario) {
      return res.status(404).json({
        error: "Usuário não encontrado.",
      });
    }

    // Se já possui empresa, retorna a empresa
    if (usuario.empresa) {
      return res.json(usuario.empresa);
    }

    // Procura uma empresa existente
    let empresa = await prisma.empresa.findFirst();

    // Se não existir nenhuma, cria uma
    if (!empresa) {
      empresa = await prisma.empresa.create({
        data: {
          nome: "Minha Empresa",
        },
      });
    }

    // Vincula a empresa ao usuário
    await prisma.usuario.update({
      where: {
        id: usuario.id,
      },
      data: {
        empresaId: empresa.id,
      },
    });

    return res.json(empresa);
  } catch (error) {
    console.error("Erro ao obter empresa:", error);

    return res.status(500).json({
      error: "Erro ao obter empresa.",
    });
  }
}

async function atualizarEmpresa(req, res) {
  try {
    const { nome, logoUrl } = req.body;

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

    let empresa;

    // Usuário já possui empresa
    if (usuario.empresaId) {
      empresa = await prisma.empresa.update({
        where: {
          id: usuario.empresaId,
        },
        data: {
          ...(nome !== undefined ? { nome } : {}),
          ...(logoUrl !== undefined ? { logoUrl } : {}),
        },
      });
    } else {
      // Cria uma empresa e vincula ao usuário
      empresa = await prisma.empresa.create({
        data: {
          nome: nome || "Minha Empresa",
          logoUrl: logoUrl || null,
        },
      });

      await prisma.usuario.update({
        where: {
          id: usuario.id,
        },
        data: {
          empresaId: empresa.id,
        },
      });
    }

    return res.json(empresa);
  } catch (error) {
    console.error("Erro ao atualizar empresa:", error);

    return res.status(500).json({
      error: "Erro ao atualizar empresa.",
    });
  }
}

module.exports = {
  obterEmpresa,
  atualizarEmpresa,
};