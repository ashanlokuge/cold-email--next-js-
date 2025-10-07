import type { NextApiRequest, NextApiResponse } from 'next';
import { resumeCampaign, getCampaignStatus } from '@/lib/campaignState';
import { getDb } from '@/lib/db';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    resumeCampaign();
    const status = getCampaignStatus();
    
    if (status.campaignId) {
      try {
        const db = await getDb();
        const campaigns = db.collection('campaigns');
        await campaigns.updateOne({ _id: new (require('mongodb').ObjectId)(status.campaignId) }, { $set: { status: 'running' } });
      } catch (err) {
        console.warn('Failed to persist resume to DB:', err?.message || err);
      }
    }

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