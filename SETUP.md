# 🚀 Quick Setup Guide for ColdSendz Next.js

This guide will help you set up the Next.js version of your cold email sender application.

## ✅ Prerequisites Checklist

Before starting, make sure you have:

- [ ] **Node.js 18+** installed on your system
- [ ] **Azure Communication Services** account and email domain configured
- [ ] **Your Azure credentials** ready (connection string, subscription ID, etc.)

## 🛠️ Installation Steps

### Step 1: Navigate to the Next.js Directory
```bash
cd next_version
```

### Step 2: Install Dependencies
```bash
npm install
```

### Step 3: Set Up Environment Variables
```bash
# Copy the example environment file
cp .env.example .env.local
```

Edit `.env.local` with your Azure configuration:
```env
COMMUNICATION_SERVICES_CONNECTION_STRING=your_connection_string_here
AZ_SUBSCRIPTION_ID=f7e1ae6c-cb61-402d-9181-1e11ca111d7a
AZ_RESOURCE_GROUP=testsite
AZ_EMAIL_SERVICE_NAME=ColdEmail
AZ_EMAIL_DOMAIN=cold.digiquarter.com
```

### Step 4: Start Development Server
```bash
npm run dev
```

### Step 5: Open in Browser
Navigate to: http://localhost:3000

## 🔧 Alternative Setup (Using Scripts)

### For Windows PowerShell:
```powershell
.\setup.ps1
```

### For Unix/Linux/macOS:
```bash
chmod +x setup.sh
./setup.sh
```

## 📁 What's Different from the Original?

The Next.js version includes:

1. **Modern Framework**: Built with Next.js 14 and TypeScript
2. **Better UI**: Tailwind CSS with responsive design
3. **API Routes**: Server-side functionality built into Next.js
4. **Type Safety**: Full TypeScript implementation
5. **Modern Dev Tools**: Hot reloading, better error handling
6. **Production Ready**: Optimized builds and deployment ready

## 🎯 Key Features Migrated

All your original features are preserved:

- ✅ Email campaign composition with spintax support
- ✅ Sender management and validation
- ✅ Human-like timing algorithms
- ✅ Real-time campaign status tracking
- ✅ Variable substitution and personalization
- ✅ CSV recipient import
- ✅ Azure Communication Services integration

## 🚀 Getting Started

Once the setup is complete:

1. **Configure Senders**: Go to "Sender Management" to add your email addresses
2. **Create Campaign**: Use "Compose Campaign" to create your first email
3. **Add Recipients**: Paste emails or import CSV files
4. **Send**: Start your campaign and monitor progress in real-time

## 🆘 Troubleshooting

### Common Issues:

1. **"Cannot find module 'next'" Error**
   - Run `npm install` to install dependencies

2. **Azure Authentication Errors**
   - Verify your connection string and credentials in `.env.local`
   - Try different authentication methods (see README.md)

3. **Build Errors**
   - Clear cache: `rm -rf .next node_modules && npm install`
   - Check TypeScript errors: `npm run type-check`

4. **Email Sending Fails**
   - Verify your Azure email domain is properly configured
   - Check that sender addresses are provisioned in Azure

## 📖 Full Documentation

For detailed documentation, see `README.md` in this directory.

## 🔄 Migration from Original Version

Your existing Azure setup will work with this version. You just need to:

1. Use the same environment variables
2. Your sender addresses will work automatically
3. All timing and anti-spam features are preserved

---

**Happy Email Sending! 🎉**