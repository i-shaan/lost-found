import express, { RequestHandler } from 'express';
import multer from 'multer';
import path from 'path';
import { body } from 'express-validator';
import auth from '../middleware/auth';
import itemController from '../controllers/itemController';
import { Router } from 'express';
const router = express.Router();

import fs from 'fs';

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadPath = process.env.UPLOAD_PATH || './uploads';
    
    // Ensure the directory exists
    fs.mkdirSync(uploadPath, { recursive: true });
    
    cb(null, uploadPath);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({
  storage,
  limits: {
    fileSize: parseInt(process.env.MAX_FILE_SIZE || '10485760') // 10MB
  },
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed'));
    }
  }
});

// Validation rules
const itemValidation = [
  body('title')
    .trim()
    .isLength({ min: 3, max: 200 })
    .withMessage('Title must be between 3 and 200 characters'),

  body('description')
    .trim()
    .isLength({ min: 10, max: 2000 })
    .withMessage('Description must be between 10 and 2000 characters'),

  body('category')
    .isIn([
      'Electronics', 'Bags & Wallets', 'Jewelry & Accessories',
      'Clothing', 'Keys', 'Documents & Cards', 'Books & Stationery',
      'Sports Equipment', 'Other'
    ])
    .withMessage('Invalid category'),

  body('type')
    .isIn(['lost', 'found'])
    .withMessage('Type must be either lost or found'),

  body('location')
    .trim()
    .isLength({ min: 5, max: 200 })
    .withMessage('Location must be between 10 and 200 characters'),
    
  body('dateLostFound')
    .isISO8601()
    .withMessage('Invalid date format'),

  body('reward')
    .optional()
    .isInt({ min: 0 })
    .withMessage('Reward must be a positive number'),

  body('contactPreference')
    .optional()
    .isIn(['platform', 'phone', 'email'])
    .withMessage('Invalid contact preference')
];

/**
 * @swagger
 * components:
 *   schemas:
 *     Item:
 *       type: object
 *       properties:
 *         id:
 *           type: string
 *           description: Item unique identifier
 *         title:
 *           type: string
 *           description: Item title
 *         description:
 *           type: string
 *           description: Item description
 *         category:
 *           type: string
 *           enum: [Electronics, Bags & Wallets, Jewelry & Accessories, Clothing, Keys, Documents & Cards, Books & Stationery, Sports Equipment, Other]
 *         type:
 *           type: string
 *           enum: [lost, found]
 *         location:
 *           type: string
 *           description: Location where item was lost/found
 *         dateLostFound:
 *           type: string
 *           format: date-time
 *         reward:
 *           type: number
 *           minimum: 0
 *         contactPreference:
 *           type: string
 *           enum: [platform, phone, email]
 *         images:
 *           type: array
 *           items:
 *             type: string
 *         userId:
 *           type: string
 *           description: ID of the user who posted the item
 *         status:
 *           type: string
 *           enum: [active, resolved]
 *         createdAt:
 *           type: string
 *           format: date-time
 *         updatedAt:
 *           type: string
 *           format: date-time
 *   securitySchemes:
 *     bearerAuth:
 *       type: http
 *       scheme: bearer
 *       bearerFormat: JWT
 */

/**
 * @swagger
 * tags:
 *   name: Items
 *   description: Lost and Found item management
 */

