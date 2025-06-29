import mongoose, { Schema, Document, Types } from 'mongoose';
import mongoosePaginate from 'mongoose-paginate-v2';

interface ImageColor {
  color: string;
  percentage: number;
}

interface TextAnalysis {
  keywords: string[];
  sentiment: string;
  category: string;
  urgency_level: string;
  location_mentioned: string;
  brand_mentioned: string;
  color_mentioned: string;
  size_mentioned: string;
  condition_mentioned: string;
  emotional_tone: string;
  text_length: number;
  word_count: number;
  has_contact_info: boolean;
}

interface ImageAnalysis {
  objects: string[];
  colors: ImageColor[];
  gemini_description: string;
  gemini_tags: string[];
}

interface AiMetadata {
  imageFeatures: number[];
  textEmbedding: number[];
  confidence?: number;
  textAnalysis?: TextAnalysis;
  imageAnalysis?: ImageAnalysis;
  metadata?: {
    confidence?: number;
    analysis_timestamp?: Date;
  };
}

interface Match {
  itemId: Types.ObjectId;
  confidence: number;
  reasons: string[];
  notified?: boolean;
  createdAt?: Date;
}

export interface ItemDocument extends Document {
  title: string;
  description: string;
  category: string;
  type: 'lost' | 'found';
  images: string[];
  location: string;
  dateLostFound: Date;
  status: 'active' | 'resolved' | 'expired' | 'inactive' | 'archived';
  reporter: Types.ObjectId;
  tags?: string[];
  reward?: number;
  contactPreference: 'platform' | 'phone' | 'email';
  aiMetadata?: AiMetadata;
  matches: Match[];
  views?: number;
  isVerified?: boolean;
  // Resolution-related fields
  resolvedAt?: Date;
  resolution?: string;
  matchedItem?: Types.ObjectId;
  // Timestamps
  createdAt?: Date;
  updatedAt?: Date;
  // Virtual
  matchCount?: number;
}

