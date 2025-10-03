import type { NextApiRequest, NextApiResponse } from 'next';
import { resumeCampaign, getCampaignStatus } from '@/lib/campaignState';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    resumeCampaign();
    const status = getCampaignStatus();
    
    console.log('▶️ Campaign resumed via API');
    
    res.status(200).json({ 
      success: true, 
      message: 'Campaign resumed successfully',
      status 
    });
  } catch (error) {
    console.error('❌ Error resuming campaign:', error);
    res.status(500).json({ error: 'Failed to resume campaign' });
  }
}