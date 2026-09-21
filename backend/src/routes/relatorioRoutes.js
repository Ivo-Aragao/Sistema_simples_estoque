const express = require("express");

const router = express.Router();

const {
  gerarRelatorio,
  exportarRelatorio,
} = require("../controllers/relatorioController");

// Exportação de relatórios
// Deve ficar antes de qualquer rota dinâmica, caso ela seja adicionada futuramente.
router.get("/exportar", exportarRelatorio);

// Consulta do relatório
router.get("/", gerarRelatorio);

module.exports = router;