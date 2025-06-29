import mongoose, { Document, Schema, Model } from 'mongoose';
import bcrypt from 'bcryptjs';

interface NotificationPreferences {
  email: boolean;
  push: boolean;
  sms: boolean;
}

interface Location {
  name?: string;
  coordinates?: {
    lat: number;
    lng: number;
  };
}

export interface IUser extends Document {
  email: string;
  password: string;
  name: string;
  phone?: string;
  avatar?: string;
  isVerified: boolean;
  notificationPreferences: NotificationPreferences;
  location?: Location;
  reputation: number;
  itemsPosted: number;
  itemsResolved: number;
  lastActive: Date;
  createdAt: Date;
  updatedAt: Date;

  comparePassword(candidatePassword: string): Promise<boolean>;
  updateLastActive(): Promise<IUser>;
}

const userSchema = new Schema<IUser>(
  {
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true
    },
    password: {
      type: String,
      required: true,
      minlength: 6
    },
    name: {
      type: String,
      required: true,
      trim: true
    },
    phone: {
      type: String,
      sparse: true
    },
    avatar: {
      type: String
    },
    isVerified: {
      type: Boolean,
      default: false
    },
    notificationPreferences: {
      email: {
        type: Boolean,
        default: true
      },
      push: {
        type: Boolean,
        default: true
      },
      sms: {
        type: Boolean,
        default: false
      }
    },
    location: {
      name: {
        type: String
      },
      coordinates: {
        lat: {
          type: Number
        },
        lng: {
          type: Number
        }
      }
    },
    reputation: {
      type: Number,
      default: 0
    },
    itemsPosted: {
      type: Number,
      default: 0
    },
    itemsResolved: {
      type: Number,
      default: 0
    },
    lastActive: {
      type: Date,
      default: Date.now
    }
  },
  {
    timestamps: true
  }
);

userSchema.pre<IUser>('save', async function (next) {
  if (!this.isModified('password')) return next();

  try {
    const salt = await bcrypt.genSalt(12);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    next(error as Error);
  }
});

userSchema.methods.comparePassword = async function (
  candidatePassword: string
): Promise<boolean> {
  return bcrypt.compare(candidatePassword, this.password);
};

userSchema.methods.updateLastActive = function (): Promise<IUser> {
  this.lastActive = new Date();
  return this.save();
};

const User: Model<IUser> = mongoose.model<IUser>('User', userSchema);
export default User;
