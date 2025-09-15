# SnipShift Development Makefile
# Run commands from the root directory of the project

.PHONY: help setup dev build test clean docker-up docker-down docker-logs

# Default target
help: ## Show this help message
	@echo "SnipShift Development Commands:"
	@echo ""
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | awk 'BEGIN {FS = ":.*?## "}; {printf "  \033[36m%-20s\033[0m %s\n", $$1, $$2}'

# Setup commands
setup: ## Setup the development environment
	@echo "Setting up SnipShift development environment..."
	@cp env.example .env
	@echo "✅ Copied environment file"
	@echo "Please edit .env file with your actual configuration values"
	@make docker-up

install: ## Install dependencies for all services
	@echo "Installing dependencies..."
	@cd api && npm ci
	@cd web && npm ci
	@cd mobile && npm ci
	@echo "✅ All dependencies installed"

# Development commands
dev: ## Start all services in development mode
	@echo "Starting SnipShift in development mode..."
	@make docker-up
	@echo "✅ Services starting up..."
	@echo "📊 API: http://localhost:4000/graphql"
	@echo "🌐 Web: http://localhost:3000"
	@echo "📱 Mobile: Run 'npm start' in mobile/ directory"

api-dev: ## Start only the API service in development mode
	@echo "Starting API service..."
	@cd api && npm run dev

web-dev: ## Start only the web service in development mode
	@echo "Starting web service..."
	@cd web && npm run dev

# Build commands
build: ## Build all services
	@echo "Building all services..."
	@cd api && npm run build
	@cd web && npm run build
	@echo "✅ All services built"

build-api: ## Build only the API service
	@echo "Building API service..."
	@cd api && npm run build

build-web: ## Build only the web service
	@echo "Building web service..."
	@cd web && npm run build

# Testing commands
test: ## Run tests for all services
	@echo "Running tests..."
	@cd api && npm test
	@cd web && npm test
	@cd mobile && npm test

test-api: ## Run tests for API service
	@echo "Running API tests..."
	@cd api && npm test

test-web: ## Run tests for web service
	@echo "Running web tests..."
	@cd web && npm test

# Docker commands
docker-up: ## Start all services with Docker Compose
	@echo "Starting Docker services..."
	@docker-compose up -d
	@echo "⏳ Waiting for services to be ready..."
	@sleep 10
	@echo "✅ Docker services started"
	@echo "📊 API: http://localhost:4000/graphql"
	@echo "🌐 Web: http://localhost:3000"
	@echo "🐘 PostgreSQL: localhost:5432"
	@echo "🔴 Redis: localhost:6379"
	@echo "🗄️ pgAdmin: http://localhost:5050"

docker-down: ## Stop all Docker services
	@echo "Stopping Docker services..."
	@docker-compose down
	@echo "✅ Docker services stopped"

docker-logs: ## Show logs from all Docker services
	@docker-compose logs -f

docker-restart: ## Restart all Docker services
	@echo "Restarting Docker services..."
	@docker-compose restart
	@echo "✅ Docker services restarted"

# Database commands
db-migrate: ## Run database migrations
	@echo "Running database migrations..."
	@docker-compose exec api npm run db:migrate

db-generate: ## Generate database client
	@echo "Generating database client..."
	@docker-compose exec api npm run db:generate

db-studio: ## Open database studio
	@echo "Opening database studio..."
	@docker-compose exec api npm run db:studio

# Cleanup commands
clean: ## Clean up all build artifacts and dependencies
	@echo "Cleaning up..."
	@cd api && rm -rf dist node_modules
	@cd web && rm -rf .next node_modules
	@cd mobile && rm -rf node_modules
	@echo "✅ Cleanup completed"

docker-clean: ## Clean up Docker containers and volumes
	@echo "Cleaning up Docker..."
	@docker-compose down -v --remove-orphans
	@docker system prune -f
	@echo "✅ Docker cleanup completed"

# Deployment commands
deploy-staging: ## Deploy to staging environment
	@echo "Deploying to staging..."
	@echo "This would trigger the staging deployment pipeline"

deploy-production: ## Deploy to production environment
	@echo "Deploying to production..."
	@echo "This would trigger the production deployment pipeline"

# Utility commands
logs-api: ## Show API service logs
	@docker-compose logs -f api

logs-web: ## Show web service logs
	@docker-compose logs -f web

shell-api: ## Open shell in API container
	@docker-compose exec api sh

shell-web: ## Open shell in web container
	@docker-compose exec web sh

shell-db: ## Open PostgreSQL shell
	@docker-compose exec postgres psql -U snipshift -d snipshift

# Health checks
health: ## Check health of all services
	@echo "Checking service health..."
	@curl -f http://localhost:4000/health && echo "✅ API is healthy" || echo "❌ API is not healthy"
	@curl -f http://localhost:3000/api/health && echo "✅ Web is healthy" || echo "❌ Web is not healthy"

# Development helpers
format: ## Format code in all services
	@echo "Formatting code..."
	@cd api && npm run lint:fix
	@cd web && npm run lint:fix
	@cd mobile && npm run lint:fix

typecheck: ## Run type checking for all services
	@echo "Running type checks..."
	@cd api && npm run typecheck
	@cd web && npm run typecheck
	@cd mobile && npm run typecheck
