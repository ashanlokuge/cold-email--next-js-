// Script to assign anonymous campaigns to a specific user
const { MongoClient } = require('mongodb');

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb+srv://ashanlokuge10_db_user:Q9hc8mb2NfXBtqJC@coldsendz.b9c8uzw.mongodb.net/?retryWrites=true&w=majority&appName=ColdSendz';
const DB_NAME = process.env.MONGODB_DB || 'coldEmailSender';

// CHANGE THIS to your email address
const YOUR_EMAIL = 'sashint-cs20019@stu.kln.ac.lk';  // Replace with your actual email

async function assignAnonymousCampaigns() {
  const client = new MongoClient(MONGODB_URI);

  try {
    await client.connect();
    console.log('✅ Connected to MongoDB');

    const db = client.db(DB_NAME);
    const users = db.collection('users');
    const campaigns = db.collection('campaigns');

    // First, show all users
    console.log('\n👥 All users in database:');
    const allUsers = await users.find({}).toArray();
    if (allUsers.length === 0) {
      console.log('   ⚠️ No users found in database!');
    } else {
      allUsers.forEach(u => console.log(`   - ${u.email} (ID: ${u._id})`));
    }

    // Find your user
    const user = await users.findOne({ email: YOUR_EMAIL });
    if (!user) {
      console.error(`❌ User not found with email: ${YOUR_EMAIL}`);
      console.log('\n👥 Available users:');
      const allUsers = await users.find({}).toArray();
      allUsers.forEach(u => console.log(`   - ${u.email}`));
      return;
    }

    console.log(`\n✅ Found user: ${user.email}`);
    console.log(`   User ID: ${user._id.toString()}`);

    // Find anonymous campaigns
    const anonymousCampaigns = await campaigns.find({ 
      userId: "anonymous" 
    }).toArray();

    console.log(`\n📊 Found ${anonymousCampaigns.length} anonymous campaigns`);

    if (anonymousCampaigns.length === 0) {
      console.log('No anonymous campaigns to update!');
      return;
    }

    // Show campaigns that will be updated
    console.log('\n📋 Campaigns to be assigned to you:');
    anonymousCampaigns.forEach((camp, idx) => {
      console.log(`   ${idx + 1}. ${camp.campaignName} (${camp.status}) - ${camp.sentCount}/${camp.totalRecipients} emails`);
    });

    console.log('\n🔧 Updating campaigns...');

    // Update all anonymous campaigns
    const result = await campaigns.updateMany(
      { userId: "anonymous" },
      { 
        $set: { 
          userId: user._id.toString(),
          userEmail: user.email 
        } 
      }
    );

    console.log(`\n✅ Updated ${result.modifiedCount} campaigns`);

    // Verify
    const yourCampaigns = await campaigns.find({ 
      userId: user._id.toString() 
    }).toArray();

    console.log(`\n✅ You now have ${yourCampaigns.length} campaigns!`);

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await client.close();
    console.log('\n🔌 Disconnected from MongoDB');
  }
}

assignAnonymousCampaigns().then(() => {
  console.log('\n✅ Script completed! Refresh your Campaign History page.');
  process.exit(0);
}).catch(error => {
  console.error('❌ Fatal error:', error);
  process.exit(1);
});
