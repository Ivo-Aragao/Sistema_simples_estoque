const express = require("express");

const authMiddleware = require("../middlewares/authMiddleware");

const {
  abrirComanda,
  obterComanda,
  adicionarItem,
  alterarItem,
  removerItem,
  atualizarStatusItem,
  registrarPagamento,
  alterarTaxaServico,
  marcarItemNaoCobravel,
} = require("../controllers/comandaController");

const router = express.Router();

router.post(
  "/",
  authMiddleware,
  abrirComanda
);

router.get(
  "/:id",
  authMiddleware,
  obterComanda
);

router.post(
  "/:id/itens",
  authMiddleware,
  adicionarItem
);

router.put(
  "/:id/itens/:itemId",
  authMiddleware,
  alterarItem
);

router.patch(
  "/:id/itens/:itemId/status",
  authMiddleware,
  atualizarStatusItem
);

router.patch(
  "/:id/itens/:itemId/nao-cobravel",
  authMiddleware,
  marcarItemNaoCobravel
);

router.delete(
  "/:id/itens/:itemId",
  authMiddleware,
  removerItem
);

router.post(
  "/:id/pagamentos",
  authMiddleware,
  registrarPagamento
);

router.patch(
  "/:id/taxa-servico",
  authMiddleware,
  alterarTaxaServico
);

module.exports = router;