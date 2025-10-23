# 🚀 Deployment Guide: Railway + Vercel

This guide will help you deploy your ColdSendz application using Railway for the worker and Vercel for the main app.

## 📋 **Architecture Overview**

- **Vercel**: Next.js frontend + API routes
- **Railway**: Worker process (background job processor)
- **MongoDB**: Cloud database (Atlas or Railway)
- **Redis**: Cloud Redis (Railway)

## 🔧 **Prerequisites**

1. **Vercel Account**: https://vercel.com
2. **Railway Account**: https://railway.app
3. **MongoDB Atlas Account**: https://cloud.mongodb.com
4. **GitHub Repository**: Your code pushed to GitHub

## 🚀 **Step 1: Deploy to Vercel (Main App)**

### 1.1 Connect Repository
1. Go to [Vercel Dashboard](https://vercel.com/dashboard)
2. Click "New Project"
3. Import your GitHub repository
4. Select the repository: `cold-email--next-js-`

### 1.2 Configure Build Settings
- **Framework Preset**: Next.js
- **Root Directory**: `./` (root)
- **Build Command**: `npm run build:app`
- **Output Directory**: `.next`

### 1.3 Set Environment Variables in Vercel
Go to Project Settings → Environment Variables and add:

```bash
# Database
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/
MONGODB_DB=coldemail
JWT_SECRET=your-super-secret-jwt-key
DB_INIT_SECRET=your-db-init-secret

# Azure Communication Services
COMMUNICATION_SERVICES_CONNECTION_STRING=endpoint=https://...
AZ_SUBSCRIPTION_ID=your-subscription-id
AZ_RESOURCE_GROUP=your-resource-group
AZ_EMAIL_SERVICE_NAME=your-email-service
AZ_EMAIL_DOMAIN=your-domain.com

# Azure Authentication
AZURE_AUTH_METHOD=service-principal
AZURE_CLIENT_ID=your-client-id
AZURE_CLIENT_SECRET=your-client-secret
AZURE_TENANT_ID=your-tenant-id

# Redis (from Railway)
REDIS_URL=redis://default:password@host:port
REDIS_PUBLIC_URL=redis://default:password@host:port

# Email Settings
RATE_PER_MINUTE=60
JITTER_PCT=20
MAX_RETRIES=3
```

### 1.4 Deploy
Click "Deploy" and wait for deployment to complete.

## 🚂 **Step 2: Deploy to Railway (Worker)**

### 2.1 Create New Project
1. Go to [Railway Dashboard](https://railway.app/dashboard)
2. Click "New Project"
3. Select "Deploy from GitHub repo"
4. Choose your repository

### 2.2 Configure Service
1. **Service Name**: `coldsendz-worker`
2. **Build Command**: `npm install`
3. **Start Command**: `npm run worker`
4. **Port**: Leave empty (Railway will auto-detect)

### 2.3 Set Environment Variables in Railway
Go to Variables tab and add the same environment variables as Vercel:

```bash
# Database
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/
MONGODB_DB=coldemail
JWT_SECRET=your-super-secret-jwt-key

# Azure Communication Services
COMMUNICATION_SERVICES_CONNECTION_STRING=endpoint=https://...
AZ_SUBSCRIPTION_ID=your-subscription-id
AZ_RESOURCE_GROUP=your-resource-group
AZ_EMAIL_SERVICE_NAME=your-email-service
AZ_EMAIL_DOMAIN=your-domain.com

# Azure Authentication
AZURE_AUTH_METHOD=service-principal
AZURE_CLIENT_ID=your-client-id
AZURE_CLIENT_SECRET=your-client-secret
AZURE_TENANT_ID=your-tenant-id

# Redis (Railway Redis service)
REDIS_URL=redis://default:password@host:port
REDIS_PUBLIC_URL=redis://default:password@host:port

# Email Settings
RATE_PER_MINUTE=60
JITTER_PCT=20
MAX_RETRIES=3
```

### 2.4 Deploy Worker
Click "Deploy" and wait for deployment to complete.

## 🔗 **Step 3: Connect Services**

### 3.1 Get Railway Redis URL
1. In Railway dashboard, go to your Redis service
2. Copy the connection string
3. Update both Vercel and Railway with the same Redis URL

### 3.2 Test Connection
1. Check Vercel deployment logs
2. Check Railway worker logs
3. Both should show successful connections

## 🧪 **Step 4: Test Deployment**

### 4.1 Test Main App
1. Open your Vercel URL: `https://your-app.vercel.app`
2. Login with admin credentials
3. Create a test campaign

### 4.2 Test Worker
1. Check Railway worker logs
2. You should see: `👷 Worker received job X in emailCampaignQueue`
3. Campaign should process successfully

## 🔄 **Step 5: Local Development**

Your local setup remains the same:

```bash
# Terminal 1 - Main App
npm run dev

# Terminal 2 - Worker
npm run worker
```

## 📊 **Monitoring**

### Vercel Monitoring
- **Dashboard**: https://vercel.com/dashboard
- **Function Logs**: Project → Functions tab
- **Analytics**: Project → Analytics tab

### Railway Monitoring
- **Dashboard**: https://railway.app/dashboard
- **Service Logs**: Click on your worker service
- **Metrics**: Service → Metrics tab

## 🚨 **Troubleshooting**

### Common Issues

#### 1. **Worker Not Processing Jobs**
- Check Railway worker logs
- Verify Redis connection
- Ensure environment variables match

#### 2. **Vercel API Timeout**
- Check function timeout settings
- Verify MongoDB connection
- Check API route logs

#### 3. **Environment Variables**
- Ensure all variables are set in both services
- Check for typos in variable names
- Verify Redis URL format

### Debug Commands

```bash
# Test Redis connection
redis-cli -u "your-redis-url" ping

# Test MongoDB connection
mongosh "your-mongodb-uri"

# Check environment variables
node -e "console.log(process.env.REDIS_URL)"
```

## 🔧 **Maintenance**

### Updates
1. Push changes to GitHub
2. Vercel auto-deploys
3. Railway auto-deploys
4. Test both services

### Scaling
- **Vercel**: Automatically scales
- **Railway**: Upgrade plan for more resources
- **MongoDB**: Upgrade Atlas plan
- **Redis**: Upgrade Railway Redis plan

## 📞 **Support**

- **Vercel Docs**: https://vercel.com/docs
- **Railway Docs**: https://docs.railway.app
- **MongoDB Atlas**: https://docs.atlas.mongodb.com

---

## 🎉 **Success!**

Your ColdSendz application is now deployed and running in production!

- **Frontend**: https://your-app.vercel.app
- **Worker**: Running on Railway
- **Database**: MongoDB Atlas
- **Queue**: Railway Redis
