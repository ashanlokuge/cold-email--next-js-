// Script to inspect MongoDB collections
const { MongoClient } = require('mongodb');

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb+srv://ashanlokuge10_db_user:Q9hc8mb2NfXBtqJC@coldsendz.b9c8uzw.mongodb.net/?retryWrites=true&w=majority&appName=ColdSendz';
const DB_NAME = process.env.MONGODB_DB || 'coldEmailSender';

async function inspectDatabase() {
  const client = new MongoClient(MONGODB_URI);

  try {
    await client.connect();
    console.log('✅ Connected to MongoDB');
    console.log(`📂 Database: ${DB_NAME}\n`);

    const db = client.db(DB_NAME);
    
    // List all collections
    const collections = await db.listCollections().toArray();
    console.log('📋 Collections in database:');
    for (const coll of collections) {
      const count = await db.collection(coll.name).countDocuments();
      console.log(`   - ${coll.name}: ${count} documents`);
    }

    // Check campaigns collection specifically
    console.log('\n🔍 Detailed inspection of campaigns collection:');
    const campaigns = db.collection('campaigns');
    const count = await campaigns.countDocuments();
    console.log(`   Total documents: ${count}`);
    
    if (count > 0) {
      const sample = await campaigns.find({}).limit(3).toArray();
      console.log('\n   Sample campaigns:');
      sample.forEach((camp, idx) => {
        console.log(`\n   Campaign ${idx + 1}:`);
        console.log(`     _id: ${camp._id}`);
        console.log(`     campaignName: ${camp.campaignName}`);
        console.log(`     userId: ${JSON.stringify(camp.userId)}`);
        console.log(`     userId type: ${typeof camp.userId}`);
        console.log(`     userEmail: ${camp.userEmail}`);
        console.log(`     status: ${camp.status}`);
        console.log(`     createdAt: ${camp.createdAt}`);
      });
    }

    // Check users collection
    console.log('\n👥 Users in database:');
    const users = db.collection('users');
    const usersList = await users.find({}).toArray();
    usersList.forEach(user => {
      console.log(`   - ${user.email} (${user._id})`);
    });

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await client.close();
    console.log('\n🔌 Disconnected from MongoDB');
  }
}

inspectDatabase().then(() => {
  process.exit(0);
}).catch(error => {
  console.error('❌ Fatal error:', error);
  process.exit(1);
});
