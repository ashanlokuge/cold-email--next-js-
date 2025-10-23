/** @type {import('next').NextConfig} */
const nextConfig = {
  // Environment variables that should be available on the client side
  env: {
    COMMUNICATION_SERVICES_CONNECTION_STRING: process.env.COMMUNICATION_SERVICES_CONNECTION_STRING,
    AZ_SUBSCRIPTION_ID: process.env.AZ_SUBSCRIPTION_ID,
    AZ_RESOURCE_GROUP: process.env.AZ_RESOURCE_GROUP,
    AZ_EMAIL_SERVICE_NAME: process.env.AZ_EMAIL_SERVICE_NAME,
    AZ_EMAIL_DOMAIN: process.env.AZ_EMAIL_DOMAIN,
    AZURE_AUTH_METHOD: process.env.AZURE_AUTH_METHOD || 'default',
    AZURE_CLIENT_ID: process.env.AZURE_CLIENT_ID || '',
    AZURE_CLIENT_SECRET: process.env.AZURE_CLIENT_SECRET || '',
    AZURE_TENANT_ID: process.env.AZURE_TENANT_ID || '',
    RATE_PER_MINUTE: process.env.RATE_PER_MINUTE || '20',
    JITTER_PCT: process.env.JITTER_PCT || '50',
    MAX_RETRIES: process.env.MAX_RETRIES || '3',
  },
  // API route configuration moved to individual API routes
  // Ensure proper build output
  trailingSlash: false,
  generateEtags: false,
  // Remove standalone output for Railway Nixpacks deployment
  // output: 'standalone',
}

module.exports = nextConfig