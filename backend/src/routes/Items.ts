import express from 'express';
import { body, query, param } from 'express-validator';
import { validate } from '../middleware/validate';
import { auth } from '../middleware/auth';
import {
  createItem,
  getItems,
  getItem,
  updateItem,
  deleteItem,
  searchItems,
  getItemMatches,
  markItemAsClaimed,
  getItemsByUser
} from '../controllers/itemController'

const router = express.Router();
router.use(auth);
// Validation rules
const createItemValidation = [
  body('title')
    .trim()
    .isLength({ min: 3, max: 100 })
    .withMessage('Title must be between 3 and 100 characters'),
  body('description')
    .trim()
    .isLength({ min: 10, max: 1000 })
    .withMessage('Description must be between 10 and 1000 characters'),
  body('category')
    .isIn([
      'Electronics', 'Jewelry', 'Clothing', 'Bags & Wallets', 
      'Keys', 'Documents', 'Toys', 'Sports Equipment', 
      'Books & Stationery', 'Accessories', 'Other'
    ])
    .withMessage('Invalid category'),
  body('type')
    .isIn(['lost', 'found'])
    .withMessage('Type must be either lost or found'),
  body('location.coordinates')
    .isArray({ min: 2, max: 2 })
    .withMessage('Location coordinates must be an array of [longitude, latitude]'),
  body('location.address')
    .trim()
    .notEmpty()
    .withMessage('Location address is required'),
  body('images')
    .optional()
    .isArray()
    .withMessage('Images must be an array'),
  body('tags')
    .optional()
    .isArray()
    .withMessage('Tags must be an array'),
  body('reward')
    .optional()
    .isNumeric()
    .isFloat({ min: 0 })
    .withMessage('Reward must be a positive number'),
  body('contactPreference')
    .optional()
    .isIn(['platform', 'direct'])
    .withMessage('Contact preference must be platform or direct')
];

const updateItemValidation = [
  body('title')
    .optional()
    .trim()
    .isLength({ min: 3, max: 100 })
    .withMessage('Title must be between 3 and 100 characters'),
  body('description')
    .optional()
    .trim()
    .isLength({ min: 10, max: 1000 })
    .withMessage('Description must be between 10 and 1000 characters'),
  body('category')
    .optional()
    .isIn([
      'Electronics', 'Jewelry', 'Clothing', 'Bags & Wallets', 
      'Keys', 'Documents', 'Toys', 'Sports Equipment', 
      'Books & Stationery', 'Accessories', 'Other'
    ])
    .withMessage('Invalid category'),
  body('status')
    .optional()
    .isIn(['active', 'matched', 'claimed', 'expired'])
    .withMessage('Invalid status')
];

const searchValidation = [
  query('q')
    .trim()
    .isLength({ min: 2 })
    .withMessage('Search query must be at least 2 characters'),
  query('lat')
    .optional()
    .isFloat({ min: -90, max: 90 })
    .withMessage('Invalid latitude'),
  query('lng')
    .optional()
    .isFloat({ min: -180, max: 180 })
    .withMessage('Invalid longitude'),
  query('radius')
    .optional()
    .isInt({ min: 1, max: 1000 })
    .withMessage('Radius must be between 1 and 1000 km')
];

const paginationValidation = [
  query('page')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Page must be a positive integer'),
  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('Limit must be between 1 and 100')
];

/**
 * @swagger
 * tags:
 *   name: Items
 *   description: Item management endpoints
 */

/**
 * @swagger
 * /api/v1/items:
 *   get:
 *     summary: Get all items (public)
 *     tags: [Items]
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *         description: Page number for pagination
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *         description: Number of items per page
 *     responses:
 *       200:
 *         description: A list of items
 */
router.get('/', paginationValidation, validate, getItems);

/**
 * @swagger
 * /api/v1/items/search:
 *   get:
 *     summary: Search for items (public)
 *     tags: [Items]
 *     parameters:
 *       - in: query
 *         name: q
 *         schema:
 *           type: string
 *         required: true
 *         description: Search query
 *       - in: query
 *         name: lat
 *         schema:
 *           type: number
 *         description: Latitude for geolocation
 *       - in: query
 *         name: lng
 *         schema:
 *           type: number
 *         description: Longitude for geolocation
 *       - in: query
 *         name: radius
 *         schema:
 *           type: integer
 *         description: Radius in km
 *     responses:
 *       200:
 *         description: Search results
 */
router.get('/search', searchValidation, paginationValidation, validate, searchItems);

/**
 * @swagger
 * /api/v1/items/{id}:
 *   get:
 *     summary: Get item by ID (public)
 *     tags: [Items]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: MongoDB item ID
 *     responses:
 *       200:
 *         description: Item details
 *       404:
 *         description: Item not found
 */
router.get('/:id', param('id').isMongoId().withMessage('Invalid item ID'), validate, getItem);

/**
 * @swagger
 * /api/v1/items:
 *   post:
 *     summary: Create a new item (authenticated)
 *     tags: [Items]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/Item'
 *     responses:
 *       201:
 *         description: Item created
 *       400:
 *         description: Validation error
 */
router.post('/', createItemValidation, validate, createItem);

/**
 * @swagger
 * /api/v1/items/{id}:
 *   put:
 *     summary: Update an item by ID
 *     tags: [Items]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Item ID
 *     responses:
 *       200:
 *         description: Item updated
 *       404:
 *         description: Item not found
 */
router.put('/:id', param('id').isMongoId(), updateItemValidation, validate, updateItem);

/**
 * @swagger
 * /api/v1/items/{id}:
 *   delete:
 *     summary: Delete an item by ID
 *     tags: [Items]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Item ID
 *     responses:
 *       200:
 *         description: Item deleted
 *       404:
 *         description: Item not found
 */
router.delete('/:id', param('id').isMongoId(), validate, deleteItem);

/**
 * @swagger
 * /api/v1/items/{id}/matches:
 *   get:
 *     summary: Get matched items by ID
 *     tags: [Items]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Item ID
 *     responses:
 *       200:
 *         description: List of matched items
 */
router.get('/:id/matches', param('id').isMongoId(), validate, getItemMatches);

/**
 * @swagger
 * /api/v1/items/{id}/claim:
 *   patch:
 *     summary: Mark an item as claimed
 *     tags: [Items]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Item ID
 *     responses:
 *       200:
 *         description: Item marked as claimed
 */
router.patch('/:id/claim', param('id').isMongoId(), validate, markItemAsClaimed);

/**
 * @swagger
 * /api/v1/items/user/{userId}:
 *   get:
 *     summary: Get items by user ID
 *     tags: [Items]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *         description: User ID
 *     responses:
 *       200:
 *         description: Items by user
 */
router.get('/user/:userId', param('userId').isMongoId(), paginationValidation, validate, getItemsByUser);

export default router;