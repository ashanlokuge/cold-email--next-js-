import type { EmailDetail } from '@/types';

// Define campaign status type
type CampaignStatus = {
  isRunning: boolean;
  campaignName: string;
  sent: number;
  successful: number;
  failed: number;
  total: number;
  completed: boolean;
  startTime: number | null;
  status: 'idle' | 'running' | 'stopped' | 'completed';
  campaignId?: string | null;
  nextEmailIn?: number | null; // Seconds until next email
  lastDelay?: number | null; // Last calculated delay in ms
  // pauseReason removed: pause/resume feature deprecated
};

// Global state that persists across API calls (like HTML/JS project)
// Using globalThis to ensure state persists in development hot reloads
const globalForCampaign = globalThis as unknown as {
  campaignStatus: CampaignStatus | undefined;
  emailDetailsStore: EmailDetail[] | undefined;
};

// Shared campaign status across all API endpoints (persistent like HTML/JS)
const defaultCampaignStatus: CampaignStatus = {
  isRunning: false,
  campaignName: '',
  sent: 0,
  successful: 0,
  failed: 0,
  total: 0,
  completed: false,
  startTime: null,
  status: 'idle'
};

// Initialize or get existing campaign status
export let currentCampaignStatus = globalForCampaign.campaignStatus ?? defaultCampaignStatus;

// Initialize or get existing email details
export let emailDetails: EmailDetail[] = globalForCampaign.emailDetailsStore ?? [];
export const MAX_EMAIL_DETAILS = 200;

// Store state globally to persist across API calls
globalForCampaign.campaignStatus = currentCampaignStatus;
globalForCampaign.emailDetailsStore = emailDetails;

// Functions to update campaign status
export function updateCampaignStatus(updates: Partial<CampaignStatus>) {
  console.log('📊 Updating campaign status:', updates);
  // If marking as completed, ensure proper state
  if (updates.completed === true) {
    currentCampaignStatus = { 
      ...currentCampaignStatus, 
      ...updates, 
      isRunning: false 
    };
  } else {
    currentCampaignStatus = { ...currentCampaignStatus, ...updates };
  }
  
  // Update global state to persist across API calls
  globalForCampaign.campaignStatus = currentCampaignStatus;
  
  // console.log('📊 New campaign status:', currentCampaignStatus);
}

export function completeCampaign() {
  currentCampaignStatus = {
    ...currentCampaignStatus,
    isRunning: false,
    completed: true
  };
  
  // Update global state
  globalForCampaign.campaignStatus = currentCampaignStatus;
}

export function resetCampaignStatus() {
  currentCampaignStatus = {
    isRunning: false,
    campaignName: '',
    sent: 0,
    successful: 0,
    failed: 0,
    total: 0,
    completed: false,
    startTime: null,
    status: 'idle'
  };
  
  // Update global state
  globalForCampaign.campaignStatus = currentCampaignStatus;
}

export function getCampaignStatus() {
  // Always get the latest state from global storage
  currentCampaignStatus = globalForCampaign.campaignStatus ?? defaultCampaignStatus;
  return { ...currentCampaignStatus };
}

// Functions to manage email details
export function addEmailDetail(detail: EmailDetail) {
  // Get latest email details from global storage
  emailDetails = globalForCampaign.emailDetailsStore ?? [];
  
  emailDetails.unshift(detail);
  if (emailDetails.length > MAX_EMAIL_DETAILS) {
    emailDetails.splice(MAX_EMAIL_DETAILS);
  }
  
  // Update global storage
  globalForCampaign.emailDetailsStore = emailDetails;
}

export function getEmailDetails() {
  // Always get the latest state from global storage
  emailDetails = globalForCampaign.emailDetailsStore ?? [];
  return [...emailDetails];
}

export function clearEmailDetails() {
  emailDetails = [];
  globalForCampaign.emailDetailsStore = emailDetails;
}

// Campaign control functions
export function stopCampaign() {
  if (currentCampaignStatus.isRunning) {
    currentCampaignStatus = {
      ...currentCampaignStatus,
      isRunning: false,
      status: 'stopped',
      completed: true
    };
    globalForCampaign.campaignStatus = currentCampaignStatus;
    console.log('⏹️ Campaign stopped');
  }
}