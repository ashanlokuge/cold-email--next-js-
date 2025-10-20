// Multi-campaign management system
import type { EmailDetail } from '@/types';

interface CampaignInstance {
  campaignId: string;
  campaignName: string;
  userId: string;
  userEmail: string;
  isRunning: boolean;
  sent: number;
  successful: number;
  failed: number;
  total: number;
  completed: boolean;
  startTime: number;
  status: 'running' | 'paused' | 'stopped' | 'completed';
  pauseReason?: string;
  nextEmailIn?: number;
  lastDelay?: number;
}

interface MultiCampaignState {
  campaigns: Map<string, CampaignInstance>;
  emailDetails: Map<string, EmailDetail[]>; // campaignId -> email details
}

// Global state for multiple campaigns
const globalForMultiCampaign = globalThis as unknown as {
  multiCampaignState: MultiCampaignState | undefined;
};

// Initialize multi-campaign state
const defaultMultiCampaignState: MultiCampaignState = {
  campaigns: new Map(),
  emailDetails: new Map()
};

export let multiCampaignState = globalForMultiCampaign.multiCampaignState ?? defaultMultiCampaignState;

// Initialize global state
if (!globalForMultiCampaign.multiCampaignState) {
  globalForMultiCampaign.multiCampaignState = multiCampaignState;
}

// Create a new campaign instance
export function createCampaignInstance(
  campaignId: string,
  campaignName: string,
  userId: string,
  userEmail: string,
  totalRecipients: number
): CampaignInstance {
  const campaign: CampaignInstance = {
    campaignId,
    campaignName,
    userId,
    userEmail,
    isRunning: true,
    sent: 0,
    successful: 0,
    failed: 0,
    total: totalRecipients,
    completed: false,
    startTime: Date.now(),
    status: 'running'
  };

  multiCampaignState.campaigns.set(campaignId, campaign);
  multiCampaignState.emailDetails.set(campaignId, []);

  return campaign;
}

// Get campaign instance by ID
export function getCampaignInstance(campaignId: string): CampaignInstance | null {
  return multiCampaignState.campaigns.get(campaignId) || null;
}

// Update campaign instance
export function updateCampaignInstance(campaignId: string, updates: Partial<CampaignInstance>): void {
  const campaign = multiCampaignState.campaigns.get(campaignId);
  if (campaign) {
    Object.assign(campaign, updates);
    multiCampaignState.campaigns.set(campaignId, campaign);
  }
}

// Get all running campaigns for a user
export function getRunningCampaignsForUser(userId: string): CampaignInstance[] {
  return Array.from(multiCampaignState.campaigns.values())
    .filter(campaign => campaign.userId === userId && campaign.isRunning);
}

// Get all campaigns for a user
export function getAllCampaignsForUser(userId: string): CampaignInstance[] {
  return Array.from(multiCampaignState.campaigns.values())
    .filter(campaign => campaign.userId === userId);
}

// Check if user can start a new campaign (limit concurrent campaigns)
export function canStartNewCampaign(userId: string, maxConcurrent: number = 5): boolean {
  const runningCampaigns = getRunningCampaignsForUser(userId);
  return runningCampaigns.length < maxConcurrent;
}

// Add email detail to campaign
export function addEmailDetailToCampaign(campaignId: string, emailDetail: EmailDetail): void {
  const details = multiCampaignState.emailDetails.get(campaignId) || [];
  details.push(emailDetail);
  multiCampaignState.emailDetails.set(campaignId, details);
}

// Get email details for campaign
export function getEmailDetailsForCampaign(campaignId: string): EmailDetail[] {
  return multiCampaignState.emailDetails.get(campaignId) || [];
}

// Complete campaign
export function completeCampaignInstance(campaignId: string): void {
  updateCampaignInstance(campaignId, {
    isRunning: false,
    completed: true,
    status: 'completed'
  });
}

// Pause campaign
export function pauseCampaignInstance(campaignId: string, reason?: string): void {
  updateCampaignInstance(campaignId, {
    isRunning: false,
    status: 'paused',
    pauseReason: reason
  });
}

