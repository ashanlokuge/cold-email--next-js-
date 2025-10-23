# ColdSendz Deployment Script for Windows PowerShell
Write-Host "🚀 ColdSendz Deployment Script" -ForegroundColor Green
Write-Host "==============================" -ForegroundColor Green

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

$requiredCommands = @("git", "npm")
foreach ($cmd in $requiredCommands) {
    if (-not (Test-Command $cmd)) {
        Write-Host "❌ $cmd is not installed. Please install it first." -ForegroundColor Red
        exit 1
    }
}

# Check if we're in a git repository
if (-not (Test-Path ".git")) {
    Write-Host "❌ Not in a git repository. Please initialize git first." -ForegroundColor Red
    exit 1
}

# Check if there are uncommitted changes
$gitStatus = git status --porcelain
if ($gitStatus) {
    Write-Host "⚠️  You have uncommitted changes. Please commit them first." -ForegroundColor Yellow
    Write-Host "Run: git add . && git commit -m 'Your commit message'" -ForegroundColor Yellow
    exit 1
}

Write-Host "✅ All checks passed!" -ForegroundColor Green

# Ask user what to deploy
Write-Host ""
Write-Host "What would you like to deploy?" -ForegroundColor Cyan
Write-Host "1) Deploy to Vercel (Main App)" -ForegroundColor White
Write-Host "2) Deploy to Railway (Worker)" -ForegroundColor White
Write-Host "3) Deploy both" -ForegroundColor White
Write-Host "4) Test local setup" -ForegroundColor White
Write-Host "5) Exit" -ForegroundColor White

$choice = Read-Host "Enter your choice (1-5)"

switch ($choice) {
    "1" {
        Write-Host "🚀 Deploying to Vercel..." -ForegroundColor Yellow
        npm run build:app
        vercel --prod
    }
    "2" {
        Write-Host "🚂 Deploying to Railway..." -ForegroundColor Yellow
        railway up
    }
    "3" {
        Write-Host "🚀 Deploying to Vercel..." -ForegroundColor Yellow
        npm run build:app
        vercel --prod
        Write-Host ""
        Write-Host "🚂 Deploying to Railway..." -ForegroundColor Yellow
        railway up
    }
    "4" {
        Write-Host "🧪 Testing local setup..." -ForegroundColor Yellow
        npm run test:setup
    }
    "5" {
        Write-Host "👋 Goodbye!" -ForegroundColor Green
        exit 0
    }
    default {
        Write-Host "❌ Invalid choice. Please run the script again." -ForegroundColor Red
        exit 1
    }
}

Write-Host "✅ Deployment complete!" -ForegroundColor Green
