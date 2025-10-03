import type { NextApiRequest, NextApiResponse } from 'next';
import { emailClient, mgmtClient, config as azureConfig } from '@/lib/azure';
import { sanitizeRecipients, personalizeContent, calculateHumanLikeDelay, sleep, isRetryable } from '@/lib/utils';
import type { Recipient, EmailDetail } from '@/types';
import { 
  updateCampaignStatus, 
  resetCampaignStatus, 
  getCampaignStatus,
  addEmailDetail,
  completeCampaign
} from '@/lib/campaignState';

// API route configuration
export const config = {
  api: {
    bodyParser: {
      sizeLimit: '10mb',
    },
  },
}

async function fetchSenders() {
  const senders: string[] = [];

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

    // Get senders from all domains (exactly like HTML/JS project)
    for (const domainName of domains) {
      try {
        for await (const s of (mgmtClient as any).senderUsernames.listByDomains(azureConfig.resourceGroup, azureConfig.emailServiceName, domainName)) {
          if (s?.name) {
            senders.push(`${s.name}@${domainName}`);
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
        if (s?.name) senders.push(`${s.name}@${azureConfig.emailDomain}`);
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
    const { campaignName, subject, text, recipients: rawRecipients, selectedSenders } = req.body;

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

    // Check if campaign is already running
    const currentStatus = getCampaignStatus();
    if (currentStatus.isRunning) {
      return res.status(409).json({ 
        error: 'A campaign is already running' 
      });
    }

    // Get available senders
    const senders = await fetchSenders();
    
    if (senders.length === 0) {
      return res.status(500).json({ 
        error: 'No available senders found' 
      });
    }

    // Initialize campaign status
    resetCampaignStatus();
    updateCampaignStatus({
      isRunning: true,
      campaignName,
      sent: 0,
      successful: 0,
      failed: 0,
      total: recipients.length,
      completed: false,
      startTime: Date.now(),
      status: 'running'
    });

    // Start sending emails asynchronously
    sendEmailsAsync(campaignName, subject, text, recipients, senders, selectedSenders);

    return res.status(200).json({ 
      success: true, 
      message: 'Campaign started successfully',
      totalRecipients: recipients.length
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
  senders: any[],
  selectedSenders?: string[]
) {
  try {
    // Filter senders if specific ones are selected
    const availableSenders = selectedSenders && selectedSenders.length > 0 
      ? senders.filter(sender => selectedSenders.includes(sender))
      : senders;

    if (availableSenders.length === 0) {
      throw new Error('No available senders after filtering');
    }

    // Campaign start logging (matching HTML/JS project)
    console.log(`\n🚀 Starting campaign "${campaignName}"`);
    console.log(`📧 Total emails to send: ${recipients.length}`);
    console.log(`👥 Available senders: ${availableSenders.length}`);
    console.log(`📋 Subject: "${subject}"`);

    const stats = {
      successful: 0,
      failed: 0,
      sent: 0
    };

    const senderStats: Record<string, { sent: number; successful: number; failed: number; assigned: number }> = {};
    availableSenders.forEach(sender => {
      senderStats[sender] = { sent: 0, successful: 0, failed: 0, assigned: 0 };
    });

    // COMPLETE DETERMINISTIC SENDER SELECTION ALGORITHM (from HTML/JS project)
    
    // GROUP SENDERS BY DOMAIN FOR PERFECT DOMAIN DISTRIBUTION
    const sendersByDomain: Record<string, string[]> = {};
    const domainStats: Record<string, { senders: number; targetEmails: number; currentEmails: number }> = {};
    
    availableSenders.forEach(sender => {
      const domain = sender.split('@')[1];
      if (!sendersByDomain[domain]) {
        sendersByDomain[domain] = [];
        domainStats[domain] = { senders: 0, targetEmails: 0, currentEmails: 0 };
      }
      sendersByDomain[domain].push(sender);
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
        sender: availableSenders[i],
        domain: availableSenders[i].split('@')[1],
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
    const senderSequence: string[] = [];
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
        selectedSender = availableSenders[emailIndex % availableSenders.length];
        senderStats[selectedSender].assigned++;
        console.log(`⚠️ Fallback to round-robin: ${selectedSender} at position ${emailIndex}`);
      }
      
      senderSequence.push(selectedSender);
      
      // Move to next sender for next iteration
      currentSenderIndex++;
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
      // Check campaign status before each email
      const currentStatus = getCampaignStatus();
      
      // Handle stop command
      if (currentStatus.status === 'stopped' || !currentStatus.isRunning) {
        console.log(`⏹️ Campaign stopped by user at ${i}/${recipients.length} emails`);
        break;
      }
      
      // Handle pause command
      while (currentStatus.status === 'paused' && currentStatus.isRunning) {
        console.log(`⏸️ Campaign paused at ${i}/${recipients.length} emails. Waiting...`);
        await sleep(2000); // Check every 2 seconds
        const newStatus = getCampaignStatus();
        if (newStatus.status === 'stopped' || !newStatus.isRunning) {
          console.log(`⏹️ Campaign stopped while paused at ${i}/${recipients.length} emails`);
          break;
        }
        if (newStatus.status === 'running') {
          console.log(`▶️ Campaign resumed at ${i}/${recipients.length} emails`);
          break;
        }
      }
      
      // Double-check if we should continue after pause handling
      const finalStatus = getCampaignStatus();
      if (finalStatus.status === 'stopped' || !finalStatus.isRunning) {
        console.log(`⏹️ Campaign stopped after pause check at ${i}/${recipients.length} emails`);
        break;
      }
      
      const recipient = recipients[i];
      const sender = senderSequence[i]; // Use pre-calculated sequence instead of simple round-robin
      
      // Track sender usage
      senderStats[sender].sent++;
      
      // Check if this is a consecutive send for better logging
      const isConsecutive = i > 0 && senderSequence[i - 1] === sender;
      const consecutiveWarning = isConsecutive ? " ⚠️ CONSECUTIVE" : "";
      console.log(`📤 ${i + 1}/${recipients.length} - Sending from: ${sender} [Sequence: ${i}]${consecutiveWarning}`);
      
      try {
        // Personalize content for each recipient with unique index
        const personalizedText = personalizeContent(text, recipient, i, sender);
        
        // Create email message
        const emailMessage = {
          senderAddress: sender,
          content: {
            subject: subject,
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
        senderStats[sender].successful++;
        
        // Add email detail for real-time tracking
        addEmailDetail({
          timestamp: new Date().toISOString(),
          recipient: recipient.email,
          subject: subject,
          status: 'success',
          sender: sender
        });

        // Console log matching HTML/JS project format
        console.log(`OK ${recipient.email} via ${sender} — status: 202 (${stats.sent}/${recipients.length})`);

        // Update campaign status in real-time
        updateCampaignStatus({
          sent: stats.sent,
          successful: stats.successful,
          failed: stats.failed
        });

      } catch (error: any) {
        stats.sent++;
        stats.failed++;
        senderStats[sender].failed++;
        
        // Add failed email detail
        addEmailDetail({
          timestamp: new Date().toISOString(),
          recipient: recipient.email,
          subject: subject,
          status: 'failed',
          error: error.message || 'Unknown error',
          sender: sender
        });

        // Console log for failed emails
        console.log(`❌ FAILED ${recipient.email} via ${sender} — error: ${error.message} (${stats.sent}/${recipients.length})`);

        // Update campaign status
        updateCampaignStatus({
          sent: stats.sent,
          successful: stats.successful,
          failed: stats.failed
        });
      }

      // Human-like delay between emails
      if (i < recipients.length - 1) {
        const campaignStartTime = getCampaignStatus().startTime || Date.now();
        const delay = calculateHumanLikeDelay(i, stats.sent, recipients.length, sender, campaignStartTime);
        await sleep(delay);
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
    completeCampaign();

  } catch (error) {
    console.error('Campaign execution error:', error);
    
    // Mark campaign as completed even if there was an error
    completeCampaign();
  }
}