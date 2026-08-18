#!/bin/sh
set -e

echo ">>> Applying Prisma migrations..."
npx prisma migrate deploy --schema prisma/schema.prisma

echo ">>> Seeding database (idempotent)..."
npm run prisma:seed -w backend

echo ">>> Starting backend dev server..."
exec npm run start:dev -w backend
