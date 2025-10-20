import type { NextApiRequest, NextApiResponse } from 'next';
import { stopCampaignInstance, getCampaignInstance, getCampaignStatus } from '@/lib/multiCampaignManager';
import { campaignRepository } from '@/lib/campaignRepository';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    let { campaignId } = req.body as { campaignId?: string };

    // If no campaignId provided, fall back to primary running campaign
    if (!campaignId) {
      const primary = getCampaignStatus();
      campaignId = primary?.campaignId ?? null;
    }

    if (!campaignId) {
      return res.status(400).json({ error: 'Campaign ID is required and no active campaign found' });
    }

    const campaign = getCampaignInstance(campaignId);
    if (!campaign) {
      return res.status(404).json({ error: 'Campaign not found' });
    }

    stopCampaignInstance(campaignId);

    // Persist to DB
    try {
      await campaignRepository.updateCampaignProgress(campaignId, {
        status: 'stopped',
        endTime: new Date()
      });
    } catch (err) {
      console.warn('Failed to persist stop to DB:', err?.message || err);
    }

    console.log(`⏹️ Campaign ${campaignId} stopped via API`);

    res.status(200).json({
      success: true,
      message: 'Campaign stopped successfully',
      campaignId,
      status: 'stopped'
    });
  } catch (error) {
    console.error('❌ Error stopping campaign:', error);
    res.status(500).json({ error: 'Failed to stop campaign' });
  }
}