import type { NextApiRequest, NextApiResponse } from 'next';
import { getEmailDetails } from '@/lib/campaignState';
import { getAllEmailDetails } from '@/lib/multiCampaignManager';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Legacy single-list details
    const legacyDetails = getEmailDetails();

    // Get all details from MongoDB
    const mongoDetails = await getAllEmailDetails(200);

    // Merge and dedupe by timestamp+recipient (simple heuristic)
    const combined = [...mongoDetails, ...legacyDetails];
    const seen = new Set();
    const deduped: any[] = [];

    for (const d of combined) {
      const key = `${d.timestamp || ''}::${d.recipient || ''}::${d.sender || ''}`;
      if (!seen.has(key)) {
        seen.add(key);
        deduped.push(d);
      }
    }

    // Return most recent first and limit to 200 entries
    deduped.sort((a, b) => (b.timestamp || '').localeCompare(a.timestamp || ''));
    res.status(200).json(deduped.slice(0, 200));
  } catch (error) {
    console.error('Error fetching combined email details:', error);
    res.status(500).json({ error: 'Failed to fetch email details' });
  }
}