#!/bin/bash

# Script to run database migration via SSH tunnel
# Usage: ./run-migration.sh

echo "🔄 Running database migration for booking system enhancements..."
echo ""

# Check if SSH tunnel is active
if ! nc -z localhost 5432 2>/dev/null; then
  echo "❌ Error: SSH tunnel not active on port 5432"
  echo "Please run: ssh -L 5432:localhost:5432 ubuntu@202.51.83.186"
  exit 1
fi

echo "✅ SSH tunnel detected on port 5432"
echo ""

# Get database credentials from .env file
if [ -f ".env" ]; then
  export $(grep -v '^#' .env | xargs)
  echo "✅ Loaded database credentials from .env"
else
  echo "❌ .env file not found"
  exit 1
fi

# Run migration
echo ""
echo "🚀 Executing migration: add-booking-id-to-students.sql"
echo ""

PGPASSWORD=$DB_PASSWORD psql -h localhost -p 5432 -U $DB_USERNAME -d $DB_DATABASE -f migrations/add-booking-id-to-students.sql

if [ $? -eq 0 ]; then
  echo ""
  echo "✅ Migration completed successfully!"
  echo ""
  echo "📋 Summary of changes:"
  echo "  ✅ Added 'booking_id' column to students table"
  echo "  ✅ Added foreign key constraint linking students to bookings"
  echo "  ✅ Added index on students.booking_id"
  echo "  ✅ Added 'phone' column to booking_guests table"
  echo "  ✅ Added 'email' column to booking_guests table"
  echo "  ✅ Added indexes on booking_guests (email, phone)"
  echo ""
else
  echo ""
  echo "❌ Migration failed! Check error messages above."
  exit 1
fi
