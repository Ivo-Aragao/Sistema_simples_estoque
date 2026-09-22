-- AlterTable
ALTER TABLE "Comanda" ADD COLUMN     "taxaServicoAtiva" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "taxaServicoPercentual" DOUBLE PRECISION NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "ComandaItem" ADD COLUMN     "ajustadoEm" TIMESTAMP(3),
ADD COLUMN     "cobrar" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "motivoNaoCobranca" TEXT;

-- AlterTable
ALTER TABLE "Venda" ADD COLUMN     "taxaServico" DOUBLE PRECISION NOT NULL DEFAULT 0,
ADD COLUMN     "taxaServicoPercentual" DOUBLE PRECISION NOT NULL DEFAULT 0;
