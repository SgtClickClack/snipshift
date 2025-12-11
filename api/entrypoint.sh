#!/bin/sh
set -e

echo "🚀 Starting Snipshift API entrypoint..."

# Wait for database to be ready (optional but recommended)
if [ -n "$DATABASE_URL" ] || [ -n "$POSTGRES_URL" ]; then
  echo "⏳ Waiting for database to be ready..."
  
  # Extract connection details from DATABASE_URL
  # Format: postgresql://user:password@host:port/database
  DB_HOST=$(echo "${DATABASE_URL:-$POSTGRES_URL}" | sed -n 's/.*@\([^:]*\):.*/\1/p')
  DB_PORT=$(echo "${DATABASE_URL:-$POSTGRES_URL}" | sed -n 's/.*:\([0-9]*\)\/.*/\1/p' || echo "5432")
  
  # Install netcat for connection testing if not available
  if ! command -v nc >/dev/null 2>&1; then
    apk add --no-cache netcat-openbsd >/dev/null 2>&1 || true
  fi
  
  # Wait for database connection (max 30 seconds)
  timeout=30
  counter=0
  while ! nc -z "${DB_HOST:-localhost}" "${DB_PORT:-5432}" 2>/dev/null; do
    if [ $counter -ge $timeout ]; then
      echo "❌ Database connection timeout after ${timeout} seconds"
      exit 1
    fi
    echo "   Waiting for database... (${counter}/${timeout}s)"
    sleep 1
    counter=$((counter + 1))
  done
  
  echo "✅ Database is ready"
fi

# Run database migrations
echo "📦 Running database migrations..."
if [ -d "drizzle" ] && [ -n "$(ls -A drizzle/*.sql 2>/dev/null)" ]; then
  echo "   Found migration files in drizzle directory"
  # Apply all migrations in order (sorted by filename)
  # Note: In production, you should track applied migrations to avoid re-applying
  migration_count=0
  for migration_file in $(ls drizzle/*.sql 2>/dev/null | sort); do
    if [ -f "$migration_file" ]; then
      migration_name=$(basename "$migration_file")
      echo "   Applying migration: $migration_name"
      # Use the existing apply-migration script
      if [ -f "_src/scripts/apply-migration.ts" ]; then
        npx tsx _src/scripts/apply-migration.ts "$migration_name" || {
          echo "⚠️  Migration $migration_name failed or already applied"
          # Continue with other migrations even if one fails (might be already applied)
        }
        migration_count=$((migration_count + 1))
      else
        echo "⚠️  Migration script not found at _src/scripts/apply-migration.ts"
        break
      fi
    fi
  done
  if [ $migration_count -gt 0 ]; then
    echo "✅ Processed $migration_count migration(s)"
  else
    echo "ℹ️  No new migrations to apply"
  fi
else
  echo "⚠️  No migration files found in drizzle directory"
  echo "   Make sure migrations are applied manually or via CI/CD"
fi

# Start the application
echo "🎯 Starting API server..."
exec "$@"
