const express = require("express");

const authMiddleware = require("../middlewares/authMiddleware");

const {
  criarVenda,
  listarVendas,
  cancelarVenda,
} = require("../controllers/vendaController");

const router = express.Router();

router.get("/", authMiddleware, listarVendas);
router.post("/", authMiddleware, criarVenda);
router.patch("/:id/cancelar", authMiddleware, cancelarVenda);

module.exports = router;