import axios from 'axios';
import { logger } from '../utils/loggers';

const AI_SERVICE_URL = process.env.AI_SERVICE_URL || 'http://localhost:8000';

interface ImageAnalysisResult {
  features: number[];
  objects: string[];
  colors: string[];
  confidence: number;
}

interface TextAnalysisResult {
  embedding: number[];
  keywords: string[];
  sentiment: number;
  category: string;
  confidence?: number;
}

interface MatchResult {
  itemId: string;
  score: number;
  reasons: string[];
}

class AIService {
  private baseUrl: string;

  constructor() {
    this.baseUrl = AI_SERVICE_URL;
  }

  async analyzeImage(imageUrl: string): Promise<ImageAnalysisResult> {
    try {
      const response = await axios.post(`${this.baseUrl}/analyze-image`, {
        image_url: imageUrl
      });
      return response.data;
    } catch (error) {
      logger.error('AI image analysis failed:', error);
      throw new Error('Failed to analyze image');
    }
  }

  async analyzeText(text: string): Promise<TextAnalysisResult> {
    try {
      const response = await axios.post(`${this.baseUrl}/analyze-text`, {
        text
      });
      return response.data;
    } catch (error) {
      logger.error('AI text analysis failed:', error);
      throw new Error('Failed to analyze text');
    }
  }

  async findMatches(
    itemType: 'lost' | 'found',
    imageFeatures?: number[],
    textEmbedding?: number[],
    category?: string
  ): Promise<MatchResult[]> {
    try {
      const response = await axios.post(`${this.baseUrl}/find-matches`, {
        item_type: itemType,
        image_features: imageFeatures,
        text_embedding: textEmbedding,
        category
      });
      return response.data;
    } catch (error) {
      logger.error('AI match finding failed:', error);
      throw new Error('Failed to find matches');
    }
  }

  async categorizeItem(description: string, imageUrl?: string): Promise<string> {
    try {
      const response = await axios.post(`${this.baseUrl}/categorize`, {
        description,
        image_url: imageUrl
      });
      return response.data.category;
    } catch (error) {
      logger.error('AI categorization failed:', error);
      throw new Error('Failed to categorize item');
    }
  }
}

export const aiClient = new AIService();