import axios from 'axios';
import FormData from 'form-data';
import fs from 'fs';
import { logger } from '../utils/loggers';
import { Item, MatchResult, AIAnalysisResult } from '../types';
import {ItemModel} from '../models/Item';
import { AdvancedMatchingService } from './AdvancedMatchingService';

class AIService {
  private baseURL: string;
  private apiKey: string;
  private timeout: number;

  constructor() {
    this.baseURL = process.env.AI_SERVICE_URL || 'http://localhost:8000';
    this.apiKey = process.env.AI_SERVICE_API_KEY || 'dev-key';
    this.timeout = 45000; // 45 seconds for enhanced processing
  }

  async analyzeItem(itemData: any): Promise<AIAnalysisResult> {
    try {
      logger.info('Starting enhanced AI analysis for item', itemData.title);
      const { title, description, category, images, tags } = itemData;
      console.log("a", itemData.description);
      
      // Step 1: Enhanced text analysis using Gemini AI (only description)
      const textAnalysis = await this.analyzeTextEnhanced(description);
   
      
      // Step 2: Analyze images (if any)
      let imageAnalysis = null;
      if (images && images.length > 0) {
        imageAnalysis = await this.analyzeImages(images);
      }
      
      // Step 3: Generate combined embeddings
      const embeddings = await this.generateEmbeddings({
        text: textAnalysis,
        images: imageAnalysis
      });
      
      // Step 4: Calculate overall confidence
      const confidence = this.calculateEnhancedConfidence({
        textAnalysis,
        imageAnalysis,
        hasImages: images && images.length > 0
      });
    
      // Step 5: Extract keywords from the nested analysis object
      const extractedKeywords = textAnalysis?.analysis?.keywords || 
                               textAnalysis?.analysis?.extracted_keywords || 
                               [];
    
      return {
        imageFeatures: embeddings.imageFeatures || Array(100).fill(0),
        textEmbedding: embeddings.textEmbedding || Array(384).fill(0),
        confidence,
        textAnalysis: {
          keywords: extractedKeywords, // Fixed: Extract from nested analysis
          sentiment: textAnalysis?.analysis?.sentiment || 'neutral',
          emotional_tone: textAnalysis?.analysis?.emotional_tone || 'neutral',
          urgency_level: textAnalysis?.analysis?.urgency_level || 'low',
          confidence_score: textAnalysis?.analysis?.confidence_score || 0
        },
        imageAnalysis: imageAnalysis || {
          objects: [],
          colors: [],
          gemini_description: '',
          gemini_tags: []
        },
        metadata: {
          confidence,
          analysis_timestamp: new Date()
        }
      };
    } catch (error) {
      logger.error('Error in enhanced AI analysis:', error);
      throw error;
    }
  }

  async analyzeTextEnhanced(description: string): Promise<any> {
    try {
      logger.info('Performing enhanced text analysis with Gemini AI');
      logger.info("description", description);
      
      const response = await axios.post(`${this.baseURL}/analyze/text-enhanced`, {
        description: description  // ✅ Proper JSON structure
      }, {
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json'
        },
        timeout: this.timeout
      });
      
      return response.data;
    } catch (error) {
      logger.error('Enhanced text analysis failed:', error);
      throw error;
    }
  }
  // async findSimilarItems(sourceItem: any, targetType: string): Promise<MatchResult[]> {
  //   try {
      
  //     logger.info(`Finding enhanced AI matches for ${sourceItem.type} item: ${sourceItem._id}`);

  //     // Get all active items of the opposite type
  //     const candidateItems = await ItemModel.find({
  //       type: targetType,
  //       status: 'active',
  //       _id: { $ne: sourceItem._id }
  //     }).lean();

  //     if (candidateItems.length === 0) {
  //       logger.info('No candidate items found for matching');
  //       return [];
  //     }

  //     // Prepare data for enhanced AI matching service
  //     const matchingRequest = {
  //       source_item: {
  //         id: sourceItem._id.toString(),
  //         text_embedding: sourceItem.aiMetadata?.textEmbedding || [],
  //         image_features: sourceItem.aiMetadata?.imageFeatures || [],
  //         text_analysis: sourceItem.aiMetadata?.textAnalysis || {},
  //         image_analysis: sourceItem.aiMetadata?.imageAnalysis || {},
  //         category: sourceItem.category,
  //         location: sourceItem.location,
  //         date_lost_found: sourceItem.dateLostFound,
  //         tags: sourceItem.tags || []
  //       },
  //       candidate_items: candidateItems.map(item => ({
  //         id: item._id.toString(),
  //         text_embedding: item.aiMetadata?.textEmbedding || [],
  //         image_features: item.aiMetadata?.imageFeatures || [],
  //         text_analysis: item.aiMetadata?.textAnalysis || {},
  //         image_analysis: item.aiMetadata?.imageAnalysis || {},
  //         category: item.category,
  //         location: item.location,
  //         date_lost_found: item.dateLostFound,
  //         tags: item.tags || []
  //       })),
  //       match_threshold: parseFloat(process.env.MATCH_CONFIDENCE_THRESHOLD || '0.6'),
  //       max_matches: parseInt(process.env.MAX_MATCHES_PER_ITEM || '10')
  //     };

  //     // Call enhanced AI matching service
  //     const response = await axios.post(`${this.baseURL}/matching/find-matches`, matchingRequest, {
  //       headers: {
  //         'Authorization': `Bearer ${this.apiKey}`,
  //         'Content-Type': 'application/json'
  //       },
  //       timeout: this.timeout
  //     });

  //     const matches: MatchResult[] = response.data;
  //     logger.info(`Enhanced AI found ${matches.length} matches above confidence threshold`);
      
  //     return matches;

  //   } catch (error) {
  //     logger.error('Error finding enhanced AI matches:', error);
  //     return [];
  //   }
  // }
