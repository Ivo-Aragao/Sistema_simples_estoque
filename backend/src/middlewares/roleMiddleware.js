function verificarPerfil(perfisPermitidos) {
  return (req, res, next) => {
    const usuario = req.usuario;

    if (!usuario) {
      return res.status(401).json({ error: "Não autenticado" });
    }

    if (!perfisPermitidos.includes(usuario.perfil)) {
      return res.status(403).json({ error: "Acesso negado" });
    }

    next();
  };
}

module.exports = { verificarPerfil };