const express = require("express");

const authMiddleware = require("../middlewares/authMiddleware");
const upload = require("../middlewares/uploadMiddleware");

const {
  obterEmpresa,
  atualizarEmpresa,
  atualizarLogo,
} = require("../controllers/empresaController");

const router = express.Router();

router.get("/", authMiddleware, obterEmpresa);

router.put("/", authMiddleware, atualizarEmpresa);

router.post(
  "/logo",
  authMiddleware,
  (req, res, next) => {
    upload.single("logo")(req, res, (error) => {
      if (error) {
        console.error("ERRO NO UPLOAD DA LOGO:");
        console.error(error);
        console.error("message:", error?.message);
        console.error("stack:", error?.stack);

        return res.status(500).json({
          error: error?.message || "Erro ao fazer upload da imagem.",
        });
      }

      next();
    });
  },
  atualizarLogo
);

module.exports = router;