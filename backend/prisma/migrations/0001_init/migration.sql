-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateTable
CREATE TABLE "Category" (
    "id" TEXT NOT NULL,
    "nama" TEXT NOT NULL,

    CONSTRAINT "Category_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Product" (
    "id" TEXT NOT NULL,
    "sku" TEXT NOT NULL,
    "nama" TEXT NOT NULL,
    "kategori" TEXT NOT NULL DEFAULT 'Lain-lain',
    "satuan" TEXT NOT NULL DEFAULT 'pcs',
    "hargaBeli" INTEGER NOT NULL DEFAULT 0,
    "hargaJual" INTEGER NOT NULL DEFAULT 0,
    "stok" INTEGER NOT NULL DEFAULT 0,
    "stokMin" INTEGER NOT NULL DEFAULT 0,
    "aktif" BOOLEAN NOT NULL DEFAULT true,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Product_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Customer" (
    "id" TEXT NOT NULL,
    "nama" TEXT NOT NULL,
    "telepon" TEXT NOT NULL DEFAULT '',
    "alamat" TEXT NOT NULL DEFAULT '',
    "catatan" TEXT NOT NULL DEFAULT '',
    "dibuatPada" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Customer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Supplier" (
    "id" TEXT NOT NULL,
    "nama" TEXT NOT NULL,
    "telepon" TEXT NOT NULL DEFAULT '',
    "alamat" TEXT NOT NULL DEFAULT '',
    "catatan" TEXT NOT NULL DEFAULT '',

    CONSTRAINT "Supplier_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Purchase" (
    "id" TEXT NOT NULL,
    "nomor" TEXT NOT NULL,
    "tanggal" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "supplierId" TEXT NOT NULL DEFAULT '',
    "supplierNama" TEXT NOT NULL DEFAULT 'Supplier umum',
    "total" INTEGER NOT NULL DEFAULT 0,
    "keterangan" TEXT NOT NULL DEFAULT '',
    "petugas" TEXT NOT NULL DEFAULT 'Kasir',

    CONSTRAINT "Purchase_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PurchaseItem" (
    "id" TEXT NOT NULL,
    "purchaseId" TEXT NOT NULL,
    "produkId" TEXT NOT NULL,
    "sku" TEXT NOT NULL DEFAULT '',
    "nama" TEXT NOT NULL,
    "satuan" TEXT NOT NULL DEFAULT 'pcs',
    "qty" INTEGER NOT NULL,
    "hargaBeli" INTEGER NOT NULL,
    "subtotal" INTEGER NOT NULL,

    CONSTRAINT "PurchaseItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Sale" (
    "id" TEXT NOT NULL,
    "nomor" TEXT NOT NULL,
    "tanggal" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "kasir" TEXT NOT NULL DEFAULT 'Kasir',
    "pelanggan" TEXT NOT NULL DEFAULT '',
    "pelangganId" TEXT NOT NULL DEFAULT '',
    "subtotal" INTEGER NOT NULL DEFAULT 0,
    "diskonItem" INTEGER NOT NULL DEFAULT 0,
    "diskon" INTEGER NOT NULL DEFAULT 0,
    "pajakPersen" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "pajak" INTEGER NOT NULL DEFAULT 0,
    "total" INTEGER NOT NULL DEFAULT 0,
    "metode" TEXT NOT NULL DEFAULT 'tunai',
    "bayar" INTEGER NOT NULL DEFAULT 0,
    "kembalian" INTEGER NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL DEFAULT 'selesai',
    "alasanVoid" TEXT NOT NULL DEFAULT '',
    "waktuVoid" TIMESTAMP(3),
    "catatan" TEXT NOT NULL DEFAULT '',

    CONSTRAINT "Sale_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SaleItem" (
    "id" TEXT NOT NULL,
    "saleId" TEXT NOT NULL,
    "produkId" TEXT NOT NULL,
    "sku" TEXT NOT NULL DEFAULT '',
    "nama" TEXT NOT NULL,
    "satuan" TEXT NOT NULL DEFAULT 'pcs',
    "harga" INTEGER NOT NULL,
    "hargaBeli" INTEGER NOT NULL DEFAULT 0,
    "qty" INTEGER NOT NULL,
    "diskon" INTEGER NOT NULL DEFAULT 0,
    "subtotal" INTEGER NOT NULL,

    CONSTRAINT "SaleItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Payment" (
    "id" TEXT NOT NULL,
    "saleId" TEXT NOT NULL,
    "metode" TEXT NOT NULL,
    "jumlah" INTEGER NOT NULL,

    CONSTRAINT "Payment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StockMutation" (
    "id" TEXT NOT NULL,
    "tanggal" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "produkId" TEXT NOT NULL,
    "nama" TEXT NOT NULL DEFAULT '',
    "tipe" TEXT NOT NULL,
    "qty" INTEGER NOT NULL,
    "keterangan" TEXT NOT NULL DEFAULT '',
    "ref" TEXT NOT NULL DEFAULT '',
    "petugas" TEXT NOT NULL DEFAULT 'Kasir',

    CONSTRAINT "StockMutation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "nama" TEXT NOT NULL,
    "username" TEXT NOT NULL,
    "peran" TEXT NOT NULL DEFAULT 'kasir',
    "passwordHash" TEXT NOT NULL,
    "aktif" BOOLEAN NOT NULL DEFAULT true,
    "dibuatPada" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Setting" (
    "id" INTEGER NOT NULL DEFAULT 1,
    "data" JSONB NOT NULL DEFAULT '{}',

    CONSTRAINT "Setting_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Category_nama_key" ON "Category"("nama");

-- CreateIndex
CREATE UNIQUE INDEX "Product_sku_key" ON "Product"("sku");

-- CreateIndex
CREATE INDEX "Product_nama_idx" ON "Product"("nama");

-- CreateIndex
CREATE INDEX "Product_kategori_idx" ON "Product"("kategori");

-- CreateIndex
CREATE INDEX "Customer_nama_idx" ON "Customer"("nama");

-- CreateIndex
CREATE INDEX "Supplier_nama_idx" ON "Supplier"("nama");

-- CreateIndex
CREATE UNIQUE INDEX "Purchase_nomor_key" ON "Purchase"("nomor");

-- CreateIndex
CREATE INDEX "Purchase_tanggal_idx" ON "Purchase"("tanggal");

-- CreateIndex
CREATE INDEX "PurchaseItem_purchaseId_idx" ON "PurchaseItem"("purchaseId");

-- CreateIndex
CREATE INDEX "PurchaseItem_produkId_idx" ON "PurchaseItem"("produkId");

-- CreateIndex
CREATE UNIQUE INDEX "Sale_nomor_key" ON "Sale"("nomor");

-- CreateIndex
CREATE INDEX "Sale_tanggal_idx" ON "Sale"("tanggal");

-- CreateIndex
CREATE INDEX "Sale_status_idx" ON "Sale"("status");

-- CreateIndex
CREATE INDEX "Sale_pelangganId_idx" ON "Sale"("pelangganId");

-- CreateIndex
CREATE INDEX "SaleItem_saleId_idx" ON "SaleItem"("saleId");

-- CreateIndex
CREATE INDEX "SaleItem_produkId_idx" ON "SaleItem"("produkId");

-- CreateIndex
CREATE INDEX "Payment_saleId_idx" ON "Payment"("saleId");

-- CreateIndex
CREATE INDEX "StockMutation_produkId_idx" ON "StockMutation"("produkId");

-- CreateIndex
CREATE INDEX "StockMutation_tanggal_idx" ON "StockMutation"("tanggal");

-- CreateIndex
CREATE UNIQUE INDEX "User_username_key" ON "User"("username");

-- AddForeignKey
ALTER TABLE "PurchaseItem" ADD CONSTRAINT "PurchaseItem_purchaseId_fkey" FOREIGN KEY ("purchaseId") REFERENCES "Purchase"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SaleItem" ADD CONSTRAINT "SaleItem_saleId_fkey" FOREIGN KEY ("saleId") REFERENCES "Sale"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Payment" ADD CONSTRAINT "Payment_saleId_fkey" FOREIGN KEY ("saleId") REFERENCES "Sale"("id") ON DELETE CASCADE ON UPDATE CASCADE;

