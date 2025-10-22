// CommonJS version of campaign worker to avoid import issues
const { emailClient, mgmtClient, config: azureConfig } = require('@/lib/azure');
const { sanitizeRecipients, personalizeContent, calculateHumanLikeDelay, sleep } = require('@/lib/utils');
const {
  createCampaignInstance,
  getCampaignInstance,
  updateCampaignInstance,
  completeCampaignInstance
} = require('@/lib/multiCampaignManager');
const { campaignRepository } = require('@/lib/campaignRepository');
const {
  getTimezoneStatusMessage,
  isBusinessHours,
  getMillisecondsUntilBusinessHours,
  isSendingAllowedToday,
  isWithinSendingWindow,
  getCurrentHourInTimezone,
  getCurrentDayInTimezone
} = require('@/lib/timezoneConfig');

interface CampaignJobData {
  campaignId?: string | null;
  campaignName: string;
  subject: string;
  text: string;
  recipients: any[];
  selectedSenders?: string[];
  timezoneConfig?: any;
  userId: string;
  userEmail: string;
}

async function fetchSenders(): Promise<Array<{ email: string; displayName: string }>> {
  const senders: Array<{ email: string; displayName: string }> = [];
  try {
    const domains: string[] = [];
    try {
      for await (const domain of (mgmtClient as any).domains.listByEmailServiceResource(azureConfig.resourceGroup, azureConfig.emailServiceName)) {
        if (domain && domain.name) domains.push(domain.name);
      }
    } catch (err: any) {
      console.error('Error fetching domains:', err?.message || err);
    }
    if (domains.length === 0) domains.push(azureConfig.emailDomain);
    for (const domainName of domains) {
      try {
        for await (const s of (mgmtClient as any).senderUsernames.listByDomains(azureConfig.resourceGroup, azureConfig.emailServiceName, domainName)) {
          if (s?.name) {
            senders.push({ email: `${s.name}@${domainName}`, displayName: s.displayName || s.name || 'The Team' });
          }
        }
      } catch (domainError: any) {
        console.warn(`Failed to fetch senders for domain ${domainName}:`, domainError?.message || domainError);
      }
    }
    if (!senders.length) throw new Error('No approved sender usernames found');
    return senders;
  } catch (error: any) {
    console.error('Error fetching domains, falling back:', error?.message || error);
    try {
      for await (const s of (mgmtClient as any).senderUsernames.listByDomains(azureConfig.resourceGroup, azureConfig.emailServiceName, azureConfig.emailDomain)) {
        if (s?.name) senders.push({ email: `${s.name}@${azureConfig.emailDomain}`, displayName: s.displayName || s.name || 'The Team' });
      }
    } catch (fallbackError: any) {
      console.error('Fallback also failed:', fallbackError?.message || fallbackError);
    }
    return senders;
  }
}

