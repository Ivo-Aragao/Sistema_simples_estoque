const express = require("express");
const router = express.Router();

const {
  listarProdutos,
  criarProduto,
  editarProduto,
  inativarProduto,
} = require("../controllers/produtoController");

router.get("/", listarProdutos);
router.post("/", criarProduto);
router.put("/:id", editarProduto);
router.patch("/:id/inativar", inativarProduto);

module.exports = router;