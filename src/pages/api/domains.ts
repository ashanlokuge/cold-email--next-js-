import type { NextApiRequest, NextApiResponse } from 'next';
import { mgmtClient, config as azureConfig } from '@/lib/azure';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const domains: any[] = [];

    console.log('Fetching domains from Azure...');
    console.log('Resource Group:', azureConfig.resourceGroup);
    console.log('Email Service Name:', azureConfig.emailServiceName);
    console.log('Auth Method:', azureConfig.authMethod);
    
    // Debug: Check what properties are available on mgmtClient
    console.log('mgmtClient properties:', Object.getOwnPropertyNames(mgmtClient));
    console.log('mgmtClient prototype properties:', Object.getOwnPropertyNames(Object.getPrototypeOf(mgmtClient)));
    
    // Check if domains property exists
    if ('domains' in mgmtClient) {
      console.log('domains property exists');
      console.log('domains properties:', Object.getOwnPropertyNames((mgmtClient as any).domains));
    } else {
      console.log('domains property does NOT exist');
    }
    
    // Check for alternative property names
    const possibleProperties = ['domains', 'emailServiceDomains', 'domainNames', 'communicationServiceDomains'];
    for (const prop of possibleProperties) {
      if (prop in mgmtClient) {
        console.log(`Found property: ${prop}`);
      }
    }

    // Try to use domains property if it exists
    if ('domains' in mgmtClient && (mgmtClient as any).domains && (mgmtClient as any).domains.listByEmailServiceResource) {
      // List all email domains in the email service (same as working HTML/JS app)
      for await (const domain of (mgmtClient as any).domains.listByEmailServiceResource(azureConfig.resourceGroup, azureConfig.emailServiceName)) {
        console.log('Found domain:', domain);
        if (domain && domain.name) {
          domains.push({
            name: domain.name,
            domainManagement: domain.domainManagement || 'Unknown',
            verificationStatus: domain.verificationStatus || 'Unknown',
            userEngagementTracking: domain.userEngagementTracking || 'Unknown'
          });
        }
      }
    } else {
      console.log('domains.listByEmailServiceResource method not available');
      throw new Error('Azure SDK domains property not available - this might be a version mismatch');
    }

    console.log('Total domains found:', domains.length);

    // Fallback to configured domain if no domains found via API (same as original)
    if (domains.length === 0) {
      console.log('No domains found via API, using configured domain:', azureConfig.emailDomain);
      domains.push({
        name: azureConfig.emailDomain,
        domainManagement: 'Unknown',
        verificationStatus: 'Unknown',
        userEngagementTracking: 'Unknown'
      });
    }

    // Return in original server format
    res.status(200).json({
      count: domains.length,
      domains: domains
    });
  } catch (error: any) {
    console.error('Error fetching domains:', error);
    console.error('Error details:', {
      message: error.message,
      code: error.code,
      statusCode: error.statusCode,
      stack: error.stack
    });

    // Fallback to configured domain on error (same as original)
    res.status(200).json({
      count: 1,
      domains: [{
        name: azureConfig.emailDomain,
        domainManagement: 'Unknown',
        verificationStatus: 'Unknown',
        userEngagementTracking: 'Unknown'
      }],
      error: 'Failed to fetch domains from Azure, showing configured domain: ' + error.message
    });
  }
}