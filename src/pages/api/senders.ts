import type { NextApiRequest, NextApiResponse } from 'next';
import { mgmtClient, config as azureConfig } from '@/lib/azure';

// Cache senders for 10 minutes (same as original)
let cachedSenders: any = null;
let cachedAt = 0;

async function getApprovedSenders() {
  const now = Date.now();
  if (cachedSenders && now - cachedAt < 10 * 60_000) return cachedSenders;

  const senders: string[] = [];
  
  try {
    // Get all domains first (same as original)
    const domains: string[] = [];
    for await (const domain of (mgmtClient as any).domains.listByEmailServiceResource(azureConfig.resourceGroup, azureConfig.emailServiceName)) {
      if (domain && domain.name) {
        domains.push(domain.name);
      }
    }

    // If no domains found via API, use the configured domain
    if (domains.length === 0) {
      domains.push(azureConfig.emailDomain);
    }

    // Get senders from all domains (same as original)
    for (const domainName of domains) {
      try {
        for await (const s of (mgmtClient as any).senderUsernames.listByDomains(azureConfig.resourceGroup, azureConfig.emailServiceName, domainName)) {
          if (s?.name) {
            senders.push(`${s.name}@${domainName}`);
          }
        }
      } catch (domainError) {
        console.warn(`Failed to get senders for domain ${domainName}:`, domainError.message);
        // Continue with other domains even if one fails
      }
    }

    if (!senders.length) throw new Error('No approved sender usernames found in any ACS domain');
    cachedSenders = senders; cachedAt = now;
    return senders;

  } catch (error) {
    console.error('Error fetching senders, falling back to configured domain:', error.message);

    // Fallback: try to get senders from configured domain only
    const fallbackSenders: string[] = [];
    try {
      for await (const s of (mgmtClient as any).senderUsernames.listByDomains(azureConfig.resourceGroup, azureConfig.emailServiceName, azureConfig.emailDomain)) {
        if (s?.name) fallbackSenders.push(`${s.name}@${azureConfig.emailDomain}`);
      }
    } catch (fallbackError) {
      console.error('Fallback also failed:', fallbackError.message);
    }

    cachedSenders = fallbackSenders;
    cachedAt = now;
    return fallbackSenders;
  }
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method === 'GET') {
    try {
      const senders = await getApprovedSenders();
      res.status(200).json({
        domain: azureConfig.emailDomain,
        count: senders.length,
        senders
      });
    } catch (error: any) {
      console.error('Error in senders GET:', error);
      res.status(500).json({ error: error.message });
    }
  }
  else if (req.method === 'POST') {
    try {
      const { username, displayName, domain } = req.body;

      if (!username || !displayName) {
        return res.status(400).json({ error: 'Username and displayName are required' });
      }

      // Use provided domain or fallback to default
      const selectedDomain = domain || azureConfig.emailDomain;

      if (!selectedDomain) {
        return res.status(400).json({ error: 'Domain is required' });
      }

      // Validate username format (alphanumeric and hyphens only)
      if (!/^[a-zA-Z0-9-]+$/.test(username)) {
        return res.status(400).json({ error: 'Username can only contain letters, numbers, and hyphens' });
      }

      // Create the sender in Azure (same as original)
      await (mgmtClient as any).senderUsernames.createOrUpdate(
        azureConfig.resourceGroup,
        azureConfig.emailServiceName,
        selectedDomain,
        username,
        { username, displayName }
      );

      // Clear cache so next request will fetch fresh data
      cachedSenders = null;

      res.status(200).json({
        message: 'Sender created successfully',
        sender: {
          email: `${username}@${selectedDomain}`,
          username,
          displayName,
          domain: selectedDomain
        }
      });
    } catch (error: any) {
      console.error('Error creating sender:', error);
      res.status(500).json({ error: error.message });
    }
  }
  else if (req.method === 'DELETE') {
    try {
      const { username } = req.body;

      if (!username) {
        return res.status(400).json({ error: 'Username is required' });
      }

      // Get the sender's domain by finding it in current senders
      const currentSenders = await getApprovedSenders();
      const senderToDelete = currentSenders.find((s: any) => s.username === username);

      if (!senderToDelete) {
        return res.status(404).json({ error: 'Sender not found' });
      }

      // Delete the sender from Azure
      await (mgmtClient as any).senderUsernames.delete(
        azureConfig.resourceGroup,
        azureConfig.emailServiceName,
        senderToDelete.domain,
        username
      );

      // Clear cache so next request will fetch fresh data
      cachedSenders = null;

      res.status(200).json({ message: 'Sender deleted successfully' });
    } catch (error: any) {
      console.error('Error deleting sender:', error);
      res.status(500).json({ error: error.message });
    }
  }
  else {
    res.status(405).json({ error: 'Method not allowed' });
  }
}