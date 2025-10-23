#!/bin/bash

# Local Development Startup Script
# This script starts all required services for local development

echo "🚀 Starting ColdSendz Local Development Environment"
echo "=================================================="

# Check if required tools are installed
check_command() {
    if ! command -v $1 &> /dev/null; then
        echo "❌ $1 is not installed. Please install it first."
        exit 1
    fi
}

echo "🔍 Checking required tools..."
check_command "node"
check_command "npm"
check_command "mongod"
check_command "redis-server"

# Create .env.local if it doesn't exist
if [ ! -f .env.local ]; then
    echo "📝 Creating .env.local from template..."
    cp .env.local.example .env.local 2>/dev/null || echo "⚠️  Please create .env.local manually with your configuration"
fi

# Install dependencies
echo "📦 Installing dependencies..."
npm install

# Start MongoDB
echo "🗄️  Starting MongoDB..."
mongod --dbpath ./data/db --fork --logpath ./logs/mongodb.log

# Start Redis
echo "🔴 Starting Redis..."
redis-server --daemonize yes --logfile ./logs/redis.log

# Wait for services to start
echo "⏳ Waiting for services to start..."
sleep 3

# Check if services are running
if ! pgrep -x "mongod" > /dev/null; then
    echo "❌ MongoDB failed to start"
    exit 1
fi

if ! pgrep -x "redis-server" > /dev/null; then
    echo "❌ Redis failed to start"
    exit 1
fi

echo "✅ MongoDB and Redis are running"

# Initialize database
echo "🗃️  Initializing database..."
npm run setup-admin

# Start the application
echo "🌐 Starting Next.js application..."
echo "📱 Application will be available at: http://localhost:3000"
echo "👷 Start the worker in another terminal with: npm run worker"
echo ""
echo "Press Ctrl+C to stop all services"

# Start Next.js dev server
npm run dev
