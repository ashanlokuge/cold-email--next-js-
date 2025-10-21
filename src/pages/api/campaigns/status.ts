import type { NextApiRequest, NextApiResponse } from 'next';
import { getCampaignStatus, getRunningCampaignsForUser } from '@/lib/multiCampaignManager';
import jwt from 'jsonwebtoken';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Get user from token for multi-campaign supportyt
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

    // If user is authenticated, prefer per-user running campaigns
    if (userId) {
      const running = await getRunningCampaignsForUser(userId);
      if (running && running.length > 0) {
        const primary = running[0];
        return res.status(200).json({
          isRunning: primary.isRunning,
          campaignName: primary.campaignName,
          sent: primary.sent ?? 0,
          successful: primary.successful ?? 0,
          failed: primary.failed ?? 0,
          total: primary.total ?? 0,
          completed: primary.completed ?? false,
          startTime: primary.startTime ?? null,
          status: primary.status,
          campaignId: primary.campaignId
        });
      }
    }

    // Fallback to old global status for backwards compatibility
    const status = await getCampaignStatus();
    res.status(200).json(status);
  } catch (error) {
    console.error('Error fetching campaign status:', error);
    res.status(500).json({ error: 'Failed to fetch campaign status' });
  }
}