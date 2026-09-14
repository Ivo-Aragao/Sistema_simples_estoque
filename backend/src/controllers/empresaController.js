const prisma = require("../services/prisma");

async function obterEmpresa(req, res) {
  try {
    const usuario = await prisma.usuario.findUnique({
      where: { id: req.usuario.id },
      include: {
        empresa: true,
      },
    });

    if (!usuario) {
      return res.status(404).json({
        error: "Usuário não encontrado.",
      });
    }

    if (!usuario.empresa) {
      return res.status(404).json({
        error: "Empresa não encontrada.",
      });
    }

    res.json(usuario.empresa);
  } catch (error) {
    res.status(500).json({
      error: error.message,
    });
  }
}

async function atualizarEmpresa(req, res) {
  try {
    const { nome, logoUrl } = req.body;

    const usuario = await prisma.usuario.findUnique({
      where: { id: req.usuario.id },
    });

    if (!usuario?.empresaId) {
      return res.status(400).json({
        error: "Usuário não possui empresa vinculada.",
      });
    }

    const empresa = await prisma.empresa.update({
      where: {
        id: usuario.empresaId,
      },
      data: {
        ...(nome !== undefined ? { nome } : {}),
        ...(logoUrl !== undefined ? { logoUrl } : {}),
      },
    });

    res.json(empresa);
  } catch (error) {
    res.status(500).json({
      error: error.message,
    });
  }
}

module.exports = {
  obterEmpresa,
  atualizarEmpresa,
};