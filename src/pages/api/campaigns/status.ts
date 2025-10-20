import type { NextApiRequest, NextApiResponse } from 'next';
import { getCampaignStatus } from '@/lib/multiCampaignManager';
import jwt from 'jsonwebtoken';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Get user from token for multi-campaign support
    const token = req.headers.authorization?.replace('Bearer ', '');
    let userId = null;

    if (token) {
      try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET!) as any;
        userId = decoded.userId;
      } catch (error) {
        console.warn('Invalid token in status request:', error);
      }
    }

    // Get campaign status (will return the first running campaign for backward compatibility)
    const status = getCampaignStatus();

    // If no running campaign and user is authenticated, check for any user campaigns
    if (!status.isRunning && userId) {
      // Return empty status for authenticated users with no running campaigns
      res.status(200).json({
        isRunning: false,
        campaignName: '',
        sent: 0,
        successful: 0,
        failed: 0,
        total: 0,
        completed: false,
        startTime: null,
        status: 'idle' as const,
        campaignId: null
      });
    } else {
      res.status(200).json(status);
    }
  } catch (error) {
    console.error('Error fetching campaign status:', error);
    res.status(500).json({ error: 'Failed to fetch campaign status' });
  }
}