// Script to fix userId format in existing campaigns
// Run with: node scripts/fix-campaign-userids.js

const { MongoClient, ObjectId } = require('mongodb');

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb+srv://ashanlokuge10_db_user:Q9hc8mb2NfXBtqJC@coldsendz.b9c8uzw.mongodb.net/?retryWrites=true&w=majority&appName=ColdSendz';
const DB_NAME = process.env.MONGODB_DB || 'coldEmailSender';

async function fixCampaignUserIds() {
  const client = new MongoClient(MONGODB_URI);

  try {
    await client.connect();
    console.log('✅ Connected to MongoDB');

    const db = client.db(DB_NAME);
    const campaigns = db.collection('campaigns');
    const users = db.collection('users');

    // First, get all users to see what their IDs look like
    const allUsers = await users.find({}).toArray();
    console.log('\n👥 Users in database:');
    allUsers.forEach(user => {
      console.log(`   ${user.email}: ${user._id.toString()}`);
    });

    // Find all campaigns
    const allCampaigns = await campaigns.find({}).toArray();
    console.log(`\n📊 Found ${allCampaigns.length} total campaigns`);

    if (allCampaigns.length === 0) {
      console.log('No campaigns to fix!');
      return;
    }

    let fixed = 0;
    let alreadyCorrect = 0;
    let errors = 0;

    for (const campaign of allCampaigns) {
      console.log(`\n🔍 Checking campaign: ${campaign.campaignName} (${campaign._id})`);
      console.log(`   Current userId type: ${typeof campaign.userId}`);
      console.log(`   Current userId value:`, campaign.userId);
      
      // Check if userId is a string or object
      if (typeof campaign.userId === 'string') {
        console.log(`   ✓ Already correct (string)`);
        alreadyCorrect++;
      } else if (typeof campaign.userId === 'object' && campaign.userId !== null) {
        console.log(`   🔧 Needs fixing (object)`);
        
        // Extract the actual ID string
        let newUserId = null;
        
        if (typeof campaign.userId === 'object') {
          // Try different formats
          if (campaign.userId._id) {
            newUserId = campaign.userId._id;
          } else if (campaign.userId.$oid) {
            newUserId = campaign.userId.$oid;
          } else if (campaign.userId.toString) {
            newUserId = campaign.userId.toString();
          }
        }

        if (newUserId) {
          // Update the campaign with string userId
          await campaigns.updateOne(
            { _id: campaign._id },
            { $set: { userId: newUserId } }
          );
          
          console.log(`   ✅ Fixed: ${JSON.stringify(campaign.userId)} → "${newUserId}"`);
          fixed++;
        } else {
          console.log(`   ❌ Cannot parse userId:`, campaign.userId);
          errors++;
        }
      } else {
        console.log(`   ⚠️ Unexpected userId type: ${typeof campaign.userId}`);
        errors++;
      }
    }

    console.log('\n' + '='.repeat(60));
    console.log('📊 SUMMARY:');
    console.log('='.repeat(60));
    console.log(`   Total campaigns:   ${allCampaigns.length}`);
    console.log(`   ✅ Fixed:          ${fixed}`);
    console.log(`   ✓ Already correct: ${alreadyCorrect}`);
    console.log(`   ❌ Errors:         ${errors}`);
    console.log('='.repeat(60));

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await client.close();
    console.log('\n🔌 Disconnected from MongoDB');
  }
}

// Run the fix
fixCampaignUserIds().then(() => {
  console.log('✅ Script completed!');
  process.exit(0);
}).catch(error => {
  console.error('❌ Fatal error:', error);
  process.exit(1);
});
