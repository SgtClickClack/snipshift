# Test Database Configuration

## Docker Compose Configuration

The test database is configured in `api/docker-compose.test.yml`:

```yaml
services:
  db:
    environment:
      - POSTGRES_USER=${POSTGRES_USER:-postgres}
      - POSTGRES_PASSWORD=${POSTGRES_PASSWORD:-test}
      - POSTGRES_DB=hospogo_test
    ports:
      - "5433:5432"
```

## Environment Variables

The test scripts automatically read from environment variables. You can configure the test database connection using:

### Option 1: Full Connection String
```bash
export DATABASE_URL="postgresql://postgres:your_password@localhost:5433/hospogo_test"
# or
export POSTGRES_URL="postgresql://postgres:your_password@localhost:5433/hospogo_test"
```

### Option 2: Individual Components
```bash
export POSTGRES_USER=postgres
export POSTGRES_PASSWORD=your_password_here
export POSTGRES_DB=hospogo_test
export POSTGRES_HOST=localhost
export POSTGRES_PORT=5433
```

### Option 3: Test-Specific Variables
```bash
export TEST_DB_USER=postgres
export TEST_DB_PASSWORD=your_password_here
export TEST_DB_NAME=hospogo_test
export TEST_DB_HOST=localhost
export TEST_DB_PORT=5433
```

## Defaults

If no environment variables are set, the scripts default to:
- **User**: `postgres`
- **Password**: `test`
- **Database**: `hospogo_test`
- **Host**: `localhost`
- **Port**: `5433`

## Usage

All test scripts automatically use the configuration:

```bash
# These all use the same configuration
npm run db:migrate:test
npm run db:audit:test
npm run db:seed:test
npm run test:readiness
```

## Custom Configuration Example

To use a custom password:

```bash
# Set environment variable
export POSTGRES_PASSWORD=my_secure_password

# Start database with custom password
docker-compose -f api/docker-compose.test.yml up -d

# Run tests (will use custom password automatically)
npm run test:readiness
```

## Configuration Priority

The scripts check for configuration in this order:

1. `DATABASE_URL` or `POSTGRES_URL` (full connection string)
2. Individual `POSTGRES_*` environment variables
3. `TEST_DB_*` environment variables
4. Default values (postgres:test@localhost:5433/hospogo_test)
