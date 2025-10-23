# Local Development Startup Script for Windows PowerShell
# This script starts all required services for local development

Write-Host "🚀 Starting ColdSendz Local Development Environment" -ForegroundColor Green
Write-Host "==================================================" -ForegroundColor Green

# Check if required tools are installed
function Test-Command {
    param($Command)
    try {
        Get-Command $Command -ErrorAction Stop | Out-Null
        return $true
    }
    catch {
        return $false
    }
}

Write-Host "🔍 Checking required tools..." -ForegroundColor Yellow

$requiredCommands = @("node", "npm", "mongod", "redis-server")
foreach ($cmd in $requiredCommands) {
    if (-not (Test-Command $cmd)) {
        Write-Host "❌ $cmd is not installed. Please install it first." -ForegroundColor Red
        Write-Host "   - Node.js: https://nodejs.org/" -ForegroundColor Yellow
        Write-Host "   - MongoDB: https://www.mongodb.com/try/download/community" -ForegroundColor Yellow
        Write-Host "   - Redis: https://github.com/microsoftarchive/redis/releases" -ForegroundColor Yellow
        exit 1
    }
}

# Create .env.local if it doesn't exist
if (-not (Test-Path ".env.local")) {
    Write-Host "📝 Creating .env.local from template..." -ForegroundColor Yellow
    if (Test-Path ".env.local.example") {
        Copy-Item ".env.local.example" ".env.local"
    } else {
        Write-Host "⚠️  Please create .env.local manually with your configuration" -ForegroundColor Yellow
    }
}

# Install dependencies
Write-Host "📦 Installing dependencies..." -ForegroundColor Yellow
npm install

# Create data directories
if (-not (Test-Path "data")) {
    New-Item -ItemType Directory -Path "data" | Out-Null
}
if (-not (Test-Path "data/db")) {
    New-Item -ItemType Directory -Path "data/db" | Out-Null
}
if (-not (Test-Path "logs")) {
    New-Item -ItemType Directory -Path "logs" | Out-Null
}

# Start MongoDB
Write-Host "🗄️  Starting MongoDB..." -ForegroundColor Yellow
Start-Process -FilePath "mongod" -ArgumentList "--dbpath", "./data/db", "--fork", "--logpath", "./logs/mongodb.log" -WindowStyle Hidden

# Start Redis
Write-Host "🔴 Starting Redis..." -ForegroundColor Yellow
Start-Process -FilePath "redis-server" -ArgumentList "--daemonize", "yes", "--logfile", "./logs/redis.log" -WindowStyle Hidden

# Wait for services to start
Write-Host "⏳ Waiting for services to start..." -ForegroundColor Yellow
Start-Sleep -Seconds 5

# Check if services are running
$mongodProcess = Get-Process -Name "mongod" -ErrorAction SilentlyContinue
$redisProcess = Get-Process -Name "redis-server" -ErrorAction SilentlyContinue

if (-not $mongodProcess) {
    Write-Host "❌ MongoDB failed to start" -ForegroundColor Red
    exit 1
}

if (-not $redisProcess) {
    Write-Host "❌ Redis failed to start" -ForegroundColor Red
    exit 1
}

Write-Host "✅ MongoDB and Redis are running" -ForegroundColor Green

# Initialize database
Write-Host "🗃️  Initializing database..." -ForegroundColor Yellow
npm run setup-admin

# Start the application
Write-Host "🌐 Starting Next.js application..." -ForegroundColor Yellow
Write-Host "📱 Application will be available at: http://localhost:3000" -ForegroundColor Cyan
Write-Host "👷 Start the worker in another terminal with: npm run worker" -ForegroundColor Cyan
Write-Host ""
Write-Host "Press Ctrl+C to stop all services" -ForegroundColor Yellow

# Start Next.js dev server
npm run dev
