const bcrypt = require('bcryptjs');
const { MongoClient, ObjectId } = require('mongodb');

async function createUser() {
  const uri = process.env.MONGODB_URI || 'mongodb+srv://ashanlokuge10_db_user:Q9hc8mb2NfXBtqJC@coldsendz.b9c8uzw.mongodb.net/';
  const client = new MongoClient(uri);

  try {
    await client.connect();
    console.log('Connected to MongoDB');

    const db = client.db('coldemail');
    const usersCollection = db.collection('users');

    // User details
    const email = 'ashanlokuge10@gmail.com';
    const password = 'Welcome@2025'; // Change this after first login!
    const name = 'Ashan Lokuge';

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create user
    const newUser = {
      email,
      password: hashedPassword,
      name,
      role: 'admin', // Setting as admin
      subscription: {
        plan: 'pro',
        emailLimit: 10000,
        emailsUsed: 0
      },
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    const result = await usersCollection.insertOne(newUser);
    
    console.log('\n✅ User created successfully!');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('📧 Email:', email);
    console.log('🔑 Temporary Password:', password);
    console.log('👤 Name:', name);
    console.log('🎭 Role:', 'admin');
    console.log('📦 Plan:', 'pro (10,000 emails)');
    console.log('🆔 User ID:', result.insertedId.toString());
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('\n🌐 Login at: http://localhost:3001/login');
    console.log('⚠️  Please change your password after first login!');
    
  } catch (error) {
    console.error('Error creating user:', error);
  } finally {
    await client.close();
  }
}

createUser();
