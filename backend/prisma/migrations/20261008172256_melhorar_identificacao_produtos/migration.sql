-- CreateTable
CREATE TABLE "ProdutoFornecedor" (
    "id" SERIAL NOT NULL,
    "produtoId" INTEGER NOT NULL,
    "fornecedorId" INTEGER NOT NULL,
    "codigoProduto" TEXT,
    "codigoBarra" TEXT,
    "nomeOriginal" TEXT,
    "nomeNormalizado" TEXT,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizadoEm" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProdutoFornecedor_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ProdutoFornecedor_fornecedorId_codigoBarra_idx" ON "ProdutoFornecedor"("fornecedorId", "codigoBarra");

-- CreateIndex
CREATE INDEX "ProdutoFornecedor_fornecedorId_nomeNormalizado_idx" ON "ProdutoFornecedor"("fornecedorId", "nomeNormalizado");

-- CreateIndex
CREATE UNIQUE INDEX "ProdutoFornecedor_fornecedorId_codigoProduto_key" ON "ProdutoFornecedor"("fornecedorId", "codigoProduto");

-- AddForeignKey
ALTER TABLE "ProdutoFornecedor" ADD CONSTRAINT "ProdutoFornecedor_produtoId_fkey" FOREIGN KEY ("produtoId") REFERENCES "Produto"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProdutoFornecedor" ADD CONSTRAINT "ProdutoFornecedor_fornecedorId_fkey" FOREIGN KEY ("fornecedorId") REFERENCES "Fornecedor"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
