const express = require("express");
const authMiddleware = require("../middleware/authMiddleware");

const {
  obterEmpresa,
  atualizarEmpresa,
} = require("../controllers/empresaController");

const router = express.Router();

router.get("/", authMiddleware, obterEmpresa);
router.put("/", authMiddleware, atualizarEmpresa);

module.exports = router;