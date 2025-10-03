# ColdSendz Next.js Setup Script
Write-Host "🚀 Setting up ColdSendz Next.js Application..." -ForegroundColor Green

# Check if Node.js is installed
try {
    $nodeVersion = node --version
    Write-Host "✅ Node.js version check passed: $nodeVersion" -ForegroundColor Green
    
    # Extract version number and check if it's 18 or higher
    $versionNumber = [int]($nodeVersion -replace 'v(\d+)\..*', '$1')
    if ($versionNumber -lt 18) {
        Write-Host "❌ Node.js version 18 or higher is required. Current version: $nodeVersion" -ForegroundColor Red
        exit 1
    }
} catch {
    Write-Host "❌ Node.js is not installed. Please install Node.js 18+ and try again." -ForegroundColor Red
    exit 1
}

# Install dependencies
Write-Host "📦 Installing dependencies..." -ForegroundColor Yellow
npm install

if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Failed to install dependencies" -ForegroundColor Red
    exit 1
}

Write-Host "✅ Dependencies installed successfully" -ForegroundColor Green

# Copy environment file if it doesn't exist
if (-not (Test-Path ".env.local")) {
    Write-Host "📋 Creating .env.local from template..." -ForegroundColor Yellow
    Copy-Item ".env.example" ".env.local"
    Write-Host "✅ Environment file created. Please edit .env.local with your Azure configuration." -ForegroundColor Green
} else {
    Write-Host "⚠️  .env.local already exists. Please verify your configuration." -ForegroundColor Yellow
}

# Build the application to check for errors
Write-Host "🔨 Building application to verify setup..." -ForegroundColor Yellow
npm run build

if ($LASTEXITCODE -eq 0) {
    Write-Host "✅ Build successful!" -ForegroundColor Green
    Write-Host ""
    Write-Host "🎉 Setup completed successfully!" -ForegroundColor Green
    Write-Host ""
    Write-Host "Next steps:" -ForegroundColor Cyan
    Write-Host "1. Edit .env.local with your Azure Communication Services configuration" -ForegroundColor White
    Write-Host "2. Run 'npm run dev' to start the development server" -ForegroundColor White
    Write-Host "3. Open http://localhost:3000 in your browser" -ForegroundColor White
    Write-Host ""
    Write-Host "For detailed configuration instructions, see README.md" -ForegroundColor Cyan
} else {
    Write-Host "❌ Build failed. Please check the error messages above." -ForegroundColor Red
    exit 1
}