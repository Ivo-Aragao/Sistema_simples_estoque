const express = require("express");
const router = express.Router();
const prisma = require("../services/prisma");

router.get("/", async (req, res) => {
  const categorias = await prisma.categoria.findMany();
  res.json(categorias);
});

router.post("/", async (req, res) => {
  const categoria = await prisma.categoria.create({
    data: { nome: req.body.nome },
  });
  res.json(categoria);
});

module.exports = router;