const ItemSchema = new Schema<ItemDocument>(
  {
    title: { 
      type: String, 
      required: true, 
      trim: true, 
      maxlength: [200, 'Title cannot exceed 200 characters'],
      minlength: [3, 'Title must be at least 3 characters long']
    },
    description: { 
      type: String, 
      required: true, 
      maxlength: [2000, 'Description cannot exceed 2000 characters'],
      minlength: [10, 'Description must be at least 10 characters long']
    },
    category: {
      type: String,
      required: true,
      enum: {
        values: [
          'Electronics', 'Bags & Wallets', 'Jewelry & Accessories',
          'Clothing', 'Keys', 'Documents & Cards', 'Books & Stationery',
          'Sports Equipment', 'Other'
        ],
        message: 'Invalid category selected'
      }
    },
    type: { 
      type: String, 
      required: true, 
      enum: {
        values: ['lost', 'found'],
        message: 'Type must be either lost or found'
      }
    },
    images: {
      type: [String],
      validate: {
        validator: function(images: string[]) {
          return images.length <= 5; // Maximum 5 images
        },
        message: 'Cannot upload more than 5 images'
      }
    },
    location: { 
      type: String, 
      required: true, 
      trim: true,
      maxlength: [200, 'Location cannot exceed 200 characters'],
      minlength: [2, 'Location must be at least 2 characters long']
    },
    dateLostFound: { 
      type: Date, 
      required: true,
      validate: {
        validator: function(date: Date) {
          // Date should not be more than 1 year in the past or in the future
          const oneYearAgo = new Date();
          oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);
          const tomorrow = new Date();
          tomorrow.setDate(tomorrow.getDate() + 1);
          
          return date >= oneYearAgo && date <= tomorrow;
        },
        message: 'Date must be within the last year and not in the future'
      }
    },
    status: { 
      type: String, 
      enum: {
        values: ['active', 'resolved', 'expired', 'inactive', 'archived'],
        message: 'Invalid status'
      },
      default: 'active',
      index: true
    },
    reporter: { 
      type: Schema.Types.ObjectId, 
      ref: 'User', 
      required: true,
      index: true
    },

    reward: { 
      type: Number, 
      min: [0, 'Reward cannot be negative'],
      max: [1000000, 'Reward cannot exceed 1,000,000']
    },
    contactPreference: {
      type: String,
      enum: {
        values: ['platform', 'phone', 'email'],
        message: 'Invalid contact preference'
      },
      default: 'platform'
    },
    aiMetadata: {
      imageFeatures: [Number],
      textEmbedding: [Number],
      confidence: { 
        type: Number, 
        min: 0, 
        max: 1 
      },
      textAnalysis: {
        keywords: [String],
        sentiment: String,
        category: String,
        urgency_level: String,
        location_mentioned: String,
        brand_mentioned: String,
        color_mentioned: String,
        size_mentioned: String,
        condition_mentioned: String,
        emotional_tone: String,
        text_length: Number,
        word_count: Number,
        has_contact_info: Boolean
      },
      imageAnalysis: {
        objects: [String],
        colors: [
          {
            color: String,
            percentage: {
              type: Number,
              min: 0,
              max: 100
            }
          }
        ],
        gemini_description: String,
        gemini_tags: [String]
      },
      metadata: {
        confidence: {
          type: Number,
          min: 0,
          max: 1
        },
        analysis_timestamp: {
          type: Date,
          default: Date.now
        }
      }
    },
    matches: [
      {
        itemId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'Item',
          required: true
        },
        confidence: {
          type: Number,
          required: true,
          min: 0,
          max: 1
        },
        reasons: {
          type: [String],
          required: true
        },
        notified: { 
          type: Boolean, 
          default: false 
        },
        createdAt: { 
          type: Date, 
          default: Date.now 
        }
      }
    ],
    views: { 
      type: Number, 
      default: 0,
      min: 0
    },
    isVerified: { 
      type: Boolean, 
      default: false 
    },
    // Resolution-related fields
    resolvedAt: {
      type: Date,
      validate: {
        validator: function(this: ItemDocument, resolvedAt: Date) {
          // resolvedAt should only be set if status is 'resolved'
          if (resolvedAt && this.status !== 'resolved') {
            return false;
          }
          // resolvedAt should not be in the future
          if (resolvedAt && resolvedAt > new Date()) {
            return false;
          }
          return true;
        },
        message: 'Invalid resolution date'
      }
    },
    resolution: {
      type: String,
      maxlength: [1000, 'Resolution description cannot exceed 1000 characters'],
      validate: {
        validator: function(this: ItemDocument, resolution: string) {
          // Resolution should only be provided if status is 'resolved'
          if (resolution && this.status !== 'resolved') {
            return false;
          }
          return true;
        },
        message: 'Resolution can only be provided for resolved items'
      }
    },
    matchedItem: {
      type: Schema.Types.ObjectId,
      ref: 'Item',
      validate: {
        validator: function(this: ItemDocument, matchedItem: Types.ObjectId) {
          // matchedItem should only be set if status is 'resolved'
          if (matchedItem && this.status !== 'resolved') {
            return false;
          }
          return true;
        },
        message: 'Matched item can only be set for resolved items'
      }
    }
  },
  {
    timestamps: true,
    // Add version key for optimistic concurrency control
    versionKey: '__v'
  }
);

// Compound Indexes for better query performance
ItemSchema.index({ type: 1, status: 1, createdAt: -1 });
ItemSchema.index({ category: 1, type: 1, status: 1 });
ItemSchema.index({ reporter: 1, status: 1, createdAt: -1 });
ItemSchema.index({ status: 1, dateLostFound: -1 });
ItemSchema.index({ location: 1, type: 1, status: 1 });

