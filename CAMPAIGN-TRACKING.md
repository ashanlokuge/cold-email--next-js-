# Campaign Tracking Feature

## Overview
This feature allows users to track their email campaigns with full history, statistics, and detailed logs stored in MongoDB.

## Features Implemented

### 1. Campaign Data Persistence
- **MongoDB Collections**: Campaigns are stored in the `campaigns` collection
- **Campaign Schema**: 
  - `userId` - Owner of the campaign (from JWT)
  - `userEmail` - Email of the campaign owner
  - `campaignName` - User-defined campaign name
  - `subject` - Email subject line
  - `body` - Email body content
  - `status` - Current status: 'running' | 'stopped' | 'completed'
  - `totalRecipients` - Total number of recipients
  - `sentCount` - Number of emails sent
  - `successCount` - Number of successfully delivered emails
  - `failedCount` - Number of failed email sends
  - `startTime` - Campaign start timestamp
  - `endTime` - Campaign completion/stop timestamp
  - `selectedSenders` - Array of sender email addresses used
  - `emailLogs` - Array of email delivery logs (last 200 entries)

### 2. Campaign Repository (`src/lib/campaignRepository.ts`)
A centralized repository class for all campaign database operations:

**Methods:**
- `createCampaign()` - Create a new campaign record
- `updateCampaignProgress()` - Update campaign status and statistics
- `addEmailLog()` - Add individual email delivery logs
- `getUserCampaigns()` - Get all campaigns for a specific user
- `getCampaignById()` - Get detailed campaign information
- `getRunningCampaigns()` - Get all active campaigns
- `getCompletedCampaigns()` - Get all finished campaigns
- `getUserStats()` - Get aggregate statistics for a user
- `deleteCampaign()` - Remove a campaign (soft delete recommended)

### 3. API Endpoints

#### `/api/campaigns/list` (GET)
- **Authentication**: JWT required
- **Purpose**: Fetch all campaigns for the logged-in user
- **Response**: 
  ```json
  {
    "success": true,
    "campaigns": [...],
    "stats": {
      "totalCampaigns": 10,
      "runningCampaigns": 2,
      "completedCampaigns": 8,
      "totalEmailsSent": 5000,
      "totalSuccessful": 4850,
      "totalFailed": 150
    }
  }
  ```

#### `/api/campaigns/details?id=<campaignId>` (GET)
- **Authentication**: JWT required
- **Purpose**: Get detailed information about a specific campaign
- **Ownership Check**: Verifies user owns the campaign
- **Response**: Full campaign object with email logs

#### `/api/campaigns/send` (POST)
- **Updated**: Now creates campaign in DB at start, logs all emails, and updates progress
- **Campaign Creation**: Assigns userId from JWT token
- **Email Logging**: Records every sent/failed email with timestamps
- **Progress Updates**: Updates stats every 10 emails
- **Completion**: Sets status to 'completed' and endTime when done

#### `/api/campaigns/stop` (POST)
- **Authentication**: JWT required
- **Purpose**: Stop a running campaign
- **Response**: 
  ```json
  {
    "success": true,
    "message": "Campaign stopped successfully"
  }
  ```

### 4. Campaign History UI (`src/components/sections/CampaignsHistorySection.tsx`)

**Stats Dashboard:**
- Total Campaigns count
- Total Emails Sent
- Overall Success Rate
- Running vs Completed breakdown

**Filter Tabs:**
- All Campaigns
- Active Campaigns (running)
- Completed Campaigns (completed/stopped)

**Campaign Table:**
- Campaign Name & Subject
- Status badge (with color coding)
- Progress bar (sent/total)
- Success rate percentage
- Start time
- "View Details" button

**Campaign Details Modal:**
- Full campaign information
- Sender accounts used
- Email logs table (last 200 emails)
- Success/failure status for each email
- Error messages for failed sends
- Timestamps

### 5. Navigation Integration
- Added "Campaign History" to sidebar navigation
- Clock icon for easy identification
- Positioned between "Campaign Progress" and "Import Recipients"

## Data Flow

