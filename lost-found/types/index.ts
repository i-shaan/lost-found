import { SetStateAction } from "react";

export interface User {
    _id: string;
    email: string;
    name: string;
    phone?: string;
    avatar?: string;
    isVerified: boolean;
    notificationPreferences: {
      email: boolean;
      push: boolean;
      sms: boolean;
    };
    location?: {
      name?: string;
      coordinates?: {
        lat: number;
        lng: number;
      };
    };
    reputation: number;
    itemsPosted: number;
    itemsResolved: number;
    lastActive: Date;
    createdAt: Date;
    updatedAt: Date;
  }
  
  export interface Item {
    data: SetStateAction<Item | null>;
    _id: string;
    title: string;
    description: string;
    category: 'Electronics' | 'Bags & Wallets' | 'Jewelry & Accessories' | 'Clothing' | 'Keys' | 'Documents & Cards' | 'Books & Stationery' | 'Sports Equipment' | 'Other';
    type: 'lost' | 'found';
    images: string[];
    location: string;
    dateLostFound: Date;
    status: 'active' | 'resolved' | 'expired';
    reporter: User;
    tags: string[];
    reward?: number;
    contactPreference: 'platform' | 'phone' | 'email';
    matches: Match[];
    views: number;
    isVerified: boolean;
    createdAt: Date;
    updatedAt: Date;
  }
  export interface ResolutionRequest {
    _id: string;
    sourceItemId: string;
    matchedItemId: string;
    initiatedBy: string;
    resolution: string;
    confirmationCode: string;
    status: 'pending' | 'confirmed' | 'rejected' | 'expired';
    confirmedBy?: string;
    confirmedAt?: Date;
    expiresAt: Date;
    createdAt: Date;
  }
  
  export interface Match {
    itemId: string;
    confidence: number;
    reasons: string[];
    notified: boolean;
    createdAt: Date;
  }
  
  export interface LoginData {
    email: string;
    password: string;
  }
  
  export interface RegisterData {
    name: string;
    email: string;
    password: string;
    confirmPassword: string;
    phone?: string;
  }
  
  export interface ItemFilters {
    category?: string;
    type?: string;
    location?: string;
    dateFrom?: string;
    dateTo?: string;
    status?: string;
    hasReward?: boolean;
  }