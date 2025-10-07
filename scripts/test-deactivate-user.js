const { MongoClient } = require('mongodb');

async function run() {
  const uri = process.env.MONGODB_URI || 'mongodb+srv://ashanlokuge10_db_user:Q9hc8mb2NfXBtqJC@coldsendz.b9c8uzw.mongodb.net/';
  const client = new MongoClient(uri);
  try {
    await client.connect();
    const db = client.db('coldemail');
    const users = db.collection('users');

    const res = await users.updateOne({ email: 'admin@example.com' }, { $set: { isActive: false } });
    console.log('matchedCount', res.matchedCount, 'modifiedCount', res.modifiedCount);
  } catch (err) {
    console.error(err);
  } finally {
    await client.close();
  }
}

run();
