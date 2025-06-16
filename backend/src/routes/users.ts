import express from 'express';
import { body, param } from 'express-validator';
import { validate } from '../middleware/validate';
import { auth } from '../middleware/auth';
import {
  getProfile,
  updateProfile,
  getUserItems,
  getUserStats,
  deleteAccount
} from '../controllers/userController'

const router = express.Router();

// All routes require authentication
router.use(auth);

// Validation rules
const updateProfileValidation = [
  body('name')
    .optional()
    .trim()
    .isLength({ min: 2, max: 50 })
    .withMessage('Name must be between 2 and 50 characters'),
  body('phone')
    .optional()
    .isMobilePhone('any')
    .withMessage('Please provide a valid phone number'),
  body('location.coordinates')
    .optional()
    .isArray({ min: 2, max: 2 })
    .withMessage('Location coordinates must be an array of [longitude, latitude]'),
  body('location.address')
    .optional()
    .trim()
    .notEmpty()
    .withMessage('Location address cannot be empty')
];

// Routes
/**
 * @swagger
 * /api/v1/users/profile:
 *   get:
 *     summary: Get current user profile
 *     tags: [User]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: User profile retrieved
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Internal server error
 */
router.get('/profile', getProfile);
/**
 * @swagger
 * /api/v1/users/profile:
 *   put:
 *     summary: Update current user profile
 *     tags: [User]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *               phone:
 *                 type: string
 *               avatar:
 *                 type: string
 *               location:
 *                 type: object
 *                 properties:
 *                   coordinates:
 *                     type: array
 *                     items:
 *                       type: number
 *                   address:
 *                     type: string
 *     responses:
 *       200:
 *         description: Profile updated
 *       404:
 *         description: User not found
 *       500:
 *         description: Server error
 */

router.put('/profile', updateProfileValidation, validate, updateProfile);

/**
 * @swagger
 * /api/v1/users/items:
 *   get:
 *     summary: Get all items reported by the user
 *     tags: [User]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: type
 *         schema:
 *           type: string
 *         description: Item type (lost/found)
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *         description: Item status (active/claimed)
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: List of user-reported items
 *       500:
 *         description: Server error
 */

router.get('/items', getUserItems);

/**
 * @swagger
 * /api/v1/users/stats:
 *   get:
 *     summary: Get statistics for current user
 *     tags: [User]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Statistics data
 *       500:
 *         description: Server error
 */


router.get('/stats', getUserStats);

/**
 * @swagger
 * /api/v1/users/account:
 *   delete:
 *     summary: Delete user account
 *     tags: [User]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Account deleted successfully
 *       500:
 *         description: Server error
 */

router.delete('/account', deleteAccount);

export default router;