// import express, { Request, Response } from 'express';
// import auth from '../middleware/auth';
// import { logger } from '../utils/loggers';

// const router = express.Router();

// // Notification type
// interface Notification {
//   id: string;
//   title: string;
//   message: string;
//   type?: string;
//   read: boolean;
//   readAt?: Date;
//   createdAt: Date;
// }

// // Extend Request to include authenticated user
// interface AuthenticatedRequest extends Request {
//   user: {
//     id: string;
//   };
// }

// // In-memory store (replace with DB in production)
// const notifications = new Map<string, Notification[]>();
// /**
//  * @swagger
//  * tags:
//  *   name: Notifications
//  *   description: Endpoints for managing user notifications
//  */

// /**
//  * @swagger
//  * /notifications:
//  *   get:
//  *     summary: Fetch paginated notifications for the logged-in user
//  *     tags: [Notifications]
//  *     security:
//  *       - bearerAuth: []
//  *     parameters:
//  *       - in: query
//  *         name: page
//  *         schema:
//  *           type: integer
//  *         description: Page number
//  *       - in: query
//  *         name: limit
//  *         schema:
//  *           type: integer
//  *         description: Number of notifications per page
//  *       - in: query
//  *         name: unreadOnly
//  *         schema:
//  *           type: boolean
//  *         description: Whether to fetch only unread notifications
//  *     responses:
//  *       200:
//  *         description: Notifications fetched successfully
//  *       500:
//  *         description: Server error
//  */

// // GET: Fetch notifications
// router.get('/', auth, async (req: Request, res: Response) => {
//   try {
//     const page = parseInt(req.query.page as string) || 1;
//     const limit = parseInt(req.query.limit as string) || 20;
//     const unreadOnly = req.query.unreadOnly === 'true';

//     const userNotifications = notifications.get((req as AuthenticatedRequest).user.id) || [];

//     let filtered = userNotifications;
//     if (unreadOnly) {
//       filtered = filtered.filter(n => !n.read);
//     }

//     const start = (page - 1) * limit;
//     const paginated = filtered.slice(start, start + limit);

//     res.json({
//       success: true,
//       data: {
//         notifications: paginated,
//         pagination: {
//           page,
//           limit,
//           total: filtered.length,
//           unread: userNotifications.filter(n => !n.read).length
//         }
//       }
//     });
//   } catch (error) {
//     logger.error('Error fetching notifications:', error);
//     res.status(500).json({
//       success: false,
//       message: 'Failed to fetch notifications',
//       error: process.env.NODE_ENV === 'development' ? (error as Error).message : 'Internal server error'
//     });
//   }
// });
// /**
//  * @swagger
//  * /notifications/{notificationId}/read:
//  *   put:
//  *     summary: Mark a notification as read
//  *     tags: [Notifications]
//  *     security:
//  *       - bearerAuth: []
//  *     parameters:
//  *       - in: path
//  *         name: notificationId
//  *         required: true
//  *         schema:
//  *           type: string
//  *         description: ID of the notification to mark as read
//  *     responses:
//  *       200:
//  *         description: Notification marked as read
//  *       404:
//  *         description: Notification not found
//  *       500:
//  *         description: Server error
//  */

// // PUT: Mark notification as read

// router.put('/:notificationId/read', auth, async (req: Request, res: Response) => {
//   try {
//     const { notificationId } = req.params;
//     const userNotifications = notifications.get((req as AuthenticatedRequest).user.id) || [];

//     const notification = userNotifications.find(n => n.id === notificationId);
//     if (!notification) {
//       return res.status(404).json({ success: false, message: 'Notification not found' });
//     }

//     notification.read = true;
//     notification.readAt = new Date();

//     res.json({ success: true, message: 'Notification marked as read' });
//   } catch (error) {
//     logger.error('Error marking notification as read:', error);
//     res.status(500).json({
//       success: false,
//       message: 'Failed to mark notification as read',
//       error: process.env.NODE_ENV === 'development' ? (error as Error).message : 'Internal server error'
//     });
//   }
// });
// /**
//  * @swagger
//  * /notifications/mark-all-read:
//  *   put:
//  *     summary: Mark all notifications as read for the logged-in user
//  *     tags: [Notifications]
//  *     security:
//  *       - bearerAuth: []
//  *     responses:
//  *       200:
//  *         description: All notifications marked as read
//  *       500:
//  *         description: Server error
//  */

