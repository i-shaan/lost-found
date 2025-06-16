import { Request, Response } from 'express';
import { Item } from '../models/Item';
import { User } from '../models/Users';
import { logger } from '../utils/loggers';
import { aiClient } from '../services/aiService';

export const createItem = async (req: Request, res: Response) => {
  try {
    logger.info("request",req)
    const {
      title,
      description,
      category,
      type,
      images,
      location,
      dateLostFound,
      tags,
      reward,
      contactPreference
    } = req.body;

    // Create new item
    const item = new Item({
      title,
      description,
      category,
      type,
      images,
      location,
      dateLostFound,
      reporter: req.user!.id,
      tags,
      reward,
      contactPreference
    });

    // Process with AI services if available
    // try {
    //   // Analyze text description
    //   const textAnalysis = await aiClient.analyzeText(description);
      
    //   // Analyze images if provided
    //   let imageAnalysis = null;
    //   if (images && images.length > 0) {
    //     imageAnalysis = await aiClient.analyzeImage(images[0]);
    //   }

    //   // Auto-categorize if not provided
    //   if (!category) {
    //     const suggestedCategory = await aiClient.categorizeItem(description, images?.[0]);
    //     item.category = suggestedCategory;
    //   }

    //   // Store AI metadata
    //   item.aiMetadata = {
    //     textEmbedding: textAnalysis.embedding,
    //     imageFeatures: imageAnalysis?.features,
    //     confidence: imageAnalysis?.confidence || textAnalysis.confidence,
    //     category: textAnalysis.category
    //   };

    //   // Extract additional tags from AI analysis
    //   if (textAnalysis.keywords) {
    //     item.tags = [...new Set([...item.tags, ...textAnalysis.keywords])];
    //   }

    // } catch (aiError) {
    //   logger.warn('AI processing failed, continuing without AI features:', aiError);
    // }

    await item.save();

    // Populate reporter information
    await item.populate('reporter', 'name email avatar');

    // Find potential matches
    try {
      const matches = await findPotentialMatches(item);
      if (matches.length > 0) {
        item.matches = matches.map(match => match.itemId);
        await item.save();
      }
    } catch (matchError) {
      logger.warn('Match finding failed:', matchError);
    }

    res.status(201).json({
      success: true,
      message: 'Item created successfully',
      data: { item }
    });

  } catch (error) {
    logger.error('Create item error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create item'
    });
  }
};

export const getItems = async (req: Request, res: Response) => {
  try {
    const {
      type,
      category,
      status = 'active',
      search,
      lat,
      lng,
      radius = 50,
      page = 1,
      limit = 20,
      sortBy = 'createdAt',
      sortOrder = 'desc'
    } = req.query;

    // Build query
    const query: any = { status, isPublic: true };

    if (type) query.type = type;
    if (category) query.category = category;

    // Text search
    if (search) {
      query.$text = { $search: search as string };
    }

    // Location-based search
    if (lat && lng) {
      const latitude = parseFloat(lat as string);
      const longitude = parseFloat(lng as string);
      const radiusInMeters = parseInt(radius as string) * 1000;

      query.location = {
        $near: {
          $geometry: {
            type: 'Point',
            coordinates: [longitude, latitude]
          },
          $maxDistance: radiusInMeters
        }
      };
    }

    // Pagination
    const pageNum = parseInt(page as string);
    const limitNum = parseInt(limit as string);
    const skip = (pageNum - 1) * limitNum;

    // Sort options
    const sortOptions: any = {};
    sortOptions[sortBy as string] = sortOrder === 'desc' ? -1 : 1;

    // Execute query
    const items = await Item.find(query)
      .populate('reporter', 'name avatar')
      .sort(sortOptions)
      .skip(skip)
      .limit(limitNum)
      .lean();

    // Get total count for pagination
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
    logger.error('Get items error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch items'
    });
  }
};

export const getItem = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const item = await Item.findById(id)
      .populate('reporter', 'name email phone avatar location')
      .populate('matches', 'title type images location createdAt');

    if (!item) {
      return res.status(404).json({
        success: false,
        message: 'Item not found'
      });
    }

    // Increment view count (but not for the owner)
    if (item.reporter._id.toString() !== req.user?.id) {
      item.views += 1;
      await item.save();
    }

    res.json({
      success: true,
      data: { item }
    });

  } catch (error) {
    logger.error('Get item error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch item'
    });
  }
};

