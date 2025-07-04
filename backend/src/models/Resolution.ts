import mongoose, { Document, Schema, Model } from 'mongoose';

const { model } = mongoose;

// Interface for the Resolution document
export interface IResolution {
  sourceItemId: mongoose.Types.ObjectId;
  matchedItemId: mongoose.Types.ObjectId;
  initiatedBy: mongoose.Types.ObjectId;
  resolution: string;
  confirmationCode: string;
  status: 'pending' | 'confirmed' | 'rejected' | 'expired';
  confirmedBy?: mongoose.Types.ObjectId;
  confirmedAt?: Date;
  expiresAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

// Interface for the Resolution document with methods
export interface IResolutionDocument extends IResolution, Document {
  isExpired(): boolean;
}

// Interface for the Resolution model with statics
export interface IResolutionModel extends Model<IResolutionDocument> {
  generateConfirmationCode(): string;
}

const resolutionSchema = new Schema<IResolutionDocument>({
  sourceItemId: {
    type: Schema.Types.ObjectId,
    ref: 'Item',
    required: true,
    index: true
  },
  matchedItemId: {
    type: Schema.Types.ObjectId,
    ref: 'Item',
    required: true,
    index: true
  },
  initiatedBy: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  resolution: {
    type: String,
    required: true,
    trim: true,
    minlength: [10, 'Resolution must be at least 10 characters long'],
    maxlength: [1000, 'Resolution cannot exceed 1000 characters']
  },
  confirmationCode: {
    type: String,
    required: true,
    unique: true,
    length: 8,
    uppercase: true,
    match: [/^[A-Z0-9]{8}$/, 'Confirmation code must be 8 alphanumeric characters']
  },
  status: {
    type: String,
    enum: {
      values: ['pending', 'confirmed', 'rejected', 'expired'],
      message: 'Invalid resolution status'
    },
    default: 'pending',
    index: true
  },
  confirmedBy: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    validate: {
      validator: function(this: IResolutionDocument, confirmedBy: mongoose.Types.ObjectId): boolean {
        // confirmedBy should only be set if status is 'confirmed'
        if (confirmedBy && this.status !== 'confirmed') {
          return false;
        }
        return true;
      },
      message: 'confirmedBy can only be set when status is confirmed'
    }
  },
  confirmedAt: {
    type: Date,
    validate: {
      validator: function(this: IResolutionDocument, confirmedAt: Date): boolean {
        // confirmedAt should only be set if status is 'confirmed'
        if (confirmedAt && this.status !== 'confirmed') {
          return false;
        }
        // confirmedAt should not be in the future
        if (confirmedAt && confirmedAt > new Date()) {
          return false;
        }
        return true;
      },
      message: 'Invalid confirmation date'
    }
  },
  expiresAt: {
    type: Date,
    required: true,
    index: { expireAfterSeconds: 0 },
    validate: {
      validator: function(this: IResolutionDocument, expiresAt: Date): boolean {
        // expiresAt should be in the future when created
        return expiresAt > this.createdAt || expiresAt > new Date();
      },
      message: 'Expiration date must be in the future'
    }
  }
}, {
  timestamps: true,
  // Add version key for optimistic concurrency control
  versionKey: '__v'
});

// Compound indexes for efficient queries
resolutionSchema.index({ sourceItemId: 1, status: 1 });
resolutionSchema.index({ matchedItemId: 1, status: 1 });
resolutionSchema.index({ confirmationCode: 1, status: 1 });
resolutionSchema.index({ expiresAt: 1, status: 1 });
resolutionSchema.index({ initiatedBy: 1, createdAt: -1 });

// Static method to generate unique confirmation code
resolutionSchema.statics.generateConfirmationCode = function(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let result = '';
  for (let i = 0; i < 8; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
};

// Instance method to check if resolution is expired
resolutionSchema.methods.isExpired = function(this: IResolutionDocument): boolean {
  return new Date() > this.expiresAt;
};

// Pre-save middleware to ensure data consistency
resolutionSchema.pre('save', function(this: IResolutionDocument, next) {
  // Ensure confirmation fields are only set when status is confirmed
  if (this.status === 'confirmed') {
    if (!this.confirmedBy) {
      return next(new Error('confirmedBy is required when status is confirmed'));
    }
    if (!this.confirmedAt) {
      this.confirmedAt = new Date();
    }
  } else {
    // Clear confirmation fields if status is not confirmed
    this.confirmedBy = undefined;
    this.confirmedAt = undefined;
  }
  
  // Ensure confirmation code is uppercase
  if (this.confirmationCode) {
    this.confirmationCode = this.confirmationCode.toUpperCase();
  }
  
  next();
});

// Virtual for populated matched item
resolutionSchema.virtual('matchedItem', {
  ref: 'Item',
  localField: 'matchedItemId',
  foreignField: '_id',
  justOne: true
});

// Virtual for populated source item
resolutionSchema.virtual('sourceItem', {
  ref: 'Item',
  localField: 'sourceItemId',
  foreignField: '_id',
  justOne: true
});

// Ensure virtuals are included in JSON output
resolutionSchema.set('toJSON', { virtuals: true });
resolutionSchema.set('toObject', { virtuals: true });

export const ResolutionModel = model<IResolutionDocument, IResolutionModel>('Resolution', resolutionSchema);
export default ResolutionModel;