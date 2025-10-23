#!/bin/bash

# ColdSendz Deployment Script
echo "🚀 ColdSendz Deployment Script"
echo "=============================="

# Check if required tools are installed
check_command() {
    if ! command -v $1 &> /dev/null; then
        echo "❌ $1 is not installed. Please install it first."
        exit 1
    fi
}

echo "🔍 Checking required tools..."
check_command "git"
check_command "npm"

# Check if we're in a git repository
if [ ! -d ".git" ]; then
    echo "❌ Not in a git repository. Please initialize git first."
    exit 1
fi

# Check if there are uncommitted changes
if [ -n "$(git status --porcelain)" ]; then
    echo "⚠️  You have uncommitted changes. Please commit them first."
    echo "Run: git add . && git commit -m 'Your commit message'"
    exit 1
fi

echo "✅ All checks passed!"

# Ask user what to deploy
echo ""
echo "What would you like to deploy?"
echo "1) Deploy to Vercel (Main App)"
echo "2) Deploy to Railway (Worker)"
echo "3) Deploy both"
echo "4) Test local setup"
echo "5) Exit"

read -p "Enter your choice (1-5): " choice

case $choice in
    1)
        echo "🚀 Deploying to Vercel..."
        npm run build:app
        vercel --prod
        ;;
    2)
        echo "🚂 Deploying to Railway..."
        railway up
        ;;
    3)
        echo "🚀 Deploying to Vercel..."
        npm run build:app
        vercel --prod
        echo ""
        echo "🚂 Deploying to Railway..."
        railway up
        ;;
    4)
        echo "🧪 Testing local setup..."
        npm run test:setup
        ;;
    5)
        echo "👋 Goodbye!"
        exit 0
        ;;
    *)
        echo "❌ Invalid choice. Please run the script again."
        exit 1
        ;;
esac

echo "✅ Deployment complete!"
