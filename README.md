# ColdSendz - Next.js Version

A modern, professional cold email sender application built with Next.js, TypeScript, and Azure Communication Services.

## Features

- 🚀 **Modern Next.js Stack** - Built with Next.js 14, TypeScript, and Tailwind CSS
- 📧 **Email Campaign Management** - Create and manage email campaigns with ease
- 👥 **Sender Management** - Add and manage multiple sender addresses
- 📝 **Template System** - Create reusable email templates with variables and spintax
- 📊 **Real-time Analytics** - Track campaign performance and delivery status
- 🎯 **Smart Personalization** - Dynamic content personalization with variables
- 🔄 **Spintax Support** - Create variations to avoid spam detection
- ⏱️ **Human-like Timing** - Advanced timing algorithms for natural sending patterns
- 🔐 **Secure Authentication** - Multiple Azure authentication methods
- 📱 **Responsive Design** - Works perfectly on desktop and mobile

## Tech Stack

- **Frontend**: Next.js 14, TypeScript, Tailwind CSS, React Hot Toast
- **Backend**: Next.js API Routes, Azure Communication Services
- **Authentication**: Azure Identity (Multiple methods supported)
- **Email Service**: Azure Communication Services Email API
- **Styling**: Tailwind CSS with custom design system
- **TypeScript**: Full type safety throughout the application

## Prerequisites

Before running this application, you need:

1. **Azure Account** with Communication Services set up
2. **Email Domain** configured in Azure Communication Services
3. **Node.js** 18+ installed on your system
4. **Environment Variables** configured (see setup below)

## Quick Start

### 1. Clone and Install

