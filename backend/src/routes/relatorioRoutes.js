const express = require("express");

const router = express.Router();

const {
 gerarRelatorio,
 exportarRelatorio
}=require("../controllers/relatorioController");


router.get("/", gerarRelatorio);

router.get(
 "/exportar",
 exportarRelatorio
);


module.exports=router;