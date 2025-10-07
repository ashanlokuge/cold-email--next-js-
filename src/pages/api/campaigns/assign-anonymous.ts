// API endpoint to assign anonymous campaigns to the current logged-in user
// Call this from the browser or use it as an admin tool

import type { NextApiRequest, NextApiResponse } from 'next';
import { getDb } from '../../../lib/db';
import jwt from 'jsonwebtoken';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Get user from JWT token
    const token = req.headers.authorization?.replace('Bearer ', '');
    if (!token) {
      return res.status(401).json({ success: false, message: 'Unauthorized' });
    }

    const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';
    const decoded = jwt.verify(token, JWT_SECRET) as any;
    const userId = decoded.userId;
    const userEmail = decoded.email;

    console.log('🔧 Assigning anonymous campaigns to:', userEmail, userId);

    const db = await getDb();
    const campaigns = db.collection('campaigns');

    // Find anonymous campaigns
    const anonymousCampaigns = await campaigns.find({ 
      userId: "anonymous" 
    }).toArray();

    console.log(`📊 Found ${anonymousCampaigns.length} anonymous campaigns`);

    if (anonymousCampaigns.length === 0) {
      return res.status(200).json({
        success: true,
        message: 'No anonymous campaigns to assign',
        assigned: 0
      });
    }

    // Update all anonymous campaigns to current user
    const result = await campaigns.updateMany(
      { userId: "anonymous" },
      { 
        $set: { 
          userId: userId,
          userEmail: userEmail 
        } 
      }
    );

    console.log(`✅ Assigned ${result.modifiedCount} campaigns to ${userEmail}`);

    res.status(200).json({
      success: true,
      message: `Assigned ${result.modifiedCount} campaigns to your account`,
      assigned: result.modifiedCount
    });

  } catch (error) {
    console.error('Error assigning campaigns:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to assign campaigns',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}
