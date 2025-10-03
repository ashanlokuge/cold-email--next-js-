import type { NextApiRequest, NextApiResponse } from 'next';
import { mgmtClient, config as azureConfig } from '@/lib/azure';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method === 'POST') {
    return createSender(req, res);
  } else if (req.method === 'DELETE') {
    return deleteSender(req, res);
  } else {
    return res.status(405).json({ error: 'Method not allowed' });
  }
}

async function createSender(req: NextApiRequest, res: NextApiResponse) {
  try {
    const { username, displayName } = req.body;

    if (!username || !displayName) {
      return res.status(400).json({ 
        error: 'Username and display name are required' 
      });
    }

    // Validate username format
    if (!/^[a-zA-Z0-9._-]+$/.test(username)) {
      return res.status(400).json({ 
        error: 'Username can only contain letters, numbers, dots, hyphens, and underscores' 
      });
    }

    const result = await mgmtClient.senderUsernames.createOrUpdate(
      azureConfig.resourceGroup,
      azureConfig.emailServiceName,
      azureConfig.emailDomain,
      username,
      { username, displayName }
    );

    res.status(201).json({
      email: `${username}@${azureConfig.emailDomain}`,
      username,
      displayName,
      domain: azureConfig.emailDomain,
      provisioningState: result.provisioningState
    });
  } catch (error: any) {
    console.error('Error creating sender:', error);
    
    if (error.statusCode === 409) {
      return res.status(409).json({ 
        error: 'Sender already exists' 
      });
    }
    
    res.status(500).json({ 
      error: 'Failed to create sender',
      details: error.message 
    });
  }
}

async function deleteSender(req: NextApiRequest, res: NextApiResponse) {
  try {
    const { username } = req.body;

    if (!username) {
      return res.status(400).json({ 
        error: 'Username is required' 
      });
    }

    await mgmtClient.senderUsernames.delete(
      azureConfig.resourceGroup,
      azureConfig.emailServiceName,
      azureConfig.emailDomain,
      username
    );

    res.status(200).json({ 
      message: 'Sender deleted successfully' 
    });
  } catch (error: any) {
    console.error('Error deleting sender:', error);
    
    if (error.statusCode === 404) {
      return res.status(404).json({ 
        error: 'Sender not found' 
      });
    }
    
    res.status(500).json({ 
      error: 'Failed to delete sender',
      details: error.message 
    });
  }
}