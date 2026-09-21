/*
  Warnings:

  - A unique constraint covering the columns `[vendaId]` on the table `Comanda` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[empresaId,numero]` on the table `Mesa` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[comandaId]` on the table `Venda` will be added. If there are existing duplicate values, this will fail.

*/
-- DropIndex
DROP INDEX "Mesa_numero_key";

-- AlterTable
ALTER TABLE "Comanda" ADD COLUMN     "vendaId" INTEGER;

-- AlterTable
ALTER TABLE "Venda" ADD COLUMN     "comandaId" INTEGER;

-- CreateIndex
CREATE UNIQUE INDEX "Comanda_vendaId_key" ON "Comanda"("vendaId");

-- CreateIndex
CREATE UNIQUE INDEX "Mesa_empresaId_numero_key" ON "Mesa"("empresaId", "numero");

-- CreateIndex
CREATE UNIQUE INDEX "Venda_comandaId_key" ON "Venda"("comandaId");

-- AddForeignKey
ALTER TABLE "Venda" ADD CONSTRAINT "Venda_comandaId_fkey" FOREIGN KEY ("comandaId") REFERENCES "Comanda"("id") ON DELETE SET NULL ON UPDATE CASCADE;
