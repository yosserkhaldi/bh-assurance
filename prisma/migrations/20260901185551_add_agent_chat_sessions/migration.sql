-- DropIndex
DROP INDEX "idx_contracts_number_trgm";

-- DropIndex
DROP INDEX "idx_establishments_business_name_trgm";

-- DropIndex
DROP INDEX "idx_establishments_manager_name_trgm";

-- DropIndex
DROP INDEX "idx_vehicles_chassis_trgm";

-- DropIndex
DROP INDEX "idx_vehicles_registration_trgm";

-- CreateTable
CREATE TABLE "agent_chat_sessions" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "session_id" VARCHAR(255) NOT NULL,
    "title" VARCHAR(200),
    "messages" JSONB NOT NULL,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "agent_chat_sessions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "agent_chat_sessions_user_id_updated_at_idx" ON "agent_chat_sessions"("user_id", "updated_at");

-- CreateIndex
CREATE UNIQUE INDEX "agent_chat_sessions_user_id_session_id_key" ON "agent_chat_sessions"("user_id", "session_id");

-- AddForeignKey
ALTER TABLE "agent_chat_sessions" ADD CONSTRAINT "agent_chat_sessions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
