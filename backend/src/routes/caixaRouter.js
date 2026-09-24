const express = require("express");

const authMiddleware = require("../middlewares/authMiddleware");

const {
  obterCaixaAtual,
  abrirCaixa,
  fecharCaixa,
} = require("../controllers/caixaController");

const router = express.Router();

router.get(
  "/aberto",
  authMiddleware,
  obterCaixaAtual
);

router.post(
  "/abrir",
  authMiddleware,
  abrirCaixa
);

router.post(
  "/fechar",
  authMiddleware,
  fecharCaixa
);

module.exports = router;