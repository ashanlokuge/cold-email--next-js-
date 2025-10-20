import type { NextApiRequest, NextApiResponse } from 'next';
import { emailClient, mgmtClient, config as azureConfig } from '@/lib/azure';
import { sanitizeRecipients, personalizeContent, calculateHumanLikeDelay, sleep, isRetryable } from '@/lib/utils';
import type { Recipient, EmailDetail, TimezoneConfig } from '@/types';
import { campaignRepository } from '@/lib/campaignRepository';
import {
  getTimezoneStatusMessage,
  isBusinessHours,
  getMillisecondsUntilBusinessHours,
  isSendingAllowedToday,
  isWithinSendingWindow,
  getCurrentHourInTimezone,
  getCurrentDayInTimezone
} from '@/lib/timezoneConfig';
import jwt from 'jsonwebtoken';

// API route configuration
export const config = {
  api: {
    bodyParser: {
      sizeLimit: '10mb',
    },
  },
};

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
      chunkIndex,
      totalChunks,
      recipients,
      subject,
      text,
      senders,
      selectedSenders,
      timezoneConfig,
      startIndex
    } = req.body;

    if (!campaignId || !recipients || !Array.isArray(recipients)) {
      return res.status(400).json({
        error: 'Missing required fields: campaignId, recipients'
      });
    }

    console.log(`🚀 Processing chunk ${chunkIndex + 1}/${totalChunks} for campaign ${campaignId}`);
    console.log(`📧 Chunk contains ${recipients.length} recipients (starting from index ${startIndex})`);

    // Filter senders if specific ones are selected
    const availableSenders = selectedSenders && selectedSenders.length > 0
      ? senders.filter(sender => selectedSenders.includes(sender.email))
      : senders;

    if (availableSenders.length === 0) {
      return res.status(500).json({
        error: 'No available senders found'
      });
    }

    // Process this chunk of emails
    const results = await processEmailChunk(
      campaignId,
      recipients,
      subject,
      text,
      availableSenders,
      timezoneConfig,
      startIndex
    );

    // Update campaign progress in database
    await campaignRepository.updateCampaignProgress(campaignId, {
      sentCount: results.sent,
      successCount: results.successful,
      failedCount: results.failed,
      status: results.completed ? 'completed' : 'running'
    });

    console.log(`✅ Chunk ${chunkIndex + 1}/${totalChunks} completed: ${results.sent} emails processed`);

    return res.status(200).json({
      success: true,
      message: `Chunk ${chunkIndex + 1}/${totalChunks} processed successfully`,
      results,
      completed: results.completed
    });

  } catch (error) {
    console.error('Error processing chunk:', error);
    return res.status(500).json({
      error: 'Failed to process chunk'
    });
  }
}

async function processEmailChunk(
  campaignId: string,
  recipients: Recipient[],
  subject: string,
  text: string,
  availableSenders: Array<{ email: string; displayName: string }>,
  timezoneConfig: TimezoneConfig | null,
  startIndex: number
) {
  const stats = {
    sent: 0,
    successful: 0,
    failed: 0
  };

  // Simple round-robin sender distribution for chunks
  let senderIndex = 0;

  for (let i = 0; i < recipients.length; i++) {
    const recipient = recipients[i];
    const senderEmail = availableSenders[senderIndex % availableSenders.length].email;
    const senderDisplayName = availableSenders[senderIndex % availableSenders.length].displayName;
    senderIndex++;

    try {
      // Check timezone constraints
      if (timezoneConfig) {
        if (!isSendingAllowedToday(timezoneConfig) || !isWithinSendingWindow(timezoneConfig)) {
          console.log(`⏸️ Skipping email due to timezone constraints`);
          continue;
        }
      }

  // Personalize content (personalizeContent signature: content, recipient, recipientIndex?, senderEmail?, senderDisplayName?)
  const personalizedSubject = personalizeContent(subject, recipient, 0, senderEmail, senderDisplayName);
  const personalizedText = personalizeContent(text, recipient, 0, senderEmail, senderDisplayName);

      // Create email message
      const emailMessage = {
        senderAddress: senderEmail,
        senderDisplayName: senderDisplayName,
        recipients: [{
          address: recipient.email,
          displayName: recipient.name || recipient.email.split('@')[0]
        }],
        content: {
          subject: personalizedSubject,
          plainText: personalizedText,
          html: personalizedText.replace(/\n/g, '<br>')
        }
      };

  // Send email (cast to any to avoid strict SDK type mismatch in serverless environment)
  const result = await (emailClient as any).beginSend(emailMessage as any);

      // Update statistics
      stats.sent++;
      stats.successful++;

      // Log email to database
      await campaignRepository.addEmailLog(campaignId, {
        email: recipient.email,
        name: recipient.name,
        status: 'sent',
        timestamp: new Date(),
        sender: senderEmail
      });

      console.log(`OK ${recipient.email} via ${senderEmail} (${senderDisplayName}) — status: 202 (${stats.sent}/${recipients.length})`);

    } catch (error: any) {
      stats.sent++;
      stats.failed++;

      // Log failed email to database
      await campaignRepository.addEmailLog(campaignId, {
        email: recipient.email,
        name: recipient.name,
        status: 'failed',
        timestamp: new Date(),
        error: error.message || 'Unknown error',
        sender: senderEmail
      });

      console.log(`❌ FAILED ${recipient.email} via ${senderEmail} (${senderDisplayName}) — error: ${error.message}`);
    }

    // Human-like delay between emails (shorter for chunks)
    if (i < recipients.length - 1) {
      const delay = Math.min(calculateHumanLikeDelay(i, stats.sent, recipients.length, senderEmail, Date.now(), timezoneConfig), 30000); // Max 30s delay
      await sleep(delay);
    }
  }

  return {
    ...stats,
    completed: stats.sent === recipients.length
  };
}
