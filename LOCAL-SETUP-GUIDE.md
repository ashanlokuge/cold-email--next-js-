# 🚀 Complete Local Development Setup Guide

This guide will help you set up the entire ColdSendz application locally with Redis, MongoDB, and the worker process.

## 📋 Prerequisites

Before starting, make sure you have these installed:

### Required Software
- **Node.js** (v18 or higher): https://nodejs.org/
- **MongoDB**: https://www.mongodb.com/try/download/community
- **Redis**: 
  - Windows: https://github.com/microsoftarchive/redis/releases
  - Mac: `brew install redis`
  - Linux: `sudo apt-get install redis-server`

### Required Azure Setup
- Azure Communication Services account
- Verified email domain
- Service principal or Azure CLI authentication

## 🔧 Step-by-Step Setup

### Step 1: Environment Configuration

1. **Create `.env.local` file** (copy from `.env.local.example`):
```bash
# Database Configuration
MONGODB_URI=mongodb://localhost:27017/coldemail
MONGODB_DB=coldemail

# Authentication
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production-make-it-long-and-random
DB_INIT_SECRET=some-long-random-string-for-db-init

# Azure Communication Services (REQUIRED)
COMMUNICATION_SERVICES_CONNECTION_STRING=your-azure-communication-services-connection-string
AZ_SUBSCRIPTION_ID=your-subscription-id
AZ_RESOURCE_GROUP=your-resource-group
AZ_EMAIL_SERVICE_NAME=your-email-service-name
AZ_EMAIL_DOMAIN=your-domain.com

# Azure Authentication
AZURE_AUTH_METHOD=default
# For Service Principal: AZURE_AUTH_METHOD=service-principal
# AZURE_CLIENT_ID=your-client-id
# AZURE_CLIENT_SECRET=your-client-secret
# AZURE_TENANT_ID=your-tenant-id

# Redis Configuration (REQUIRED for queue)
REDIS_URL=redis://localhost:6379
REDIS_PUBLIC_URL=redis://localhost:6379

# Email Settings
RATE_PER_MINUTE=20
JITTER_PCT=50
MAX_RETRIES=3
```

### Step 2: Install Dependencies
```bash
npm install
```

### Step 3: Start Services

#### Option A: Automated Setup (Recommended)
```bash
# For Windows PowerShell
npm run start:local:win

# For Linux/Mac
npm run start:local
```

#### Option B: Manual Setup
Open **4 separate terminals**:

**Terminal 1 - MongoDB:**
```bash
mongod --dbpath ./data/db
```

**Terminal 2 - Redis:**
```bash
redis-server
```

**Terminal 3 - Main Application:**
```bash
npm run dev
```

**Terminal 4 - Worker Process:**
```bash
npm run worker
```

### Step 4: Initialize Database
```bash
npm run setup-admin
```

### Step 5: Test Setup
```bash
npm run test:setup
```

## 🧪 Testing Your Setup

### 1. Check All Services
```bash
# Test database connection
npm run db:health

# Test complete setup
npm run test:setup
```

### 2. Test Campaign System
1. Open http://localhost:3000
2. Login with admin credentials
3. Create a test campaign with a few recipients
4. Check if the worker processes the job

### 3. Monitor Logs
- **Main App**: Check terminal running `npm run dev`
- **Worker**: Check terminal running `npm run worker`
- **MongoDB**: Check `./logs/mongodb.log`
- **Redis**: Check `./logs/redis.log`

## 🔍 Troubleshooting

### Common Issues

#### 1. "Redis connection failed"
```bash
# Check if Redis is running
redis-cli ping
# Should return "PONG"

# If not running, start Redis:
redis-server
```

#### 2. "MongoDB connection failed"
```bash
# Check if MongoDB is running
mongosh --eval "db.adminCommand('ping')"

# If not running, start MongoDB:
mongod --dbpath ./data/db
```

#### 3. "Worker not processing jobs"
- Make sure Redis is running
- Check worker terminal for errors
- Verify `.env.local` has correct `REDIS_URL`

#### 4. "Azure authentication failed"
- Verify Azure credentials in `.env.local`
- For CLI auth: run `az login`
- For Service Principal: verify client ID, secret, and tenant ID

#### 5. "Environment variables missing"
- Make sure `.env.local` exists
- Check all required variables are set
- Restart the application after changes

### Debug Commands

```bash
# Check Redis connection
redis-cli ping

# Check MongoDB connection
mongosh --eval "db.adminCommand('ping')"

# Check environment variables
node -e "console.log(process.env.REDIS_URL)"

# Test BullMQ queue
node -e "
const { Queue } = require('bullmq');
const queue = new Queue('test', { connection: process.env.REDIS_URL });
queue.add('test', { hello: 'world' }).then(() => console.log('Queue test OK'));
"
```

## 📊 Monitoring

### Queue Status
```bash
# Check queue jobs
redis-cli
> KEYS bull:*
> LLEN bull:emailCampaignQueue:waiting
> LLEN bull:emailCampaignQueue:active
> LLEN bull:emailCampaignQueue:completed
```

### Database Status
```bash
# Check campaigns collection
mongosh coldemail
> db.campaigns.find().limit(5)
> db.campaigns.countDocuments()
```

## 🎯 Next Steps

Once everything is running:

1. **Create your first campaign**
2. **Monitor the worker logs** to see job processing
3. **Check the database** for campaign records
4. **Test email sending** with a small recipient list

## 📞 Support

If you encounter issues:
1. Check the logs in each terminal
2. Run `npm run test:setup` to verify configuration
3. Ensure all services are running
4. Verify environment variables are correct
