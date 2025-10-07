import type { NextApiRequest, NextApiResponse } from 'next';
import { initializeDatabase } from '../../../../src/lib/mongodb-mcp';

const INIT_SECRET = process.env.DB_INIT_SECRET;

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, message: 'Method not allowed' });
  }

  const secret = req.headers['x-init-secret'] || req.body?.secret;

  if (!INIT_SECRET) {
    return res.status(403).json({ success: false, message: 'DB_INIT_SECRET is not set on the server' });
  }

  if (!secret || secret !== INIT_SECRET) {
    return res.status(401).json({ success: false, message: 'Invalid or missing initialization secret' });
  }

  try {
    await initializeDatabase();
    return res.status(200).json({ success: true, message: 'Database initialized' });
  } catch (error: any) {
    console.error('Init DB error:', error);
    return res.status(500).json({ success: false, message: error?.message || 'Initialization failed' });
  }
}