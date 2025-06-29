import nodemailer from 'nodemailer';
import { Types } from 'mongoose';
import Users from "../models/Users"
import { logger } from '../utils/loggers';
import { Server as SocketIOServer } from 'socket.io';
import { SentMessageInfo } from 'nodemailer/lib/smtp-transport';
import { ItemModel } from '../models/Item';
import dotenv from 'dotenv';
dotenv.config();
interface Notification {
  type: 'new_match' | 'item_resolved';
  sourceItem?: any;
  matchedItem?: any;
  confidence?: number;
  reasons?: string[];
  item?: any;
}

interface NotificationData {
  userId: Types.ObjectId;
  data: Notification;
  io: SocketIOServer;
}

class NotificationService {
  private emailTransporter: nodemailer.Transporter;

  constructor() {
    this.emailTransporter = nodemailer.createTransport({
        host: 'smtp.gmail.com',
        port: 587,
        secure: false,           // Set true for port 465 (SSL)
        auth: {
          user: process.env.SMTP_USER,
          pass: 'esvvbzrjynrzmwxn',
        },
    });
  }

  async notifyMatches(sourceItem: any, matches: any[], io: SocketIOServer): Promise<void> {
    try {
      logger.info(`Sending notifications for ${matches.length} matches`);
  
      for (const match of matches) {
        // Step 1: Fetch the full item with populated reporter
        const fetchedItem = await ItemModel.findById(match.item_id).populate('reporter');
        if (!fetchedItem || !fetchedItem.reporter) {
          logger.warn(`Skipping match: Item or reporter not found for item_id ${match.item_id}`);
          continue;
        }
  
        // Step 2: Inject the full item into match
        match.item = fetchedItem;
  
        // Step 3: Proceed with notification
        await this.notifyUser(fetchedItem.reporter._id, {
          type: 'new_match',
          sourceItem,
          matchedItem: fetchedItem,
          confidence: match.confidence,
          reasons: match.reasons
        }, io);
      }
  
    } catch (error) {
      logger.error('Error sending match notifications:', error);
    }
  }

  async notifyUser(userId: Types.ObjectId, notification: Notification, io: SocketIOServer): Promise<void> {
    try {
      const user = await Users.findById(userId);
      if (!user) return;

      if (io) {
        io.to(`user_${userId}`).emit('notification', notification);
      }

      if (user.notificationPreferences?.email) {
        await this.sendEmailNotification(user, notification);
      }

      logger.info(`Notification sent to user ${userId}`);
    } catch (error) {
      logger.error(`Error notifying user ${userId}:`, error);
    }
  }

  async sendEmailNotification(user: any, notification: Notification): Promise<void> {
    try {
      let subject: string | undefined;
      let html: string | undefined;

      switch (notification.type) {
        case 'new_match':
          subject = `🎯 Potential Match Found for Your ${notification.sourceItem?.type} Item!`;
          html = this.generateMatchEmailHTML(user, notification);
          break;

        case 'item_resolved':
          subject = `✅ Your Item Has Been Resolved!`;
          html = this.generateResolvedEmailHTML(user, notification);
          break;

        default:
          return;
      }

      await this.emailTransporter.sendMail({
        from: `"FindIt Lost & Found" <${process.env.SMTP_USER}>`,
        to: user.email,
        subject,
        html
      });

      logger.info(`Email sent to ${user.email}`);
    } catch (error) {
      logger.error(`Error sending email to ${user.email}:`, error);
    }
  }

  generateMatchEmailHTML(user: any, notification: Notification): string {
    const { sourceItem, matchedItem, confidence, reasons } = notification;
    return `<!DOCTYPE html>...${/* OMITTED for brevity - identical to original HTML */''}`;
  }

  generateResolvedEmailHTML(user: any, notification: Notification): string {
    return `<!DOCTYPE html>...${/* OMITTED for brevity - identical to original HTML */''}`;
  }

  async sendBulkNotifications(notifications: NotificationData[]): Promise<void> {
    const batchSize = parseInt(process.env.NOTIFICATION_BATCH_SIZE || '50');

    for (let i = 0; i < notifications.length; i += batchSize) {
      const batch = notifications.slice(i, i + batchSize);
      await Promise.all(
        batch.map(notification =>
          this.notifyUser(notification.userId, notification.data, notification.io)
        )
      );

      if (i + batchSize < notifications.length) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }
  }
}

export default new NotificationService();
