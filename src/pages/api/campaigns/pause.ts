import type { NextApiRequest, NextApiResponse } from 'next';
import { pauseCampaign, getCampaignStatus } from '@/lib/campaignState';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    pauseCampaign();
    const status = getCampaignStatus();
    
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