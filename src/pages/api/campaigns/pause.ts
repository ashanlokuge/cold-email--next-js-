import type { NextApiRequest, NextApiResponse } from 'next';
import { pauseCampaign, getCampaignStatus } from '@/lib/campaignState';
import { campaignRepository } from '@/lib/campaignRepository';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    pauseCampaign();
    const status = getCampaignStatus();
    
    // Persist to DB if campaignId exists
    if (status.campaignId) {
      try {
        await campaignRepository.updateCampaignProgress(status.campaignId, {
          status: 'paused'
        });
      } catch (err) {
        console.warn('Failed to persist pause to DB:', err?.message || err);
      }
    }

    console.log('⏸️ Campaign paused via API');
    
    res.status(200).json({ 
      success: true, 
      message: 'Campaign paused successfully',
      status 
    });
  } catch (error) {
    console.error('❌ Error pausing campaign:', error);
    res.status(500).json({ error: 'Failed to pause campaign' });
  }
}