-- AlterTable
ALTER TABLE "contracts" ADD COLUMN     "lot" VARCHAR(20);

-- AlterTable
ALTER TABLE "establishments" ADD COLUMN     "matricule_fiscal" VARCHAR(50),
ADD COLUMN     "mobile_phone" VARCHAR(30),
ADD COLUMN     "unique_identifier" VARCHAR(50);

-- AlterTable
ALTER TABLE "vehicles" ADD COLUMN     "category_label" VARCHAR(100),
ADD COLUMN     "circulation_date" DATE,
ADD COLUMN     "displacement" SMALLINT,
ADD COLUMN     "empty_weight" DECIMAL(10,2),
ADD COLUMN     "intermediary_code" VARCHAR(50),
ADD COLUMN     "power" SMALLINT,
ADD COLUMN     "seats" SMALLINT,
ADD COLUMN     "total_weight" DECIMAL(10,2),
ADD COLUMN     "trailer" VARCHAR(50),
ADD COLUMN     "usage" VARCHAR(100),
ADD COLUMN     "validity_end" DATE,
ADD COLUMN     "validity_start" DATE;
