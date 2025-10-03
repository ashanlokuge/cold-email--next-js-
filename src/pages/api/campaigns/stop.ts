import type { NextApiRequest, NextApiResponse } from 'next';
import { stopCampaign, getCampaignStatus } from '@/lib/campaignState';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    stopCampaign();
    const status = getCampaignStatus();
    
    console.log('⏹️ Campaign stopped via API');
    
    res.status(200).json({ 
      success: true, 
      message: 'Campaign stopped successfully',
      status 
    });
  } catch (error) {
    console.error('❌ Error stopping campaign:', error);
    res.status(500).json({ error: 'Failed to stop campaign' });
  }
}