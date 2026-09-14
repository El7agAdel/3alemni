#!/bin/sh
set -e

echo "Running database migrations"
npx prisma migrate deploy

echo "Running database seeds"
npx prisma db seed

echo "Starting the application"
exec node dist/src/main.js
