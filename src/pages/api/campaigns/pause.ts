import type { NextApiRequest, NextApiResponse } from 'next';
import { pauseCampaignInstance, getCampaignInstance } from '@/lib/multiCampaignManager';
import { campaignRepository } from '@/lib/campaignRepository';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { campaignId } = req.body;

    if (!campaignId) {
      return res.status(400).json({ error: 'Campaign ID is required' });
    }

    const campaign = getCampaignInstance(campaignId);
    if (!campaign) {
      return res.status(404).json({ error: 'Campaign not found' });
    }

    pauseCampaignInstance(campaignId);

    // Persist to DB
    try {
      await campaignRepository.updateCampaignProgress(campaignId, {
        status: 'paused'
      });
    } catch (err) {
      console.warn('Failed to persist pause to DB:', err?.message || err);
    }

    console.log(`⏸️ Campaign ${campaignId} paused via API`);

    res.status(200).json({
      success: true,
      message: 'Campaign paused successfully',
      campaignId,
      status: 'paused'
    });
  } catch (error) {
    console.error('❌ Error pausing campaign:', error);
    res.status(500).json({ error: 'Failed to pause campaign' });
  }
}