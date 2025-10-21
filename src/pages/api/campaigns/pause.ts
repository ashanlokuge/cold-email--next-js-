import type { NextApiRequest, NextApiResponse } from 'next';
import { pauseCampaignInstance, getCampaignInstance, getCampaignStatus, getRunningCampaignsForUser } from '@/lib/multiCampaignManager';
import jwt from 'jsonwebtoken';
import { campaignRepository } from '@/lib/campaignRepository';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    let { campaignId } = req.body as { campaignId?: string };

    // If no campaignId provided, try to find primary running campaign for user from token
    if (!campaignId) {
      const token = req.headers.authorization?.replace('Bearer ', '');
      if (token) {
        try {
          const decoded = jwt.verify(token, process.env.JWT_SECRET!) as any;
          const userId = decoded.userId;
          const running = await getRunningCampaignsForUser(userId);
          if (running && running.length > 0) campaignId = running[0].campaignId;
        } catch (err) {
          // fallback to global status
          const primary = await getCampaignStatus();
          campaignId = primary?.campaignId ?? null;
        }
      } else {
        const primary = await getCampaignStatus();
        campaignId = primary?.campaignId ?? null;
      }
    }

    if (!campaignId) {
      return res.status(400).json({ error: 'Campaign ID is required and no active campaign found' });
    }

    const campaign = await getCampaignInstance(campaignId);
    if (!campaign) {
      return res.status(404).json({ error: 'Campaign not found' });
    }

  await pauseCampaignInstance(campaignId);

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