// Text index for search functionality
ItemSchema.index({ 
  title: 'text', 
  description: 'text', 
  location: 'text',
  tags: 'text'
}, {
  weights: {
    title: 10,
    description: 5,
    location: 3,
    tags: 2
  },
  name: 'search_index'
});

// Sparse indexes for optional fields
ItemSchema.index({ resolvedAt: -1 }, { sparse: true });
ItemSchema.index({ matchedItem: 1 }, { sparse: true });

// Plugin for pagination
ItemSchema.plugin(mongoosePaginate);

// Virtual for match count
ItemSchema.virtual('matchCount').get(function (this: ItemDocument) {
  return this.matches?.length || 0;
});

// Virtual for age of the item
ItemSchema.virtual('age').get(function (this: ItemDocument) {
  if (!this.createdAt) return null;
  return Date.now() - this.createdAt.getTime();
});

// Virtual for days since lost/found
ItemSchema.virtual('daysSince').get(function (this: ItemDocument) {
  if (!this.dateLostFound) return null; // or 0 or 'N/A' based on your use case
  return Math.floor((Date.now() - this.dateLostFound.getTime()) / (1000 * 60 * 60 * 24));
});


// Ensure virtuals are included in JSON output
ItemSchema.set('toJSON', { virtuals: true });
ItemSchema.set('toObject', { virtuals: true });

// Pre-save middleware
ItemSchema.pre('save', function(next) {
  // Auto-set resolvedAt when status changes to resolved
  if (this.isModified('status') && this.status === 'resolved' && !this.resolvedAt) {
    this.resolvedAt = new Date();
  }
  
  // Clear resolution fields when status is not resolved
  if (this.isModified('status') && this.status !== 'resolved') {
    this.resolvedAt = undefined;
    this.resolution = undefined;
    this.matchedItem = undefined;
  }
  
  // Ensure tags are unique and cleaned
  if (this.tags && this.tags.length > 0) {
    this.tags = [...new Set(this.tags.map(tag => tag.trim().toLowerCase()))].filter(Boolean);
  }
  
  next();
});

// Pre-findOneAndUpdate middleware
ItemSchema.pre('findOneAndUpdate', function(next) {
  const update = this.getUpdate() as any;
  
  if (update && update.status === 'resolved' && !update.resolvedAt) {
    update.resolvedAt = new Date();
  }
  
  if (update && update.status !== 'resolved') {
    update.resolvedAt = undefined;
    update.resolution = undefined;
    update.matchedItem = undefined;
  }
  
  next();
});

// Static methods
ItemSchema.statics.findActiveItems = function(type?: 'lost' | 'found') {
  const query: any = { status: 'active' };
  if (type) query.type = type;
  return this.find(query).sort({ createdAt: -1 });
};

ItemSchema.statics.findRecentItems = function(days: number = 7) {
  const date = new Date();
  date.setDate(date.getDate() - days);
  return this.find({
    status: 'active',
    createdAt: { $gte: date }
  }).sort({ createdAt: -1 });
};

ItemSchema.statics.findItemsWithMatches = function(minConfidence: number = 0.5) {
  return this.find({
    status: 'active',
    'matches.confidence': { $gte: minConfidence }
  }).sort({ createdAt: -1 });
};

// Instance methods
ItemSchema.methods.hasHighConfidenceMatches = function(threshold: number = 0.8) {
  return this.matches && this.matches.some((match: { confidence: number; }) => match.confidence >= threshold);
};

ItemSchema.methods.getMatchesAboveThreshold = function(threshold: number = 0.5) {
  return this.matches ? this.matches.filter((match: { confidence: number; }) => match.confidence >= threshold) : [];
};

ItemSchema.methods.resolve = function(resolution?: string, matchedItemId?: Types.ObjectId) {
  this.status = 'resolved';
  this.resolvedAt = new Date();
  if (resolution) this.resolution = resolution;
  if (matchedItemId) this.matchedItem = matchedItemId;
  return this.save();
};

export const ItemModel = mongoose.model<ItemDocument>('Item', ItemSchema);