// // PUT: Mark all notifications as read
// router.put('/mark-all-read', auth, async (req: Request, res: Response) => {
//   try {
//     const userNotifications = notifications.get((req as AuthenticatedRequest).user.id) || [];

//     userNotifications.forEach(n => {
//       n.read = true;
//       n.readAt = new Date();
//     });

//     res.json({ success: true, message: 'All notifications marked as read' });
//   } catch (error) {
//     logger.error('Error marking all notifications as read:', error);
//     res.status(500).json({
//       success: false,
//       message: 'Failed to mark all notifications as read',
//       error: process.env.NODE_ENV === 'development' ? (error as Error).message : 'Internal server error'
//     });
//   }
// });

// // DELETE: Delete a notification
// router.delete('/:notificationId', auth, async (req: Request, res: Response) => {
//   try {
//     const { notificationId } = req.params;
//     const userNotifications = notifications.get((req as AuthenticatedRequest).user.id) || [];

//     const index = userNotifications.findIndex(n => n.id === notificationId);
//     if (index === -1) {
//       return res.status(404).json({ success: false, message: 'Notification not found' });
//     }

//     userNotifications.splice(index, 1);
//     res.json({ success: true, message: 'Notification deleted successfully' });
//   } catch (error) {
//     logger.error('Error deleting notification:', error);
//     res.status(500).json({
//       success: false,
//       message: 'Failed to delete notification',
//       error: process.env.NODE_ENV === 'development' ? (error as Error).message : 'Internal server error'
//     });
//   }
// });

// // Helper to add a new notification
// function addNotification(
//   userId: string,
//   notification: Omit<Notification, 'id' | 'read' | 'createdAt' | 'readAt'>
// ): Notification {
//   const userNotifications = notifications.get(userId) || [];

//   const newNotification: Notification = {
//     id: Math.random().toString(36).substring(2, 10),
//     ...notification,
//     read: false,
//     createdAt: new Date()
//   };

//   userNotifications.unshift(newNotification);
//   if (userNotifications.length > 100) {
//     userNotifications.splice(100);
//   }

//   notifications.set(userId, userNotifications);
//   return newNotification;
// }

// export default router;
import express, { Request, Response } from 'express';
import auth from '../middleware/auth';
import { logger } from '../utils/loggers';
import notificationService from '../services/notificationService';
import { Types } from 'mongoose';

const router = express.Router();

// Extend Request to include authenticated user
interface AuthenticatedRequest extends Request {
  user: {
    id: string;
  };
}

/**
 * @swagger
 * tags:
 *   name: Notifications
 *   description: Endpoints for managing user notifications
 */

/**
 * @swagger
 * /notifications:
 *   get:
 *     summary: Fetch paginated notifications for the logged-in user
 *     tags: [Notifications]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *         description: Page number (default: 1)
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *         description: Number of notifications per page (default: 20)
 *     responses:
 *       200:
 *         description: Notifications fetched successfully
 *       500:
 *         description: Server error
 */
router.get('/', auth, async (req: Request, res: Response) => {
  try {
    
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const userId = new Types.ObjectId((req as AuthenticatedRequest).user.id);
  
    const result = await notificationService.getUserNotifications(userId, page, limit);
    logger.info("result",req.params)

    res.json({
      success: true,
      data: {
        notifications: result.notifications,
        pagination: {
          page,
          limit,
          total: result.total,
          unreadCount: result.unreadCount,
          hasMore: result.hasMore
        }
      }
    });
  } catch (error) {
    logger.error('Error fetching notifications:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch notifications',
      error: process.env.NODE_ENV === 'development' ? (error as Error).message : 'Internal server error'
    });
  }
});

/**
 * @swagger
 * /notifications/unread-count:
 *   get:
 *     summary: Get unread notification count for the logged-in user
 *     tags: [Notifications]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Unread count fetched successfully
 *       500:
 *         description: Server error
 */
router.get('/unread-count', auth, async (req: Request, res: Response) => {
  try {
    const userId = new Types.ObjectId((req as AuthenticatedRequest).user.id);
    const unreadCount = await notificationService.getUnreadCount(userId);

    res.json({
      success: true,
      data: { unreadCount }
    });
  } catch (error) {
    logger.error('Error fetching unread count:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch unread count',
      error: process.env.NODE_ENV === 'development' ? (error as Error).message : 'Internal server error'
    });
  }
});

