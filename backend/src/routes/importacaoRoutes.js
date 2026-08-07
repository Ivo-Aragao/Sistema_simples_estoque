const express = require("express");
const multer = require("multer");
const { importarXml } = require("../controllers/importacaoXmlController");

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage() });

router.post("/xml", upload.single("xml"), importarXml);

module.exports = router;