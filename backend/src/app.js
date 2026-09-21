const express = require("express");
const cors = require("cors");

const authRoutes = require("./routes/authRoutes");
const produtoRoutes = require("./routes/produtoRoutes");
const movimentacaoRoutes = require("./routes/movimentacaoRoutes");
const dashboardRoutes = require("./routes/dashboardRoutes");
const relatorioRoutes = require("./routes/relatorioRoutes");
const categoriaRoutes = require("./routes/categoriaRoutes");
const fornecedorRoutes = require("./routes/fornecedorRoutes");
const importacaoRoutes = require("./routes/importacaoRoutes");
const empresaRoutes = require("./routes/empresaRoutes");
const vendaRoutes = require("./routes/vendaRoutes");
const mesaRoutes = require("./routes/mesaRoutes");
const comandaRoutes = require("./routes/comandaRoutes");

const app = express();

app.use(cors());
app.use(express.json());

app.use("/auth", authRoutes);
app.use("/produtos", produtoRoutes);
app.use("/movimentacoes", movimentacaoRoutes);
app.use("/dashboard", dashboardRoutes);
app.use("/relatorios", relatorioRoutes);
app.use("/categorias", categoriaRoutes);
app.use("/empresa", empresaRoutes);
app.use("/fornecedores", fornecedorRoutes);
app.use("/importacoes", importacaoRoutes);
app.use("/vendas", vendaRoutes);
app.use("/mesas", mesaRoutes);
app.use("/comandas", comandaRoutes);

app.get("/", (req, res) => {
  res.json({
    message:
      "API do sistema de estoque funcionando",
  });
});

module.exports = app;