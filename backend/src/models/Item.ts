import mongoose, { Document, Schema } from 'mongoose';

export interface IItem extends Document {
  title: string;
  description: string;
  category: string;
  type: 'lost' | 'found';
  images: string[];
  location: {
    type: 'Point';
    coordinates: [number, number];
    address: string;
  };
  dateReported: Date;
  dateLostFound?: Date;
  status: 'active' | 'matched' | 'claimed' | 'expired';
  reporter: mongoose.Types.ObjectId;
  tags: string[];
  reward?: number;
  contactPreference: 'platform' | 'direct';
  aiMetadata: {
    imageFeatures?: number[];
    textEmbedding?: number[];
    confidence?: number;
    category?: string;
  };
  matches?: mongoose.Types.ObjectId[];
  views: number;
  isPublic: boolean;
  expiresAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const ItemSchema = new Schema<IItem>({
  title: {
    type: String,
    required: [true, 'Title is required'],
    trim: true,
    maxlength: [100, 'Title cannot exceed 100 characters']
  },
  description: {
    type: String,
    required: [true, 'Description is required'],
    trim: true,
    maxlength: [1000, 'Description cannot exceed 1000 characters']
  },
  category: {
    type: String,
    required: [true, 'Category is required'],
    enum: [
      'Electronics', 'Jewelry', 'Clothing', 'Bags & Wallets', 
      'Keys', 'Documents', 'Toys', 'Sports Equipment', 
      'Books & Stationery', 'Accessories', 'Other'
    ]
  },
  type: {
    type: String,
    enum: ['lost', 'found'],
    required: [true, 'Type is required']
  },
  images: [{
    type: String,
    validate: {
      validator: function(v: string) {
        return /^https?:\/\/.+\.(jpg|jpeg|png|webp|gif)$/i.test(v);
      },
      message: 'Invalid image URL format'
    }
  }],
  location: {
    type: {
      type: String,
      enum: ['Point'],
      required: true
    },
    coordinates: {
      type: [Number],
      required: true,
      validate: {
        validator: function(v: number[]) {
          return v.length === 2 && v[0] >= -180 && v[0] <= 180 && v[1] >= -90 && v[1] <= 90;
        },
        message: 'Invalid coordinates'
      }
    },
    address: {
      type: String,
      required: [true, 'Address is required']
    }
  },
  dateReported: {
    type: Date,
    default: Date.now
  },
  dateLostFound: Date,
  status: {
    type: String,
    enum: ['active', 'matched', 'claimed', 'expired'],
    default: 'active'
  },
  reporter: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  tags: [{
    type: String,
    trim: true,
    lowercase: true
  }],
  reward: {
    type: Number,
    min: [0, 'Reward cannot be negative']
  },
  contactPreference: {
    type: String,
    enum: ['platform', 'direct'],
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
    category: String
  },
  matches: [{
    type: Schema.Types.ObjectId,
    ref: 'Item'
  }],
  views: {
    type: Number,
    default: 0
  },
  isPublic: {
    type: Boolean,
    default: true
  },
  expiresAt: Date
}, {
  timestamps: true,
});

// Indexes
ItemSchema.index({ location: '2dsphere' });
ItemSchema.index({ type: 1, status: 1 });
ItemSchema.index({ category: 1 });
ItemSchema.index({ tags: 1 });
ItemSchema.index({ reporter: 1 });
ItemSchema.index({ createdAt: -1 });
ItemSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

// Text search index
ItemSchema.index({
  title: 'text',
  description: 'text',
  tags: 'text'
});

export const Item = mongoose.model<IItem>('Item', ItemSchema);