import express, { Request, Response } from 'express';
import auth from '../middleware/auth';
import { logger } from '../utils/loggers';

const router = express.Router();

// Notification type
interface Notification {
  id: string;
  title: string;
  message: string;
  type?: string;
  read: boolean;
  readAt?: Date;
  createdAt: Date;
}

// Extend Request to include authenticated user
interface AuthenticatedRequest extends Request {
  user: {
    id: string;
  };
}

// In-memory store (replace with DB in production)
const notifications = new Map<string, Notification[]>();
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
 *         description: Page number
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *         description: Number of notifications per page
 *       - in: query
 *         name: unreadOnly
 *         schema:
 *           type: boolean
 *         description: Whether to fetch only unread notifications
 *     responses:
 *       200:
 *         description: Notifications fetched successfully
 *       500:
 *         description: Server error
 */

// GET: Fetch notifications
router.get('/', auth, async (req: Request, res: Response) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const unreadOnly = req.query.unreadOnly === 'true';

    const userNotifications = notifications.get((req as AuthenticatedRequest).user.id) || [];

    let filtered = userNotifications;
    if (unreadOnly) {
      filtered = filtered.filter(n => !n.read);
    }

    const start = (page - 1) * limit;
    const paginated = filtered.slice(start, start + limit);

    res.json({
      success: true,
      data: {
        notifications: paginated,
        pagination: {
          page,
          limit,
          total: filtered.length,
          unread: userNotifications.filter(n => !n.read).length
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

// PUT: Mark notification as read

router.put('/:notificationId/read', auth, async (req: Request, res: Response) => {
  try {
    const { notificationId } = req.params;
    const userNotifications = notifications.get((req as AuthenticatedRequest).user.id) || [];

    const notification = userNotifications.find(n => n.id === notificationId);
    if (!notification) {
      return res.status(404).json({ success: false, message: 'Notification not found' });
    }

    notification.read = true;
    notification.readAt = new Date();

    res.json({ success: true, message: 'Notification marked as read' });
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

// PUT: Mark all notifications as read
router.put('/mark-all-read', auth, async (req: Request, res: Response) => {
  try {
    const userNotifications = notifications.get((req as AuthenticatedRequest).user.id) || [];

    userNotifications.forEach(n => {
      n.read = true;
      n.readAt = new Date();
    });

    res.json({ success: true, message: 'All notifications marked as read' });
  } catch (error) {
    logger.error('Error marking all notifications as read:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to mark all notifications as read',
      error: process.env.NODE_ENV === 'development' ? (error as Error).message : 'Internal server error'
    });
  }
});

// DELETE: Delete a notification
router.delete('/:notificationId', auth, async (req: Request, res: Response) => {
  try {
    const { notificationId } = req.params;
    const userNotifications = notifications.get((req as AuthenticatedRequest).user.id) || [];

    const index = userNotifications.findIndex(n => n.id === notificationId);
    if (index === -1) {
      return res.status(404).json({ success: false, message: 'Notification not found' });
    }

    userNotifications.splice(index, 1);
    res.json({ success: true, message: 'Notification deleted successfully' });
  } catch (error) {
    logger.error('Error deleting notification:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete notification',
      error: process.env.NODE_ENV === 'development' ? (error as Error).message : 'Internal server error'
    });
  }
});

// Helper to add a new notification
function addNotification(
  userId: string,
  notification: Omit<Notification, 'id' | 'read' | 'createdAt' | 'readAt'>
): Notification {
  const userNotifications = notifications.get(userId) || [];

  const newNotification: Notification = {
    id: Math.random().toString(36).substring(2, 10),
    ...notification,
    read: false,
    createdAt: new Date()
  };

  userNotifications.unshift(newNotification);
  if (userNotifications.length > 100) {
    userNotifications.splice(100);
  }

  notifications.set(userId, userNotifications);
  return newNotification;
}

export default router;
