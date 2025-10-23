// Load environment variables first
require('dotenv').config({ path: '.env.local' });

// Configure ts-node before requiring any TypeScript files
require('ts-node').register({
  project: './tsconfig.worker.json',
  transpileOnly: true,
  compilerOptions: {
    module: 'commonjs',
    target: 'es2017',
    moduleResolution: 'node',
    esModuleInterop: true,
    allowSyntheticDefaultImports: true,
    strict: false,
    skipLibCheck: true,
    forceConsistentCasingInFileNames: true,
    resolveJsonModule: true,
    isolatedModules: false,
    noEmit: true
  }
});

require('tsconfig-paths/register');

const { Worker, QueueEvents } = require('bullmq');
const IORedis = require('ioredis');

// Redis connection from Railway env vars - use REDIS_URL
const REDIS_URL = process.env.REDIS_URL || process.env.REDIS_PUBLIC_URL;

if (!REDIS_URL) {
  console.error('❌ REDIS_URL environment variable is missing');
  console.error('Available env vars:', Object.keys(process.env).filter(k => k.includes('REDIS')));
  process.exit(1);
}

// Create IORedis connection with BullMQ-compatible options
const connection = new IORedis(REDIS_URL, {
  maxRetriesPerRequest: null,
  enableReadyCheck: false,
  maxLoadingTimeout: 1000
});

async function main() {
  console.log('🚀 Starting BullMQ Worker...');
  console.log('📡 Redis URL configured:', REDIS_URL ? 'Yes' : 'No');

  try {
    // Lazy import TS module after ts-node/register
    const { processEmailCampaign } = require('./src/lib/campaignWorkerCommonJS.ts');
    console.log('✅ Campaign worker module loaded successfully');

    const queueName = 'emailCampaignQueue';

    const worker = new Worker(queueName, async (job) => {
      console.log(`👷 Worker received job ${job.id} in ${queueName}`);
      try {
        await processEmailCampaign(job.data);
        console.log(`✅ Job ${job.id} completed successfully`);
      } catch (error) {
        console.error(`❌ Job ${job.id} failed:`, error);
        throw error; // Re-throw to mark job as failed
      }
    }, { 
      connection,
      concurrency: 1 // Process one job at a time
    });

    const events = new QueueEvents(queueName, { connection });

    events.on('completed', ({ jobId }) => {
      console.log(`✅ Job ${jobId} completed`);
    });
    
    events.on('failed', ({ jobId, failedReason }) => {
      console.error(`❌ Job ${jobId} failed: ${failedReason}`);
    });

    events.on('waiting', ({ jobId }) => {
      console.log(`⏳ Job ${jobId} waiting`);
    });

    events.on('active', ({ jobId }) => {
      console.log(`🔄 Job ${jobId} active`);
    });

    console.log('🎯 Worker is ready and listening for jobs...');

    const shutdown = async () => {
      console.log('🛑 Shutting down worker...');
      await worker.close();
      await events.close();
      process.exit(0);
    };
    
    process.on('SIGINT', shutdown);
    process.on('SIGTERM', shutdown);

  } catch (error) {
    console.error('❌ Failed to initialize worker:', error);
    process.exit(1);
  }
}

main().catch((err) => {
  console.error('Worker fatal error:', err);
  process.exit(1);
});