/**
 * @swagger
 * /items:
 *   post:
 *     summary: Create a new item
 *     tags: [Items]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required:
 *               - title
 *               - description
 *               - category
 *               - type
 *               - location
 *               - dateLostFound
 *             properties:
 *               title:
 *                 type: string
 *                 minLength: 3
 *                 maxLength: 200
 *               description:
 *                 type: string
 *                 minLength: 10
 *                 maxLength: 2000
 *               category:
 *                 type: string
 *                 enum: [Electronics, Bags & Wallets, Jewelry & Accessories, Clothing, Keys, Documents & Cards, Books & Stationery, Sports Equipment, Other]
 *               type:
 *                 type: string
 *                 enum: [lost, found]
 *               location:
 *                 type: string
 *                 minLength: 5
 *                 maxLength: 200
 *               dateLostFound:
 *                 type: string
 *                 format: date-time
 *               reward:
 *                 type: number
 *                 minimum: 0
 *               contactPreference:
 *                 type: string
 *                 enum: [platform, phone, email]
 *               images:
 *                 type: array
 *                 items:
 *                   type: string
 *                   format: binary
 *                 maxItems: 5
 *     responses:
 *       201:
 *         description: Item created successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Item'
 *       400:
 *         description: Validation error
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                 details:
 *                   type: array
 *                   items:
 *                     type: object
 *       401:
 *         description: Unauthorized
 *       413:
 *         description: File too large
 */
router.post('/', auth, upload.array('images', 5), itemValidation, itemController.createItem as RequestHandler);

/**
 * @swagger
 * /items:
 *   get:
 *     summary: Get all items with optional filtering
 *     tags: [Items]
 *     parameters:
 *       - in: query
 *         name: type
 *         schema:
 *           type: string
 *           enum: [lost, found]
 *         description: Filter by item type
 *       - in: query
 *         name: category
 *         schema:
 *           type: string
 *           enum: [Electronics, Bags & Wallets, Jewelry & Accessories, Clothing, Keys, Documents & Cards, Books & Stationery, Sports Equipment, Other]
 *         description: Filter by category
 *       - in: query
 *         name: location
 *         schema:
 *           type: string
 *         description: Filter by location
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Search in title and description
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           minimum: 1
 *           default: 1
 *         description: Page number
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 100
 *           default: 20
 *         description: Number of items per page
 *       - in: query
 *         name: sortBy
 *         schema:
 *           type: string
 *           enum: [dateLostFound, createdAt, title]
 *           default: createdAt
 *         description: Sort by field
 *       - in: query
 *         name: sortOrder
 *         schema:
 *           type: string
 *           enum: [asc, desc]
 *           default: desc
 *         description: Sort order
 *     responses:
 *       200:
 *         description: List of items retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 items:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Item'
 *                 pagination:
 *                   type: object
 *                   properties:
 *                     page:
 *                       type: integer
 *                     limit:
 *                       type: integer
 *                     total:
 *                       type: integer
 *                     pages:
 *                       type: integer
 *       400:
 *         description: Invalid query parameters
 */
router.get('/', itemController.getItems as RequestHandler);

/**
 * @swagger
 * /items/my-items:
 *   get:
 *     summary: Get current user's items
 *     tags: [Items]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [active, resolved]
 *         description: Filter by item status
 *       - in: query
 *         name: type
 *         schema:
 *           type: string
 *           enum: [lost, found]
 *         description: Filter by item type
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           minimum: 1
 *           default: 1
 *         description: Page number
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 100
 *           default: 20
 *         description: Number of items per page
 *     responses:
 *       200:
 *         description: User's items retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 items:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Item'
 *                 pagination:
 *                   type: object
 *                   properties:
 *                     page:
 *                       type: integer
 *                     limit:
 *                       type: integer
 *                     total:
 *                       type: integer
 *                     pages:
 *                       type: integer
 *       401:
 *         description: Unauthorized
 */
router.get('/my-items', auth, itemController.getUserItems as RequestHandler);

/**
 * @swagger
 * /items/{id}:
 *   get:
 *     summary: Get item by ID
 *     tags: [Items]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Item ID
 *     responses:
 *       200:
 *         description: Item retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Item'
 *       404:
 *         description: Item not found
 *       400:
 *         description: Invalid item ID
 */
router.get('/:id', itemController.getItemById as RequestHandler);

