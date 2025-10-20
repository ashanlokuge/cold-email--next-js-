import type { NextApiRequest, NextApiResponse } from 'next';
import { emailClient, mgmtClient, config as azureConfig } from '@/lib/azure';
import { sanitizeRecipients, personalizeContent, calculateHumanLikeDelay, sleep, isRetryable } from '@/lib/utils';
import type { Recipient, EmailDetail, TimezoneConfig } from '@/types';
import {
  updateCampaignStatus,
  resetCampaignStatus,
  getCampaignStatus,
  addEmailDetail,
  completeCampaign,
  createCampaignInstance,
  getCampaignInstance,
  updateCampaignInstance,
  canStartNewCampaign,
  addEmailDetailToCampaign,
  completeCampaignInstance,
  getRunningCampaignsForUser
} from '@/lib/multiCampaignManager';
import { getDb } from '@/lib/db';
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
}

async function fetchSenders() {
  const senders: Array<{ email: string; displayName: string }> = [];

  try {
    // Get all domains first
    const domains: string[] = [];

    try {
      for await (const domain of (mgmtClient as any).domains.listByEmailServiceResource(azureConfig.resourceGroup, azureConfig.emailServiceName)) {
        if (domain && domain.name) {
          domains.push(domain.name);
        }
      }
    } catch (domainError) {
      console.error('Error fetching domains:', domainError.message);
    }

    // If no domains found via API, use the configured domain
    if (domains.length === 0) {
      domains.push(azureConfig.emailDomain);
    }

    // Get senders from all domains with displayName
    for (const domainName of domains) {
      try {
        for await (const s of (mgmtClient as any).senderUsernames.listByDomains(azureConfig.resourceGroup, azureConfig.emailServiceName, domainName)) {
          if (s?.name) {
            senders.push({
              email: `${s.name}@${domainName}`,
              displayName: s.displayName || s.name || 'The Team'
            });
          }
        }
      } catch (domainError) {
        console.warn(`Failed to fetch senders for domain ${domainName}:`, domainError.message);
        // Continue with other domains even if one fails
      }
    }

    if (!senders.length) {
      throw new Error('No approved sender usernames found in any ACS domain');
    }

    return senders;
  } catch (error) {
    console.error('Error fetching domains, falling back to configured domain:', error.message);
    // Fallback to the original single-domain approach
    try {
      for await (const s of (mgmtClient as any).senderUsernames.listByDomains(azureConfig.resourceGroup, azureConfig.emailServiceName, azureConfig.emailDomain)) {
        if (s?.name) senders.push({
          email: `${s.name}@${azureConfig.emailDomain}`,
          displayName: s.displayName || s.name || 'The Team'
        });
      }
    } catch (fallbackError) {
      console.error('Fallback also failed:', fallbackError.message);
    }

    return senders;
  }
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Get user from JWT token
    const token = req.headers.authorization?.replace('Bearer ', '');
    let userId = 'anonymous';
    let userEmail = 'anonymous@example.com';

    console.log('🔐 Authorization header:', req.headers.authorization ? 'Present' : 'Missing');
    console.log('🔐 Token extracted:', token ? 'Yes' : 'No');

    if (token) {
      try {
        const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';
        const decoded = jwt.verify(token, JWT_SECRET) as any;
        console.log('🔓 Token decoded successfully:', decoded);
        userId = decoded.userId;
        userEmail = decoded.email || decoded.userEmail || 'unknown@example.com';
        console.log('✅ User authenticated:', userEmail, userId);
      } catch (err) {
        console.error('❌ Token verification failed:', err.message);
        console.warn('⚠️ Using anonymous user due to invalid token');
      }
    } else {
      console.warn('⚠️ No token provided, using anonymous user');
    }

    const { campaignName, subject, text, recipients: rawRecipients, selectedSenders, timezoneConfig } = req.body;

    if (!campaignName || !subject || !text || !rawRecipients) {
      return res.status(400).json({
        error: 'Campaign name, subject, text, and recipients are required'
      });
    }

    const recipients = sanitizeRecipients(rawRecipients);

    if (recipients.length === 0) {
      return res.status(400).json({
        error: 'No valid recipients found'
      });
    }

    // Log timezone configuration if provided
    if (timezoneConfig) {
      console.log('🌍 Timezone configuration:', timezoneConfig);
      console.log(`📍 Target timezone: ${timezoneConfig.targetTimezone}`);
      console.log(`🕐 Business hours: ${timezoneConfig.businessHourStart}:00 - ${timezoneConfig.businessHourEnd}:00`);
    }

    // Check if user can start a new campaign (limit concurrent campaigns)
    if (!canStartNewCampaign(userId, 5)) { // Max 5 concurrent campaigns per user
      const runningCampaigns = getRunningCampaignsForUser(userId);
      return res.status(409).json({
        error: `Maximum concurrent campaigns reached (${runningCampaigns.length}/5). Please wait for a campaign to complete or stop one.`,
        runningCampaigns: runningCampaigns.map(c => ({
          campaignId: c.campaignId,
          campaignName: c.campaignName,
          status: c.status,
          sent: c.sent,
          total: c.total
        }))
      });
    }

    // Get available senders
    const senders = await fetchSenders();

    if (senders.length === 0) {
      return res.status(500).json({
        error: 'No available senders found'
      });
    }

    // Create campaign in MongoDB using the new repository
    let campaignId: string | null = null;
    try {
      campaignId = await campaignRepository.createCampaign({
        userId,
        userEmail,
        campaignName,
        subject,
        body: text,
        totalRecipients: recipients.length,
        selectedSenders: selectedSenders || senders.slice(0, 3).map(s => s.email)
      });
      console.log('✅ Campaign created in MongoDB:', campaignId);
    } catch (dbError) {
      console.warn('Failed to create campaign in MongoDB:', dbError);
      // Continue anyway - campaign will run but won't be persisted
    }

    // Create new campaign instance
    const campaignInstance = createCampaignInstance(
      campaignId,
      campaignName,
      userId,
      userEmail,
      recipients.length
    );

    // Choose execution method based on campaign size
    const useChunkedExecution = recipients.length > 50; // Use chunks for campaigns > 50 emails

    if (useChunkedExecution) {
      console.log(`📦 Using chunked execution for large campaign (${recipients.length} emails)`);

      // Schedule chunks instead of direct execution
      setTimeout(async () => {
        try {
          const response = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/api/campaigns/schedule-chunks`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              campaignId,
              recipients,
              subject,
              text,
              senders,
              selectedSenders,
              timezoneConfig,
              chunkSize: Math.min(20, Math.max(5, Math.floor(recipients.length / 10))) // Dynamic chunk size
            })
          });

          if (!response.ok) {
            console.error('❌ Failed to schedule chunks:', await response.text());
            // Mark campaign as failed
            if (campaignId) {
              campaignRepository.updateCampaignProgress(campaignId, {
                status: 'stopped',
                endTime: new Date()
              }).catch(err => console.warn('Failed to update campaign status:', err));
            }
          } else {
            const result = await response.json();
            console.log('✅ Chunks scheduled successfully:', result);
          }
        } catch (error) {
          console.error('❌ Error scheduling chunks:', error);
          // Mark campaign as failed
          if (campaignId) {
            campaignRepository.updateCampaignProgress(campaignId, {
              status: 'stopped',
              endTime: new Date()
            }).catch(err => console.warn('Failed to update campaign status:', err));
          }
        }
      }, 1000); // Start scheduling after 1 second
    } else {
      console.log(`🚀 Using direct execution for small campaign (${recipients.length} emails)`);

      // Start sending emails asynchronously (non-blocking) for small campaigns
      sendEmailsAsync(campaignName, subject, text, recipients, senders, selectedSenders, campaignId, timezoneConfig)
        .catch(error => {
          console.error('❌ Campaign execution failed:', error);
          // Mark campaign as failed in DB
          if (campaignId) {
            campaignRepository.updateCampaignProgress(campaignId, {
              status: 'stopped',
              endTime: new Date()
            }).catch(err => console.warn('Failed to update campaign status:', err));
          }
        });
    }

    return res.status(200).json({
      success: true,
      message: 'Campaign started successfully',
      totalRecipients: recipients.length,
      campaignId
    });

  } catch (error) {
    console.error('Error starting campaign:', error);
    return res.status(500).json({
      error: 'Failed to start campaign'
    });
  }
}

async function sendEmailsAsync(
  campaignName: string,
  subject: string,
  text: string,
  recipients: Recipient[],
  senders: Array<{ email: string; displayName: string }>,
  selectedSenders?: string[],
  campaignId?: string | null,
  timezoneConfig?: TimezoneConfig | null
) {
  // Helper: fetch latest status from DB (serverless-safe)
  const fetchDbStatus = async (): Promise<'running' | 'paused' | 'stopped' | 'completed' | null> => {
    if (!campaignId) return null;
    try {
      const doc = await campaignRepository.getCampaignById(campaignId);
      return doc?.status || null;
    } catch (e) {
      console.warn('Failed to fetch campaign status from DB:', (e as any)?.message || e);
      return null;
    }
  };

  // Get campaign instance
  const getCurrentCampaign = () => getCampaignInstance(campaignId) || null;

  // Helper: sync in-memory status with DB if they diverge
  const syncStatusFromDb = async (): Promise<'running' | 'paused' | 'stopped' | 'completed' | null> => {
    const dbStatus = await fetchDbStatus();
    if (!dbStatus || !campaignId) return null;

    const local = getCurrentCampaign();
    if (local && dbStatus !== local.status) {
      if (dbStatus === 'paused') {
        updateCampaignInstance(campaignId, { status: 'paused', isRunning: false });
      } else if (dbStatus === 'running') {
        updateCampaignInstance(campaignId, { status: 'running', isRunning: true });
      } else if (dbStatus === 'stopped' || dbStatus === 'completed') {
        updateCampaignInstance(campaignId, {
          status: dbStatus,
          isRunning: false,
          completed: dbStatus === 'completed'
        });
      }
    }
    return dbStatus;
  };

  // Helper: wait with interruptible checks (pause/stop)
  const interruptibleSleep = async (ms: number): Promise<boolean> => {
    let remaining = ms;
    const step = 2000; // 2s granularity for responsiveness
    while (remaining > 0) {
      await sleep(Math.min(step, remaining));
      remaining -= step;

      // Check DB-driven status during wait
      const dbStatus = await syncStatusFromDb();
      const statusNow = getCurrentCampaign();

      if (!statusNow || statusNow.status === 'stopped' || statusNow.isRunning === false || dbStatus === 'stopped') {
        return false; // interrupted due to stop
      }

      // If paused, wait here until resumed or stopped
      while (statusNow.status === 'paused' || dbStatus === 'paused') {
        console.log('⏸️ Campaign paused during wait. Polling for resume...');
        await sleep(2000);
        await syncStatusFromDb();
        const updated = getCurrentCampaign();
        if (!updated || updated.status === 'stopped' || updated.isRunning === false) return false;
        if (updated.status === 'running') break; // resume
      }
    }
    return true; // completed wait without interruption
  };

  try {
    // Filter senders if specific ones are selected
    const availableSenders = selectedSenders && selectedSenders.length > 0
      ? senders.filter(sender => selectedSenders.includes(sender.email))
      : senders;

    if (availableSenders.length === 0) {
      throw new Error('No available senders after filtering');
    }

    // Campaign start logging (matching HTML/JS project)
    console.log(`\n🚀 Starting campaign "${campaignName}"`);
    console.log(`📧 Total emails to send: ${recipients.length}`);
    console.log(`👥 Available senders: ${availableSenders.length}`);
    console.log(`📋 Subject: "${subject}"`);

    // Log timezone information if configured
    if (timezoneConfig) {
      const tzStatus = getTimezoneStatusMessage(timezoneConfig);
      console.log(`🌍 Timezone: ${timezoneConfig.targetTimezone}`);
      console.log(`📍 Status: ${tzStatus}`);

      // Check if we need to wait for business hours
      if (timezoneConfig.respectBusinessHours && !isBusinessHours(timezoneConfig)) {
        const waitMs = getMillisecondsUntilBusinessHours(timezoneConfig);
        if (waitMs > 0) {
          const waitMinutes = Math.round(waitMs / 60000);
          console.log(`⏰ Waiting ${waitMinutes} minutes until business hours in ${timezoneConfig.targetTimezone}...`);
          await sleep(waitMs);
          console.log(`✅ Business hours started in ${timezoneConfig.targetTimezone}. Resuming campaign...`);
        }
      }
    }

    const stats = {
      successful: 0,
      failed: 0,
      sent: 0
    };

    const senderStats: Record<string, { sent: number; successful: number; failed: number; assigned: number }> = {};
    availableSenders.forEach(sender => {
      senderStats[sender.email] = { sent: 0, successful: 0, failed: 0, assigned: 0 };
    });

    // MEMORY-OPTIMIZED SENDER DISTRIBUTION
    // Use simple round-robin for large campaigns to prevent memory issues
    const useSimpleDistribution = recipients.length > 1000;

    let senderSequence: string[] = [];

    if (useSimpleDistribution) {
      console.log('📊 Using simple round-robin distribution for large campaign');
      senderSequence = recipients.map((_, i) => availableSenders[i % availableSenders.length].email);
    } else {
      console.log('📊 Using advanced distribution algorithm');

      // GROUP SENDERS BY DOMAIN FOR PERFECT DOMAIN DISTRIBUTION
      const sendersByDomain: Record<string, string[]> = {};
      const domainStats: Record<string, { senders: number; targetEmails: number; currentEmails: number }> = {};

      availableSenders.forEach(sender => {
        const domain = sender.email.split('@')[1];
        if (!sendersByDomain[domain]) {
          sendersByDomain[domain] = [];
          domainStats[domain] = { senders: 0, targetEmails: 0, currentEmails: 0 };
        }
        sendersByDomain[domain].push(sender.email);
        domainStats[domain].senders++;
      });

      const domains = Object.keys(sendersByDomain);

      // PRE-CALCULATE PERFECT DISTRIBUTION
      console.log(`\n🎯 Calculating perfect sender distribution for ${recipients.length} emails across ${availableSenders.length} senders in ${domains.length} domains...`);

      const baseEmailsPerSender = Math.floor(recipients.length / availableSenders.length);
      const remainderEmails = recipients.length % availableSenders.length;

      // Calculate domain distribution
      domains.forEach(domain => {
        const sendersInDomain = sendersByDomain[domain].length;
        domainStats[domain].targetEmails = sendersInDomain * baseEmailsPerSender;
      });

      // Distribute remainder emails across domains
      let remainderToDistribute = remainderEmails;
      domains.forEach(domain => {
        if (remainderToDistribute > 0) {
          const sendersInDomain = sendersByDomain[domain].length;
          const extraForDomain = Math.min(remainderToDistribute, sendersInDomain);
          domainStats[domain].targetEmails += extraForDomain;
          remainderToDistribute -= extraForDomain;
        }
      });

      // Create distribution plan
      const distributionPlan: Array<{
        sender: string;
        domain: string;
        targetCount: number;
        currentCount: number;
      }> = [];

      let remainderCounter = 0;

      for (let i = 0; i < availableSenders.length; i++) {
        const emailsForThisSender = baseEmailsPerSender + (remainderCounter < remainderEmails ? 1 : 0);
        distributionPlan.push({
          sender: availableSenders[i].email,
          domain: availableSenders[i].email.split('@')[1],
          targetCount: emailsForThisSender,
          currentCount: 0
        });
        remainderCounter++;
      }

      // Log the planned distribution by domain
      console.log(`📊 Planned Distribution by Domain:`);
      domains.forEach(domain => {
        const domainSenders = distributionPlan.filter(p => p.domain === domain);
        const domainTotal = domainSenders.reduce((sum, p) => sum + p.targetCount, 0);
        const domainPercentage = ((domainTotal / recipients.length) * 100).toFixed(1);

        console.log(`\n  🌐 ${domain}: ${domainTotal} emails (${domainPercentage}%)`);
        domainSenders.forEach(plan => {
          const senderPercentage = ((plan.targetCount / recipients.length) * 100).toFixed(1);
          console.log(`    ├── ${plan.sender}: ${plan.targetCount} emails (${senderPercentage}%)`);
        });
      });

      // CREATE EXACT SENDER SEQUENCE WITH ANTI-CONSECUTIVE LOGIC
      let currentSenderIndex = 0;

      for (let emailIndex = 0; emailIndex < recipients.length; emailIndex++) {
        let selectedSender: string | null = null;
        let attempts = 0;
        const lastSender = senderSequence.length > 0 ? senderSequence[senderSequence.length - 1] : null;

        // First pass: Try to find a sender that hasn't reached their target AND is different from last sender
        while (attempts < availableSenders.length) {
          const planIndex = currentSenderIndex % availableSenders.length;
          const plan = distributionPlan[planIndex];

          if (plan.currentCount < plan.targetCount) {
            // Check if this sender is different from the last sender (avoid consecutive)
            if (!lastSender || plan.sender !== lastSender) {
              selectedSender = plan.sender;
              plan.currentCount++;
              senderStats[plan.sender].assigned++;
              break;
            }
            // If it's the same as last sender, try next one (unless we're out of options)
          }

          currentSenderIndex++;
          attempts++;
        }

        // Second pass: If we couldn't find a different sender, allow same sender but log it
        if (!selectedSender) {
          attempts = 0;
          currentSenderIndex = 0; // Reset index for second pass

          while (attempts < availableSenders.length) {
            const planIndex = currentSenderIndex % availableSenders.length;
            const plan = distributionPlan[planIndex];

            if (plan.currentCount < plan.targetCount) {
              selectedSender = plan.sender;
              plan.currentCount++;
              senderStats[plan.sender].assigned++;

              // Log if we had to use the same sender consecutively
              if (lastSender && plan.sender === lastSender) {
                console.log(`⚠️ Using consecutive sender ${plan.sender} at position ${emailIndex} (no alternatives available)`);
              }
              break;
            }

            currentSenderIndex++;
            attempts++;
          }
        }

        // Final fallback: If all senders are at capacity, use round-robin
        if (!selectedSender) {
          selectedSender = availableSenders[emailIndex % availableSenders.length].email;
          senderStats[selectedSender].assigned++;
          console.log(`⚠️ Fallback to round-robin: ${selectedSender} at position ${emailIndex}`);
        }

        senderSequence.push(selectedSender);

        // Move to next sender for next iteration
        currentSenderIndex++;
      }
    }

    // VERIFY PERFECT DISTRIBUTION AND CHECK FOR CONSECUTIVE SENDS
    console.log(`\n✅ Sender sequence generated. Verification:`);
    const verification: Record<string, number> = {};
    let consecutiveCount = 0;
    const consecutivePairs: string[] = [];

    senderSequence.forEach((sender, index) => {
      verification[sender] = (verification[sender] || 0) + 1;

      // Check for consecutive sends from same sender
      if (index > 0 && senderSequence[index - 1] === sender) {
        consecutiveCount++;
        consecutivePairs.push(`${sender} at positions ${index - 1} and ${index}`);
      }
    });

    Object.entries(verification).forEach(([sender, count]) => {
      const percentage = ((count / recipients.length) * 100).toFixed(1);
      console.log(`  ${sender}: ${count} assigned (${percentage}%)`);
    });

    // Report consecutive sends analysis
    if (consecutiveCount > 0) {
      console.log(`\n⚠️ Consecutive sender analysis:`);
      console.log(`  Total consecutive sends: ${consecutiveCount}`);
      console.log(`  Consecutive pairs found:`);
      consecutivePairs.forEach(pair => console.log(`    - ${pair}`));
    } else {
      console.log(`\n✅ No consecutive sends detected - Perfect sender rotation!`);
    }

    // EXECUTE WITH GUARANTEED DISTRIBUTION (using pre-calculated sequence)
    for (let i = 0; i < recipients.length; i++) {
      // Serverless-safe: sync status from DB before each email
      const dbStatus = await syncStatusFromDb();
      const currentStatus = getCurrentCampaign();

      // Handle stop
      if (!currentStatus || currentStatus.status === 'stopped' || currentStatus.isRunning === false || dbStatus === 'stopped') {
        console.log(`⏹️ Campaign stopped by user at ${i}/${recipients.length} emails`);
        break;
      }

      // Handle pause: wait until resumed
      while (currentStatus.status === 'paused' || dbStatus === 'paused') {
        console.log(`⏸️ Campaign paused at ${i}/${recipients.length} emails. Waiting...`);
        await sleep(2000);
        const latestDb = await syncStatusFromDb();
        const newStatus = getCurrentCampaign();
        if (!newStatus || newStatus.status === 'stopped' || newStatus.isRunning === false || latestDb === 'stopped') {
          console.log(`⏹️ Campaign stopped while paused at ${i}/${recipients.length} emails`);
          break;
        }
        if (newStatus.status === 'running' || latestDb === 'running') {
          console.log(`▶️ Campaign resumed at ${i}/${recipients.length} emails`);
          break;
        }
      }

      // Double-check continuation after pause handling
      const finalStatus = getCurrentCampaign();
      if (finalStatus.status === 'stopped' || finalStatus.isRunning === false) {
        console.log(`⏹️ Campaign stopped after pause check at ${i}/${recipients.length} emails`);
        break;
      }

      const recipient = recipients[i];
      const senderEmail = senderSequence[i]; // Use pre-calculated sequence instead of simple round-robin

      // Get sender object to access displayName
      const senderObj = availableSenders.find(s => s.email === senderEmail);
      const senderDisplayName = senderObj?.displayName || 'The Team';

      // Track sender usage
      senderStats[senderEmail].sent++;

      // Check if this is a consecutive send for better logging
      const isConsecutive = i > 0 && senderSequence[i - 1] === senderEmail;
      const consecutiveWarning = isConsecutive ? " ⚠️ CONSECUTIVE" : "";
      console.log(`📤 ${i + 1}/${recipients.length} - Sending from: ${senderEmail} (${senderDisplayName}) [Sequence: ${i}]${consecutiveWarning}`);

      try {
        // Personalize content for each recipient with unique index and sender display name
        const personalizedSubject = personalizeContent(subject, recipient, i, senderEmail, senderDisplayName);
        const personalizedText = personalizeContent(text, recipient, i, senderEmail, senderDisplayName);

        // Create email message
        const emailMessage = {
          senderAddress: senderEmail,
          content: {
            subject: personalizedSubject,
            plainText: personalizedText,
          },
          recipients: {
            to: [
              {
                address: recipient.email,
                displayName: recipient.name || recipient.email
              }
            ]
          }
        };

        // Send email
        const result = await emailClient.beginSend(emailMessage);

        // Update statistics
        stats.sent++;
        stats.successful++;
        senderStats[senderEmail].successful++;

        // Add email detail for real-time tracking
        addEmailDetailToCampaign(campaignId, {
          timestamp: new Date().toISOString(),
          recipient: recipient.email,
          subject: subject,
          status: 'success',
          sender: senderEmail
        });

        // Persist email log to MongoDB if campaignId is present
        if (campaignId) {
          try {
            await campaignRepository.addEmailLog(campaignId, {
              email: recipient.email,
              name: recipient.name,
              status: 'sent',
              timestamp: new Date(),
              sender: senderEmail
            });
          } catch (err) {
            console.warn('Failed to persist email log:', err);
          }
        }

        // Console log matching HTML/JS project format
        console.log(`OK ${recipient.email} via ${senderEmail} (${senderDisplayName}) — status: 202 (${stats.sent}/${recipients.length})`);

        // Update campaign status in real-time
        updateCampaignInstance(campaignId, {
          sent: stats.sent,
          successful: stats.successful,
          failed: stats.failed
        });

        // Persist periodic totals to campaigns collection
        if (campaignId && (stats.sent % 10 === 0 || stats.sent === recipients.length)) {
          try {
            await campaignRepository.updateCampaignProgress(campaignId, {
              sentCount: stats.sent,
              successCount: stats.successful,
              failedCount: stats.failed
            });
          } catch (err) {
            console.warn('Failed to persist campaign totals:', err);
          }
        }

      } catch (error: any) {
        stats.sent++;
        stats.failed++;
        senderStats[senderEmail].failed++;

        // Add failed email detail
        addEmailDetailToCampaign(campaignId, {
          timestamp: new Date().toISOString(),
          recipient: recipient.email,
          subject: subject,
          status: 'failed',
          error: error.message || 'Unknown error',
          sender: senderEmail
        });

        // Persist failure to MongoDB
        if (campaignId) {
          try {
            await campaignRepository.addEmailLog(campaignId, {
              email: recipient.email,
              name: recipient.name,
              status: 'failed',
              timestamp: new Date(),
              error: error.message || 'Unknown error',
              sender: senderEmail
            });
          } catch (err) {
            console.warn('Failed to persist error log:', err);
          }
        }

        // Console log for failed emails
        console.log(`❌ FAILED ${recipient.email} via ${senderEmail} (${senderDisplayName}) — error: ${error.message} (${stats.sent}/${recipients.length})`);

        // Update campaign status
        updateCampaignInstance(campaignId, {
          sent: stats.sent,
          successful: stats.successful,
          failed: stats.failed
        });
      }

      // Human-like delay between emails
      if (i < recipients.length - 1) {
        // CHECK: Pause campaign if outside scheduled time/days
        if (timezoneConfig) {
          const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
          const currentDay = getCurrentDayInTimezone(timezoneConfig.targetTimezone);
          const currentHour = getCurrentHourInTimezone(timezoneConfig.targetTimezone);

          // Check if we should pause (wrong day or wrong time)
          while (!isSendingAllowedToday(timezoneConfig) || !isWithinSendingWindow(timezoneConfig)) {
            const pauseReason = !isSendingAllowedToday(timezoneConfig)
              ? `Today is ${dayNames[currentDay]} (not in selected days)`
              : `Current time is ${currentHour}:00 (outside ${timezoneConfig.sendTimeStart}:00-${timezoneConfig.sendTimeEnd}:00)`;

            console.log(`\n⏸️  CAMPAIGN PAUSED: ${pauseReason}`);
            console.log(`🕐 Target timezone: ${timezoneConfig.targetTimezone}`);
            console.log(`⏳ Waiting 5 minutes before checking again...`);

            updateCampaignStatus({
              status: 'paused',
              pauseReason: pauseReason
            });

            // Wait 5 minutes and check again
            await sleep(5 * 60 * 1000);

            // Re-check current time and day
            const newDay = getCurrentDayInTimezone(timezoneConfig.targetTimezone);
            const newHour = getCurrentHourInTimezone(timezoneConfig.targetTimezone);

            // If still outside window, continue loop
            if (isSendingAllowedToday(timezoneConfig) && isWithinSendingWindow(timezoneConfig)) {
              console.log(`\n✅ CAMPAIGN RESUMED: Now in scheduled window!`);
              console.log(`📅 Day: ${dayNames[newDay]}`);
              console.log(`🕐 Time: ${newHour}:00 (${timezoneConfig.targetTimezone})`);

              updateCampaignStatus({
                status: 'running',
                pauseReason: null
              });
              break;
            }
          }
        }

        const campaignStartTime = getCampaignStatus().startTime || Date.now();
        const delay = calculateHumanLikeDelay(i, stats.sent, recipients.length, senderEmail, campaignStartTime, timezoneConfig);

        // Update campaign status with delay info for UI
        const delaySeconds = Math.round(delay / 1000);
        updateCampaignStatus({
          nextEmailIn: delaySeconds,
          lastDelay: delay
        });

        console.log(`⏳ Waiting ${delaySeconds}s before next email (${delay}ms delay calculated)...`);

        // Interruptible wait so pause/stop take effect quickly
        const continued = await interruptibleSleep(delay);
        if (!continued) {
          console.log('⏹️ Campaign interrupted during wait (pause/stop).');
          break;
        }

        // Clear the countdown after delay
        updateCampaignStatus({
          nextEmailIn: null
        });
      }
    }

    // Campaign completion summary (matching HTML/JS project)
    const duration = Math.round((Date.now() - (getCampaignStatus().startTime || Date.now())) / 1000);
    console.log(`\n✅ Campaign "${campaignName}" completed!`);
    console.log(`📊 Final Results:`);
    console.log(`   Total Emails: ${recipients.length}`);
    console.log(`   Successfully Sent: ${stats.successful}`);
    console.log(`   Failed: ${stats.failed}`);
    console.log(`   Duration: ${duration}s`);
    console.log(`   Success Rate: ${((stats.successful / recipients.length) * 100).toFixed(1)}%`);

    // Mark campaign as completed
    completeCampaignInstance(campaignId);

    // Persist final campaign status
    if (campaignId) {
      try {
        await campaignRepository.updateCampaignProgress(campaignId, {
          status: 'completed',
          sentCount: stats.sent,
          successCount: stats.successful,
          failedCount: stats.failed,
          endTime: new Date()
        });
      } catch (err) {
        console.warn('Failed to persist final campaign status:', err);
      }
    }

  } catch (error) {
    console.error('Campaign execution error:', error);

    // Mark campaign as completed even if there was an error
    completeCampaign();
  }
}