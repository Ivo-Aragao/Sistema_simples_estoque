-- AlterTable
ALTER TABLE "ComandaItem" ADD COLUMN     "enviadoEm" TIMESTAMP(3),
ADD COLUMN     "preparandoEm" TIMESTAMP(3),
ADD COLUMN     "prontoEm" TIMESTAMP(3),
ADD COLUMN     "quantidadeServida" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "servidoEm" TIMESTAMP(3),
ADD COLUMN     "status" TEXT NOT NULL DEFAULT 'PENDENTE';
