-- Add force_password_change flag to users
ALTER TABLE "users" ADD COLUMN "force_password_change" BOOLEAN NOT NULL DEFAULT false;
