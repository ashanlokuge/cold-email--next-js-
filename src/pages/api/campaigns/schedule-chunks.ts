import type { NextApiRequest, NextApiResponse } from 'next';
import { campaignRepository } from '@/lib/campaignRepository';
import type { Recipient, TimezoneConfig } from '@/types';

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
      chunkSize = 10 // Default chunk size
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

    // Schedule chunks with delays
    const scheduledChunks = [];

    for (let i = 0; i < chunks.length; i++) {
      const chunk = chunks[i];
      const delay = i * 60000; // 1 minute delay between chunks

      scheduledChunks.push({
        chunkIndex: chunk.chunkIndex,
        startIndex: chunk.startIndex,
        recipients: chunk.recipients,
        delay: delay,
        scheduledTime: new Date(Date.now() + delay)
      });

      // Schedule the chunk processing
      setTimeout(async () => {
        try {
          console.log(`⏰ Executing scheduled chunk ${chunk.chunkIndex + 1}/${chunks.length}`);

          const response = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/api/campaigns/process-chunk`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              campaignId,
              chunkIndex: chunk.chunkIndex,
              totalChunks: chunks.length,
              recipients: chunk.recipients,
              subject,
              text,
              senders,
              selectedSenders,
              timezoneConfig,
              startIndex: chunk.startIndex
            })
          });

          if (!response.ok) {
            console.error(`❌ Chunk ${chunk.chunkIndex + 1} failed:`, await response.text());
          } else {
            const result = await response.json();
            console.log(`✅ Chunk ${chunk.chunkIndex + 1} completed:`, result);
          }
        } catch (error) {
          console.error(`❌ Error executing chunk ${chunk.chunkIndex + 1}:`, error);
        }
      }, delay);
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
