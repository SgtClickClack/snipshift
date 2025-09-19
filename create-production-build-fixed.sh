#!/bin/bash

echo "🚀 Creating Snipshift Production Deployment Package"
echo "=================================================="

# Create deployment directory
mkdir -p snipshift-production-deploy
cd snipshift-production-deploy

# Copy production server file
echo "📄 Copying production server configuration..."
cp ../production-server.js .

# Copy package files
echo "📦 Copying package configuration..."
cp ../package.json .
cp ../package-lock.json .

# Copy API build (already built)
echo "🔧 Copying API build..."
cp -r ../dist/index.js .

# Build the React app with Vite
echo "🎨 Building React app with Vite..."
cd ..
npm run build:client || {
    echo "❌ Failed to build client. Installing dependencies and trying again..."
    npm install
    npm run build:client
}
cd snipshift-production-deploy

# Copy the built React app
echo "📁 Copying built React app..."
cp -r ../dist/public/* public/

echo "✅ Production deployment created successfully!"
echo "📁 Files created in: snipshift-production-deploy/"
echo "🚀 To deploy, upload the contents of snipshift-production-deploy/ to your server"
