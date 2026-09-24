-- AlterTable
ALTER TABLE "Venda" ADD COLUMN     "caixaId" INTEGER;

-- CreateTable
CREATE TABLE "Caixa" (
    "id" SERIAL NOT NULL,
    "empresaId" INTEGER NOT NULL,
    "usuarioAberturaId" INTEGER,
    "usuarioFechamentoId" INTEGER,
    "aberturaEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "fechamentoEm" TIMESTAMP(3),
    "saldoInicial" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "saldoEsperado" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "saldoFinal" DOUBLE PRECISION,
    "diferenca" DOUBLE PRECISION,
    "totalVendas" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "totalDinheiro" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "totalPix" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "totalCartao" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "totalOutros" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL DEFAULT 'ABERTO',
    "fechamentoAutomatico" BOOLEAN NOT NULL DEFAULT false,
    "aberturaAutomatica" BOOLEAN NOT NULL DEFAULT false,
    "observacao" TEXT,

    CONSTRAINT "Caixa_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Caixa_empresaId_status_idx" ON "Caixa"("empresaId", "status");

-- AddForeignKey
ALTER TABLE "Venda" ADD CONSTRAINT "Venda_caixaId_fkey" FOREIGN KEY ("caixaId") REFERENCES "Caixa"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Caixa" ADD CONSTRAINT "Caixa_empresaId_fkey" FOREIGN KEY ("empresaId") REFERENCES "Empresa"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Caixa" ADD CONSTRAINT "Caixa_usuarioAberturaId_fkey" FOREIGN KEY ("usuarioAberturaId") REFERENCES "Usuario"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Caixa" ADD CONSTRAINT "Caixa_usuarioFechamentoId_fkey" FOREIGN KEY ("usuarioFechamentoId") REFERENCES "Usuario"("id") ON DELETE SET NULL ON UPDATE CASCADE;
