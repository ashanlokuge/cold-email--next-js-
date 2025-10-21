// API to get all campaigns for logged-in user
import type { NextApiRequest, NextApiResponse } from 'next';
import { campaignRepository } from '../../../lib/campaignRepository';
import { getAllCampaignsForUser } from '../../../lib/multiCampaignManager';
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

    // Get campaigns from database
    const dbCampaigns = await campaignRepository.getUserCampaigns(userId);

    // Get in-memory campaign data for real-time status
    const memoryCampaigns = getAllCampaignsForUser(userId);

    // Merge database data with in-memory data
    const campaigns = dbCampaigns.map(dbCampaign => {
      const memoryCampaign = memoryCampaigns.find(mc => mc.campaignId === dbCampaign._id.toString());
      
      return {
        ...dbCampaign,
        // Override with real-time data from memory if available
        status: memoryCampaign?.status || dbCampaign.status,
        sentCount: memoryCampaign?.sent || dbCampaign.sentCount,
        successCount: memoryCampaign?.successful || dbCampaign.successCount,
        failedCount: memoryCampaign?.failed || dbCampaign.failedCount,
        nextEmailIn: memoryCampaign?.nextEmailIn
      };
    });

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
