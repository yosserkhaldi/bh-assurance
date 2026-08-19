-- CreateIndex
CREATE UNIQUE INDEX "contracts_one_active_per_establishment"
  ON "contracts"("establishment_id")
  WHERE "deleted_at" IS NULL;
