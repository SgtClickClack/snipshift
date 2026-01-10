#!/bin/bash
# Production Deployment Script for HospoGo
# This script automates the production deployment process

set -e  # Exit on error

echo "ðŸš€ HospoGo Production Deployment Script"
echo "=========================================="
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check if .env.production exists
if [ ! -f ".env.production" ]; then
    echo -e "${RED}âŒ Error: .env.production file not found!${NC}"
    echo ""
    echo "Please create .env.production file with your production configuration."
    echo "You can use PRODUCTION_DEPLOYMENT.md as a reference."
    exit 1
fi

echo -e "${GREEN}âœ… Found .env.production file${NC}"
echo ""

# Check if Docker is running
if ! docker info > /dev/null 2>&1; then
    echo -e "${RED}âŒ Error: Docker is not running!${NC}"
    echo "Please start Docker and try again."
    exit 1
fi

echo -e "${GREEN}âœ… Docker is running${NC}"
echo ""

# Step 1: Build production images
echo "ðŸ“¦ Step 1: Building production images..."
echo "This may take several minutes..."
docker-compose -f docker-compose.prod.yml build --no-cache

if [ $? -eq 0 ]; then
    echo -e "${GREEN}âœ… Build completed successfully${NC}"
else
    echo -e "${RED}âŒ Build failed!${NC}"
    exit 1
fi

echo ""

# Step 2: Start services
echo "ðŸš€ Step 2: Starting services..."
docker-compose -f docker-compose.prod.yml up -d

if [ $? -eq 0 ]; then
    echo -e "${GREEN}âœ… Services started${NC}"
else
    echo -e "${RED}âŒ Failed to start services!${NC}"
    exit 1
fi

echo ""

# Step 3: Wait for services to be healthy
echo "â³ Step 3: Waiting for services to be healthy..."
sleep 10

# Check API health
echo "Checking API health..."
for i in {1..30}; do
    if curl -f http://localhost:5000/health > /dev/null 2>&1; then
        echo -e "${GREEN}âœ… API is healthy${NC}"
        break
    fi
    if [ $i -eq 30 ]; then
        echo -e "${YELLOW}âš ï¸  API health check timeout. Check logs with: docker-compose -f docker-compose.prod.yml logs -f api${NC}"
    else
        echo "   Waiting for API... ($i/30)"
        sleep 2
    fi
done

echo ""

# Step 4: Show status
echo "ðŸ“Š Step 4: Service Status"
docker-compose -f docker-compose.prod.yml ps

echo ""
echo -e "${GREEN}âœ¨ Deployment complete!${NC}"
echo ""
echo "Next steps:"
echo "1. Promote your user to admin:"
echo "   docker exec -it snipshift-api npx tsx scripts/promote-to-admin.ts <your-email>"
echo ""
echo "2. View logs:"
echo "   docker-compose -f docker-compose.prod.yml logs -f"
echo ""
echo "3. Test the application:"
echo "   - Frontend: http://localhost:3000"
echo "   - API: http://localhost:5000/health"
echo ""
