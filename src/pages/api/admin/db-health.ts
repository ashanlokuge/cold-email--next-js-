import type { NextApiRequest, NextApiResponse } from 'next';
import { checkDatabaseHealth } from '../../../../src/lib/mongodb-mcp';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const status = await checkDatabaseHealth();
    res.status(200).json(status);
  } catch (error: any) {
    res.status(500).json({ connected: false, database: '', collections: [], error: error?.message });
  }
}