import { Response, Request } from 'express';
import { validationResult } from 'express-validator';
import { ItemModel } from '../models/Item';
import User from '../models/Users';
import { aiService } from '../services/aiService';
import notificationService from '../services/notificationService';
import { logger } from '../utils/loggers';
import { MatchResult } from '../types';
import mongoose from 'mongoose';
import fs from 'fs';
import path from 'path';
const { Types } = mongoose;
import { Server as SocketIOServer } from 'socket.io';
import { ParsedQs } from 'qs';

export interface GetItemsQuery extends ParsedQs {
  type?: 'lost' | 'found';
  category?: string;
  status?: 'active' | 'inactive' | 'archived';
  search?: string;
  location?: string;
  page?: string;
  limit?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

interface CustomRequest extends Request<{ id?: string }, any, any, GetItemsQuery> {
  user?: {
    id: string;
    _id: string;
  };
  io: SocketIOServer;
}

// Helper function to validate MongoDB ObjectId
const isValidObjectId = (id: string): boolean => {
  return mongoose.Types.ObjectId.isValid(id) && /^[0-9a-fA-F]{24}$/.test(id);
};

// Helper function to safely delete files
const safeDeleteFile = (filePath: string): void => {
  try {
    const fullPath = path.isAbsolute(filePath) ? filePath : path.join(process.cwd(), filePath);
    if (fs.existsSync(fullPath)) {
      fs.unlinkSync(fullPath);
    }
  } catch (error) {
    logger.warn(`Failed to delete file: ${filePath}`, error);
  }
};

// Helper function to safely parse numeric query parameters
const parseNumericQuery = (value: string | undefined, defaultValue: number, min?: number, max?: number): number => {
  if (!value) return defaultValue;
  const parsed = parseInt(value, 10);
  if (isNaN(parsed)) return defaultValue;
  if (min !== undefined && parsed < min) return min;
  if (max !== undefined && parsed > max) return max;
  return parsed;
};

class ItemController {
  async createItem(req: CustomRequest, res: Response): Promise<void> {
    try {
      logger.info('Request body:', req.body);
      logger.info('Request files:', req.files);
      logger.info('Content-Type:', req.headers['content-type']);
      
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        logger.info('Validation errors:', errors.array()); // Add this line
        res.status(400).json({
          success: false,
          errors: errors.array()
        });
        return;
      }

      const {
        title,
        description,
        category,
        type,
        location,
        dateLostFound,
        reward,
        contactPreference
      } = req.body;

      // Validate required fields
      if (!title?.trim() || !description?.trim() || !category || !type || !location?.trim()) {
        res.status(400).json({
          success: false,
          message: 'Missing required fields: title, description, category, type, and location are required'
        });
        return;
      }

      // Validate date
      const parsedDate = new Date(dateLostFound);
      if (isNaN(parsedDate.getTime())) {
        res.status(400).json({
          success: false,
          message: 'Invalid date format for dateLostFound'
        });
        return;
      }

      const images = req.files ? (req.files as Express.Multer.File[]).map(file => file.path) : [];

      // Step 1: Analyze item with AI
      logger.info(`Starting AI analysis for ${type} item: ${title}`);
      const aiAnalysis = await aiService.analyzeItem({
        title: title.trim(),
        description: description.trim(),
        category,
        images,
      });

      // Step 2: Create item with AI metadata
      const newItem = new ItemModel({
        title: title.trim(),
        description: description.trim(),
        category,
        type,
        images,
        location: location.trim(),
        dateLostFound: parsedDate,
        reporter: req.user?.id,
        reward: reward || 0,
        contactPreference: contactPreference || 'platform',
        aiMetadata: aiAnalysis,
        status: 'active'
      });

      const savedItem = await newItem.save();

      // Step 3: Find matches using AI services
      logger.info(`Finding AI-powered matches for ${type} item: ${savedItem._id}`);
      const oppositeType = type === 'lost' ? 'found' : 'lost';
      const matches = await aiService.findSimilarItems(savedItem, oppositeType);

      // Step 4: Update item with matches and notify users
      if (matches.length > 0) {
        savedItem.matches = matches.map((match: MatchResult) => ({
          itemId: new Types.ObjectId(match.item_id),
          confidence: match.confidence,
          reasons: match.reasons,
          createdAt: new Date()
        }));
        await savedItem.save();

        // Send notifications to matched item owners
        await notificationService.notifyMatches(savedItem, matches, req.io);
      }

      // Step 5: Update user statistics
      await User.findByIdAndUpdate(req.user?.id, {
        $inc: { itemsPosted: 1 }
      });

      res.status(201).json({
        success: true,
        data: {
          item: savedItem,
          matches: matches,
          matchCount: matches.length
        },
        message: `${type.charAt(0).toUpperCase() + type.slice(1)} item created successfully${matches.length > 0 ? ` with ${matches.length} potential matches found` : ''}`
      });

    } catch (error) {
      logger.error('Error creating item:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to create item',
        error: process.env.NODE_ENV === 'development' ? (error as Error).message : 'Internal server error'
      });
    }
  }

  async getItems(req: CustomRequest, res: Response): Promise<void> {
    try {
      const {
        type,
        category,
        status = 'active',
        search,
        location,
        page = '1',
        limit = '20',
        sortBy = 'createdAt',
        sortOrder = 'desc',
      } = req.query;
  
      const query: any = { status };
  
      if (type && ['lost', 'found'].includes(type)) {
        query.type = type;
      }
      if (category) query.category = category;
      if (location?.trim()) {
        query.location = { $regex: location.trim(), $options: 'i' };
      }
  
      if (search?.trim()) {
        query.$or = [
          { title: { $regex: search.trim(), $options: 'i' } },
          { description: { $regex: search.trim(), $options: 'i' } },
          { tags: { $in: [new RegExp(search.trim(), 'i')] } }
        ];
      }
  
      const pageNum = parseNumericQuery(page, 1, 1);
      const limitNum = parseNumericQuery(limit, 20, 1, 100);
      const sortDirection = sortOrder === 'desc' ? -1 : 1;
      
      // Validate sortBy field
      const allowedSortFields = ['createdAt', 'updatedAt', 'title', 'dateLostFound', 'views'];
      const sortField = allowedSortFields.includes(sortBy) ? sortBy : 'createdAt';
  
      const options = {
        page: pageNum,
        limit: limitNum,
        sort: { [sortField]: sortDirection },
        populate: {
          path: 'reporter',
          select: 'name avatar reputation',
        },
      };
  
      const items = await (ItemModel as any).paginate(query, options);
  
      res.json({
        success: true,
        data: items,
      });
    } catch (error) {
      logger.error('Error fetching items:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch items',
        error: process.env.NODE_ENV === 'development' ? (error as Error).message : 'Internal server error',
      });
    }
  }

  async getUserItems(req: CustomRequest, res: Response): Promise<void> {
    try {
      const {
        status,
        type,
        page = '1',
        limit = '20',
        sortBy = 'createdAt',
        sortOrder = 'desc'
      } = req.query;

      const query: any = { reporter: req.user?.id };
      
      if (status && ['active', 'inactive', 'archived', 'resolved'].includes(status)) {
        query.status = status;
      }
      if (type && ['lost', 'found'].includes(type)) {
        query.type = type;
      }

      const pageNum = parseNumericQuery(page, 1, 1);
      const limitNum = parseNumericQuery(limit, 20, 1, 100);
      const sortDirection = sortOrder === 'desc' ? -1 : 1;
      
      const allowedSortFields = ['createdAt', 'updatedAt', 'title', 'dateLostFound'];
      const sortField = allowedSortFields.includes(sortBy) ? sortBy : 'createdAt';

      const options = {
        page: pageNum,
        limit: limitNum,
        sort: { [sortField]: sortDirection },
        populate: [
          {
            path: 'matches.itemId',
            select: 'title description images type category location dateLostFound status'
          }
        ]
      };

      const items = await (ItemModel as any).paginate(query, options);

      // Add statistics
      const stats = await ItemModel.aggregate([
        { $match: { reporter: new Types.ObjectId(req.user?.id) } },
        {
          $group: {
            _id: null,
            total: { $sum: 1 },
            active: { $sum: { $cond: [{ $eq: ['$status', 'active'] }, 1, 0] } },
            resolved: { $sum: { $cond: [{ $eq: ['$status', 'resolved'] }, 1, 0] } },
            lost: { $sum: { $cond: [{ $eq: ['$type', 'lost'] }, 1, 0] } },
            found: { $sum: { $cond: [{ $eq: ['$type', 'found'] }, 1, 0] } }
          }
        }
      ]);

      res.json({
        success: true,
        data: {
          ...items,
          stats: stats[0] || { total: 0, active: 0, resolved: 0, lost: 0, found: 0 }
        }
      });

    } catch (error) {
      logger.error('Error fetching user items:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch user items',
        error: process.env.NODE_ENV === 'development' ? (error as Error).message : 'Internal server error'
      });
    }
  }

  async getItemById(req: CustomRequest, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      
      if (!id || !isValidObjectId(id)) {
        res.status(400).json({
          success: false,
          message: 'Invalid or missing item ID'
        });
        return;
      }
      
      const item = await ItemModel.findById(id)
        .populate('reporter', 'name avatar reputation')
        .populate('matches.itemId', 'title description images type category location dateLostFound status');

      if (!item) {
        res.status(404).json({
          success: false,
          message: 'Item not found'
        });
        return;
      }

      // Increment view count if not the owner
      if (item.reporter._id.toString() !== req.user?.id) {
        await ItemModel.findByIdAndUpdate(id, { $inc: { views: 1 } });
        item.views = (item.views || 0) + 1;
      }

      res.json({
        success: true,
        data: item
      });

    } catch (error) {
      logger.error('Error fetching item:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch item',
        error: process.env.NODE_ENV === 'development' ? (error as Error).message : 'Internal server error'
      });
    }
  }

  async getItemMatches(req: CustomRequest, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const { limit = '10', threshold = '0.5' } = req.query;
  
      if (!id || !isValidObjectId(id)) {
        res.status(400).json({
          success: false,
          message: 'Invalid or missing item ID'
        });
        return;
      }
  
      const item = await ItemModel.findById(id);
      if (!item) {
        res.status(404).json({
          success: false,
          message: 'Item not found'
        });
        return;
      }
  
      // Check if user owns the item
      if (item.reporter.toString() !== req.user?.id) {
        res.status(403).json({
          success: false,
          message: 'Not authorized to view matches for this item'
        });
        return;
      }

      const limitNum = parseNumericQuery(limit, 10, 1, 50);
      const thresholdNum = typeof threshold === 'string' ? parseFloat(threshold) || 0.5 : 0.5;
      
      if (thresholdNum < 0 || thresholdNum > 1) {
        res.status(400).json({
          success: false,
          message: 'Threshold must be between 0 and 1'
        });
        return;
      }
  
      // Populate the entire item with matches populated
      const populatedItem = await ItemModel.findById(id).populate({
        path: 'matches.itemId',
        select: 'title description images type category location dateLostFound status reporter',
        populate: {
          path: 'reporter',
          select: 'name avatar reputation'
        }
      });
  
      if (!populatedItem) {
        res.status(404).json({
          success: false,
          message: 'Item not found'
        });
        return;
      }
  
      // Filter and map the populated matches
      const matchesWithSimilarity = populatedItem.matches
        ?.filter(match => match.confidence >= thresholdNum)
        .slice(0, limitNum)
        .map(match => ({
          item: match.itemId,
          similarity: match.confidence,
          reasons: match.reasons,
          matchedAt: match.createdAt
        })) || [];
  
      res.json({
        success: true,
        data: {
          itemId: id,
          matches: matchesWithSimilarity,
          totalMatches: item.matches?.length || 0,
          filteredCount: matchesWithSimilarity.length
        }
      });
  
    } catch (error) {
      logger.error('Error getting item matches:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }

  async updateItem(req: CustomRequest, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const errors = validationResult(req);
      
      if (!errors.isEmpty()) {
        res.status(400).json({
          success: false,
          errors: errors.array()
        });
        return;
      }
  
      if (!id || !isValidObjectId(id)) {
        res.status(400).json({
          success: false,
          message: 'Invalid or missing item ID'
        });
        return;
      }
  
      const item = await ItemModel.findById(id);
      if (!item) {
        res.status(404).json({
          success: false,
          message: 'Item not found'
        });
        return;
      }
  
      // Check if user owns the item
      if (item.reporter.toString() !== req.user?.id) {
        res.status(403).json({
          success: false,
          message: 'Not authorized to update this item'
        });
        return;
      }
  
      const {
        title,
        description,
        category,
        location,
        dateLostFound,
        tags,
        reward,
        contactPreference,
        removeImages
      } = req.body;
  
      // Initialize images array if it doesn't exist
      if (!item.images) {
        item.images = [];
      }
  
      // Handle image removal
      if (removeImages && Array.isArray(removeImages)) {
        for (const imageUrl of removeImages) {
          safeDeleteFile(imageUrl);
        }
        item.images = item.images.filter(img => !removeImages.includes(img));
      }
  
      // Handle new images
      const newImages = req.files ? (req.files as Express.Multer.File[]).map(file => file.path) : [];
      if (newImages.length > 0) {
        item.images = [...item.images, ...newImages];
      }
  
      // Track if significant changes were made
      let significantChange = false;
  
      // Update fields with validation
      if (title && title.trim() !== item.title) {
        item.title = title.trim();
        significantChange = true;
      }
      if (description && description.trim() !== item.description) {
        item.description = description.trim();
        significantChange = true;
      }
      if (category && category !== item.category) {
        item.category = category;
        significantChange = true;
      }
      if (location && location.trim() !== item.location) {
        item.location = location.trim();
      }
      if (dateLostFound) {
        const parsedDate = new Date(dateLostFound);
        if (!isNaN(parsedDate.getTime())) {
          item.dateLostFound = parsedDate;
        }
      }
      if (tags && Array.isArray(tags)) {
        item.tags = tags;
      }
      if (reward !== undefined) {
        item.reward = Math.max(0, Number(reward) || 0);
      }
      if (contactPreference && ['platform', 'email', 'phone'].includes(contactPreference)) {
        item.contactPreference = contactPreference;
      }
  
      item.updatedAt = new Date();
  
      // Re-analyze with AI if content changed significantly
      if (significantChange || newImages.length > 0) {
        logger.info(`Re-analyzing updated item: ${item._id}`);
        const aiAnalysis = await aiService.analyzeItem({
          title: item.title,
          description: item.description,
          category: item.category,
          images: item.images || [],
          tags: item.tags || []
        });
        item.aiMetadata = aiAnalysis;
  
        // Find new matches
        const oppositeType = item.type === 'lost' ? 'found' : 'lost';
        const matches = await aiService.findSimilarItems(item, oppositeType);
        
        if (matches.length > 0) {
          item.matches = matches.map((match: MatchResult) => ({
            itemId: new Types.ObjectId(match.item_id),
            confidence: match.confidence,
            reasons: match.reasons,
            createdAt: new Date()
          }));
        }
      }
  
      const updatedItem = await item.save();
  
      res.json({
        success: true,
        data: updatedItem,
        message: 'Item updated successfully'
      });
  
    } catch (error) {
      logger.error('Error updating item:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to update item',
        error: process.env.NODE_ENV === 'development' ? (error as Error).message : 'Internal server error'
      });
    }
  }

  async deleteItem(req: CustomRequest, res: Response): Promise<void> {
    try {
      const { id } = req.params;

      if (!id || !isValidObjectId(id)) {
        res.status(400).json({
          success: false,
          message: 'Invalid or missing item ID'
        });
        return;
      }

      const item = await ItemModel.findById(id);
      if (!item) {
        res.status(404).json({
          success: false,
          message: 'Item not found'
        });
        return;
      }

      // Check if user owns the item
      if (item.reporter.toString() !== req.user?.id) {
        res.status(403).json({
          success: false,
          message: 'Not authorized to delete this item'
        });
        return;
      }

      // Delete associated images
      if (item.images && item.images.length > 0) {
        for (const imagePath of item.images) {
          safeDeleteFile(imagePath);
        }
      }

      // Remove item from other items' matches
      await ItemModel.updateMany(
        { 'matches.itemId': id },
        { $pull: { matches: { itemId: id } } }
      );

      // Delete the item
      await ItemModel.findByIdAndDelete(id);

      // Update user statistics
      await User.findByIdAndUpdate(req.user?.id, {
        $inc: { itemsPosted: -1 }
      });

      logger.info(`Item deleted: ${id} by user: ${req.user?.id}`);

      res.json({
        success: true,
        message: 'Item deleted successfully'
      });

    } catch (error) {
      logger.error('Error deleting item:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to delete item',
        error: process.env.NODE_ENV === 'development' ? (error as Error).message : 'Internal server error'
      });
    }
  }

  async resolveItem(req: CustomRequest, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const { resolution, matchedItemId } = req.body;

      if (!id || !isValidObjectId(id)) {
        res.status(400).json({
          success: false,
          message: 'Invalid or missing item ID'
        });
        return;
      }

      const item = await ItemModel.findById(id);
      if (!item) {
        res.status(404).json({
          success: false,
          message: 'Item not found'
        });
        return;
      }

      // Check if user owns the item
      if (item.reporter.toString() !== req.user?.id) {
        res.status(403).json({
          success: false,
          message: 'Not authorized to resolve this item'
        });
        return;
      }

      // Check if item is already resolved
      if (item.status === 'resolved') {
        res.status(400).json({
          success: false,
          message: 'Item is already resolved'
        });
        return;
      }

      // Update item status
      item.status = 'resolved';
      item.resolvedAt = new Date();
      if (resolution && resolution.trim()) {
        item.resolution = resolution.trim();
      }
      
      if (matchedItemId && isValidObjectId(matchedItemId)) {
        item.matchedItem = new Types.ObjectId(matchedItemId);
        
        // Also resolve the matched item if it exists
        const matchedItem = await ItemModel.findById(matchedItemId);
        if (matchedItem && matchedItem.status === 'active') {
          matchedItem.status = 'resolved';
          matchedItem.resolvedAt = new Date();
          matchedItem.matchedItem = new mongoose.Types.ObjectId(item._id as string);
          await matchedItem.save();
        }
      }

      await item.save();

      // Update user statistics
      await User.findByIdAndUpdate(req.user?.id, {
        $inc: { itemsResolved: 1 }
      });

      // Send notification to users who had this item in their matches
      // await notificationService.notifyItemResolved(item, req.io);

      logger.info(`Item resolved: ${id} by user: ${req.user?.id}`);

      res.json({
        success: true,
        data: item,
        message: 'Item marked as resolved successfully'
      });

    } catch (error) {
      logger.error('Error resolving item:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to resolve item',
        error: process.env.NODE_ENV === 'development' ? (error as Error).message : 'Internal server error'
      });
    }
  }

  async rerunMatching(req: CustomRequest, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      
      if (!id || !isValidObjectId(id)) {
        res.status(400).json({
          success: false,
          message: 'Invalid or missing item ID'
        });
        return;
      }
      
      const item = await ItemModel.findById(id);
      if (!item) {
        res.status(404).json({
          success: false,
          message: 'Item not found'
        });
        return;
      }

      // Check if user owns the item
      if (item.reporter.toString() !== req.user?.id) {
        res.status(403).json({
          success: false,
          message: 'Not authorized to rerun matching'
        });
        return;
      }

      // Check if item is already resolved
      if (item.status === 'resolved') {
        res.status(400).json({
          success: false,
          message: 'Cannot rerun matching for resolved items'
        });
        return;
      }

      const oppositeType = item.type === 'lost' ? 'found' : 'lost';
      const matches = await aiService.findSimilarItems(item, oppositeType);

      // Update matches
      item.matches = matches.map((match: MatchResult) => ({
        itemId: new Types.ObjectId(match.item_id),
        confidence: match.confidence,
        reasons: match.reasons,
        createdAt: new Date()
      }));

      await item.save();

      // Send notifications for new matches
      // if (matches.length > 0) {
      //   await notificationService.notifyMatches(item, matches, req.io);
      // }

      res.json({
        success: true,
        data: {
          item,
          matches,
          matchCount: matches.length
        },
        message: `Found ${matches.length} potential matches`
      });

    } catch (error) {
      logger.error('Error rerunning matching:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to rerun matching',
        error: process.env.NODE_ENV === 'development' ? (error as Error).message : 'Internal server error'
      });
    }
  }
}

export default new ItemController();