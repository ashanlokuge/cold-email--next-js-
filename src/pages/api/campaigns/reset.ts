import type { NextApiRequest, NextApiResponse } from 'next';
import { resetCampaignStatus, clearEmailDetails } from '@/lib/campaignState';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Reset the campaign status
    resetCampaignStatus();
    
    // Clear email details
    clearEmailDetails();
    
    return res.status(200).json({ 
      message: 'Campaign reset successfully',
      status: 'reset'
    });
  } catch (error) {
    console.error('Error resetting campaign:', error);
    return res.status(500).json({ 
      error: 'Failed to reset campaign' 
    });
  }
}