import type { NextApiRequest, NextApiResponse } from 'next';
import { getRunningCampaignsForUser, getAllCampaignsForUser, getCampaignStatistics } from '@/lib/multiCampaignManager';
import jwt from 'jsonwebtoken';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Get user from token
    const token = req.headers.authorization?.replace('Bearer ', '');

    if (!token) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    let userId: string;
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET!) as any;
      userId = decoded.userId;
    } catch (error) {
      return res.status(401).json({ error: 'Invalid token' });
    }

    // Get all campaigns for the users
    const allCampaigns = getAllCampaignsForUser(userId);
    const runningCampaigns = getRunningCampaignsForUser(userId);
    const stats = getCampaignStatistics(userId);

    // Return the primary running campaign (first one) for backward compatibility
    const primaryCampaign = runningCampaigns.length > 0 ? runningCampaigns[0] : null;

    res.status(200).json({
      // Primary campaign status (for backward compatibility)
      isRunning: primaryCampaign?.isRunning || false,
      campaignName: primaryCampaign?.campaignName || '',
      sent: primaryCampaign?.sent || 0,
      successful: primaryCampaign?.successful || 0,
      failed: primaryCampaign?.failed || 0,
      total: primaryCampaign?.total || 0,
      completed: primaryCampaign?.completed || false,
      startTime: primaryCampaign?.startTime || null,
      status: primaryCampaign?.status || 'idle',
      campaignId: primaryCampaign?.campaignId || null,
      nextEmailIn: primaryCampaign?.nextEmailIn || null,
      lastDelay: primaryCampaign?.lastDelay || null,

      // Multi-campaign data
      allCampaigns: allCampaigns.map(campaign => ({
        campaignId: campaign.campaignId,
        campaignName: campaign.campaignName,
        userId: campaign.userId,
        userEmail: campaign.userEmail,
        isRunning: campaign.isRunning,
        sent: campaign.sent,
        successful: campaign.successful,
        failed: campaign.failed,
        total: campaign.total,
        completed: campaign.completed,
        startTime: campaign.startTime,
        status: campaign.status,
        pauseReason: campaign.pauseReason,
        nextEmailIn: campaign.nextEmailIn,
        lastDelay: campaign.lastDelay
      })),

      runningCampaigns: runningCampaigns.map(campaign => ({
        campaignId: campaign.campaignId,
        campaignName: campaign.campaignName,
        sent: campaign.sent,
        successful: campaign.successful,
        failed: campaign.failed,
        total: campaign.total,
        status: campaign.status,
        startTime: campaign.startTime,
        pauseReason: campaign.pauseReason,
        nextEmailIn: campaign.nextEmailIn,
        lastDelay: campaign.lastDelay
      })),

      // Statistics
      stats: {
        totalCampaigns: stats.totalCampaigns,
        runningCampaigns: stats.runningCampaigns,
        completedCampaigns: stats.completedCampaigns,
        totalEmails: stats.totalEmails,
        totalSent: stats.totalSent,
        totalSuccessful: stats.totalSuccessful,
        totalFailed: stats.totalFailed,
        successRate: stats.successRate
      }
    });
  } catch (error) {
    console.error('Error fetching multi-campaign status:', error);
    res.status(500).json({ error: 'Failed to fetch campaign status' });
  }
}
