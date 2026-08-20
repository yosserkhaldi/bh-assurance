-- CreateEnum
CREATE TYPE "contract_amendment_type" AS ENUM ('VEHICLE_ADDITION', 'VEHICLE_REMOVAL', 'DATE_CHANGE', 'COVERAGE_CHANGE', 'OTHER');

-- CreateEnum
CREATE TYPE "contract_amendment_status" AS ENUM ('DRAFT', 'ACTIVE', 'CANCELLED');

-- CreateEnum
CREATE TYPE "generated_document_type" AS ENUM ('ATTESTATION', 'GREEN_CARD', 'AMENDMENT', 'CONTRACT_SUMMARY');

-- CreateTable
CREATE TABLE "contract_amendments" (
    "id" UUID NOT NULL,
    "contract_id" UUID NOT NULL,
    "type" "contract_amendment_type" NOT NULL,
    "status" "contract_amendment_status" NOT NULL DEFAULT 'DRAFT',
    "effective_date" DATE,
    "description" TEXT,
    "vehicle_ids" JSONB,
    "created_by_id" UUID,
    "updated_by_id" UUID,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,
    "deleted_at" TIMESTAMPTZ(3),

    CONSTRAINT "contract_amendments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "generated_documents" (
    "id" UUID NOT NULL,
    "type" "generated_document_type" NOT NULL,
    "contract_id" UUID NOT NULL,
    "amendment_id" UUID,
    "file_name" VARCHAR(255) NOT NULL,
    "file_path" VARCHAR(500) NOT NULL,
    "generated_by_id" UUID,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "generated_documents_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "contract_amendments_contract_id_status_idx" ON "contract_amendments"("contract_id", "status");

-- CreateIndex
CREATE INDEX "contract_amendments_deleted_at_idx" ON "contract_amendments"("deleted_at");

-- CreateIndex
CREATE INDEX "generated_documents_contract_id_type_idx" ON "generated_documents"("contract_id", "type");

-- CreateIndex
CREATE INDEX "generated_documents_created_at_idx" ON "generated_documents"("created_at");

-- AddForeignKey
ALTER TABLE "contract_amendments" ADD CONSTRAINT "contract_amendments_contract_id_fkey" FOREIGN KEY ("contract_id") REFERENCES "contracts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "contract_amendments" ADD CONSTRAINT "contract_amendments_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "contract_amendments" ADD CONSTRAINT "contract_amendments_updated_by_id_fkey" FOREIGN KEY ("updated_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "generated_documents" ADD CONSTRAINT "generated_documents_contract_id_fkey" FOREIGN KEY ("contract_id") REFERENCES "contracts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "generated_documents" ADD CONSTRAINT "generated_documents_amendment_id_fkey" FOREIGN KEY ("amendment_id") REFERENCES "contract_amendments"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "generated_documents" ADD CONSTRAINT "generated_documents_generated_by_id_fkey" FOREIGN KEY ("generated_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
