#!/usr/bin/env node

const bcrypt = require('bcryptjs');
const { MongoClient } = require('mongodb');

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017';
const MONGODB_DB = process.env.MONGODB_DB || 'coldemail';

async function createDefaultAdmin() {
  console.log('🔧 Setting up default admin user...');
  
  const client = new MongoClient(MONGODB_URI);
  
  try {
    await client.connect();
    console.log('✅ Connected to MongoDB');
    
    const db = client.db(MONGODB_DB);
    const usersCollection = db.collection('users');
    
    // Check if admin already exists
    const existingAdmin = await usersCollection.findOne({ 
      email: 'admin@example.com' 
    });
    
    if (existingAdmin) {
      console.log('⚠️  Admin user already exists');
      console.log('📧 Email: admin@example.com');
      console.log('🔑 Password: admin123');
      return;
    }
    
    // Create default admin user
    const hashedPassword = await bcrypt.hash('admin123', 12);
    
    const adminUser = {
      email: 'admin@example.com',
      password: hashedPassword,
      name: 'Administrator',
      role: 'admin',
      isActive: true,
      createdAt: new Date()
    };
    
    await usersCollection.insertOne(adminUser);
    console.log('🎉 Default admin user created successfully!');
    console.log('');
    console.log('📧 Email: admin@example.com');
    console.log('🔑 Password: admin123');
    console.log('');
    console.log('⚠️  Please change the default password after first login!');
    
  } catch (error) {
    console.error('❌ Error creating admin user:', error);
    process.exit(1);
  } finally {
    await client.close();
  }
}

// Run the setup
createDefaultAdmin();