# Worker Startup Script for Windows PowerShell
# This script starts the BullMQ worker process

Write-Host "👷 Starting ColdSendz Campaign Worker" -ForegroundColor Green
Write-Host "====================================" -ForegroundColor Green

# Check if .env.local exists
if (-not (Test-Path ".env.local")) {
    Write-Host "❌ .env.local file not found. Please create it first." -ForegroundColor Red
    Write-Host "   Copy .env.local.example to .env.local and update with your values" -ForegroundColor Yellow
    exit 1
}

# Check if Redis is running
$redisProcess = Get-Process -Name "redis-server" -ErrorAction SilentlyContinue
if (-not $redisProcess) {
    Write-Host "❌ Redis is not running. Please start Redis first:" -ForegroundColor Red
    Write-Host "   redis-server" -ForegroundColor Yellow
    exit 1
}

# Check if MongoDB is running
$mongodProcess = Get-Process -Name "mongod" -ErrorAction SilentlyContinue
if (-not $mongodProcess) {
    Write-Host "❌ MongoDB is not running. Please start MongoDB first:" -ForegroundColor Red
    Write-Host "   mongod --dbpath ./data/db" -ForegroundColor Yellow
    exit 1
}

Write-Host "✅ Redis and MongoDB are running" -ForegroundColor Green

# Start the worker
Write-Host "🚀 Starting worker process..." -ForegroundColor Yellow
Write-Host "📡 Worker will process campaign jobs from the queue" -ForegroundColor Cyan
Write-Host ""
Write-Host "Press Ctrl+C to stop the worker" -ForegroundColor Yellow

# Use the CommonJS worker for better compatibility
node worker-commonjs.js
