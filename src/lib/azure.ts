import { EmailClient } from '@azure/communication-email';
import { CommunicationServiceManagementClient } from '@azure/arm-communication';
import { 
  DefaultAzureCredential, 
  ClientSecretCredential, 
  ManagedIdentityCredential,
  AzureCliCredential 
} from '@azure/identity';

// Environment variables
export const config = {
  connectionString: process.env.COMMUNICATION_SERVICES_CONNECTION_STRING!,
  subscriptionId: process.env.AZ_SUBSCRIPTION_ID!,
  resourceGroup: process.env.AZ_RESOURCE_GROUP!,
  emailServiceName: process.env.AZ_EMAIL_SERVICE_NAME!,
  emailDomain: process.env.AZ_EMAIL_DOMAIN!,
  authMethod: process.env.AZURE_AUTH_METHOD || 'default',
  clientId: process.env.AZURE_CLIENT_ID,
  clientSecret: process.env.AZURE_CLIENT_SECRET,
  tenantId: process.env.AZURE_TENANT_ID,
  ratePerMinute: Number(process.env.RATE_PER_MINUTE) || 20,
  jitterPct: Number(process.env.JITTER_PCT) || 50,
  maxRetries: Number(process.env.MAX_RETRIES) || 3,
};

// Validate required environment variables
const requiredEnvVars = [
  'COMMUNICATION_SERVICES_CONNECTION_STRING',
  'AZ_SUBSCRIPTION_ID',
  'AZ_RESOURCE_GROUP',
  'AZ_EMAIL_SERVICE_NAME',
  'AZ_EMAIL_DOMAIN'
];

for (const envVar of requiredEnvVars) {
  if (!process.env[envVar]) {
    throw new Error(`Missing required environment variable: ${envVar}`);
  }
}

// Create Azure credential based on configuration
function createAzureCredential() {
  const authMethod = config.authMethod.toLowerCase();
  
  console.log(`🔐 Initializing Azure authentication with method: ${authMethod}`);
  
  switch (authMethod) {
    case 'service-principal':
      if (!config.clientId || !config.clientSecret || !config.tenantId) {
        throw new Error('Service Principal authentication requires AZURE_CLIENT_ID, AZURE_CLIENT_SECRET, and AZURE_TENANT_ID');
      }
      return new ClientSecretCredential(config.tenantId, config.clientId, config.clientSecret);
    
    case 'managed-identity':
      return new ManagedIdentityCredential();
    
    case 'cli':
      return new AzureCliCredential();
    
    case 'default':
    default:
      return new DefaultAzureCredential();
  }
}

// Initialize Azure clients
export const emailClient = new EmailClient(config.connectionString);
export const mgmtCredential = createAzureCredential();
export const mgmtClient = new CommunicationServiceManagementClient(mgmtCredential, config.subscriptionId);