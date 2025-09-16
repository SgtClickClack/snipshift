#!/bin/bash
# Deployment Script for SnipShift
# Handles different deployment scenarios (Replit, Docker, etc.)

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Function to check if command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Function to check if we're in the right directory
check_directory() {
    if [ ! -f "package.json" ] || [ ! -d "snipshift-next" ]; then
        print_error "Please run this script from the project root directory"
        exit 1
    fi
}

# Function to build the API
build_api() {
    print_status "Building API..."
    cd snipshift-next/api
    
    # Install dependencies
    print_status "Installing dependencies..."
    npm install --legacy-peer-deps
    
    # Build the application
    print_status "Compiling TypeScript..."
    npm run build
    
    # Verify build
    if [ -f "dist/index.js" ]; then
        print_success "API build completed successfully"
    else
        print_error "API build failed - dist/index.js not found"
        exit 1
    fi
    
    cd ../..
}

# Function to deploy to Replit
deploy_replit() {
    print_status "Deploying to Replit..."
    
    # Check if .replit file exists
    if [ ! -f ".replit" ]; then
        print_error ".replit file not found"
        exit 1
    fi
    
    # Build the API
    build_api
    
    # The .replit file should handle the deployment
    print_success "Replit deployment configuration updated"
    print_status "The deployment will use: npm run start:container"
    print_warning "Make sure to trigger deployment from Replit dashboard"
}

# Function to deploy with Docker
deploy_docker() {
    print_status "Deploying with Docker..."
    
    # Check if Docker is available
    if ! command_exists docker; then
        print_error "Docker is not installed or not in PATH"
        exit 1
    fi
    
    if ! command_exists docker-compose; then
        print_error "Docker Compose is not installed or not in PATH"
        exit 1
    fi
    
    # Build the API
    build_api
    
    # Use production docker-compose
    print_status "Starting production services..."
    docker-compose -f snipshift-next/docker-compose.prod.yml up -d --build
    
    print_success "Docker deployment completed"
    print_status "API should be available at http://localhost:4000"
}

# Function to deploy locally (development)
deploy_local() {
    print_status "Deploying locally for development..."
    
    # Build the API
    build_api
    
    # Start development services
    print_status "Starting development services..."
    cd snipshift-next
    docker-compose up -d postgres redis
    
    # Wait for services to be ready
    print_status "Waiting for database to be ready..."
    sleep 10
    
    # Start API in development mode
    print_status "Starting API in development mode..."
    cd api
    npm run dev &
    
    cd ../..
    print_success "Local development deployment completed"
    print_status "API should be available at http://localhost:4000"
    print_status "Web should be available at http://localhost:3000"
}

# Function to show help
show_help() {
    echo "SnipShift Deployment Script"
    echo ""
    echo "Usage: $0 [OPTION]"
    echo ""
    echo "Options:"
    echo "  replit     Deploy to Replit (production)"
    echo "  docker     Deploy with Docker (production)"
    echo "  local      Deploy locally for development"
    echo "  build      Only build the API"
    echo "  help       Show this help message"
    echo ""
    echo "Examples:"
    echo "  $0 replit    # Deploy to Replit"
    echo "  $0 docker    # Deploy with Docker"
    echo "  $0 local     # Start local development"
    echo "  $0 build     # Just build the API"
}

# Main script logic
main() {
    check_directory
    
    case "${1:-help}" in
        "replit")
            deploy_replit
            ;;
        "docker")
            deploy_docker
            ;;
        "local")
            deploy_local
            ;;
        "build")
            build_api
            ;;
        "help"|"-h"|"--help")
            show_help
            ;;
        *)
            print_error "Unknown option: $1"
            show_help
            exit 1
            ;;
    esac
}

# Run main function with all arguments
main "$@"