// Resume campaign
export function resumeCampaignInstance(campaignId: string): void {
  updateCampaignInstance(campaignId, {
    isRunning: true,
    status: 'running',
    pauseReason: undefined
  });
}

// Stop campaign
export function stopCampaignInstance(campaignId: string): void {
  updateCampaignInstance(campaignId, {
    isRunning: false,
    status: 'stopped'
  });
}

// Remove campaign instance (cleanup)
export function removeCampaignInstance(campaignId: string): void {
  multiCampaignState.campaigns.delete(campaignId);
  multiCampaignState.emailDetails.delete(campaignId);
}

// Get campaign statistics
export function getCampaignStatistics(userId: string) {
  const allCampaigns = getAllCampaignsForUser(userId);
  const runningCampaigns = getRunningCampaignsForUser(userId);
  
  const totalEmails = allCampaigns.reduce((sum, c) => sum + c.total, 0);
  const totalSent = allCampaigns.reduce((sum, c) => sum + c.sent, 0);
  const totalSuccessful = allCampaigns.reduce((sum, c) => sum + c.successful, 0);
  const totalFailed = allCampaigns.reduce((sum, c) => sum + c.failed, 0);
  
  return {
    totalCampaigns: allCampaigns.length,
    runningCampaigns: runningCampaigns.length,
    completedCampaigns: allCampaigns.filter(c => c.completed).length,
    totalEmails,
    totalSent,
    totalSuccessful,
    totalFailed,
    successRate: totalSent > 0 ? (totalSuccessful / totalSent * 100).toFixed(1) : '0'
  };
}

// Legacy compatibility functions (for existing code)
export function getCampaignStatus() {
  // Return the first running campaign for backward compatibility
  const runningCampaign = Array.from(multiCampaignState.campaigns.values())
    .find(c => c.isRunning);
  
  if (runningCampaign) {
    return {
      isRunning: runningCampaign.isRunning,
      campaignName: runningCampaign.campaignName,
      sent: runningCampaign.sent,
      successful: runningCampaign.successful,
      failed: runningCampaign.failed,
      total: runningCampaign.total,
      completed: runningCampaign.completed,
      startTime: runningCampaign.startTime,
      status: runningCampaign.status,
      pauseReason: runningCampaign.pauseReason,
      nextEmailIn: runningCampaign.nextEmailIn,
      lastDelay: runningCampaign.lastDelay,
      campaignId: runningCampaign.campaignId
    };
  }
  
  // Return default status if no running campaigns
  return {
    isRunning: false,
    campaignName: '',
    sent: 0,
    successful: 0,
    failed: 0,
    total: 0,
    completed: false,
    startTime: null,
    status: 'idle' as const,
    campaignId: null
  };
}

export function updateCampaignStatus(updates: Partial<CampaignInstance>): void {
  // Update the first running campaign for backward compatibility
  const runningCampaign = Array.from(multiCampaignState.campaigns.values())
    .find(c => c.isRunning);
  
  if (runningCampaign && updates.campaignId) {
    updateCampaignInstance(updates.campaignId, updates);
  }
}

export function addEmailDetail(emailDetail: EmailDetail): void {
  // Add to the first running campaign for backward compatibility
  const runningCampaign = Array.from(multiCampaignState.campaigns.values())
    .find(c => c.isRunning);
  
  if (runningCampaign) {
    addEmailDetailToCampaign(runningCampaign.campaignId, emailDetail);
  }
}

export function completeCampaign(): void {
  // Complete the first running campaign for backward compatibility
  const runningCampaign = Array.from(multiCampaignState.campaigns.values())
    .find(c => c.isRunning);
  
  if (runningCampaign) {
    completeCampaignInstance(runningCampaign.campaignId);
  }
}

export function resetCampaignStatus(): void {
  // Reset all campaigns (for backward compatibility)
  multiCampaignState.campaigns.clear();
  multiCampaignState.emailDetails.clear();
}
