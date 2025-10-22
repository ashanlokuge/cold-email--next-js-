// Multi-campaign management system with MongoDB persistence
import type { EmailDetail } from '@/types';
import { connectDB } from './db';

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
  status: 'running' | 'stopped' | 'completed';
  // pauseReason removed: pause/resume feature deprecated
  nextEmailIn?: number;
  lastDelay?: number;
  createdAt: Date;
  updatedAt: Date;
}

// Database collection names
const CAMPAIGNS_COLLECTION = 'campaigns';
const EMAIL_DETAILS_COLLECTION = 'emailDetails';

// Create a new campaign instance
export async function createCampaignInstance(
  campaignId: string,
  campaignName: string,
  userId: string,
  userEmail: string,
  totalRecipients: number
): Promise<CampaignInstance> {
  const db = await connectDB();
  const now = new Date();

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
    status: 'running',
    createdAt: now,
    updatedAt: now
  };

  // Avoid creating duplicate DB documents. The repository creates a document with
  // an ObjectId _id (returned as string). If that exists, update it instead.
  try {
    const filter: any = { $or: [{ campaignId }] };

    // If campaignId looks like an ObjectId hex, include _id match as well
    if (/^[0-9a-fA-F]{24}$/.test(campaignId)) {
      try {
        const { ObjectId } = await import('mongodb');
        filter.$or.push({ _id: new ObjectId(campaignId) });
      } catch (err) {
        // ignore if ObjectId not available
      }
    }

    await db.collection(CAMPAIGNS_COLLECTION).updateOne(
      filter,
      { $set: { ...campaign } },
      { upsert: true }
    );
  } catch (err) {
    // Fallback to insert if upsert fails for any reason
    try {
      await db.collection(CAMPAIGNS_COLLECTION).insertOne(campaign);
    } catch (e) {
      console.warn('Failed to persist campaign instance to DB:', e);
    }
  }

  return campaign;
}

// Get campaign instance by ID
export async function getCampaignInstance(campaignId: string): Promise<CampaignInstance | null> {
  const db = await connectDB();
  const campaign = await db.collection(CAMPAIGNS_COLLECTION).findOne({ campaignId });
  return campaign ? (campaign as unknown as CampaignInstance) : null;
}

// Update campaign instance
export async function updateCampaignInstance(campaignId: string, updates: Partial<CampaignInstance>): Promise<void> {
  const db = await connectDB();
  await db.collection(CAMPAIGNS_COLLECTION).updateOne(
    { campaignId },
    {
      $set: {
        ...updates,
        updatedAt: new Date()
      }
    }
  );
}

// Get all running campaigns for a user
export async function getRunningCampaignsForUser(userId: string): Promise<CampaignInstance[]> {
  const db = await connectDB();
  const campaigns = await db.collection(CAMPAIGNS_COLLECTION)
    .find({ userId, isRunning: true })
    .toArray();
  return campaigns as unknown as CampaignInstance[];
}

// Get all campaigns for a user
export async function getAllCampaignsForUser(userId: string): Promise<CampaignInstance[]> {
  const db = await connectDB();
  const campaigns = await db.collection(CAMPAIGNS_COLLECTION)
    .find({ userId })
    .sort({ createdAt: -1 })
    .toArray();
  return campaigns as unknown as CampaignInstance[];
}

// Check if user can start a new campaign (limit concurrent campaigns)
export async function canStartNewCampaign(userId: string, maxConcurrent: number = 5): Promise<boolean> {
  const runningCampaigns = await getRunningCampaignsForUser(userId);
  return runningCampaigns.length < maxConcurrent;
}

// Add email detail to campaign
export async function addEmailDetailToCampaign(campaignId: string, emailDetail: EmailDetail): Promise<void> {
  const db = await connectDB();
  await db.collection(EMAIL_DETAILS_COLLECTION).insertOne({
    ...emailDetail,
    campaignId,
    createdAt: new Date()
  });
}

// Get email details for campaign
export async function getEmailDetailsForCampaign(campaignId: string): Promise<EmailDetail[]> {
  const db = await connectDB();
  const details = await db.collection(EMAIL_DETAILS_COLLECTION)
    .find({ campaignId })
    .sort({ timestamp: 1 })
    .toArray();
  return details as unknown as EmailDetail[];
}

// Get all email details (for all campaigns)
export async function getAllEmailDetails(limit: number = 200): Promise<EmailDetail[]> {
  const db = await connectDB();
  const details = await db.collection(EMAIL_DETAILS_COLLECTION)
    .find({})
    .sort({ timestamp: -1 })
    .limit(limit)
    .toArray();
  return details as unknown as EmailDetail[];
}

// Complete campaign
export async function completeCampaignInstance(campaignId: string): Promise<void> {
  await updateCampaignInstance(campaignId, {
    isRunning: false,
    completed: true,
    status: 'completed'
  });
}

// Stop campaign
export async function stopCampaignInstance(campaignId: string): Promise<void> {
  await updateCampaignInstance(campaignId, {
    isRunning: false,
    status: 'stopped'
  });
}

// Remove campaign instance (cleanup)
export async function removeCampaignInstance(campaignId: string): Promise<void> {
  const db = await connectDB();
  await db.collection(CAMPAIGNS_COLLECTION).deleteOne({ campaignId });
  await db.collection(EMAIL_DETAILS_COLLECTION).deleteMany({ campaignId });
}

// Clean up old stopped campaigns from in-memory system (older than 1 hour)
export async function cleanupOldStoppedCampaigns(): Promise<void> {
  const db = await connectDB();
  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
  
  await db.collection(CAMPAIGNS_COLLECTION).deleteMany({
    status: { $in: ['stopped', 'completed'] },
    updatedAt: { $lt: oneHourAgo }
  });
}

// Get campaign statistics
export async function getCampaignStatistics(userId: string) {
  const allCampaigns = await getAllCampaignsForUser(userId);
  const runningCampaigns = await getRunningCampaignsForUser(userId);

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
export async function getCampaignStatus() {
  // This function is deprecated - campaigns now require userId
  console.warn('getCampaignStatus() is deprecated. Use getRunningCampaignsForUser(userId) instead.');
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

export async function updateCampaignStatus(updates: Partial<CampaignInstance>): Promise<void> {
  if (updates.campaignId) {
    await updateCampaignInstance(updates.campaignId, updates);
  }
}

export async function addEmailDetail(emailDetail: EmailDetail): Promise<void> {
  if (emailDetail.campaignId) {
    await addEmailDetailToCampaign(emailDetail.campaignId, emailDetail);
  }
}

export async function completeCampaign(): Promise<void> {
  // This legacy function needs campaignId - for now, we'll skip
  console.warn('completeCampaign() is deprecated. Use completeCampaignInstance(campaignId) instead.');
}

export async function resetCampaignStatus(): Promise<void> {
  // This is dangerous and deprecated
  console.warn('resetCampaignStatus() is deprecated and does nothing in the new implementation');
}