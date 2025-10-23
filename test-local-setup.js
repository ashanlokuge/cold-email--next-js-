// Test script to verify local setup
require('dotenv').config({ path: '.env.local' });
require('ts-node').register({
  project: './tsconfig.json',
  transpileOnly: true
});
require('tsconfig-paths/register');

const { connectDB } = require('./src/lib/db');
const IORedis = require('ioredis');

async function testSetup() {
  console.log('🧪 Testing Local Development Setup');
  console.log('==================================');

  // Test 1: Environment Variables
  console.log('\n1️⃣  Testing Environment Variables...');
  const requiredEnvVars = [
    'MONGODB_URI',
    'JWT_SECRET',
    'COMMUNICATION_SERVICES_CONNECTION_STRING',
    'AZ_SUBSCRIPTION_ID',
    'AZ_RESOURCE_GROUP',
    'AZ_EMAIL_SERVICE_NAME',
    'AZ_EMAIL_DOMAIN',
    'REDIS_URL'
  ];

  let envVarsOk = true;
  for (const envVar of requiredEnvVars) {
    if (!process.env[envVar]) {
      console.log(`❌ Missing: ${envVar}`);
      envVarsOk = false;
    } else {
      console.log(`✅ Found: ${envVar}`);
    }
  }

  if (!envVarsOk) {
    console.log('\n❌ Environment variables test failed');
    console.log('Please check your .env.local file');
    return;
  }

  // Test 2: MongoDB Connection
  console.log('\n2️⃣  Testing MongoDB Connection...');
  try {
    const db = await connectDB();
    await db.admin().ping();
    console.log('✅ MongoDB connection successful');
  } catch (error) {
    console.log('❌ MongoDB connection failed:', error.message);
    console.log('Make sure MongoDB is running: mongod --dbpath ./data/db');
    return;
  }

  // Test 3: Redis Connection
  console.log('\n3️⃣  Testing Redis Connection...');
  try {
    const redis = new IORedis(process.env.REDIS_URL);
    await redis.ping();
    console.log('✅ Redis connection successful');
    await redis.quit();
  } catch (error) {
    console.log('❌ Redis connection failed:', error.message);
    console.log('Make sure Redis is running: redis-server');
    return;
  }

  // Test 4: BullMQ Queue
  console.log('\n4️⃣  Testing BullMQ Queue...');
  try {
    const { Queue } = require('bullmq');
    const IORedis = require('ioredis');
    
    // Use IORedis connection directly
    const redis = new IORedis(process.env.REDIS_URL);
    const queue = new Queue('testQueue', { connection: redis });
    
    // Add a test job
    await queue.add('test', { message: 'Hello World' });
    console.log('✅ BullMQ queue test successful');
    
    // Clean up
    await queue.close();
    await redis.quit();
  } catch (error) {
    console.log('❌ BullMQ queue test failed:', error.message);
    return;
  }

  console.log('\n🎉 All tests passed! Your local setup is ready.');
  console.log('\nNext steps:');
  console.log('1. Start the main app: npm run dev');
  console.log('2. Start the worker: npm run worker');
  console.log('3. Open http://localhost:3000');
}

testSetup().catch(console.error);
