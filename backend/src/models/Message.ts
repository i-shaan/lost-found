import mongoose, { Document, Schema, Types } from 'mongoose';

export interface INotification extends Document {
  timeAgo: any;
  _id: Types.ObjectId;
  userId: Types.ObjectId;
  type: 'new_match' | 'item_resolved' | 'message' | 'system' | 'resolution_request' | 'resolution_confirmed';
  title: string;
  message: string;
  data?: {
    sourceItem?: any;
    matchedItem?: any;
    confidence?: number;
    reasons?: string[];
    item?: any;
    [key: string]: any;
  };
  read: boolean;
  readAt?: Date;
  createdAt: Date;
  updatedAt: Date;
  expiresAt?: Date; // Optional expiration for auto-cleanup
}

const NotificationSchema = new Schema<INotification>({
  userId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  type: {
    type: String,
    enum: ['new_match', 'item_resolved', 'message', 'system', 'resolution_request' ,'resolution_confirmed'],
    required: true
  },
  title: {
    type: String,
    required: true,
    maxlength: 200
  },
  message: {
    type: String,
    required: true,
    maxlength: 1000
  },
  data: {
    type: Schema.Types.Mixed,
    default: {}
  },
  read: {
    type: Boolean,
    default: false,
    index: true
  },
  readAt: {
    type: Date
  },
  expiresAt: {
    type: Date,
    default: () => new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // 30 days from now
  }
}, {
  timestamps: true
});

// Compound indexes for efficient querying
NotificationSchema.index({ userId: 1, read: 1, createdAt: -1 });
NotificationSchema.index({ userId: 1, createdAt: -1 });
NotificationSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 }); // TTL index for auto-cleanup

// Virtual for formatting
NotificationSchema.virtual('timeAgo').get(function() {
  const now = new Date();
  const diff = now.getTime() - this.createdAt.getTime();
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);
  
  if (minutes < 1) return 'Just now';
  if (minutes < 60) return `${minutes}m ago`;
  if (hours < 24) return `${hours}h ago`;
  return `${days}d ago`;
});

// Ensure virtual fields are serialized
NotificationSchema.set('toJSON', { virtuals: true });
NotificationSchema.set('toObject', { virtuals: true });

export const NotificationModel = mongoose.model<INotification>('Notification', NotificationSchema);