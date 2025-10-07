import { MongoClient, Db } from 'mongodb';

const uri = process.env.MONGODB_URI;
const dbName = process.env.MONGODB_DB || 'coldemail';

let client: MongoClient | null = null;
let db: Db | null = null;

// MongoDB connection options
const options = {
  maxPoolSize: 10,
  serverSelectionTimeoutMS: 5000,
  socketTimeoutMS: 45000,
  family: 4
};

export async function connectDB(): Promise<Db> {
  try {
    if (!uri) {
      throw new Error('MONGODB_URI is not set. Set MONGODB_URI to your Atlas connection string in .env.local');
    }

    if (db && client) {
      // Test connection
      await client.db().admin().ping();
      return db;
    }
    console.log('🔄 Connecting to MongoDB...');
    client = new MongoClient(uri, options);
    await client.connect();
    
    // Test the connection
    await client.db().admin().ping();
    db = client.db(dbName);
    
    console.log('✅ MongoDB connected successfully');
    return db;
    
  } catch (error) {
    console.error('❌ MongoDB connection failed:', error);
    
    // Provide helpful connection guidance
    if (error.message.includes('ECONNREFUSED')) {
      console.log('\n📋 MongoDB Setup Options:');
      console.log('1. 🌐 MongoDB Atlas (Recommended):');
      console.log('   https://cloud.mongodb.com - Free tier available');
      console.log('2. 🐳 Docker: docker run -d -p 27017:27017 mongo');
      console.log('3. 🖥️  Local: Download from mongodb.com');
      console.log('\n💡 Set MONGODB_URI in .env.local with your connection string');
    }
    
    throw new Error(`MongoDB connection failed: ${error.message}`);
  }
}

export async function getDb(): Promise<Db> {
  return await connectDB();
}

// Graceful shutdown
export async function closeDB(): Promise<void> {
  if (client) {
    await client.close();
    client = null;
    db = null;
    console.log('🔌 MongoDB connection closed');
  }
}

// Health check function
export async function healthCheck(): Promise<boolean> {
  try {
    if (!client) return false;
    await client.db().admin().ping();
    return true;
  } catch {
    return false;
  }
}

// Initialize collections with indexes
export async function initializeCollections(): Promise<void> {
  try {
    const database = await connectDB();
    
    // Users collection with indexes
    const usersCollection = database.collection('users');
    await usersCollection.createIndex({ email: 1 }, { unique: true });
    await usersCollection.createIndex({ role: 1 });
    await usersCollection.createIndex({ isActive: 1 });
    
    // Email campaigns collection
    const campaignsCollection = database.collection('campaigns');
    await campaignsCollection.createIndex({ userId: 1 });
    await campaignsCollection.createIndex({ status: 1 });
    await campaignsCollection.createIndex({ createdAt: -1 });
    
    // Email templates collection
    const templatesCollection = database.collection('templates');
    await templatesCollection.createIndex({ userId: 1 });
    await templatesCollection.createIndex({ name: 1 });
    
    // Senders collection
    const sendersCollection = database.collection('senders');
    await sendersCollection.createIndex({ userId: 1 });
    await sendersCollection.createIndex({ email: 1 });
    
    console.log('🗃️  Collections and indexes initialized');
    
  } catch (error) {
    console.error('❌ Failed to initialize collections:', error);
    throw error;
  }
}
