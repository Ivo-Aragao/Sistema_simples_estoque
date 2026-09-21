const express = require("express");

const authMiddleware = require("../middlewares/authMiddleware");

const {
  listarMesas,
  criarMesa,
  atualizarMesa,
  excluirMesa,
} = require("../controllers/mesaController");

const router = express.Router();

router.get("/", authMiddleware, listarMesas);

router.post("/", authMiddleware, criarMesa);

router.put("/:id", authMiddleware, atualizarMesa);

router.delete("/:id", authMiddleware, excluirMesa);

module.exports = router;