/**
 * @swagger
 * /items/{id}/matches:
 *   get:
 *     summary: Get potential matches for an item
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
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 50
 *           default: 10
 *         description: Maximum number of matches to return
 *       - in: query
 *         name: threshold
 *         schema:
 *           type: number
 *           minimum: 0
 *           maximum: 1
 *           default: 0.5
 *         description: Minimum similarity threshold (0-1)
 *     responses:
 *       200:
 *         description: Potential matches retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 matches:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       item:
 *                         $ref: '#/components/schemas/Item'
 *                       similarity:
 *                         type: number
 *                         description: Similarity score (0-1)
 *                       reasons:
 *                         type: array
 *                         items:
 *                           type: string
 *                         description: Reasons for the match
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Item not found
 *       403:
 *         description: Not authorized to view matches for this item
 */
router.get('/:id/matches', auth, itemController.getItemMatches as RequestHandler);

/**
 * @swagger
 * /items/{id}:
 *   put:
 *     summary: Update an item
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
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               title:
 *                 type: string
 *                 minLength: 3
 *                 maxLength: 200
 *               description:
 *                 type: string
 *                 minLength: 10
 *                 maxLength: 2000
 *               category:
 *                 type: string
 *                 enum: [Electronics, Bags & Wallets, Jewelry & Accessories, Clothing, Keys, Documents & Cards, Books & Stationery, Sports Equipment, Other]
 *               location:
 *                 type: string
 *                 minLength: 5
 *                 maxLength: 200
 *               dateLostFound:
 *                 type: string
 *                 format: date-time
 *               reward:
 *                 type: number
 *                 minimum: 0
 *               contactPreference:
 *                 type: string
 *                 enum: [platform, phone, email]
 *               images:
 *                 type: array
 *                 items:
 *                   type: string
 *                   format: binary
 *                 maxItems: 5
 *               removeImages:
 *                 type: array
 *                 items:
 *                   type: string
 *                 description: Array of image URLs to remove
 *     responses:
 *       200:
 *         description: Item updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Item'
 *       400:
 *         description: Validation error
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Not authorized to update this item
 *       404:
 *         description: Item not found
 */
router.put('/:id', auth, upload.array('images', 5), itemValidation, itemController.updateItem as RequestHandler);

/**
 * @swagger
 * /items/{id}:
 *   delete:
 *     summary: Delete an item
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
 *         description: Item deleted successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: Item deleted successfully
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Not authorized to delete this item
 *       404:
 *         description: Item not found
 */
router.delete('/:id', auth, itemController.deleteItem as RequestHandler);

// /**
//  * @swagger
//  * /items/{id}/resolve:
//  *   post:
//  *     summary: Mark an item as resolved
//  *     tags: [Items]
//  *     security:
//  *       - bearerAuth: []
//  *     parameters:
//  *       - in: path
//  *         name: id
//  *         required: true
//  *         schema:
//  *           type: string
//  *         description: Item ID
//  *     requestBody:
//  *       required: false
//  *       content:
//  *         application/json:
//  *           schema:
//  *             type: object
//  *             properties:
//  *               resolution:
//  *                 type: string
//  *                 maxLength: 500
//  *                 description: Optional resolution details
//  *               matchedItemId:
//  *                 type: string
//  *                 description: ID of the item this was matched with (if applicable)
//  *     responses:
//  *       200:
//  *         description: Item marked as resolved successfully
//  *         content:
//  *           application/json:
//  *             schema:
//  *               type: object
//  *               properties:
//  *                 message:
//  *                   type: string
//  *                   example: Item marked as resolved
//  *                 item:
//  *                   $ref: '#/components/schemas/Item'
//  *       401:
//  *         description: Unauthorized
//  *       403:
//  *         description: Not authorized to resolve this item
//  *       404:
//  *         description: Item not found
//  *       400:
//  *         description: Item is already resolved
//  */
// router.post('/:id/resolve', auth, itemController.resolveItem as RequestHandler);

export default router;