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

// Redis connection from Railway env vars - use REDIS_URL
const REDIS_URL = process.env.REDIS_URL;

if (!REDIS_URL) {
  console.error('❌ REDIS_URL environment variable is missing');
  process.exit(1);
}

const connection = REDIS_URL;

async function main() {
  // Lazy import TS module after ts-node/register
  const { processEmailCampaign } = require('./src/lib/campaignWorker.ts');

  const queueName = 'emailCampaignQueue';

  const worker = new Worker(queueName, async (job) => {
    console.log(`👷 Worker received job ${job.id} in ${queueName}`);
    await processEmailCampaign(job.data);
  }, { connection });

  const events = new QueueEvents(queueName, { connection });

  events.on('completed', ({ jobId }) => {
    console.log(`✅ Job ${jobId} completed`);
  });
  events.on('failed', ({ jobId, failedReason }) => {
    console.error(`❌ Job ${jobId} failed: ${failedReason}`);
  });

  const shutdown = async () => {
    console.log('Shutting down worker...');
    await worker.close();
    await events.close();
    process.exit(0);
  };
  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
}

main().catch((err) => {
  console.error('Worker fatal error:', err);
  process.exit(1);
});


