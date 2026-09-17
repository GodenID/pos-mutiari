-- CreateTable
CREATE TABLE "Integration" (
    "id" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "clientId" TEXT NOT NULL DEFAULT '',
    "secretEnc" TEXT NOT NULL DEFAULT '',
    "accessEnc" TEXT NOT NULL DEFAULT '',
    "refreshEnc" TEXT NOT NULL DEFAULT '',
    "status" TEXT NOT NULL DEFAULT 'belum',
    "extra" JSONB NOT NULL DEFAULT '{}',
    "lastCheck" TIMESTAMPTZ,
    "lastError" TEXT NOT NULL DEFAULT '',
    "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Integration_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Integration_provider_key" ON "Integration"("provider");
