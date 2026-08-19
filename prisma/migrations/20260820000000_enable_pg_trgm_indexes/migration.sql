CREATE EXTENSION IF NOT EXISTS pg_trgm;

CREATE INDEX IF NOT EXISTS idx_establishments_business_name_trgm ON "establishments" USING GIN ("business_name" gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_establishments_manager_name_trgm ON "establishments" USING GIN ("manager_name" gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_contracts_number_trgm ON "contracts" USING GIN ("number" gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_vehicles_registration_trgm ON "vehicles" USING GIN ("registration_number" gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_vehicles_chassis_trgm ON "vehicles" USING GIN ("chassis_number" gin_trgm_ops);