export async function processEmailCampaign(jobData: CampaignJobData): Promise<void> {
  const {
    campaignId: inputCampaignId,
    campaignName,
    subject,
    text,
    recipients: rawRecipients,
    selectedSenders,
    timezoneConfig,
    userId,
    userEmail
  } = jobData;

  console.log(`🚀 Processing campaign: ${campaignName} for user: ${userEmail}`);

  const recipients = sanitizeRecipients(rawRecipients);
  if (recipients.length === 0) {
    console.warn('No valid recipients provided. Aborting campaign.');
    return;
  }

  // Ensure campaign exists
  let campaignId: string | null = inputCampaignId || null;
  if (!campaignId) {
    try {
      campaignId = await campaignRepository.createCampaign({
        userId,
        userEmail,
        campaignName,
        subject,
        body: text,
        totalRecipients: recipients.length,
        selectedSenders: selectedSenders
      });
      console.log('✅ Campaign created in MongoDB by worker:', campaignId);
    } catch (e) {
      console.warn('Worker failed to create campaign in MongoDB:', (e as any)?.message || e);
    }
  }

  // Create in-memory instance
  createCampaignInstance(campaignId, campaignName, userId, userEmail, recipients.length);

  const senders = await fetchSenders();
  const availableSenders = (selectedSenders && selectedSenders.length > 0)
    ? senders.filter(s => selectedSenders.includes(s.email))
    : senders;
  if (availableSenders.length === 0) throw new Error('No available senders');

  // Timezone pre-wait
  if (timezoneConfig) {
    console.log('🌍 Timezone configuration:', timezoneConfig);
    if (timezoneConfig.respectBusinessHours && !isBusinessHours(timezoneConfig)) {
      const waitMs = getMillisecondsUntilBusinessHours(timezoneConfig);
      if (waitMs > 0) {
        console.log(`⏰ Waiting ${Math.round(waitMs / 60000)} minutes until business hours...`);
        await sleep(waitMs);
      }
    }
  }

  const stats = { successful: 0, failed: 0, sent: 0 };
  const senderStats: Record<string, { sent: number; successful: number; failed: number; assigned: number }> = {};
  availableSenders.forEach(s => senderStats[s.email] = { sent: 0, successful: 0, failed: 0, assigned: 0 });

  // Simple distribution for worker (round-robin)
  const senderSequence = recipients.map((_, i) => availableSenders[i % availableSenders.length].email);

  console.log(`🚀 Worker started campaign "${campaignName}" with ${recipients.length} emails`);

  for (let i = 0; i < recipients.length; i++) {
    const recipient = recipients[i];
    const senderEmail = senderSequence[i];
    const senderObj = availableSenders.find(s => s.email === senderEmail);
    const senderDisplayName = senderObj?.displayName || 'The Team';
    senderStats[senderEmail].sent++;

    try {
      const personalizedSubject = personalizeContent(subject, recipient, i, senderEmail, senderDisplayName);
      const personalizedText = personalizeContent(text, recipient, i, senderEmail, senderDisplayName);
      const emailMessage = {
        senderAddress: senderEmail,
        content: { subject: personalizedSubject, plainText: personalizedText },
        recipients: { to: [{ address: recipient.email, displayName: recipient.name || recipient.email }] }
      };

      const sendOperation = await (emailClient as any).beginSend(emailMessage as any);
      let sendResult: any = sendOperation;
      try {
        if (sendOperation && typeof sendOperation.pollUntilDone === 'function') {
          sendResult = await sendOperation.pollUntilDone();
        }
      } catch (pollErr) {
        console.warn('Warning: polling send operation failed:', (pollErr as any)?.message || pollErr);
      }
      const messageId = sendResult?.messageId || sendResult?.operationId || null;

      stats.sent++; stats.successful++; senderStats[senderEmail].successful++;
      if (campaignId) {
        try {
          await campaignRepository.addEmailLog(campaignId, {
            email: recipient.email,
            name: recipient.name,
            status: 'sent',
            timestamp: new Date(),
            sender: senderEmail,
            messageId: messageId || undefined
          });
        } catch (err) { console.warn('Failed to persist email log:', err); }
      }

      await updateCampaignInstance(campaignId, { sent: stats.sent, successful: stats.successful, failed: stats.failed });

    } catch (error: any) {
      stats.sent++; stats.failed++; senderStats[senderEmail].failed++;
      if (campaignId) {
        try {
          await campaignRepository.addEmailLog(campaignId, {
            email: recipient.email,
            name: recipient.name,
            status: 'failed',
            timestamp: new Date(),
            error: error?.message || 'Unknown error',
            sender: senderEmail
          });
        } catch (err) { console.warn('Failed to persist error log:', err); }
      }
      await updateCampaignInstance(campaignId, { sent: stats.sent, successful: stats.successful, failed: stats.failed });
    }

    if (i < recipients.length - 1) {
      if (timezoneConfig) {
        const currentDay = getCurrentDayInTimezone(timezoneConfig.targetTimezone);
        const currentHour = getCurrentHourInTimezone(timezoneConfig.targetTimezone);
        if (!isSendingAllowedToday(timezoneConfig) || !isWithinSendingWindow(timezoneConfig)) {
          console.log(`⏸️ Outside scheduled window (${currentDay} ${currentHour}:00). Skipping delay for this email.`);
          continue;
        }
      }
      let campaignStartTime = Date.now();
      try {
        const instance = await getCampaignInstance(campaignId);
        if (instance && instance.startTime) campaignStartTime = instance.startTime as number;
      } catch { }
      const delay = calculateHumanLikeDelay(i, stats.sent, recipients.length, senderEmail, campaignStartTime, timezoneConfig || null);
      await updateCampaignInstance(campaignId, { nextEmailIn: Math.round(delay / 1000), lastDelay: delay });
      await sleep(delay);
      await updateCampaignInstance(campaignId, { nextEmailIn: null });
    }
  }

  await completeCampaignInstance(campaignId);
  if (campaignId) {
    try {
      await campaignRepository.updateCampaignProgress(campaignId, {
        status: 'completed',
        sentCount: stats.sent,
        successCount: stats.successful,
        failedCount: stats.failed,
        endTime: new Date()
      });
    } catch (err) { console.warn('Failed to persist final campaign status:', err); }
  }
}
