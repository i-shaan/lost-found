import { Request, Response } from 'express';
import { User } from '../models/Users';
import { Item } from '../models/Item';
import { logger } from '../utils/loggers';
import { Types } from 'mongoose';
export const getProfile = async (req: Request, res: Response) => {
  try {
    const user = await User.findById(req.user!.id);
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    res.json({
      success: true,
      data: { user }
    });

  } catch (error) {
    logger.error('Get profile error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch profile'
    });
  }
};

export const updateProfile = async (req: Request, res: Response) => {
  try {
    const { name, phone, avatar, location } = req.body;

    const user = await User.findById(req.user!.id);
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Update fields
    if (name) user.name = name;
    if (phone) user.phone = phone;
    if (avatar) user.avatar = avatar;
    if (location) user.location = location;

    await user.save();

    res.json({
      success: true,
      message: 'Profile updated successfully',
      data: { user }
    });

  } catch (error) {
    logger.error('Update profile error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update profile'
    });
  }
};

export const getUserItems = async (req: Request, res: Response) => {
  try {
    const { type, status, page = 1, limit = 20 } = req.query;

    const query: any = { reporter: req.user!.id };
    if (type) query.type = type;
    if (status) query.status = status;

    const pageNum = parseInt(page as string);
    const limitNum = parseInt(limit as string);
    const skip = (pageNum - 1) * limitNum;

    const items = await Item.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limitNum)
      .populate('matches', 'title type images location createdAt');

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
    logger.error('Get user items error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch user items'
    });
  }
};



export const getUserStats = async (req: Request, res: Response) => {
  try {
    const userId = new Types.ObjectId(req.user!.id); // convert to ObjectId

    const stats = await Item.aggregate([
      { $match: { reporter: userId } },
      {
        $group: {
          _id: { type: '$type', status: '$status' },
          count: { $sum: 1 }
        }
      }
    ]);

    const totalViews = await Item.aggregate([
      { $match: { reporter: userId } },
      { $group: { _id: null, totalViews: { $sum: '$views' } } }
    ]);

    const recentItems = await Item.find({ reporter: userId })
      .sort({ createdAt: -1 })
      .limit(5)
      .select('title type status createdAt');

    const formattedStats = {
      totalItems: 0,
      lostItems: 0,
      foundItems: 0,
      activeItems: 0,
      claimedItems: 0,
      totalViews: totalViews[0]?.totalViews || 0,
      recentItems
    };

    stats.forEach(stat => {
      formattedStats.totalItems += stat.count;
      if (stat._id.type === 'lost') formattedStats.lostItems += stat.count;
      else formattedStats.foundItems += stat.count;

      if (stat._id.status === 'active') formattedStats.activeItems += stat.count;
      else if (stat._id.status === 'claimed') formattedStats.claimedItems += stat.count;
    });

    res.json({
      success: true,
      data: { stats: formattedStats }
    });

  } catch (error) {
    logger.error('Get user stats error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch user statistics'
    });
  }
};


export const deleteAccount = async (req: Request, res: Response) => {
  try {
    const userId = req.user!.id;

    // Delete user's items
    await Item.deleteMany({ reporter: userId });

    // Delete user account
    await User.findByIdAndDelete(userId);

    res.json({
      success: true,
      message: 'Account deleted successfully'
    });

  } catch (error) {
    logger.error('Delete account error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete account'
    });
  }
};