import type { NextApiRequest, NextApiResponse } from 'next';
import { connectDB } from '../../../lib/db';
import { ObjectId } from 'mongodb';
import { User } from '../../../types';
import bcrypt from 'bcryptjs';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  try {
    const db = await connectDB();
    const usersCollection = db.collection('users');

    switch (req.method) {
      case 'GET':
        // Get all users (admin only)
        const users = await usersCollection
          .find({}, { projection: { password: 0 } })
          .toArray();

        // Normalize dates to strings to avoid Invalid Date in UI
        const normalized = users.map((u) => {
          const safe = (val: any) => {
            if (!val) return null;
            try {
              const d = new Date(val);
              if (isNaN(d.getTime())) return null;
              return d.toISOString();
            } catch {
              return null;
            }
          };

          return {
            ...u,
            createdAt: safe(u.createdAt),
            lastLogin: safe(u.lastLogin)
          };
        });

        res.status(200).json({
          success: true,
          users: normalized
        });
        break;

      case 'POST':
        // Create new user
        const { email, password, name, role = 'user' } = req.body;

        if (!email || !password || !name) {
          return res.status(400).json({
            success: false,
            message: 'Email, password, and name are required'
          });
        }

        // Check if user already exists
        const existingUser = await usersCollection.findOne({ 
          email: email.toLowerCase() 
        });

        if (existingUser) {
          return res.status(400).json({
            success: false,
            message: 'User with this email already exists'
          });
        }

        // Hash password
        const hashedPassword = await bcrypt.hash(password, 12);

        // Create user
        const newUser: Omit<User, '_id'> = {
          email: email.toLowerCase(),
          password: hashedPassword,
          name,
          role: role as 'admin' | 'user',
          isActive: true,
          createdAt: new Date()
        };

        const result = await usersCollection.insertOne(newUser);

        res.status(201).json({
          success: true,
          message: 'User created successfully',
          userId: result.insertedId
        });
        break;

      case 'PUT':
        // Update user
        const { userId, updates } = req.body;

        if (!userId) {
          return res.status(400).json({
            success: false,
            message: 'User ID is required'
          });
        }

        // Validate and convert userId to ObjectId
        let userObjectId: ObjectId;
        try {
          if (!ObjectId.isValid(userId)) {
            return res.status(400).json({ success: false, message: 'Invalid user ID' });
          }
          userObjectId = new ObjectId(userId);
        } catch (err) {
          return res.status(400).json({ success: false, message: 'Invalid user ID' });
        }

        // If password is being updated, hash it
        if (updates && updates.password) {
          updates.password = await bcrypt.hash(updates.password, 12);
        }

        // Match either by ObjectId or by string _id field (backwards compatibility)
        const updateResult = await usersCollection.updateOne(
          { $or: [{ _id: userObjectId }, { _id: userId }] },
          { $set: updates }
        );

        if (updateResult.matchedCount === 0) {
          return res.status(404).json({
            success: false,
            message: 'User not found'
          });
        }

        res.status(200).json({
          success: true,
          message: 'User updated successfully'
        });
        break;

      case 'DELETE':
        // Delete user permanently or deactivate
        const { userId: deleteUserId, permanent } = req.body;

        if (!deleteUserId) {
          return res.status(400).json({ success: false, message: 'User ID is required' });
        }

        if (!ObjectId.isValid(deleteUserId)) {
          return res.status(400).json({ success: false, message: 'Invalid user ID' });
        }

        const deleteObjectId = new ObjectId(deleteUserId);

        if (permanent) {
          // Permanently delete the user from database
          const deleteResult = await usersCollection.deleteOne(
            { $or: [{ _id: deleteObjectId }, { _id: deleteUserId }] }
          );

          if (deleteResult.deletedCount === 0) {
            return res.status(404).json({
              success: false,
              message: 'User not found'
            });
          }

          res.status(200).json({
            success: true,
            message: 'User permanently deleted'
          });
        } else {
          // Soft delete - just deactivate
          const deactivateResult = await usersCollection.updateOne(
            { $or: [{ _id: deleteObjectId }, { _id: deleteUserId }] },
            { $set: { isActive: false } }
          );

          if (deactivateResult.matchedCount === 0) {
            return res.status(404).json({
              success: false,
              message: 'User not found'
            });
          }

          res.status(200).json({
            success: true,
            message: 'User deactivated successfully'
          });
        }
        break;

      default:
        res.status(405).json({
          success: false,
          message: 'Method not allowed'
        });
    }

  } catch (error) {
    console.error('User management error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
}