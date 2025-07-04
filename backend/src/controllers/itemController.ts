import { Response, Request } from 'express';
import { validationResult } from 'express-validator';
import { ItemModel } from '../models/Item';
import User from '../models/Users';
import { aiService } from '../services/aiService';
import notificationService from '../services/notificationService';
import { logger } from '../utils/loggers';
import { MatchResult } from '../types';
import mongoose, { Types } from 'mongoose';
import { uploadToCloudinary,deleteFromCloudinary } from '../utils/cloudinary';
import fs from 'fs';
import path from 'path';
// const { Types } = mongoose;
import { Server as SocketIOServer } from 'socket.io';
import { ParsedQs } from 'qs';
import ResolutionModel from '../models/Resolution';
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
function extractPublicIdFromUrl(url: string): string | null {
  try {
    // Cloudinary URL format: https://res.cloudinary.com/cloud_name/image/upload/v1234567890/folder/public_id.format
    const urlParts = url.split('/');
    const uploadIndex = urlParts.findIndex(part => part === 'upload');
    
    if (uploadIndex === -1) return null;
    
    // Get everything after 'upload' and before the file extension
    const pathAfterUpload = urlParts.slice(uploadIndex + 1).join('/');
    
    // Remove version number if present (starts with 'v' followed by numbers)
    const pathWithoutVersion = pathAfterUpload.replace(/^v\d+\//, '');
    
    // Remove file extension
    const publicId = pathWithoutVersion.replace(/\.[^/.]+$/, '');
    
    return publicId;
  } catch (error) {
    logger.error('Error extracting public_id from URL:', error);
    return null;
  }
}
class ItemController {
  async createItem(req: CustomRequest, res: Response): Promise<void> {
    try {
      logger.info('Request body:', req.body);
      logger.info('Request files:', req.files);
      logger.info('Content-Type:', req.headers['content-type']);
      
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        logger.info('Validation errors:', errors.array());
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
  
      // Handle image uploads to Cloudinary
      let imageUrls: string[] = [];
      
      if (req.files && Array.isArray(req.files) && req.files.length > 0) {
        try {
          logger.info(`Uploading ${req.files.length} images to Cloudinary`);
          
          // Upload all images to Cloudinary in parallel
          const uploadPromises = req.files.map(async (file: Express.Multer.File) => {
            const result = await uploadToCloudinary(file.buffer, {
              folder: 'lost-found/general',
              transformation: [
                { width: 800, height: 600, crop: 'limit' },
                { quality: 'auto' },
                { format: 'webp' }
              ]
            });
            return result.secure_url;
          });
  
          imageUrls = await Promise.all(uploadPromises);
          logger.info(`Successfully uploaded ${imageUrls.length} images to Cloudinary`);
          
        } catch (uploadError) {
          logger.error('Error uploading images to Cloudinary:', uploadError);
          res.status(500).json({
            success: false,
            message: 'Failed to upload images to Cloudinary'
          });
          return;
        }
      }
  
      // Step 1: Analyze item with AI
      logger.info(`Starting AI analysis for ${type} item: ${title}`);
      const aiAnalysis = await aiService.analyzeItem({
        title: title.trim(),
        description: description.trim(),
        category,
        images: imageUrls, // Use Cloudinary URLs instead of local paths
      });
  
      // Step 2: Create item with AI metadata
      const newItem = new ItemModel({
        title: title.trim(),
        description: description.trim(),
        category,
        type,
        images: imageUrls, // Store Cloudinary URLs
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
        .populate('reporter', 'name avatar reputation email')
        .populate('matches.itemId', 'title description images type category location dateLostFound status');
      logger.info(item)
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
      const { limit = '10' } = req.query;
  
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
      // const thresholdNum = typeof threshold === 'string' ? parseFloat(threshold) || 0.5 : 0.5;
      
      // if (thresholdNum < 0 || thresholdNum > 1) {
      //   res.status(400).json({
      //     success: false,
      //     message: 'Threshold must be between 0 and 1'
      //   });
      //   return;
      // }
  
      // Get the opposite type for finding similar items
      const oppositeType = item.type === 'lost' ? 'found' : 'lost';
      
      // Find similar items using AI service
      logger.info(`Finding AI-powered matches for ${item.type} item: ${item._id}`);
      const aiMatches = await aiService.findSimilarItems(item, oppositeType);
  
      // Filter matches by threshold and limit
      const filteredMatches = aiMatches.slice(0, limitNum);
  
      // Get the item IDs from filtered matches
      const matchedItemIds = filteredMatches.map(match => match.item_id);
  
      // Populate the matched items with full details
      const populatedItems = await ItemModel.find({
        _id: { $in: matchedItemIds }
      })
      .select('title description images type category location dateLostFound status reporter')
      .populate({
        path: 'reporter',
        select: 'name avatar reputation email'
      });
  
      // Create a map for quick lookup
      const itemMap = new Map();
      populatedItems.forEach(item => {
        itemMap.set((item._id as Types.ObjectId).toString(), item);
      });
  
      // Map the results to match the existing format
      const matchesWithSimilarity = filteredMatches.map(match => ({
        item: itemMap.get(match.item_id),
        similarity: match.confidence,
        reasons: match.reasons,
        matchedAt: new Date() // Current timestamp as this is dynamically generated
      })).filter(match => match.item); // Filter out any items that weren't found
  
      res.json({
        success: true,
        data: {
          itemId: id,
          matches: matchesWithSimilarity,
          totalMatches: aiMatches.length, // Total AI matches found
          filteredCount: matchesWithSimilarity.length // After threshold and limit filtering
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
  
      // Delete associated images from Cloudinary
      if (item.images && item.images.length > 0) {
        try {
          logger.info(`Deleting ${item.images.length} images from Cloudinary for item: ${id}`);
          
          const deletePromises = item.images.map(async (imageUrl: string) => {
            try {
              // Extract public_id from Cloudinary URL
              const publicId = extractPublicIdFromUrl(imageUrl);
              if (publicId) {
                await deleteFromCloudinary(publicId);
                logger.info(`Successfully deleted image: ${publicId}`);
              }
            } catch (imageError) {
              logger.error(`Failed to delete image ${imageUrl}:`, imageError);
              // Continue with other deletions even if one fails
            }
          });
  
          await Promise.allSettled(deletePromises);
          logger.info(`Completed image deletion process for item: ${id}`);
          
        } catch (error) {
          logger.error('Error during image deletion:', error);
          // Continue with item deletion even if image deletion fails
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
  

  async resolveItem(req: CustomRequest, res: Response): Promise<void>  {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        res.status(400).json({
          success: false,
          errors: errors.array()
        });
        return;
      }

      const { id } = req.params;
      const { matchedItemId, resolution } = req.body;

      if (!id || !isValidObjectId(id)) {
        res.status(400).json({
          success: false,
          message: 'Invalid or missing item ID'
        });
        return;
      }

      if (!isValidObjectId(matchedItemId)) {
        res.status(400).json({
          success: false,
          message: 'Invalid matched item ID'
        });
        return;
      }

      // Fetch both items with populated reporter
      const [sourceItem, matchedItem] = await Promise.all([
        ItemModel.findById(id).populate('reporter'),
        ItemModel.findById(matchedItemId).populate('reporter')
      ]);

      if (!sourceItem) {
        res.status(404).json({
          success: false,
          message: 'Source item not found'
        });
        return;
      }

      if (!matchedItem) {
        res.status(404).json({
          success: false,
          message: 'Matched item not found'
        });
        return;
      }

      // Check if user owns the source item
      if (sourceItem.reporter._id.toString() !== req.user?.id) {
        res.status(403).json({
          success: false,
          message: 'Not authorized to resolve this item'
        });
        return;
      }

      // Check if items are of opposite types
      if (sourceItem.type === matchedItem.type) {
        res.status(400).json({
          success: false,
          message: 'Cannot resolve items of the same type'
        });
        return;
      }

      // Check if items are already resolved
      if (sourceItem.status === 'resolved' || matchedItem.status === 'resolved') {
        res.status(400).json({
          success: false,
          message: 'One or both items are already resolved'
        });
        return;
      }

      // Check if there's already a pending resolution for these items
      const existingResolution = await ResolutionModel.findOne({
        $or: [
          { sourceItemId: id, matchedItemId: matchedItemId },
          { sourceItemId: matchedItemId, matchedItemId: id }
        ],
        status: 'pending',
        expiresAt: { $gt: new Date() }
      });

      if (existingResolution) {
        res.status(400).json({
          success: false,
          message: 'A resolution request is already pending for these items'
        });
        return;
      }

      // Generate unique confirmation code
      let confirmationCode;
      let isUnique = false;
      let attempts = 0;
      const maxAttempts = 10;

      while (!isUnique && attempts < maxAttempts) {
        confirmationCode = ResolutionModel.generateConfirmationCode();
        const existing = await ResolutionModel.findOne({ 
          confirmationCode,
          status: 'pending',
          expiresAt: { $gt: new Date() }
        });
        isUnique = !existing;
        attempts++;
      }

      if (!isUnique) {
        res.status(500).json({
          success: false,
          message: 'Failed to generate unique confirmation code. Please try again.'
        });
        return;
      }

      // Create resolution request
      const resolutionRequest = new ResolutionModel({
        sourceItemId: new Types.ObjectId(id),
        matchedItemId: new Types.ObjectId(matchedItemId),
        initiatedBy: new Types.ObjectId(req.user.id),
        resolution: resolution.trim(),
        confirmationCode,
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000) // 24 hours
      });

      await resolutionRequest.save();

      // Send notification to the matched item owner
      await notificationService.notifyUser(
        matchedItem.reporter._id,
        {
          type: 'resolution_request',
          title: '🤝 Resolution Request Received',
          message: `Someone wants to resolve their ${sourceItem.type} item "${sourceItem.title}" with your ${matchedItem.type} item "${matchedItem.title}"`,
          data: {
            resolutionId: resolutionRequest._id,
            sourceItem,
            matchedItem,
            resolution,
            confirmationCode
          }
        },
        req.io
      );

      logger.info(`Resolution request created: ${resolutionRequest._id} for items ${id} and ${matchedItemId}`);

      res.status(201).json({
        success: true,
        data: {
          resolutionId: resolutionRequest._id,
          confirmationCode,
          expiresAt: resolutionRequest.expiresAt,
          status: 'pending'
        },
        message: 'Resolution request created successfully. Please share the confirmation code with the other party.'
      });

    } catch (error) {
      logger.error('Error creating resolution request:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to create resolution request',
        error: process.env.NODE_ENV === 'development' ? (error as Error).message : 'Internal server error'
      });
    }
  }

  /**
   * Confirm item resolution with confirmation code
   */
  async confirmResolution(req: CustomRequest, res: Response): Promise<void>  {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        res.status(400).json({
          success: false,
          errors: errors.array()
        });
        return;
      }

      const { id } = req.params;
      const { confirmationCode } = req.body;

      if (!id || !isValidObjectId(id)) {
        res.status(400).json({
          success: false,
          message: 'Invalid or missing item ID'
        });
        return;
      }

      // Find the resolution request
      const resolutionRequest = await ResolutionModel.findOne({
        $or: [
          { sourceItemId: id },
          { matchedItemId: id }
        ],
        confirmationCode: confirmationCode.toUpperCase(),
        status: 'pending'
      }).populate([
        { path: 'sourceItemId', populate: { path: 'reporter' } },
        { path: 'matchedItemId', populate: { path: 'reporter' } }
      ]);

      if (!resolutionRequest) {
        res.status(404).json({
          success: false,
          message: 'Invalid confirmation code or resolution request not found'
        });
        return;
      }

      // Check if resolution has expired
      if (resolutionRequest.isExpired()) {
        resolutionRequest.status = 'expired';
        await resolutionRequest.save();
        
        res.status(400).json({
          success: false,
          message: 'Resolution request has expired'
        });
        return;
      }

      // Check if user is authorized to confirm (must be the other party)
      const sourceItem = resolutionRequest.sourceItemId as any;
      const matchedItem = resolutionRequest.matchedItemId as any;
      
      const isSourceOwner = sourceItem.reporter._id.toString() === req.user?.id;
      const isMatchedOwner = matchedItem.reporter._id.toString() === req.user?.id;
      const isInitiator = resolutionRequest.initiatedBy.toString() === req.user?.id;

      if (!isSourceOwner && !isMatchedOwner) {
        res.status(403).json({
          success: false,
          message: 'Not authorized to confirm this resolution'
        });
        return;
      }

      if (isInitiator) {
        res.status(400).json({
          success: false,
          message: 'Cannot confirm your own resolution request'
        });
        return;
      }

      // Update resolution status
      resolutionRequest.status = 'confirmed';
      resolutionRequest.confirmedBy = new Types.ObjectId(req.user?.id);
      resolutionRequest.confirmedAt = new Date();

      // Update both items as resolved - following exact schema structure
      const currentTime = new Date();
      const updatePromises = [
        ItemModel.findByIdAndUpdate(sourceItem._id, {
          status: 'resolved',
          resolvedAt: currentTime,
          resolution: resolutionRequest.resolution,
          matchedItem: matchedItem._id
        }),
        ItemModel.findByIdAndUpdate(matchedItem._id, {
          status: 'resolved',
          resolvedAt: currentTime,
          resolution: resolutionRequest.resolution,
          matchedItem: sourceItem._id
        }),
        resolutionRequest.save()
      ];

      await Promise.all(updatePromises);

      // Send success notifications to both parties
      const notifications: Array<{
        userId: any;
        payload: {
          type: 'item_resolved';
          title: string;
          message: string;
          data: any;
        };
      }> = [
        {
          userId: sourceItem.reporter._id,
          payload: {
            type: 'item_resolved',
            title: '🎉 Item Resolution Confirmed!',
            message: `Your ${sourceItem.type} item "${sourceItem.title}" has been successfully resolved!`,
            data: {
              item: sourceItem,
              matchedItem,
              resolution: resolutionRequest.resolution
            }
          }
        },
        {
          userId: matchedItem.reporter._id,
          payload: {
            type: 'item_resolved',
            title: '🎉 Item Resolution Confirmed!',
            message: `Your ${matchedItem.type} item "${matchedItem.title}" has been successfully resolved!`,
            data: {
              item: matchedItem,
              matchedItem: sourceItem,
              resolution: resolutionRequest.resolution
            }
          }
        }
      ];

      await Promise.all(
        notifications.map(notification =>
          notificationService.notifyUser(notification.userId, notification.payload, req.io)
        )
      );


      // Update user statistics - increment itemsResolved
      await Promise.all([
        User.findByIdAndUpdate(sourceItem.reporter._id, {
          $inc: { itemsResolved: 1 }
        }),
        User.findByIdAndUpdate(matchedItem.reporter._id, {
          $inc: { itemsResolved: 1 }
        })
      ]);

      logger.info(`Resolution confirmed: ${resolutionRequest._id} by user ${req.user?.id}`);

      res.json({
        success: true,
        data: {
          resolutionId: resolutionRequest._id,
          confirmedAt: resolutionRequest.confirmedAt,
          status: 'confirmed'
        },
        message: 'Resolution confirmed successfully! Both items have been marked as resolved.'
      });

    } catch (error) {
      logger.error('Error confirming resolution:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to confirm resolution',
        error: process.env.NODE_ENV === 'development' ? (error instanceof Error ? error.message : 'Unknown error') : 'Internal server error'
      });
    }
  }

  /**
   * Get resolution status for an item
   */
  async getResolutionStatus(req: CustomRequest, res: Response): Promise<void> {
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
  
      // Check if user is authorized (must be item owner or matched item owner)
      const isOwner = item.reporter.toString() === req.user?.id;
  
      if (!isOwner) {
        // Check if user owns a matched item in any resolution
        const hasMatchedResolution = await ResolutionModel.findOne({
          $or: [
            { sourceItemId: id },
            { matchedItemId: id }
          ]
        }).populate([
          { path: 'sourceItemId', select: 'reporter' },
          { path: 'matchedItemId', select: 'reporter' }
        ]);
  
        if (!hasMatchedResolution) {
          res.status(403).json({
            success: false,
            message: 'Not authorized to view resolution status for this item'
          });
          return;
        }
  
        // Type assertion for populated fields
        const sourceItem = hasMatchedResolution.sourceItemId as any;
        const matchedItem = hasMatchedResolution.matchedItemId as any;
        
        const isAuthorized = 
          sourceItem.reporter.toString() === req.user?.id ||
          matchedItem.reporter.toString() === req.user?.id;
  
        if (!isAuthorized) {
          res.status(403).json({
            success: false,
            message: 'Not authorized to view resolution status for this item'
          });
          return;
        }
      }
  
      // Find the most recent resolution request for this item
      const resolutionRequest = await ResolutionModel.findOne({
        $or: [
          { sourceItemId: id },
          { matchedItemId: id }
        ]
      })
      .sort({ createdAt: -1 })
      .populate([
        { path: 'sourceItemId', select: 'title type reporter' },
        { path: 'matchedItemId', select: 'title type reporter' },
        { path: 'initiatedBy', select: 'name' },
        { path: 'confirmedBy', select: 'name' }
      ]);
  
      if (!resolutionRequest) {
        res.status(404).json({
          success: false,
          message: 'No resolution request found for this item'
        });
        return;
      }
  
      // Check if expired and update status
      if (resolutionRequest.status === 'pending' && resolutionRequest.isExpired()) {
        resolutionRequest.status = 'expired';
        await resolutionRequest.save();
      }
  
      res.json({
        success: true,
        data: {
          resolutionId: resolutionRequest._id,
          status: resolutionRequest.status,
          resolution: resolutionRequest.resolution,
          initiatedBy: resolutionRequest.initiatedBy,
          confirmedBy: resolutionRequest.confirmedBy,
          confirmedAt: resolutionRequest.confirmedAt,
          expiresAt: resolutionRequest.expiresAt,
          createdAt: resolutionRequest.createdAt,
          sourceItem: resolutionRequest.sourceItemId,
          matchedItem: resolutionRequest.matchedItemId
        }
      });
  
    } catch (error) {
      logger.error('Error getting resolution status:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      res.status(500).json({
        success: false,
        message: 'Failed to get resolution status',
        error: process.env.NODE_ENV === 'development' ? errorMessage : 'Internal server error'
      });
    }
  }
  // async resolveItem(req: CustomRequest, res: Response): Promise<void> {
  //   try {
  //     const { id } = req.params;
  //     const { resolution, matchedItemId } = req.body;

  //     if (!id || !isValidObjectId(id)) {
  //       res.status(400).json({
  //         success: false,
  //         message: 'Invalid or missing item ID'
  //       });
  //       return;
  //     }

  //     const item = await ItemModel.findById(id);
  //     if (!item) {
  //       res.status(404).json({
  //         success: false,
  //         message: 'Item not found'
  //       });
  //       return;
  //     }

  //     // Check if user owns the item
  //     if (item.reporter.toString() !== req.user?.id) {
  //       res.status(403).json({
  //         success: false,
  //         message: 'Not authorized to resolve this item'
  //       });
  //       return;
  //     }

  //     // Check if item is already resolved
  //     if (item.status === 'resolved') {
  //       res.status(400).json({
  //         success: false,
  //         message: 'Item is already resolved'
  //       });
  //       return;
  //     }

  //     // Update item status
  //     item.status = 'resolved';
  //     item.resolvedAt = new Date();
  //     if (resolution && resolution.trim()) {
  //       item.resolution = resolution.trim();
  //     }
      
  //     if (matchedItemId && isValidObjectId(matchedItemId)) {
  //       item.matchedItem = new Types.ObjectId(matchedItemId);
        
  //       // Also resolve the matched item if it exists
  //       const matchedItem = await ItemModel.findById(matchedItemId);
  //       if (matchedItem && matchedItem.status === 'active') {
  //         matchedItem.status = 'resolved';
  //         matchedItem.resolvedAt = new Date();
  //         matchedItem.matchedItem = new mongoose.Types.ObjectId(item._id as string);
  //         await matchedItem.save();
  //       }
  //     }

  //     await item.save();

  //     // Update user statistics
  //     await User.findByIdAndUpdate(req.user?.id, {
  //       $inc: { itemsResolved: 1 }
  //     });

  //     // Send notification to users who had this item in their matches
  //     // await notificationService.notifyItemResolved(item, req.io);

  //     logger.info(`Item resolved: ${id} by user: ${req.user?.id}`);

  //     res.json({
  //       success: true,
  //       data: item,
  //       message: 'Item marked as resolved successfully'
  //     });

  //   } catch (error) {
  //     logger.error('Error resolving item:', error);
  //     res.status(500).json({
  //       success: false,
  //       message: 'Failed to resolve item',
  //       error: process.env.NODE_ENV === 'development' ? (error as Error).message : 'Internal server error'
  //     });
  //   }
  // }

  // async rerunMatching(req: CustomRequest, res: Response): Promise<void> {
  //   try {
  //     const { id } = req.params;
      
  //     if (!id || !isValidObjectId(id)) {
  //       res.status(400).json({
  //         success: false,
  //         message: 'Invalid or missing item ID'
  //       });
  //       return;
  //     }
      
  //     const item = await ItemModel.findById(id);
  //     if (!item) {
  //       res.status(404).json({
  //         success: false,
  //         message: 'Item not found'
  //       });
  //       return;
  //     }

  //     // Check if user owns the item
  //     if (item.reporter.toString() !== req.user?.id) {
  //       res.status(403).json({
  //         success: false,
  //         message: 'Not authorized to rerun matching'
  //       });
  //       return;
  //     }

  //     // Check if item is already resolved
  //     if (item.status === 'resolved') {
  //       res.status(400).json({
  //         success: false,
  //         message: 'Cannot rerun matching for resolved items'
  //       });
  //       return;
  //     }

  //     const oppositeType = item.type === 'lost' ? 'found' : 'lost';
  //     const matches = await aiService.findSimilarItems(item, oppositeType);

  //     // Update matches
  //     item.matches = matches.map((match: MatchResult) => ({
  //       itemId: new Types.ObjectId(match.item_id),
  //       confidence: match.confidence,
  //       reasons: match.reasons,
  //       createdAt: new Date()
  //     }));

  //     await item.save();

  //     // Send notifications for new matches
  //     // if (matches.length > 0) {
  //     //   await notificationService.notifyMatches(item, matches, req.io);
  //     // }

  //     res.json({
  //       success: true,
  //       data: {
  //         item,
  //         matches,
  //         matchCount: matches.length
  //       },
  //       message: `Found ${matches.length} potential matches`
  //     });

  //   } catch (error) {
  //     logger.error('Error rerunning matching:', error);
  //     res.status(500).json({
  //       success: false,
  //       message: 'Failed to rerun matching',
  //       error: process.env.NODE_ENV === 'development' ? (error as Error).message : 'Internal server error'
  //     });
  //   }
  // }

  // async resolveItem(req: CustomRequest, res: Response): Promise<void> {
  //   try {
  //     const { id } = req.params;
  //     const { matchedItemId, resolution } = req.body;

  //     if (!id || !isValidObjectId(id)) {
  //       res.status(400).json({
  //         success: false,
  //         message: 'Invalid or missing item ID'
  //       });
  //       return;
  //     }

  //     // Validate input
  //     if (!resolution || !resolution.trim()) {
  //       res.status(400).json({
  //         success: false,
  //         message: 'Resolution details are required'
  //       });
  //       return;
  //     }

  //     if (!matchedItemId || !isValidObjectId(matchedItemId)) {
  //       res.status(400).json({
  //         success: false,
  //         message: 'Valid matched item ID is required'
  //       });
  //       return;
  //     }

  //     // Check if item exists and belongs to user
  //     const item = await ItemModel.findById(id);
  //     if (!item) {
  //       res.status(404).json({
  //         success: false,
  //         message: 'Item not found'
  //       });
  //       return;
  //     }

  //     if (item.reporter.toString() !== req.user?.id) {
  //       res.status(403).json({
  //         success: false,
  //         message: 'Not authorized to resolve this item'
  //       });
  //       return;
  //     }

  //     // Check if matched item exists
  //     const matchedItem = await ItemModel.findById(matchedItemId);
  //     if (!matchedItem) {
  //       res.status(404).json({
  //         success: false,
  //         message: 'Matched item not found'
  //       });
  //       return;
  //     }

  //     // Generate confirmation code
  //     const confirmationCode = Math.random().toString(36).substring(2, 8).toUpperCase();

  //     // Create or update resolution record
  //     const resolutionData = {
  //       sourceItemId: new Types.ObjectId(id),
  //       matchedItemId: new Types.ObjectId(matchedItemId),
  //       resolution: resolution.trim(),
  //       confirmationCode,
  //       status: 'pending',
  //       createdBy: new Types.ObjectId(req.user?.id),
  //       createdAt: new Date()
  //     };

  //     const existingResolution = await Resolution.findOne({ sourceItemId: id });
  //     let savedResolution;

  //     if (existingResolution) {
  //       savedResolution = await Resolution.findByIdAndUpdate(
  //         existingResolution._id,
  //         resolutionData,
  //         { new: true }
  //       );
  //     } else {
  //       savedResolution = await Resolution.create(resolutionData);
  //     }

  //     logger.info(`Resolution request created: ${savedResolution._id} by user: ${req.user?.id}`);

  //     res.status(200).json({
  //       success: true,
  //       message: 'Resolution request submitted successfully',
  //       data: {
  //         confirmationCode,
  //         resolutionId: savedResolution._id
  //       }
  //     });

  //   } catch (error) {
  //     logger.error('Error creating resolution request:', error);
  //     res.status(500).json({
  //       success: false,
  //       message: 'Failed to submit resolution request',
  //       error: process.env.NODE_ENV === 'development' ? (error as Error).message : 'Internal server error'
  //     });
  //   }
  // }

  // async confirmResolution(req: CustomRequest, res: Response): Promise<void> {
  //   try {
  //     const { id } = req.params;
  //     const { confirmationCode } = req.body;

  //     if (!id || !isValidObjectId(id)) {
  //       res.status(400).json({
  //         success: false,
  //         message: 'Invalid or missing item ID'
  //       });
  //       return;
  //     }

  //     // Validate input
  //     if (!confirmationCode || !confirmationCode.trim()) {
  //       res.status(400).json({
  //         success: false,
  //         message: 'Confirmation code is required'
  //       });
  //       return;
  //     }

  //     // Find resolution by item ID and confirmation code
  //     const resolution = await Resolution.findOne({
  //       $or: [
  //         { sourceItemId: id },
  //         { matchedItemId: id }
  //       ],
  //       confirmationCode: confirmationCode.trim().toUpperCase()
  //     });

  //     if (!resolution) {
  //       res.status(404).json({
  //         success: false,
  //         message: 'Invalid confirmation code or resolution not found'
  //       });
  //       return;
  //     }

  //     // Check if resolution is already confirmed
  //     if (resolution.status === 'confirmed') {
  //       res.status(400).json({
  //         success: false,
  //         message: 'Resolution already confirmed'
  //       });
  //       return;
  //     }

  //     // Verify user has permission (either owner of source or matched item)
  //     const sourceItem = await ItemModel.findById(resolution.sourceItemId);
  //     const matchedItem = await ItemModel.findById(resolution.matchedItemId);

  //     if (!sourceItem || !matchedItem) {
  //       res.status(404).json({
  //         success: false,
  //         message: 'Associated items not found'
  //       });
  //       return;
  //     }

  //     const hasPermission = sourceItem.reporter.toString() === req.user?.id || 
  //                          matchedItem.reporter.toString() === req.user?.id;

  //     if (!hasPermission) {
  //       res.status(403).json({
  //         success: false,
  //         message: 'Not authorized to confirm this resolution'
  //       });
  //       return;
  //     }

  //     // Update resolution status
  //     resolution.status = 'confirmed';
  //     resolution.confirmedBy = new Types.ObjectId(req.user?.id);
  //     resolution.confirmedAt = new Date();
  //     await resolution.save();

  //     // Update both items' status to resolved
  //     await Promise.all([
  //       ItemModel.findByIdAndUpdate(resolution.sourceItemId, { 
  //         status: 'resolved',
  //         resolvedAt: new Date(),
  //         resolution: resolution.resolution,
  //         matchedItem: resolution.matchedItemId
  //       }),
  //       ItemModel.findByIdAndUpdate(resolution.matchedItemId, { 
  //         status: 'resolved',
  //         resolvedAt: new Date(),
  //         matchedItem: resolution.sourceItemId
  //       })
  //     ]);

  //     // Update user statistics for both users
  //     await Promise.all([
  //       User.findByIdAndUpdate(sourceItem.reporter, {
  //         $inc: { itemsResolved: 1 }
  //       }),
  //       User.findByIdAndUpdate(matchedItem.reporter, {
  //         $inc: { itemsResolved: 1 }
  //       })
  //     ]);

  //     logger.info(`Resolution confirmed: ${resolution._id} by user: ${req.user?.id}`);

  //     res.status(200).json({
  //       success: true,
  //       message: 'Resolution confirmed successfully',
  //       data: {
  //         resolutionId: resolution._id,
  //         status: resolution.status
  //       }
  //     });

  //   } catch (error) {
  //     logger.error('Error confirming resolution:', error);
  //     res.status(500).json({
  //       success: false,
  //       message: 'Failed to confirm resolution',
  //       error: process.env.NODE_ENV === 'development' ? (error as Error).message : 'Internal server error'
  //     });
  //   }
  // }

  // async getResolutionStatus(req: CustomRequest, res: Response): Promise<void> {
  //   try {
  //     const { id } = req.params;

  //     if (!id || !isValidObjectId(id)) {
  //       res.status(400).json({
  //         success: false,
  //         message: 'Invalid or missing item ID'
  //       });
  //       return;
  //     }

  //     // Check if item exists
  //     const item = await ItemModel.findById(id);
  //     if (!item) {
  //       res.status(404).json({
  //         success: false,
  //         message: 'Item not found'
  //       });
  //       return;
  //     }

  //     // Find resolution for this item (either as source or matched item)
  //     const resolution = await Resolution.findOne({
  //       $or: [
  //         { sourceItemId: id },
  //         { matchedItemId: id }
  //       ]
  //     }).populate('sourceItemId matchedItemId', 'title description reporter status');

  //     if (!resolution) {
  //       res.status(200).json({
  //         success: true,
  //         data: {
  //           hasResolution: false,
  //           status: null
  //         }
  //       });
  //       return;
  //     }

  //     // Check if user has permission to view this resolution
  //     const sourceItem = resolution.sourceItemId as any;
  //     const matchedItem = resolution.matchedItemId as any;
      
  //     const hasPermission = sourceItem.reporter.toString() === req.user?.id || 
  //                          matchedItem.reporter.toString() === req.user?.id;

  //     if (!hasPermission) {
  //       res.status(403).json({
  //         success: false,
  //         message: 'Not authorized to view this resolution'
  //       });
  //       return;
  //     }

  //     // Prepare response data
  //     const responseData: any = {
  //       hasResolution: true,
  //       status: resolution.status,
  //       resolution: resolution.resolution,
  //       createdAt: resolution.createdAt,
  //       confirmedAt: resolution.confirmedAt,
  //       sourceItem: {
  //         id: sourceItem._id,
  //         title: sourceItem.title,
  //         description: sourceItem.description,
  //         status: sourceItem.status
  //       },
  //       matchedItem: {
  //         id: matchedItem._id,
  //         title: matchedItem.title,
  //         description: matchedItem.description,
  //         status: matchedItem.status
  //       }
  //     };

  //     // Include confirmation code only for the creator and if still pending
  //     if (resolution.createdBy.toString() === req.user?.id && resolution.status === 'pending') {
  //       responseData.confirmationCode = resolution.confirmationCode;
  //     }

  //     logger.info(`Resolution status fetched for item: ${id} by user: ${req.user?.id}`);

  //     res.status(200).json({
  //       success: true,
  //       data: responseData
  //     });

  //   } catch (error) {
  //     logger.error('Error fetching resolution status:', error);
  //     res.status(500).json({
  //       success: false,
  //       message: 'Failed to fetch resolution status',
  //       error: process.env.NODE_ENV === 'development' ? (error as Error).message : 'Internal server error'
  //     });
  //   }
  // }


}

export default new ItemController();