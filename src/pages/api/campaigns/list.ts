// API to get all campaigns for logged-in user
import type { NextApiRequest, NextApiResponse } from 'next';
import { campaignRepository } from '../../../lib/campaignRepository';
import jwt from 'jsonwebtoken';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Get user from JWT token
    const token = req.headers.authorization?.replace('Bearer ', '');
    
    if (!token) {
      return res.status(401).json({ success: false, message: 'Unauthorized' });
    }

    const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';
    const decoded = jwt.verify(token, JWT_SECRET) as any;
    const userId = decoded.userId;

    // Get campaigns
    const campaigns = await campaignRepository.getUserCampaigns(userId);

    // Get stats
    const stats = await campaignRepository.getUserStats(userId);

    res.status(200).json({
      success: true,
      campaigns,
      stats
    });
  } catch (error) {
    console.error('Error fetching campaigns:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch campaigns',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}
