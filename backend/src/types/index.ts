export interface Item {
    _id: string;
    title: string;
    description: string;
    category: string;
    type: 'lost' | 'found';
    images: string[];
    location: string;
    dateLostFound: Date;
    status: 'active' | 'resolved' | 'expired';
    reporter: string;
    tags: string[];
    reward?: number;
    contactPreference: 'platform' | 'phone' | 'email';
    aiMetadata: {
      imageFeatures: number[];
      textEmbedding: number[];
      confidence: number;
      textAnalysis: {
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
      };
      imageAnalysis: {
        objects: string[];
        colors: Array<{ color: string; percentage: number }>;
        gemini_description: string;
        gemini_tags: string[];
      };
      metadata: {
        confidence: number;
        analysis_timestamp: Date;
      };
    };
    matches?: Array<{
      itemId: string;
      confidence: number;
      reasons: string[];
      notified: boolean;
      createdAt: Date;
    }>;
    views: number;
    isVerified: boolean;
    createdAt: Date;
    updatedAt: Date;
  }
  
  export interface MatchResult {
    item_id: string;
    similarity_score: number;
    confidence: number;
    reasons: string[];
    detailed_analysis: {
      text_similarity: number;
      image_similarity: number;
      category_match: number;
      location_proximity: number;
      time_proximity: number;
      keyword_overlap: number;
      color_similarity: number;
      semantic_similarity: number;
    };
  }
  export interface SimilarityResult {
    overall_score: number;
    confidence: number;
    reasons: string[];
    detailed_scores: {
      [key: string]: number;
    };
  }
  export interface GetItemsQuery {
    type?: 'lost' | 'found';
    category?: string;
    status?: 'active' | 'inactive' | 'archived';
    search?: string;
    location?: string;
    page?: string;      // still string because it comes from req.query
    limit?: string;
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
  }
  
  export interface AIAnalysisResult {
    imageFeatures: number[];
    textEmbedding: number[];
    confidence: number;
    textAnalysis: any;
    imageAnalysis: any;
    metadata: {
      confidence: number;
      analysis_timestamp: Date;
    };
  }
  
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
      name: string;
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