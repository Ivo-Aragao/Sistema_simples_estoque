const express = require("express");
const router = express.Router();
const prisma = require("../services/prisma");

router.get("/", async (req, res) => {
  const fornecedores = await prisma.fornecedor.findMany();
  res.json(fornecedores);
});

router.post("/", async (req, res) => {
  const fornecedor = await prisma.fornecedor.create({
    data: req.body,
  });
  res.json(fornecedor);
});

module.exports = router;