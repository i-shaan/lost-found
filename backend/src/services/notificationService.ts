import nodemailer from 'nodemailer';
import { Types } from 'mongoose';
import Users from "../models/Users";
import { NotificationModel, INotification } from '../models/Message';
import { logger } from '../utils/loggers';
import { Server as SocketIOServer } from 'socket.io';
import { SentMessageInfo } from 'nodemailer/lib/smtp-transport';
import { ItemModel } from '../models/Item';
import dotenv from 'dotenv';

dotenv.config();

interface NotificationPayload {
  type: 'new_match' | 'item_resolved' | 'message' | 'system' | 'resolution_request' | 'resolution_confirmed';
  title: string;
  message: string;
  sourceItem?: any;
  matchedItem?: any;
  confidence?: number;
  reasons?: string[];
  item?: any;
  data?: any;
}

interface NotificationData {
  userId: Types.ObjectId;
  payload: NotificationPayload;
  io: SocketIOServer;
}

class NotificationService {
  private emailTransporter: nodemailer.Transporter;

  constructor() {
    this.emailTransporter = nodemailer.createTransport({
      host: 'smtp.gmail.com',
      port: 587,
      secure: false,
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS, // Use environment variable instead of hardcoded password
      },
    });
  }

  async createNotification(userId: Types.ObjectId, payload: NotificationPayload): Promise<INotification> {
    try {
      const notification = new NotificationModel({
        userId,
        type: payload.type,
        title: payload.title,
        message: payload.message,
        data: {
          sourceItem: payload.sourceItem,
          matchedItem: payload.matchedItem,
          confidence: payload.confidence,
          reasons: payload.reasons,
          item: payload.item,
          ...payload.data
        }
      });

      await notification.save();
      logger.info(`Notification created for user ${userId}: ${payload.title}`);
      return notification;
    } catch (error) {
      logger.error(`Error creating notification for user ${userId}:`, error);
      throw error;
    }
  }

  async notifyMatches(sourceItem: any, matches: any[], io: SocketIOServer): Promise<void> {
    try {
      logger.info(`Sending notifications for ${matches.length} matches`);

      for (const match of matches) {
        const fetchedItem = await ItemModel.findById(match.item_id).populate('reporter');
        if (!fetchedItem || !fetchedItem.reporter) {
          logger.warn(`Skipping match: Item or reporter not found for item_id ${match.item_id}`);
          continue;
        }

        match.item = fetchedItem;

        const payload: NotificationPayload = {
          type: 'new_match',
          title: `🎯 Potential Match Found for Your ${sourceItem?.type} Item!`,
          message: `We found a ${Math.round(match.confidence * 100)}% match for your ${sourceItem?.title}`,
          sourceItem,
          matchedItem: fetchedItem,
          confidence: match.confidence,
          reasons: match.reasons
        };

        await this.notifyUser(fetchedItem.reporter._id, payload, io);
      }
    } catch (error) {
      logger.error('Error sending match notifications:', error);
    }
  }

  async notifyUser(userId: Types.ObjectId, payload: NotificationPayload, io: SocketIOServer): Promise<void> {
    try {
      const user = await Users.findById(userId);
      if (!user) return;

      // Create notification in database
      const notification = await this.createNotification(userId, payload);

      // Send real-time notification via Socket.IO
      if (io) {
        const notificationData = {
          id: notification._id.toString(),
          userId: notification.userId,
          type: notification.type,
          title: notification.title,
          message: notification.message,
          data: notification.data,
          read: notification.read,
          createdAt: notification.createdAt,
          timeAgo: notification.timeAgo
        };
        
        io.to(`user_${userId}`).emit('notification', notificationData);
        io.to(`user_${userId}`).emit('unread_count_update', await this.getUnreadCount(userId));
      }

      // Send email notification if enabled
      if (user.notificationPreferences?.email) {
        await this.sendEmailNotification(user, payload);
      }

      logger.info(`Notification sent to user ${userId}`);
    } catch (error) {
      logger.error(`Error notifying user ${userId}:`, error);
    }
  }

  async getUserNotifications(userId: Types.ObjectId, page: number = 1, limit: number = 20): Promise<{
    notifications: INotification[];
    total: number;
    unreadCount: number;
    hasMore: boolean;
  }> {
    try {
      const skip = (page - 1) * limit;
      
      const [notifications, total, unreadCount] = await Promise.all([
        NotificationModel
          .find({ userId })
          .sort({ createdAt: -1 })
          .skip(skip)
          .limit(limit)
          .lean(),
        NotificationModel.countDocuments({ userId }),
        NotificationModel.countDocuments({ userId, read: false })
      ]);

      return {
        notifications,
        total,
        unreadCount,
        hasMore: total > skip + notifications.length
      };
    } catch (error) {
      logger.error(`Error fetching notifications for user ${userId}:`, error);
      throw error;
    }
  }

  async getUnreadCount(userId: Types.ObjectId): Promise<number> {
    try {
      return await NotificationModel.countDocuments({ userId, read: false });
    } catch (error) {
      logger.error(`Error getting unread count for user ${userId}:`, error);
      return 0;
    }
  }

  async markAsRead(notificationId: string, userId: Types.ObjectId): Promise<boolean> {
    try {
      const result = await NotificationModel.updateOne(
        { _id: notificationId, userId, read: false },
        { 
          $set: { 
            read: true, 
            readAt: new Date() 
          } 
        }
      );

      if (result.modifiedCount > 0) {
        logger.info(`Notification ${notificationId} marked as read for user ${userId}`);
        return true;
      }
      return false;
    } catch (error) {
      logger.error(`Error marking notification as read:`, error);
      return false;
    }
  }

  async markAllAsRead(userId: Types.ObjectId): Promise<number> {
    try {
      const result = await NotificationModel.updateMany(
        { userId, read: false },
        { 
          $set: { 
            read: true, 
            readAt: new Date() 
          } 
        }
      );

      logger.info(`${result.modifiedCount} notifications marked as read for user ${userId}`);
      return result.modifiedCount;
    } catch (error) {
      logger.error(`Error marking all notifications as read:`, error);
      return 0;
    }
  }

  async deleteNotification(notificationId: string, userId: Types.ObjectId): Promise<boolean> {
    try {
      const result = await NotificationModel.deleteOne({ _id: notificationId, userId });
      
      if (result.deletedCount > 0) {
        logger.info(`Notification ${notificationId} deleted for user ${userId}`);
        return true;
      }
      return false;
    } catch (error) {
      logger.error(`Error deleting notification:`, error);
      return false;
    }
  }

  async sendEmailNotification(user: any, payload: NotificationPayload): Promise<void> {
    try {
      let html: string;

      switch (payload.type) {
        case 'new_match':
          html = this.generateMatchEmailHTML(user, payload);
          break;
        case 'item_resolved':
          html = this.generateResolvedEmailHTML(user, payload);
          break;
        default:
          html = this.generateGenericEmailHTML(user, payload);
          break;
      }

      await this.emailTransporter.sendMail({
        from: `"FindIt Lost & Found" <${process.env.SMTP_USER}>`,
        to: user.email,
        subject: payload.title,
        html
      });

      logger.info(`Email sent to ${user.email}`);
    } catch (error) {
      logger.error(`Error sending email to ${user.email}:`, error);
    }
  }

  generateMatchEmailHTML(user: any, payload: NotificationPayload): string {
    const { sourceItem, matchedItem, confidence, reasons } = payload;
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Match Found - FindIt</title>
      </head>
      <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
        <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
          <h2 style="color: #2563eb;">🎯 Great News, ${user.name}!</h2>
          <p>We found a potential match for your ${sourceItem?.type} item!</p>
          
          <div style="background: #f8fafc; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <h3 style="margin-top: 0;">${matchedItem?.title}</h3>
            <p><strong>Match Confidence:</strong> ${Math.round((confidence || 0) * 100)}%</p>
            <p><strong>Location:</strong> ${matchedItem?.location}</p>
            ${reasons ? `<p><strong>Match Reasons:</strong> ${reasons.join(', ')}</p>` : ''}
          </div>
          
          <p>
            <a href="${process.env.FRONTEND_URL}/items/${sourceItem?._id}/matches" 
               style="background: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">
              View All Matches
            </a>
          </p>
          
          <p style="color: #666; font-size: 14px;">
            Best regards,<br>
            The FindIt Team
          </p>
        </div>
      </body>
      </html>
    `;
  }

  generateResolvedEmailHTML(user: any, payload: NotificationPayload): string {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Item Resolved - FindIt</title>
      </head>
      <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
        <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
          <h2 style="color: #059669;">✅ Great News, ${user.name}!</h2>
          <p>${payload.message}</p>
          
          <div style="background: #f0fdf4; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <h3 style="margin-top: 0;">${payload.item?.title}</h3>
            <p>Your item has been successfully resolved!</p>
          </div>
          
          <p style="color: #666; font-size: 14px;">
            Best regards,<br>
            The FindIt Team
          </p>
        </div>
      </body>
      </html>
    `;
  }

  generateGenericEmailHTML(user: any, payload: NotificationPayload): string {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>${payload.title}</title>
      </head>
      <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
        <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
          <h2>${payload.title}</h2>
          <p>Hi ${user.name},</p>
          <p>${payload.message}</p>
          
          <p style="color: #666; font-size: 14px;">
            Best regards,<br>
            The FindIt Team
          </p>
        </div>
      </body>
      </html>
    `;
  }

  async sendBulkNotifications(notifications: NotificationData[]): Promise<void> {
    const batchSize = parseInt(process.env.NOTIFICATION_BATCH_SIZE || '50');

    for (let i = 0; i < notifications.length; i += batchSize) {
      const batch = notifications.slice(i, i + batchSize);
      await Promise.all(
        batch.map(notification =>
          this.notifyUser(notification.userId, notification.payload, notification.io)
        )
      );

      if (i + batchSize < notifications.length) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }
  }

  // Cleanup old notifications (optional - can be run as a cron job)
  async cleanupOldNotifications(daysOld: number = 30): Promise<number> {
    try {
      const cutoffDate = new Date(Date.now() - daysOld * 24 * 60 * 60 * 1000);
      const result = await NotificationModel.deleteMany({
        createdAt: { $lt: cutoffDate },
        read: true
      });

      logger.info(`Cleaned up ${result.deletedCount} old notifications`);
      return result.deletedCount;
    } catch (error) {
      logger.error('Error cleaning up old notifications:', error);
      return 0;
    }
  }
}

export default new NotificationService();