### Campaign Creation
1. User fills out campaign form in "Run Campaign" section
2. User clicks "Send Campaign"
3. POST to `/api/campaigns/send`
4. Extract user from JWT token
5. Create campaign record in MongoDB with `campaignRepository.createCampaign()`
6. Begin sending emails with Azure Communication Services
7. Log each email with `campaignRepository.addEmailLog()`
8. Update progress every 10 emails with `campaignRepository.updateCampaignProgress()`
9. Mark complete with status='completed' and endTime

### Campaign Control
1. User clicks Stop in "Campaign Progress" section
2. POST to `/api/campaigns/stop`
3. Update in-memory state (globalThis) for real-time UI
4. Persist status change to MongoDB via campaignRepository
5. Return updated status to frontend

### Viewing History
1. User navigates to "Campaign History"
2. Component calls `/api/campaigns/list` with JWT
3. Display campaigns in table with stats
4. User clicks "View Details" on a campaign
5. Component calls `/api/campaigns/details?id=X` with JWT
6. Show modal with full campaign details and email logs

## Database Optimization

### Email Logs Storage
- Limited to **200 most recent logs** per campaign to prevent document bloat
- Uses MongoDB `$slice` operator to maintain cap
- Older logs are automatically removed when limit exceeded
- For full audit trails, consider separate `emailLogs` collection (future enhancement)

### Indexes (Recommended)
```javascript
// campaigns collection
db.campaigns.createIndex({ userId: 1, startTime: -1 });
db.campaigns.createIndex({ status: 1 });
db.campaigns.createIndex({ userId: 1, status: 1 });
```

## Security

### JWT Authentication
- All campaign endpoints require valid JWT token
- Token extracted from `Authorization: Bearer <token>` header
- User ID from token associates campaigns with owners
- Ownership verification prevents unauthorized access

### Data Isolation
- Users can only view their own campaigns
- API endpoints verify campaign ownership before returning data
- MongoDB queries filtered by `userId` field

## Future Enhancements

### Potential Improvements
1. **Export Campaign Data**: CSV/JSON export of email logs
2. **Campaign Analytics**: Charts and graphs for delivery trends
3. **Email Bounce Tracking**: Integrate with Azure bounce notifications
4. **Campaign Duplication**: Clone existing campaigns
5. **Scheduled Campaigns**: Set future start times
6. **A/B Testing**: Multiple subject lines/bodies per campaign
7. **Recipient Grouping**: Tag recipients and filter in logs
8. **Email Preview**: See rendered email before sending
9. **Webhook Notifications**: Notify external systems on campaign events
10. **Campaign Notes**: Add user comments to campaigns

### Scalability Considerations
- For large campaigns (>10k emails), consider separate emailLogs collection
- Implement pagination for campaign list (currently returns all)
- Add date range filters for campaign history
- Consider archiving old campaigns to separate collection

## Testing

### Manual Testing Checklist
- [ ] Create a campaign and verify it appears in history
- [ ] Stop a campaign and check status updates
- [ ] View campaign details and verify email logs
- [ ] Test filters (All/Active/Completed)
- [ ] Test with multiple users to verify isolation
- [ ] Test with failed email sends (invalid recipients)
- [ ] Check stats calculations are accurate
- [ ] Verify success rate percentages

### API Testing
```bash
# List campaigns
curl -H "Authorization: Bearer <token>" http://localhost:3000/api/campaigns/list

# Get campaign details
curl -H "Authorization: Bearer <token>" http://localhost:3000/api/campaigns/details?id=<campaignId>
```

## Deployment Notes

### Environment Variables
No new environment variables required - uses existing MongoDB connection.

### Database Migration
No migration needed - campaigns collection will be created automatically on first campaign.

### Vercel Deployment
- All campaign tracking features are serverless-compatible
- MongoDB connection pooling handled by existing `getDb()` function
- No additional configuration required

## Support

For issues or questions about campaign tracking:
1. Check MongoDB connection is working
2. Verify JWT_SECRET is set correctly
3. Check browser console for API errors
4. Inspect MongoDB `campaigns` collection directly
5. Review server logs for campaign send errors