\`\`\`bash
cd next_version
npm install
\`\`\`

### 2. Environment Setup

Copy the example environment file:

\`\`\`bash
cp .env.example .env.local
\`\`\`

Edit `.env.local` with your Azure configuration:

\`\`\`env
# Azure Communication Services
COMMUNICATION_SERVICES_CONNECTION_STRING=your_connection_string_here
AZ_SUBSCRIPTION_ID=your_subscription_id
AZ_RESOURCE_GROUP=your_resource_group
AZ_EMAIL_SERVICE_NAME=your_email_service_name
AZ_EMAIL_DOMAIN=your_domain.com

# Authentication (choose one method)
AZURE_AUTH_METHOD=default  # or 'service-principal', 'managed-identity', 'cli'

# For Service Principal authentication:
AZURE_CLIENT_ID=your_client_id
AZURE_CLIENT_SECRET=your_client_secret
AZURE_TENANT_ID=your_tenant_id

# Email Settings
RATE_PER_MINUTE=20
JITTER_PCT=50
MAX_RETRIES=3
\`\`\`

### 3. Development

Start the development server:

\`\`\`bash
npm run dev
\`\`\`

Open [http://localhost:3000](http://localhost:3000) in your browser.

### 4. Production Build

\`\`\`bash
npm run build
npm start
\`\`\`

## Authentication Methods

The application supports multiple Azure authentication methods:

### 1. Default Credential (Recommended for Development)
\`\`\`env
AZURE_AUTH_METHOD=default
\`\`\`
Uses Azure's default credential chain (environment → managed identity → CLI → interactive).

### 2. Service Principal (Recommended for Production)
\`\`\`env
AZURE_AUTH_METHOD=service-principal
AZURE_CLIENT_ID=your_client_id
AZURE_CLIENT_SECRET=your_client_secret
AZURE_TENANT_ID=your_tenant_id
\`\`\`

### 3. Managed Identity (for Azure-hosted applications)
\`\`\`env
AZURE_AUTH_METHOD=managed-identity
\`\`\`

### 4. Azure CLI (for local development)
\`\`\`env
AZURE_AUTH_METHOD=cli
\`\`\`
Requires \`az login\` to be run first.

## Features Overview

### 📧 Campaign Composer
- Rich text email composition
- Variable substitution ({{name}}, {{email}}, etc.)
- Spintax support for content variation
- Real-time email preview
- Recipient list management

### 👤 Sender Management
- Add/remove sender addresses
- Domain validation
- Sender status monitoring
- Automatic provisioning

### 📝 Template System
- Reusable email templates
- Variable placeholders
- Spintax variations
- Template categorization

### 📊 Analytics Dashboard
- Real-time campaign status
- Delivery success rates
- Detailed email logs
- Performance metrics

### ⚙️ Smart Features
- **Human-like Timing**: Advanced algorithms simulate natural sending patterns
- **Spam Prevention**: Multiple layers of anti-spam techniques
- **Error Handling**: Robust retry mechanisms with exponential backoff
- **Rate Limiting**: Intelligent rate limiting to prevent API throttling

## API Endpoints

### Campaign Management
- \`POST /api/campaigns/send\` - Start email campaign
- \`GET /api/campaigns/status\` - Get campaign status

### Sender Management
- \`GET /api/senders\` - List all senders
- \`POST /api/senders/manage\` - Create sender
- \`DELETE /api/senders/manage\` - Delete sender

## Development Scripts

\`\`\`bash
npm run dev          # Start development server
npm run build        # Build for production
npm run start        # Start production server
npm run lint         # Run ESLint
npm run type-check   # TypeScript type checking
\`\`\`

## Project Structure

\`\`\`
src/
├── components/
│   ├── Layout.tsx           # Main layout wrapper
│   ├── Sidebar.tsx          # Navigation sidebar
│   └── sections/            # Page sections
│       ├── ComposeSection.tsx
│       ├── SendersSection.tsx
│       ├── TemplatesSection.tsx
│       ├── RecipientsSection.tsx
│       ├── AnalyticsSection.tsx
│       └── SettingsSection.tsx
├── lib/
│   ├── azure.ts             # Azure client configuration
│   └── utils.ts             # Utility functions
├── pages/
│   ├── api/                 # API routes
│   │   ├── campaigns/
│   │   └── senders/
│   ├── _app.tsx             # App wrapper
│   └── index.tsx            # Main page
├── styles/
│   └── globals.css          # Global styles
└── types/
    └── index.ts             # TypeScript definitions
\`\`\`

## Environment Variables Reference

| Variable | Description | Required | Default |
|----------|-------------|----------|---------|
| \`COMMUNICATION_SERVICES_CONNECTION_STRING\` | Azure Communication Services connection string | ✅ | - |
| \`AZ_SUBSCRIPTION_ID\` | Azure subscription ID | ✅ | - |
| \`AZ_RESOURCE_GROUP\` | Azure resource group name | ✅ | - |
| \`AZ_EMAIL_SERVICE_NAME\` | Email service name in Azure | ✅ | - |
| \`AZ_EMAIL_DOMAIN\` | Configured email domain | ✅ | - |
| \`AZURE_AUTH_METHOD\` | Authentication method | ❌ | \`default\` |
| \`AZURE_CLIENT_ID\` | Service principal client ID | ❌* | - |
| \`AZURE_CLIENT_SECRET\` | Service principal secret | ❌* | - |
| \`AZURE_TENANT_ID\` | Azure tenant ID | ❌* | - |
| \`RATE_PER_MINUTE\` | Emails per minute rate limit | ❌ | \`20\` |
| \`JITTER_PCT\` | Timing randomization percentage | ❌ | \`50\` |
| \`MAX_RETRIES\` | Maximum retry attempts | ❌ | \`3\` |

*Required only when using service principal authentication.

## Troubleshooting

### Common Issues

1. **Authentication Errors**
   - Verify your Azure credentials are correct
   - Ensure the service principal has proper permissions
   - Check if \`az login\` is required for CLI authentication

2. **Email Sending Failures**
   - Verify your email domain is properly configured in Azure
   - Check that sender addresses are provisioned and verified
   - Ensure Communication Services connection string is valid

3. **TypeScript Errors**
   - Run \`npm run type-check\` to identify type issues
   - Ensure all dependencies are properly installed

4. **Build Errors**
   - Clear \`.next\` folder and rebuild: \`rm -rf .next && npm run build\`
   - Check for missing environment variables

## Contributing

1. Fork the repository
2. Create a feature branch: \`git checkout -b feature-name\`
3. Commit changes: \`git commit -am 'Add feature'\`
4. Push to branch: \`git push origin feature-name\`
5. Submit a pull request

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Support

For questions or issues:
1. Check the troubleshooting section above
2. Review Azure Communication Services documentation
3. Create an issue in the repository

---

**Note**: This is the Next.js version of the ColdSendz application. For the original vanilla implementation, see the parent directory.