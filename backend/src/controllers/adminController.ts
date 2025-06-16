import { Request, Response } from 'express';
import { User } from '../models/Users';
import { Item } from '../models/Item';
import { Message } from '../models/Message';
import { logger } from '../utils/loggers';

export const getDashboardStats = async (req: Request, res: Response) => {
  try {
    // Get basic counts
    const totalUsers = await User.countDocuments();
    const totalItems = await Item.countDocuments();
    const totalMessages = await Message.countDocuments();
    
    // Get items by type
    const itemsByType = await Item.aggregate([
      { $group: { _id: '$type', count: { $sum: 1 } } }
    ]);

    // Get items by status
    const itemsByStatus = await Item.aggregate([
      { $group: { _id: '$status', count: { $sum: 1 } } }
    ]);

    // Get recent activity
    const recentUsers = await User.find()
      .sort({ createdAt: -1 })
      .limit(5)
      .select('name email createdAt');

    const recentItems = await Item.find()
      .populate('reporter', 'name')
      .sort({ createdAt: -1 })
      .limit(10)
      .select('title type status reporter createdAt');

    res.json({
      success: true,
      data: {
        stats: {
          totalUsers,
          totalItems,
          totalMessages,
          itemsByType,
          itemsByStatus
        },
        recentActivity: {
          recentUsers,
          recentItems
        }
      }
    });

  } catch (error) {
    logger.error('Get dashboard stats error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch dashboard statistics'
    });
  }
};

export const getAllUsers = async (req: Request, res: Response) => {
  try {
    const { page = 1, limit = 20, search } = req.query;

    const query: any = {};
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } }
      ];
    }

    const pageNum = parseInt(page as string);
    const limitNum = parseInt(limit as string);
    const skip = (pageNum - 1) * limitNum;

    const users = await User.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limitNum);

    const total = await User.countDocuments(query);

    res.json({
      success: true,
      data: {
        users,
        pagination: {
          page: pageNum,
          limit: limitNum,
          total,
          pages: Math.ceil(total / limitNum)
        }
      }
    });

  } catch (error) {
    logger.error('Get all users error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch users'
    });
  }
};

export const getAllItems = async (req: Request, res: Response) => {
  try {
    const { page = 1, limit = 20, type, status, search } = req.query;

    const query: any = {};
    if (type) query.type = type;
    if (status) query.status = status;
    if (search) {
      query.$or = [
        { title: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } }
      ];
    }

    const pageNum = parseInt(page as string);
    const limitNum = parseInt(limit as string);
    const skip = (pageNum - 1) * limitNum;

    const items = await Item.find(query)
      .populate('reporter', 'name email')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limitNum);

    const total = await Item.countDocuments(query);

    res.json({
      success: true,
      data: {
        items,
        pagination: {
          page: pageNum,
          limit: limitNum,
          total,
          pages: Math.ceil(total / limitNum)
        }
      }
    });

  } catch (error) {
    logger.error('Get all items error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch items'
    });
  }
};

export const deleteUser = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    // Delete user's items first
    await Item.deleteMany({ reporter: id });

    // Delete user
    const user = await User.findByIdAndDelete(id);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    res.json({
      success: true,
      message: 'User deleted successfully'
    });

  } catch (error) {
    logger.error('Delete user error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete user'
    });
  }
};

export const deleteItem = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const item = await Item.findByIdAndDelete(id);

    if (!item) {
      return res.status(404).json({
        success: false,
        message: 'Item not found'
      });
    }

    res.json({
      success: true,
      message: 'Item deleted successfully'
    });

  } catch (error) {
    logger.error('Delete item error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete item'
    });
  }
};

export const updateItemStatus = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    const item = await Item.findByIdAndUpdate(
      id,
      { status },
      { new: true }
    ).populate('reporter', 'name email');

    if (!item) {
      return res.status(404).json({
        success: false,
        message: 'Item not found'
      });
    }

    res.json({
      success: true,
      message: 'Item status updated successfully',
      data: { item }
    });

  } catch (error) {
    logger.error('Update item status error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update item status'
    });
  }
};