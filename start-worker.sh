#!/bin/bash

# Worker Startup Script
# This script starts the BullMQ worker process

echo "👷 Starting ColdSendz Campaign Worker"
echo "===================================="

# Check if .env.local exists
if [ ! -f .env.local ]; then
    echo "❌ .env.local file not found. Please create it first."
    echo "   Copy .env.local.example to .env.local and update with your values"
    exit 1
fi

# Check if Redis is running
if ! pgrep -x "redis-server" > /dev/null; then
    echo "❌ Redis is not running. Please start Redis first:"
    echo "   redis-server"
    exit 1
fi

# Check if MongoDB is running
if ! pgrep -x "mongod" > /dev/null; then
    echo "❌ MongoDB is not running. Please start MongoDB first:"
    echo "   mongod --dbpath ./data/db"
    exit 1
fi

echo "✅ Redis and MongoDB are running"

# Start the worker
echo "🚀 Starting worker process..."
echo "📡 Worker will process campaign jobs from the queue"
echo ""
echo "Press Ctrl+C to stop the worker"

# Use the CommonJS worker for better compatibility
node worker-commonjs.js
