const express = require("express");
const router = express.Router();

const {
  login,
  cadastrarUsuario,
  esqueciSenha,
  redefinirSenha
} = require("../controllers/authController");

router.post("/login", login);
router.post("/registro", cadastrarUsuario);
router.post("/esqueci-senha", esqueciSenha);
router.post("/redefinir-senha", redefinirSenha);

module.exports = router;