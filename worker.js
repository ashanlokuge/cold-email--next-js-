require('ts-node/register');
require('tsconfig-paths/register');

const { Worker, QueueEvents } = require('bullmq');

// Redis connection from Railway env varss
const connection = {
  host: process.env.REDIS_HOST,
  port: Number(process.env.REDIS_PORT || '6379'),
  password: process.env.REDIS_PASSWORD
};

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


