import { MongoClient } from 'mongodb';

const uri = process.env.MONGODB_URI || '';
let client: MongoClient | null = null;
let clientPromise: Promise<MongoClient> | null = null;

if (!uri) {
  console.warn('MONGODB_URI not set - MongoDB disabled');
}

if (!clientPromise && uri) {
  client = new MongoClient(uri);
  clientPromise = client.connect();
}

export async function getDb() {
  if (!clientPromise) throw new Error('MongoDB not configured');
  const client = await clientPromise!;
  return client.db(process.env.MONGODB_DB || 'coldemail');
}
