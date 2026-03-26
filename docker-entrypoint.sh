#!/bin/sh
set -e

echo "⏳ Running Prisma migrations..."
npx prisma migrate deploy

# Only seed if the database is empty (check for a school record)
echo "🔍 Checking if database needs seeding..."
SCHOOL_COUNT=$(node -e "
const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();
p.school.count().then(c => { console.log(c); p.\$disconnect(); }).catch(() => { console.log(0); p.\$disconnect(); });
")

if [ "$SCHOOL_COUNT" = "0" ]; then
  echo "🌱 Database is empty — seeding with demo data..."
  node src/prisma/seed.js
else
  echo "ℹ️  Database already has data (${SCHOOL_COUNT} school(s)) — skipping seed."
fi

echo "🚀 Starting backend server..."
exec "$@"
