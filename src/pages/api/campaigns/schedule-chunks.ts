import type { NextApiRequest, NextApiResponse } from 'next';
import { campaignRepository } from '@/lib/campaignRepository';
import type { Recipient, TimezoneConfig } from '@/types';
import { connectDB } from '@/lib/db';

const JOB_QUEUE_COLLECTION = 'jobQueue';

interface Job {
  campaignId: string;
  jobType: 'process-chunk';
  scheduledTime: Date;
  payload: {
    chunkIndex: number;
    totalChunks: number;
    recipients: Recipient[];
    subject: string;
    text: string;
    senders: any[];
    selectedSenders: any[];
    timezoneConfig: TimezoneConfig;
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
    const {
      campaignId,
      recipients,
      subject,
      text,
      senders,
      selectedSenders,
      timezoneConfig,
      chunkSize = 10 // Default chunk sizeut
    } = req.body;

    if (!campaignId || !recipients || !Array.isArray(recipients)) {
      return res.status(400).json({
        error: 'Missing required fields: campaignId, recipients'
      });
    }

    console.log(`📅 Scheduling chunks for campaign ${campaignId}`);
    console.log(`📊 Total recipients: ${recipients.length}, Chunk size: ${chunkSize}`);

    // Calculate chunks
    const chunks = [];
    for (let i = 0; i < recipients.length; i += chunkSize) {
      const chunkRecipients = recipients.slice(i, i + chunkSize);
      chunks.push({
        chunkIndex: Math.floor(i / chunkSize),
        startIndex: i,
        recipients: chunkRecipients
      });
    }

    console.log(`📦 Created ${chunks.length} chunks`);

    // Optional scheduled start time (ISO string) - if provided, compute initial delay until that time
    let initialDelay = 0;
    if (req.body.scheduledStart) {
      const scheduledStartTime = new Date(req.body.scheduledStart).getTime();
      if (!isNaN(scheduledStartTime)) {
        initialDelay = Math.max(0, scheduledStartTime - Date.now());
        console.log(`⏱️ Scheduled start provided: ${req.body.scheduledStart} (initial delay ${Math.round(initialDelay/1000)}s)`);
      } else {
        console.warn('⚠️ Invalid scheduledStart provided; ignoring.');
      }
    }

    // Schedule chunks by storing jobs in database queue
    const db = await connectDB();
    const scheduledChunks = [];

    for (let i = 0; i < chunks.length; i++) {
      const chunk = chunks[i];
      // Per-chunk offset (1 minute between chunks) plus initialDelay
      const delay = initialDelay + i * 60000; // 1 minute delay between chunks
      const scheduledTime = new Date(Date.now() + delay);

      const job: Job = {
        campaignId,
        jobType: 'process-chunk',
        scheduledTime,
        payload: {
          chunkIndex: chunk.chunkIndex,
          totalChunks: chunks.length,
          recipients: chunk.recipients,
          subject,
          text,
          senders,
          selectedSenders,
          timezoneConfig,
          startIndex: chunk.startIndex
        },
        status: 'pending',
        createdAt: new Date(),
        updatedAt: new Date(),
        retryCount: 0,
        maxRetries: 3
      };

      await db.collection(JOB_QUEUE_COLLECTION).insertOne(job);

      scheduledChunks.push({
        chunkIndex: chunk.chunkIndex,
        startIndex: chunk.startIndex,
        recipients: chunk.recipients,
        delay: delay,
        scheduledTime
      });
    }

    // Update campaign status
    await campaignRepository.updateCampaignProgress(campaignId, ({
      status: 'running',
      totalChunks: chunks.length,
      completedChunks: 0
    } as any));

    console.log(`✅ Scheduled ${chunks.length} chunks for campaign ${campaignId}`);

    return res.status(200).json({
      success: true,
      message: 'Campaign chunks scheduled successfully',
      totalChunks: chunks.length,
      chunkSize,
      estimatedDuration: `${Math.ceil(chunks.length)} minutes`,
      scheduledChunks: scheduledChunks.map(sc => ({
        chunkIndex: sc.chunkIndex,
        delay: sc.delay,
        scheduledTime: sc.scheduledTime
      }))
    });

  } catch (error) {
    console.error('Error scheduling chunks:', error);
    return res.status(500).json({
      error: 'Failed to schedule chunks'
    });
  }
}
