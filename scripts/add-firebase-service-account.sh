#!/bin/bash
# Bash script to add Firebase Service Account to Vercel
# Usage: ./scripts/add-firebase-service-account.sh [path-to-service-account.json] [environment]

SERVICE_ACCOUNT_PATH="${1:-}"
ENVIRONMENT="${2:-production}"

echo "========================================"
echo "Firebase Service Account Setup for Vercel"
echo "========================================"
echo ""

# Check if Vercel CLI is installed
if ! command -v vercel &> /dev/null; then
    echo "❌ Vercel CLI is not installed."
    echo "   Install it with: npm install -g vercel"
    exit 1
fi

echo "✅ Vercel CLI found"
echo ""

# Get service account JSON content
if [ -n "$SERVICE_ACCOUNT_PATH" ] && [ -f "$SERVICE_ACCOUNT_PATH" ]; then
    echo "📄 Reading service account from file: $SERVICE_ACCOUNT_PATH"
    SERVICE_ACCOUNT_JSON=$(cat "$SERVICE_ACCOUNT_PATH")
    echo "✅ Service account file loaded successfully"
else
    echo "📋 Please provide the path to your Firebase Service Account JSON file:"
    read -p "Path: " SERVICE_ACCOUNT_PATH
    
    if [ ! -f "$SERVICE_ACCOUNT_PATH" ]; then
        echo "❌ File not found: $SERVICE_ACCOUNT_PATH"
        exit 1
    fi
    
    SERVICE_ACCOUNT_JSON=$(cat "$SERVICE_ACCOUNT_PATH")
fi

# Validate JSON
if ! echo "$SERVICE_ACCOUNT_JSON" | jq . > /dev/null 2>&1; then
    echo "❌ Invalid JSON format"
    exit 1
fi

echo "✅ JSON is valid"

# Extract project_id for verification
PROJECT_ID=$(echo "$SERVICE_ACCOUNT_JSON" | jq -r '.project_id')
if [ -n "$PROJECT_ID" ]; then
    echo "📦 Project ID from service account: $PROJECT_ID"
    echo ""
fi

echo "🚀 Adding FIREBASE_SERVICE_ACCOUNT to Vercel ($ENVIRONMENT)..."
echo ""

# Use Vercel CLI to add the environment variable
echo "$SERVICE_ACCOUNT_JSON" | vercel env add FIREBASE_SERVICE_ACCOUNT "$ENVIRONMENT"

if [ $? -eq 0 ]; then
    echo ""
    echo "✅ FIREBASE_SERVICE_ACCOUNT added successfully!"
    echo ""
    
    # Verify FIREBASE_PROJECT_ID
    echo "🔍 Verifying FIREBASE_PROJECT_ID..."
    if vercel env ls "$ENVIRONMENT" | grep -q "FIREBASE_PROJECT_ID"; then
        echo "✅ FIREBASE_PROJECT_ID is set"
    else
        echo "⚠️  FIREBASE_PROJECT_ID not found. Setting it to: $PROJECT_ID"
        echo "$PROJECT_ID" | vercel env add FIREBASE_PROJECT_ID "$ENVIRONMENT"
    fi
    
    echo ""
    echo "📋 Next steps:"
    echo "   1. Redeploy: vercel --prod"
    echo "   2. Verify: curl https://hospogo.com/api/debug"
    echo "   3. Check logs: vercel logs hospogo.com --limit=30"
else
    echo ""
    echo "❌ Failed to add environment variable"
    exit 1
fi
