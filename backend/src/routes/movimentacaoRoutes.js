const express = require("express");
const router = express.Router();
const {
  listarMovimentacoes,
  criarMovimentacao
} = require("../controllers/movimentacaoController");

router.get("/", listarMovimentacoes);
router.post("/", criarMovimentacao);

module.exports = router;