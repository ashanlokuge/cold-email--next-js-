// Script to fix userId format in existing campaigns
// Run this once to convert ObjectId userId to string userId

import { MongoClient, ObjectId } from 'mongodb';

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb+srv://ashanlokuge10_db_user:Q9hc8mb2NfXBtqJC@coldsendz.b9c8uzw.mongodb.net/?retryWrites=true&w=majority&appName=ColdSendz';
const DB_NAME = process.env.MONGODB_DB || 'coldEmailSender';

async function fixCampaignUserIds() {
  const client = new MongoClient(MONGODB_URI);

  try {
    await client.connect();
    console.log('✅ Connected to MongoDB');

    const db = client.db(DB_NAME);
    const campaigns = db.collection('campaigns');

    // Find all campaigns where userId is an object (not a string)
    const allCampaigns = await campaigns.find({}).toArray();
    console.log(`📊 Found ${allCampaigns.length} total campaigns`);

    let fixed = 0;
    let alreadyCorrect = 0;

    for (const campaign of allCampaigns) {
      // Check if userId is a string or object
      if (typeof campaign.userId === 'object' && campaign.userId !== null) {
        console.log(`🔧 Fixing campaign ${campaign._id}: userId is object`, campaign.userId);
        
        // Extract the actual ID string
        let newUserId: string;
        
        if (campaign.userId._id) {
          // Format: { _id: "68e4d541acded233866c9a2e" }
          newUserId = campaign.userId._id;
        } else if (campaign.userId.$oid) {
          // Format: { $oid: "68e4d541acded233866c9a2e" }
          newUserId = campaign.userId.$oid;
        } else if (ObjectId.isValid(campaign.userId.toString())) {
          // Format: ObjectId instance
          newUserId = campaign.userId.toString();
        } else {
          console.log(`❌ Cannot parse userId for campaign ${campaign._id}:`, campaign.userId);
          continue;
        }

        // Update the campaign with string userId
        await campaigns.updateOne(
          { _id: campaign._id },
          { $set: { userId: newUserId } }
        );
        
        console.log(`✅ Fixed campaign ${campaign._id}: ${campaign.userId} → ${newUserId}`);
        fixed++;
      } else if (typeof campaign.userId === 'string') {
        console.log(`✓ Campaign ${campaign._id} already has string userId: ${campaign.userId}`);
        alreadyCorrect++;
      } else {
        console.log(`⚠️ Campaign ${campaign._id} has unexpected userId type:`, typeof campaign.userId);
      }
    }

    console.log('\n📊 Summary:');
    console.log(`   Total campaigns: ${allCampaigns.length}`);
    console.log(`   Fixed: ${fixed}`);
    console.log(`   Already correct: ${alreadyCorrect}`);
    console.log(`   Errors: ${allCampaigns.length - fixed - alreadyCorrect}`);

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await client.close();
    console.log('🔌 Disconnected from MongoDB');
  }
}

// Run the fix
fixCampaignUserIds().then(() => {
  console.log('✅ Done!');
  process.exit(0);
}).catch(error => {
  console.error('❌ Fatal error:', error);
  process.exit(1);
});
