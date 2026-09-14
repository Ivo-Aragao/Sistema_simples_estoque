-- AlterTable
ALTER TABLE "Usuario" ADD COLUMN     "empresaId" INTEGER;

-- CreateTable
CREATE TABLE "Empresa" (
    "id" SERIAL NOT NULL,
    "nome" TEXT NOT NULL,
    "logoUrl" TEXT,

    CONSTRAINT "Empresa_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "Usuario" ADD CONSTRAINT "Usuario_empresaId_fkey" FOREIGN KEY ("empresaId") REFERENCES "Empresa"("id") ON DELETE SET NULL ON UPDATE CASCADE;
