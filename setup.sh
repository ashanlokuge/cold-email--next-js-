#!/bin/bash

# ColdSendz Next.js Setup Script
echo "🚀 Setting up ColdSendz Next.js Application..."

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed. Please install Node.js 18+ and try again."
    exit 1
fi

# Check Node.js version
NODE_VERSION=$(node --version | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -lt 18 ]; then
    echo "❌ Node.js version 18 or higher is required. Current version: $(node --version)"
    exit 1
fi

echo "✅ Node.js version check passed: $(node --version)"

# Install dependencies
echo "📦 Installing dependencies..."
npm install

if [ $? -ne 0 ]; then
    echo "❌ Failed to install dependencies"
    exit 1
fi

echo "✅ Dependencies installed successfully"

# Copy environment file if it doesn't exist
if [ ! -f ".env.local" ]; then
    echo "📋 Creating .env.local from template..."
    cp .env.example .env.local
    echo "✅ Environment file created. Please edit .env.local with your Azure configuration."
else
    echo "⚠️  .env.local already exists. Please verify your configuration."
fi

# Build the application to check for errors
echo "🔨 Building application to verify setup..."
npm run build

if [ $? -eq 0 ]; then
    echo "✅ Build successful!"
    echo ""
    echo "🎉 Setup completed successfully!"
    echo ""
    echo "Next steps:"
    echo "1. Edit .env.local with your Azure Communication Services configuration"
    echo "2. Run 'npm run dev' to start the development server"
    echo "3. Open http://localhost:3000 in your browser"
    echo ""
    echo "For detailed configuration instructions, see README.md"
else
    echo "❌ Build failed. Please check the error messages above."
    exit 1
fi