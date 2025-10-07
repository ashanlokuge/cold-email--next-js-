import { connectDB } from './db';
import { User } from '../types';
import bcrypt from 'bcryptjs';
import { ObjectId, WithId } from 'mongodb';

/**
 * MongoDB MCP-style interface for user operations
 * Provides a clean API for database operations
 */
export class UserRepository {
  
  /**
   * Create a new user
   */
  static async createUser(userData: Omit<User, '_id' | 'createdAt'>): Promise<string> {
    try {
      const db = await connectDB();
      const usersCollection = db.collection('users');
      
      // Check if user already exists
      const existingUser = await usersCollection.findOne({ 
        email: userData.email.toLowerCase() 
      });
      
      if (existingUser) {
        throw new Error('User with this email already exists');
      }
      
      // Hash password
      const hashedPassword = await bcrypt.hash(userData.password, 12);
      
      const newUser = {
        ...userData,
        email: userData.email.toLowerCase(),
        password: hashedPassword,
        createdAt: new Date()
      };
      
  const result = await usersCollection.insertOne(newUser);
  // insertedId is an ObjectId
  return result.insertedId.toHexString();
      
    } catch (error) {
      throw new Error(`Failed to create user: ${error.message}`);
    }
  }
  
  /**
   * Find user by email
   */
  static async findByEmail(email: string): Promise<User | null> {
    try {
      const db = await connectDB();
      const usersCollection = db.collection('users');
      
      const user = await usersCollection.findOne<User>({
        email: email.toLowerCase()
      });

      return user || null;
      
    } catch (error) {
      throw new Error(`Failed to find user: ${error.message}`);
    }
  }
  
  /**
   * Verify user password
   */
  static async verifyPassword(email: string, password: string): Promise<User | null> {
    try {
      const user = await this.findByEmail(email);
      
      if (!user || !user.isActive) {
        return null;
      }
      
      const isValid = await bcrypt.compare(password, user.password);
      return isValid ? user : null;
      
    } catch (error) {
      throw new Error(`Failed to verify password: ${error.message}`);
    }
  }
  
  /**
   * Update user login timestamp
   */
  static async updateLastLogin(userId: string): Promise<void> {
    try {
      const db = await connectDB();
      const usersCollection = db.collection('users');
      
      const _id = new ObjectId(userId);
      await usersCollection.updateOne(
        { _id },
        { $set: { lastLogin: new Date() } }
      );
      
    } catch (error) {
      throw new Error(`Failed to update last login: ${error.message}`);
    }
  }
  
  /**
   * Get all users (admin only)
   */
  static async getAllUsers(): Promise<Omit<User, 'password'>[]> {
    try {
      const db = await connectDB();
      const usersCollection = db.collection('users');
      
      const usersWithId = await usersCollection
        .find<User>({}, { projection: { password: 0 } })
        .sort({ createdAt: -1 })
        .toArray() as WithId<Omit<User, 'password'>>[];

      // Strip any MongoDB internal fields if necessary and ensure shape
      const users = usersWithId.map(u => {
        const { _id, ...rest } = u as any;
        return rest as Omit<User, 'password'>;
      });

      return users;
      
    } catch (error) {
      throw new Error(`Failed to get users: ${error.message}`);
    }
  }
  
  /**
   * Update user
   */
  static async updateUser(userId: string, updates: Partial<User>): Promise<void> {
    try {
      const db = await connectDB();
      const usersCollection = db.collection('users');
      
      // Hash password if provided
      if (updates.password) {
        updates.password = await bcrypt.hash(updates.password, 12);
      }
      
      const _id = new ObjectId(userId);
      // Avoid attempting to set _id from updates
      const { _id: _ignore, ...safeUpdates } = updates as any;

      const result = await usersCollection.updateOne(
        { _id },
        { $set: safeUpdates }
      );
      
      if (result.matchedCount === 0) {
        throw new Error('User not found');
      }
      
    } catch (error) {
      throw new Error(`Failed to update user: ${error.message}`);
    }
  }
  
  /**
   * Delete/Deactivate user
   */
  static async deactivateUser(userId: string): Promise<void> {
    try {
      await this.updateUser(userId, { isActive: false });
    } catch (error) {
      throw new Error(`Failed to deactivate user: ${error.message}`);
    }
  }
  
  /**
   * Create default admin user
   */
  static async createDefaultAdmin(): Promise<boolean> {
    try {
      const existingAdmin = await this.findByEmail('admin@example.com');
      
      if (existingAdmin) {
        console.log('⚠️  Admin user already exists');
        return false;
      }
      
      await this.createUser({
        email: 'admin@example.com',
        password: 'admin123',
        name: 'Administrator',
        role: 'admin',
        isActive: true
      });
      
      console.log('🎉 Default admin user created successfully!');
      return true;
      
    } catch (error) {
      throw new Error(`Failed to create default admin: ${error.message}`);
    }
  }
}

/**
 * MongoDB Health Check
 */
export async function checkDatabaseHealth(): Promise<{
  connected: boolean;
  database: string;
  collections: string[];
  error?: string;
}> {
  try {
    const db = await connectDB();
    const collections = await db.listCollections().toArray();
    
    return {
      connected: true,
      database: db.databaseName,
      collections: collections.map(c => c.name)
    };
    
  } catch (error) {
    return {
      connected: false,
      database: '',
      collections: [],
      error: error.message
    };
  }
}

/**
 * Initialize database with default data
 */
export async function initializeDatabase(): Promise<void> {
  try {
    console.log('🔧 Initializing database...');
    
    // Initialize collections and indexes
    const { initializeCollections } = await import('./db');
    await initializeCollections();
    
    // Create default admin user
    await UserRepository.createDefaultAdmin();
    
    console.log('✅ Database initialized successfully');
    
  } catch (error) {
    console.error('❌ Database initialization failed:', error);
    throw error;
  }
}