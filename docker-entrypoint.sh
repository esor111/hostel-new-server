#!/bin/sh

# Wait for database to be ready
echo "Waiting for database to be ready..."
while ! nc -z $DB_HOST $DB_PORT; do
  echo "Database is unavailable - sleeping"
  sleep 1
done

echo "Database is up - executing command"

# Run migrations if needed
echo "Running database migrations..."
npm run migration:run || echo "Migration failed or no migrations to run"

# Execute the main command
exec "$@"
