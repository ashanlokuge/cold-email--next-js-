# Vercel Deployment Guide for ColdSendz Next.js

## Prerequisites
- Vercel account
- Azure Service Principal credentials (already created)

## Step-by-Step Deployment

### 1. Install Vercel CLI
```bash
npm install -g vercel
```

### 2. Login to Vercel
```bash
vercel login
```

### 3. Set Environment Variables in Vercel
```bash
# Set each environment variable in Vercel
vercel env add communication-services-connection-string
# Paste your Azure Communication Services connection string

vercel env add az-subscription-id
# Paste your Azure subscription ID

vercel env add az-resource-group
# Paste your Azure resource group name

vercel env add az-email-service-name
# Paste your email service name

vercel env add az-email-domain
# Paste your verified domain

vercel env add azure-client-id
# Paste your Azure client ID

vercel env add azure-client-secret
# Paste your Azure client secret

vercel env add azure-tenant-id
# Paste your Azure tenant ID
```

### 4. Deploy
```bash
vercel --prod
```

## Authentication Methods

### Development (Local)
- Uses Azure CLI authentication
- Requires `az login`
- Set `AZURE_AUTH_METHOD=cli` in `.env`

### Production (Vercel)
- Uses Service Principal authentication
- No Azure CLI required
- Set `AZURE_AUTH_METHOD=service-principal` in Vercel environment variables

## Service Principal Details
- **App ID**: aa9619bc-537c-4541-a753-bdeb7b224165
- **Tenant ID**: aa232db2-7a78-4414-a529-33db9124cba7
- **Role**: Contributor
- **Scope**: /subscriptions/f7e1ae6c-cb61-402d-9181-1e11ca111d7a

## Testing Production Authentication Locally
To test Service Principal authentication locally:
1. Set `AZURE_AUTH_METHOD=service-principal` in `.env`
2. Run `npm run dev`
3. Should work without `az login`

## Security Notes
- Service Principal credentials are in `.env.production`
- Never commit Service Principal secrets to git
- Use Vercel environment variables for production