/**
 * @swagger
 * /notifications/{notificationId}/read:
 *   put:
 *     summary: Mark a notification as read
 *     tags: [Notifications]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: notificationId
 *         required: true
 *         schema:
 *           type: string
 *         description: ID of the notification to mark as read
 *     responses:
 *       200:
 *         description: Notification marked as read
 *       404:
 *         description: Notification not found
 *       500:
 *         description: Server error
 */
router.put('/:notificationId/read', auth, async (req: Request, res: Response) => {
  try {
    const { notificationId } = req.params;
    const userId = new Types.ObjectId((req as AuthenticatedRequest).user.id);

    const success = await notificationService.markAsRead(notificationId, userId);

    if (!success) {
      return res.status(404).json({ 
        success: false, 
        message: 'Notification not found or already read' 
      });
    }

    // Get updated unread count
    const unreadCount = await notificationService.getUnreadCount(userId);

    res.json({ 
      success: true, 
      message: 'Notification marked as read',
      data: { unreadCount }
    });
  } catch (error) {
    logger.error('Error marking notification as read:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to mark notification as read',
      error: process.env.NODE_ENV === 'development' ? (error as Error).message : 'Internal server error'
    });
  }
});

/**
 * @swagger
 * /notifications/mark-all-read:
 *   put:
 *     summary: Mark all notifications as read for the logged-in user
 *     tags: [Notifications]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: All notifications marked as read
 *       500:
 *         description: Server error
 */
router.put('/mark-all-read', auth, async (req: Request, res: Response) => {
  try {
    const userId = new Types.ObjectId((req as AuthenticatedRequest).user.id);
    const markedCount = await notificationService.markAllAsRead(userId);

    res.json({ 
      success: true, 
      message: `${markedCount} notifications marked as read`,
      data: { markedCount }
    });
  } catch (error) {
    logger.error('Error marking all notifications as read:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to mark all notifications as read',
      error: process.env.NODE_ENV === 'development' ? (error as Error).message : 'Internal server error'
    });
  }
});

/**
 * @swagger
 * /notifications/{notificationId}:
 *   delete:
 *     summary: Delete a notification
 *     tags: [Notifications]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: notificationId
 *         required: true
 *         schema:
 *           type: string
 *         description: ID of the notification to delete
 *     responses:
 *       200:
 *         description: Notification deleted successfully
 *       404:
 *         description: Notification not found
 *       500:
 *         description: Server error
 */
router.delete('/:notificationId', auth, async (req: Request, res: Response) => {
  try {
    const { notificationId } = req.params;
    const userId = new Types.ObjectId((req as AuthenticatedRequest).user.id);

    const success = await notificationService.deleteNotification(notificationId, userId);

    if (!success) {
      return res.status(404).json({ 
        success: false, 
        message: 'Notification not found' 
      });
    }

    res.json({ 
      success: true, 
      message: 'Notification deleted successfully' 
    });
  } catch (error) {
    logger.error('Error deleting notification:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete notification',
      error: process.env.NODE_ENV === 'development' ? (error as Error).message : 'Internal server error'
    });
  }
});

/**
 * @swagger
 * /notifications/test:
 *   post:
 *     summary: Create a test notification (development only)
 *     tags: [Notifications]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               type:
 *                 type: string
 *                 enum: [new_match, item_resolved, message, system]
 *               title:
 *                 type: string
 *               message:
 *                 type: string
 *     responses:
 *       201:
 *         description: Test notification created
 *       400:
 *         description: Bad request
 *       500:
 *         description: Server error
 */
router.post('/test', auth, async (req: Request, res: Response) => {
  try {
    // Only allow in development
    if (process.env.NODE_ENV === 'production') {
      return res.status(403).json({
        success: false,
        message: 'Test endpoint not available in production'
      });
    }

    const { type = 'system', title, message } = req.body;
    const userId = new Types.ObjectId((req as AuthenticatedRequest).user.id);

    if (!title || !message) {
      return res.status(400).json({
        success: false,
        message: 'Title and message are required'
      });
    }

    const notification = await notificationService.createNotification(userId, {
      type,
      title,
      message
    });

    res.status(201).json({
      success: true,
      message: 'Test notification created',
      data: notification
    });
  } catch (error) {
    logger.error('Error creating test notification:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create test notification',
      error: process.env.NODE_ENV === 'development' ? (error as Error).message : 'Internal server error'
    });
  }
});

export default router;