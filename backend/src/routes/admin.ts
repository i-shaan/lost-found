import express from 'express';
import { adminAuth } from '../middleware/auth';
import {
  getDashboardStats,
  getAllUsers,
  getAllItems,
  deleteUser,
  deleteItem,
  updateItemStatus
} from '../controllers/adminController'

const router = express.Router();

// All routes require admin authentication
router.use(adminAuth);

// Routes
router.get('/dashboard', getDashboardStats);
router.get('/users', getAllUsers);
router.get('/items', getAllItems);
router.delete('/users/:id', deleteUser);
router.delete('/items/:id', deleteItem);
router.patch('/items/:id/status', updateItemStatus);

export default router;