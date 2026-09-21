-- AlterTable
ALTER TABLE "Produto" ADD COLUMN     "disponivelComanda" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "disponivelVenda" BOOLEAN NOT NULL DEFAULT true;