export const updateItem = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const updates = req.body;

    const item = await Item.findById(id);

    if (!item) {
      return res.status(404).json({
        success: false,
        message: 'Item not found'
      });
    }

    // Check ownership
    if (item.reporter.toString() !== req.user!.id) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to update this item'
      });
    }

    // Update item
    Object.assign(item, updates);
    await item.save();

    await item.populate('reporter', 'name email avatar');

    res.json({
      success: true,
      message: 'Item updated successfully',
      data: { item }
    });

  } catch (error) {
    logger.error('Update item error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update item'
    });
  }
};

export const deleteItem = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const item = await Item.findById(id);

    if (!item) {
      return res.status(404).json({
        success: false,
        message: 'Item not found'
      });
    }

    // Check ownership or admin role
    if (item.reporter.toString() !== req.user!.id && req.user!.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to delete this item'
      });
    }

    await Item.findByIdAndDelete(id);

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

export const searchItems = async (req: Request, res: Response) => {
  try {
    const {
      q,
      type,
      category,
      lat,
      lng,
      radius = 50,
      page = 1,
      limit = 20
    } = req.query;

    if (!q) {
      return res.status(400).json({
        success: false,
        message: 'Search query is required'
      });
    }

    // Build search query
    const query: any = {
      status: 'active',
      isPublic: true,
      $text: { $search: q as string }
    };

    if (type) query.type = type;
    if (category) query.category = category;

    // Location filter
    if (lat && lng) {
      const latitude = parseFloat(lat as string);
      const longitude = parseFloat(lng as string);
      const radiusInMeters = parseInt(radius as string) * 1000;

      query.location = {
        $near: {
          $geometry: {
            type: 'Point',
            coordinates: [longitude, latitude]
          },
          $maxDistance: radiusInMeters
        }
      };
    }

    // Pagination
    const pageNum = parseInt(page as string);
    const limitNum = parseInt(limit as string);
    const skip = (pageNum - 1) * limitNum;

    const items = await Item.find(query, { score: { $meta: 'textScore' } })
      .populate('reporter', 'name avatar')
      .sort({ score: { $meta: 'textScore' } })
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
    logger.error('Search items error:', error);
    res.status(500).json({
      success: false,
      message: 'Search failed'
    });
  }
};

export const getItemMatches = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const item = await Item.findById(id);

    if (!item) {
      return res.status(404).json({
        success: false,
        message: 'Item not found'
      });
    }

    // Check ownership
    if (item.reporter.toString() !== req.user!.id) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to view matches for this item'
      });
    }

    // Find potential matches using AI
    const matches = await findPotentialMatches(item);

    res.json({
      success: true,
      data: { matches }
    });

  } catch (error) {
    logger.error('Get item matches error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch matches'
    });
  }
};

export const markItemAsClaimed = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const item = await Item.findById(id);

    if (!item) {
      return res.status(404).json({
        success: false,
        message: 'Item not found'
      });
    }

    // Check ownership
    if (item.reporter.toString() !== req.user!.id) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to update this item'
      });
    }

    item.status = 'claimed';
    await item.save();

    res.json({
      success: true,
      message: 'Item marked as claimed',
      data: { item }
    });

  } catch (error) {
    logger.error('Mark item as claimed error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update item status'
    });
  }
};

export const getItemsByUser = async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;
    const { type, status, page = 1, limit = 20 } = req.query;

    // Check if user is requesting their own items or is admin
    if (userId !== req.user!.id && req.user!.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to view these items'
      });
    }

    const query: any = { reporter: userId };
    if (type) query.type = type;
    if (status) query.status = status;

    const pageNum = parseInt(page as string);
    const limitNum = parseInt(limit as string);
    const skip = (pageNum - 1) * limitNum;

    const items = await Item.find(query)
      .populate('reporter', 'name avatar')
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
    logger.error('Get items by user error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch user items'
    });
  }
};

// Helper function to find potential matches
async function findPotentialMatches(item: any) {
  try {
    const oppositeType = item.type === 'lost' ? 'found' : 'lost';
    
    // Use AI service to find matches
    const matches = await aiClient.findMatches(
      item.type,
      item.aiMetadata?.imageFeatures,
      item.aiMetadata?.textEmbedding,
      item.category
    );

    // Get full item details for matches
    const matchedItems = await Item.find({
      _id: { $in: matches.map((m: any) => m.itemId) },
      type: oppositeType,
      status: 'active'
    }).populate('reporter', 'name avatar');

    return matches.map((match: any) => {
      const matchedItem = matchedItems.find(item => item.id.toString() === match.itemId);
      return {
        ...match,
        item: matchedItem
      };
    });

  } catch (error) {
    logger.error('Find potential matches error:', error);
    return [];
  }
}