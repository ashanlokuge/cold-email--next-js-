// Campaign MongoDB Repository
import { ObjectId } from 'mongodb';
import { connectDB } from './db';

export interface CampaignDocument {
  _id?: ObjectId;
  userId: string; // who created the campaign
  userEmail: string;
  campaignName: string;
  subject: string;
  body: string;
  status: 'running' | 'paused' | 'stopped' | 'completed';
  
  // Recipients info
  totalRecipients: number;
  sentCount: number;
  successCount: number;
  failedCount: number;
  
  // Timing
  startTime: Date;
  endTime?: Date;
  lastUpdateTime: Date;
  
  // Senders used
  selectedSenders: string[];
  
  // Email details (limited to last 200)
  emailLogs: EmailLogEntry[];
  
  // Metadata
  createdAt: Date;
  updatedAt: Date;
}

export interface EmailLogEntry {
  email: string;
  name?: string;
  status: 'sent' | 'failed';
  timestamp: Date;
  error?: string;
  messageId?: string;
  sender?: string;
}

export class CampaignRepository {
  private async getCollection() {
    const db = await connectDB();
    return db.collection<CampaignDocument>('campaigns');
  }

  // Create a new campaign
  async createCampaign(data: {
    userId: string;
    userEmail: string;
    campaignName: string;
    subject: string;
    body: string;
    totalRecipients: number;
    selectedSenders: string[];
  }): Promise<string> {
    const collection = await this.getCollection();
    
    const campaign: Omit<CampaignDocument, '_id'> = {
      ...data,
      status: 'running',
      sentCount: 0,
      successCount: 0,
      failedCount: 0,
      emailLogs: [],
      startTime: new Date(),
      lastUpdateTime: new Date(),
      createdAt: new Date(),
      updatedAt: new Date()
    };

    const result = await collection.insertOne(campaign as any);
    return result.insertedId.toHexString();
  }

  // Update campaign progress
  async updateCampaignProgress(
    campaignId: string,
    updates: {
      sentCount?: number;
      successCount?: number;
      failedCount?: number;
      status?: 'running' | 'paused' | 'stopped' | 'completed';
      endTime?: Date;
    }
  ): Promise<void> {
    const collection = await this.getCollection();
    
    await collection.updateOne(
      { _id: new ObjectId(campaignId) },
      {
        $set: {
          ...updates,
          lastUpdateTime: new Date(),
          updatedAt: new Date()
        }
      }
    );
  }

  // Add email log entry
  async addEmailLog(
    campaignId: string,
    logEntry: EmailLogEntry
  ): Promise<void> {
    const collection = await this.getCollection();
    
    // Add to array and keep only last 200
    await collection.updateOne(
      { _id: new ObjectId(campaignId) },
      {
        $push: {
          emailLogs: {
            $each: [logEntry],
            $position: 0, // Add to beginning
            $slice: 200 // Keep only first 200
          }
        },
        $set: {
          lastUpdateTime: new Date(),
          updatedAt: new Date()
        }
      }
    );
  }

  // Get all campaigns for a user
  async getUserCampaigns(userId: string): Promise<CampaignDocument[]> {
    const collection = await this.getCollection();
    
    const campaigns = await collection
      .find({ userId })
      .sort({ createdAt: -1 })
      .toArray();

    return campaigns;
  }

  // Get campaign by ID
  async getCampaignById(campaignId: string): Promise<CampaignDocument | null> {
    const collection = await this.getCollection();
    
    const campaign = await collection.findOne({
      _id: new ObjectId(campaignId)
    });

    return campaign;
  }

  // Get running campaigns
  async getRunningCampaigns(userId?: string): Promise<CampaignDocument[]> {
    const collection = await this.getCollection();
    
    const query: any = {
      status: { $in: ['running', 'paused'] }
    };
    
    if (userId) {
      query.userId = userId;
    }

    const campaigns = await collection
      .find(query)
      .sort({ startTime: -1 })
      .toArray();

    return campaigns;
  }

  // Get completed campaigns
  async getCompletedCampaigns(userId: string, limit = 10): Promise<CampaignDocument[]> {
    const collection = await this.getCollection();
    
    const campaigns = await collection
      .find({
        userId,
        status: { $in: ['completed', 'stopped'] }
      })
      .sort({ endTime: -1 })
      .limit(limit)
      .toArray();

    return campaigns;
  }

  // Get campaign statistics for a user
  async getUserStats(userId: string): Promise<{
    totalCampaigns: number;
    runningCampaigns: number;
    completedCampaigns: number;
    totalEmailsSent: number;
    totalSuccessful: number;
    totalFailed: number;
  }> {
    const collection = await this.getCollection();
    
    const stats = await collection.aggregate([
      { $match: { userId } },
      {
        $group: {
          _id: null,
          totalCampaigns: { $sum: 1 },
          runningCampaigns: {
            $sum: {
              $cond: [
                { $in: ['$status', ['running', 'paused']] },
                1,
                0
              ]
            }
          },
          completedCampaigns: {
            $sum: {
              $cond: [
                { $in: ['$status', ['completed', 'stopped']] },
                1,
                0
              ]
            }
          },
          totalEmailsSent: { $sum: '$sentCount' },
          totalSuccessful: { $sum: '$successCount' },
          totalFailed: { $sum: '$failedCount' }
        }
      }
    ]).toArray();

    if (stats.length === 0) {
      return {
        totalCampaigns: 0,
        runningCampaigns: 0,
        completedCampaigns: 0,
        totalEmailsSent: 0,
        totalSuccessful: 0,
        totalFailed: 0
      };
    }

    const result = stats[0] as any;
    return {
      totalCampaigns: result.totalCampaigns || 0,
      runningCampaigns: result.runningCampaigns || 0,
      completedCampaigns: result.completedCampaigns || 0,
      totalEmailsSent: result.totalEmailsSent || 0,
      totalSuccessful: result.totalSuccessful || 0,
      totalFailed: result.totalFailed || 0
    };
  }

  // Delete a campaign
  async deleteCampaign(campaignId: string): Promise<boolean> {
    const collection = await this.getCollection();
    
    const result = await collection.deleteOne({
      _id: new ObjectId(campaignId)
    });

    return result.deletedCount > 0;
  }
}

// Export singleton instance
export const campaignRepository = new CampaignRepository();
