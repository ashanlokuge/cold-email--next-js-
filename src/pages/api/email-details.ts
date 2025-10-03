import type { NextApiRequest, NextApiResponse } from 'next';
import { getEmailDetails } from '@/lib/campaignState';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const details = getEmailDetails();
  res.status(200).json(details.slice(0, 50)); // Return last 50 details
}