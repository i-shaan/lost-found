import { Request, Response } from 'express';
import jwt, { SignOptions, Secret } from 'jsonwebtoken';
import { validationResult } from 'express-validator';
import User, { IUser } from '../models/Users'
import { ItemModel as Item } from '../models/Item';
import { logger } from '../utils/loggers';
import { sendEmail } from '../services/emailService';
interface AuthRequest extends Request {
  user?: {
    id: string;
    _id: string;
  };
}


export class UserController {
  /**
   * Register a new user
   */
  static async register(req: Request, res: Response): Promise<void> {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        res.status(400).json({
          success: false,
          errors: errors.array()
        });
        return;
      }

      const { name, email, password } = req.body;

      // Check if user already exists
      const existingUser = await User.findOne({ email });
      if (existingUser) {
        res.status(400).json({
          success: false,
          message: 'User already exists with this email'
        });
        return;
      }

      // Create new user
      const user = new User({
        name,
        email,
        password
      });

      await user.save();
 // ✅ Send welcome email
 await sendEmail({
  to: email,
  subject: 'Welcome to Lost & Found!',
  template: 'welcome',
  data: { name }
});
      // Generate JWT
      const token = jwt.sign(
        { id: user._id },
        process.env.JWT_SECRET as string,
        {
          expiresIn: "7d"
        }
      );


      res.status(201).json({
        success: true,
        data: {
          user: {
            id: user._id,
            name: user.name,
            email: user.email,
            isVerified: user.isVerified,
            reputation: user.reputation
          },
          token
        },
        message: 'User registered successfully'
      });

    } catch (error: any) {
      logger.error('Registration error:', error);
      res.status(500).json({
        success: false,
        message: 'Registration failed',
        error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
      });
    }
  }

  /**
   * Login user
   */
  static async login(req: Request, res: Response): Promise<void> {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        res.status(400).json({
          success: false,
          errors: errors.array()
        });
        return;
      }

      const { email, password } = req.body;

      // Find user
      const user = await User.findOne({ email });
      if (!user) {
        res.status(400).json({
          success: false,
          message: 'Invalid credentials'
        });
        return;
      }

      // Check password
      const isMatch = await user.comparePassword(password);
      if (!isMatch) {
        res.status(400).json({
          success: false,
          message: 'Invalid credentials'
        });
        return;
      }

      // Update last active
      await user.updateLastActive();

      // Generate JWT
      const token = jwt.sign(
        { id: user._id },
        process.env.JWT_SECRET as string,
        {
          expiresIn: "7d"
        }
      );
      
      
      res.cookie('token', token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
      });
      res.json({
        success: true,
        data: {
          user: {
            id: user._id,
            name: user.name,
            email: user.email,
            isVerified: user.isVerified,
            reputation: user.reputation,
            itemsPosted: user.itemsPosted,
            itemsResolved: user.itemsResolved
          },
          token
        },
        message: 'Login successful'
      });

    } catch (error: any) {
      logger.error('Login error:', error);
      res.status(500).json({
        success: false,
        message: 'Login failed',
        error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
      });
    }
  }

  /**
   * Get user profile
   */
  static async getProfile(req: AuthRequest, res: Response): Promise<void> {
    try {
      const user = await User.findById(req.user?.id).select('-password');
      
      res.json({
        success: true,
        data: user
      });

    } catch (error: any) {
      logger.error('Error fetching profile:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch profile',
        error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
      });
    }
  }

  /**
   * Update user profile
   */
  static async updateProfile(req: AuthRequest, res: Response): Promise<void> {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        res.status(400).json({
          success: false,
          errors: errors.array()
        });
        return;
      }

      const updates = req.body;
      delete updates.password; // Prevent password update through this route
      delete updates.email; // Prevent email update through this route

      const user = await User.findByIdAndUpdate(
        req.user?.id,
        updates,
        { new: true, runValidators: true }
      ).select('-password');

      res.json({
        success: true,
        data: user,
        message: 'Profile updated successfully'
      });

    } catch (error: any) {
      logger.error('Error updating profile:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to update profile',
        error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
      });
    }
  }

  /**
   * Update notification preferences
   */
  static async updateNotificationPreferences(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { email, push, sms } = req.body;
      
      const user = await User.findByIdAndUpdate(
        req.user?.id,
        {
          notificationPreferences: {
            email: email !== undefined ? email : true,
            push: push !== undefined ? push : true,
            sms: sms !== undefined ? sms : false
          }
        },
        { new: true }
      ).select('-password');

      res.json({
        success: true,
        data: user,
        message: 'Notification preferences updated successfully'
      });

    } catch (error: any) {
      logger.error('Error updating notification preferences:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to update notification preferences',
        error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
      });
    }
  }

  /**
   * Change user password
   */
  static async changePassword(req: AuthRequest, res: Response): Promise<void> {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        res.status(400).json({
          success: false,
          errors: errors.array()
        });
        return;
      }

      const { currentPassword, newPassword } = req.body;

      const user = await User.findById(req.user?.id);
      if (!user) {
        res.status(404).json({
          success: false,
          message: 'User not found'
        });
        return;
      }
      
      // Verify current password
      const isMatch = await user.comparePassword(currentPassword);
      if (!isMatch) {
        res.status(400).json({
          success: false,
          message: 'Current password is incorrect'
        });
        return;
      }

      // Update password
      user.password = newPassword;
      await user.save();

      res.json({
        success: true,
        message: 'Password updated successfully'
      });

    } catch (error: any) {
      logger.error('Error changing password:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to change password',
        error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
      });
    }
  }

  /**
   * Get user statistics
   */
  static async getUserStats(req: AuthRequest, res: Response): Promise<void> {
    try {
      const userStats = await Item.aggregate([
        { $match: { reporter: req.user?._id } },
        {
          $group: {
            _id: null,
            totalItems: { $sum: 1 },
            lostItems: { $sum: { $cond: [{ $eq: ['$type', 'lost'] }, 1, 0] } },
            foundItems: { $sum: { $cond: [{ $eq: ['$type', 'found'] }, 1, 0] } },
            resolvedItems: { $sum: { $cond: [{ $eq: ['$status', 'resolved'] }, 1, 0] } },
            totalViews: { $sum: '$views' },
            totalMatches: { $sum: { $size: '$matches' } }
          }
        }
      ]);

      const stats = userStats[0] || {
        totalItems: 0,
        lostItems: 0,
        foundItems: 0,
        resolvedItems: 0,
        totalViews: 0,
        totalMatches: 0
      };

      res.json({
        success: true,
        data: stats
      });

    } catch (error: any) {
      logger.error('Error fetching user statistics:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch statistics',
        error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
      });
    }
  }
}