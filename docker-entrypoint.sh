#!/bin/sh
set -e

# Ensure upload subdirectories exist on the mounted volume.
# Handles existing volumes created before the images/videos split was added.
mkdir -p /app/public/uploads/images /app/public/uploads/videos

echo "Running database migrations..."
npx prisma migrate deploy

if [ "${SEED_ON_START:-false}" = "true" ]; then
  echo "Seeding database..."
  node prisma/seed.cjs
fi

echo "Starting Next.js..."
exec node server.js
