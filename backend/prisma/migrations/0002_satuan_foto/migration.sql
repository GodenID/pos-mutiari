-- CreateTable
CREATE TABLE "Unit" (
    "id" TEXT NOT NULL,
    "nama" TEXT NOT NULL,

    CONSTRAINT "Unit_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Unit_nama_key" ON "Unit"("nama");

-- AlterTable
ALTER TABLE "Product" ADD COLUMN "gambarUrl" TEXT NOT NULL DEFAULT '';

-- AlterTable
ALTER TABLE "Product" ADD COLUMN "gambarKey" TEXT NOT NULL DEFAULT '';
