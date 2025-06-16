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

// Public routes
router.get('/', paginationValidation, validate, getItems);
router.get('/search', searchValidation, paginationValidation, validate, searchItems);
router.get('/:id', param('id').isMongoId().withMessage('Invalid item ID'), validate, getItem);

// Protected routes
router.use(auth); // All routes below require authentication

router.post('/', createItemValidation, validate, createItem);
router.put('/:id', param('id').isMongoId(), updateItemValidation, validate, updateItem);
router.delete('/:id', param('id').isMongoId(), validate, deleteItem);
router.get('/:id/matches', param('id').isMongoId(), validate, getItemMatches);
router.patch('/:id/claim', param('id').isMongoId(), validate, markItemAsClaimed);
router.get('/user/:userId', param('userId').isMongoId(), paginationValidation, validate, getItemsByUser);

export default router;