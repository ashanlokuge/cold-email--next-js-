import type { NextApiRequest, NextApiResponse } from 'next';
import { connectDB } from '@/lib/db';
import { ObjectId } from 'mongodb';

const JOB_QUEUE_COLLECTION = 'jobQueue';

interface Job {
  _id: ObjectId;
  campaignId: string;
  jobType: 'process-chunk';
  scheduledTime: Date;
  payload: {
    chunkIndex: number;
    totalChunks: number;
    recipients: any[];
    subject: string;
    text: string;
    senders: any[];
    selectedSenders: any[];
    timezoneConfig: any;
    startIndex: number;
  };
  status: 'pending' | 'processing' | 'completed' | 'failed';
  createdAt: Date;
  updatedAt: Date;
  retryCount: number;
  maxRetries: number;
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const db = await connectDB();
    const now = new Date();

    // Find pending jobs that are due
    const dueJobs = await db.collection(JOB_QUEUE_COLLECTION)
      .find({
        status: 'pending',
        scheduledTime: { $lte: now }
      })
      .sort({ scheduledTime: 1 })
      .limit(10) // Process up to 10 jobs at a time
      .toArray() as unknown as Job[];

    if (dueJobs.length === 0) {
      return res.status(200).json({
        success: true,
        message: 'No jobs to process',
        processed: 0
      });
    }

    console.log(`📋 Processing ${dueJobs.length} jobs`);

    let processed = 0;
    let successful = 0;
    let failed = 0;

    for (const job of dueJobs) {
      try {
        // Mark job as processing
        await db.collection(JOB_QUEUE_COLLECTION).updateOne(
          { _id: job._id },
          {
            $set: {
              status: 'processing',
              updatedAt: new Date()
            }
          }
        );

        // Process the job based on type
        if (job.jobType === 'process-chunk') {
          const response = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/api/campaigns/process-chunk`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              campaignId: job.campaignId,
              ...job.payload
            })
          });

          if (response.ok) {
            // Mark job as completed
            await db.collection(JOB_QUEUE_COLLECTION).updateOne(
              { _id: job._id },
              {
                $set: {
                  status: 'completed',
                  updatedAt: new Date()
                }
              }
            );
            successful++;
            console.log(`✅ Job ${job._id} completed`);
          } else {
            const errorText = await response.text();
            console.error(`❌ Job ${job._id} failed:`, errorText);

            // Check if we should retry
            if (job.retryCount < job.maxRetries) {
              // Reschedule for retry in 5 minutes
              const retryTime = new Date(now.getTime() + 5 * 60 * 1000);
              await db.collection(JOB_QUEUE_COLLECTION).updateOne(
                { _id: job._id },
                {
                  $set: {
                    status: 'pending',
                    scheduledTime: retryTime,
                    retryCount: job.retryCount + 1,
                    updatedAt: new Date()
                  }
                }
              );
              console.log(`🔄 Job ${job._id} rescheduled for retry`);
            } else {
              // Mark as failed
              await db.collection(JOB_QUEUE_COLLECTION).updateOne(
                { _id: job._id },
                {
                  $set: {
                    status: 'failed',
                    updatedAt: new Date()
                  }
                }
              );
              failed++;
            }
          }
        }

        processed++;
      } catch (error) {
        console.error(`❌ Error processing job ${job._id}:`, error);

        // Mark job as failed
        await db.collection(JOB_QUEUE_COLLECTION).updateOne(
          { _id: job._id },
          {
            $set: {
              status: 'failed',
              updatedAt: new Date()
            }
          }
        );
        failed++;
      }
    }

    return res.status(200).json({
      success: true,
      message: `Processed ${processed} jobs`,
      processed,
      successful,
      failed
    });

  } catch (error) {
    console.error('Error processing job queue:', error);
    return res.status(500).json({
      error: 'Failed to process job queue'
    });
  }
}