async findSimilarItems(sourceItem: any, targetType: string): Promise<MatchResult[]> {
  try {
    const matchingService = new AdvancedMatchingService();
    logger.info(`Finding enhanced AI matches for ${sourceItem.type} item: ${sourceItem._id}`);

    // Get all active items of the opposite type
    const candidateItems = await ItemModel.find({
      type: targetType,
      category:sourceItem.category,
      status: 'active',
      _id: { $ne: sourceItem._id }
    }).lean();

    if (candidateItems.length === 0) {
      logger.info('No candidate items found for matching');
      return [];
    }

    // Transform sourceItem to match Item interface expected by AdvancedMatchingService
    const transformedSourceItem= {
      _id: sourceItem._id.toString(),
      title:sourceItem.title,
      image:sourceItem.images[0],
      description:sourceItem.description,
      // text_embedding: sourceItem.aiMetadata?.textEmbedding || [],
      // image_features: sourceItem.aiMetadata?.imageFeatures || [],
      // text_analysis: sourceItem.aiMetadata?.textAnalysis || {},
      // image_analysis: sourceItem.aiMetadata?.imageAnalysis || {},
      category: sourceItem.category,
      location: sourceItem.location,
      date_lost_found: sourceItem.dateLostFound,
      tags: sourceItem.tags || []
    };

    // Transform candidate items to match Item interface
    const transformedCandidateItems= candidateItems.map(item => ({
      _id: item._id.toString(),
      // text_embedding: item.aiMetadata?.textEmbedding || [],
      // image_features: item.aiMetadata?.imageFeatures || [],
      // text_analysis: item.aiMetadata?.textAnalysis || {},
      description:item.description,
      title:item.title,
      // image_analysis: item.aiMetadata?.imageAnalysis || {},
      image:item.images[0],
      category: item.category,
      location: item.location,
      date_lost_found: item.dateLostFound,
      tags: item.tags || []
    }));

    // Use the local AdvancedMatchingService instead of API call
    const matchResults = await matchingService.findMatches(
      transformedSourceItem, 
      transformedCandidateItems
    );

    logger.info(`Enhanced AI found ${matchResults.length} matches above confidence threshold`);
    console.log("matches",matchResults)
    return matchResults;

  } catch (error) {
    logger.error('Error in findSimilarItems:', error);
    throw error;
  }
}
  async checkExistingMatches(newItem: any, io: any): Promise<void> {
    try {
      logger.info(`Checking if new item matches existing ${newItem.type} items using enhanced AI`);

      // Find all active items of the same type
      const existingItems = await ItemModel.find({
        type: newItem.type,
        status: 'active',
        _id: { $ne: newItem._id }
      });

      for (const existingItem of existingItems) {
        // Check if new item matches this existing item using enhanced AI
        const oppositeType = newItem.type === 'lost' ? 'found' : 'lost';
        const matches = await this.findSimilarItems(existingItem, oppositeType);
        
        // Check if newItem is in the matches
        const matchFound = matches.find(match => match.item_id === newItem._id.toString());
        
        if (matchFound) {
          // Add match to existing item
          const matchExists = existingItem.matches?.some(
            (match: any) => match.itemId.toString() === newItem._id.toString()
          );

          if (!matchExists) {
            if (!existingItem.matches) existingItem.matches = [];
            existingItem.matches.push({
              itemId: newItem._id,
              confidence: matchFound.confidence,
              reasons: matchFound.reasons,
              createdAt: new Date(),
            });

            await existingItem.save();

            // Notify the owner of the existing item
            if (io) {
              io.to(`user_${existingItem.reporter}`).emit('new_match', {
                itemId: existingItem._id,
                match: {
                  item: newItem,
                  confidence: matchFound.confidence,
                  reasons: matchFound.reasons
                }
              });
            }

            logger.info(`Added enhanced AI match between ${existingItem._id} and ${newItem._id}`);
          }
        }
      }

    } catch (error) {
      logger.error('Error checking existing matches with enhanced AI:', error);
    }
  }

  private async analyzeImages(imagePaths: string[]): Promise<any> {
    try {
      const formData = new FormData();
      
      for (let i = 0; i < imagePaths.length; i++) {
        if (fs.existsSync(imagePaths[i])) {
          formData.append('images', fs.createReadStream(imagePaths[i]));
        }
      }

      const response = await axios.post(`${this.baseURL}/analyze/images`, formData, {
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          ...formData.getHeaders()
        },
        timeout: this.timeout
      });

      return response.data;

    } catch (error) {
      logger.error('Image analysis failed:', error);
      return this.getFallbackImageAnalysis();
    }
  }

  private async generateEmbeddings(analysisData: any): Promise<any> {
    try {
      const response = await axios.post(`${this.baseURL}/embeddings/generate`, analysisData, {
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json'
        },
        timeout: this.timeout
      });

      return response.data;

    } catch (error) {
      logger.error('Embedding generation failed:', error);
      return {
        imageFeatures: Array(100).fill(0).map(() => Math.random()),
        textEmbedding: Array(384).fill(0).map(() => Math.random())
      };
    }
  }

  private calculateEnhancedConfidence({ textAnalysis, imageAnalysis, hasImages }: any): number {
    let confidence = 0.5;

    if (textAnalysis) {
      const textScore = this.calculateTextConfidence(textAnalysis);
      confidence += textScore * 0.6;
    }

    if (hasImages && imageAnalysis) {
      const imageScore = this.calculateImageConfidence(imageAnalysis);
      confidence += imageScore * 0.4;
    }

    // Boost confidence for enhanced analysis
    if (textAnalysis?.confidence_score) {
      confidence = Math.max(confidence, textAnalysis.confidence_score);
    }

    return Math.min(Math.max(confidence, 0), 1);
  }

  private calculateTextConfidence(textAnalysis: any): number {
    let score = 0;

    if (textAnalysis.keywords && textAnalysis.keywords.length > 0) {
      score += Math.min(textAnalysis.keywords.length * 0.1, 0.3);
    }

    if (textAnalysis.color_mentioned !== 'false') score += 0.2;
    if (textAnalysis.brand_mentioned !== 'false') score += 0.2;
    if (textAnalysis.size_mentioned !== 'false') score += 0.1;
    if (textAnalysis.location_mentioned !== 'false') score += 0.15;
    if (textAnalysis.condition_mentioned !== 'false') score += 0.05;

    return Math.min(score, 1);
  }

  private calculateImageConfidence(imageAnalysis: any): number {
    let score = 0.5;

    if (imageAnalysis.objects && imageAnalysis.objects.length > 0) {
      score += Math.min(imageAnalysis.objects.length * 0.1, 0.3);
    }

    if (imageAnalysis.colors && imageAnalysis.colors.length > 0) {
      score += 0.2;
    }

    return Math.min(score, 1);
  }

  private getFallbackAnalysis(itemData: any): AIAnalysisResult {
    return {
      imageFeatures: Array(100).fill(0).map(() => Math.random()),
      textEmbedding: Array(384).fill(0).map(() => Math.random()),
      confidence: 0.5,
      textAnalysis: this.getFallbackTextAnalysis(itemData),
      imageAnalysis: {
        objects: [],
        colors: [],
        gemini_description: '',
        gemini_tags: []
      },
      metadata: {
        confidence: 0.5,
        analysis_timestamp: new Date()
      }
    };
  }

  private getFallbackTextAnalysis({ title, description, category, tags }: any): any {
    const keywords = [
      ...title.toLowerCase().split(' '),
      ...(tags || []),
      category.toLowerCase()
    ].filter(word => word.length > 2);

    return {
      keywords: [...new Set(keywords)].slice(0, 10),
      sentiment: "neutral",
      category: category.toLowerCase(),
      urgency_level: "medium",
      location_mentioned: description.toLowerCase().includes('near') || 
                         description.toLowerCase().includes('at') ? "true" : "false",
      brand_mentioned: "false",
      color_mentioned: this.extractColors(description) ? "true" : "false",
      size_mentioned: this.extractSizes(description) ? "true" : "false",
      condition_mentioned: this.extractConditions(description) ? "true" : "false",
      emotional_tone: "concerned",
      text_length: description.length,
      word_count: description.split(' ').length,
      has_contact_info: this.hasContactInfo(description)
    };
  }

  private getFallbackImageAnalysis(): any {
    return {
      objects: [],
      colors: [],
      gemini_description: '',
      gemini_tags: []
    };
  }

  private extractColors(text: string): boolean {
    const colors = ['black', 'white', 'red', 'blue', 'green', 'yellow', 'brown', 'gray', 'silver', 'gold'];
    return colors.some(color => text.toLowerCase().includes(color));
  }

  private extractSizes(text: string): boolean {
    const sizes = ['small', 'medium', 'large', 'big', 'tiny', 'huge'];
    return sizes.some(size => text.toLowerCase().includes(size));
  }

  private extractConditions(text: string): boolean {
    const conditions = ['new', 'old', 'used', 'worn', 'damaged', 'broken', 'good', 'excellent'];
    return conditions.some(condition => text.toLowerCase().includes(condition));
  }

  private hasContactInfo(text: string): boolean {
    const contactPatterns = [
      /\b\d{10}\b/,
      /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/,
      /call/i,
      /contact/i,
      /phone/i
    ];
    
    return contactPatterns.some(pattern => pattern.test(text));
  }
}

export const aiService = new AIService();