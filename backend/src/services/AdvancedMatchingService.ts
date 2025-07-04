import { MatchResult, SimilarityResult } from '../types';
import { logger } from '../utils/loggers';

export class AdvancedMatchingService {
  private confidenceThreshold = 0.5;
  private maxMatches = 10;

  // Improved confidence thresholds for better discrimination
  private readonly CONFIDENCE_BANDS = {
    EXCELLENT: 0.85,    // Very high confidence matches
    GOOD: 0.70,         // Good matches
    MODERATE: 0.55,     // Moderate matches
    POOR: 0.35,         // Poor matches
    VERY_POOR: 0.20     // Very poor matches
  };

  async findMatches(sourceItem: any, candidateItems: any): Promise<MatchResult[]> {


    const matches: MatchResult[] = [];

    for (const candidate of candidateItems) {
      if (candidate._id === sourceItem._id) continue; // Skip self-matching

      const similarityResult = this.calculateComprehensiveSimilarity(sourceItem, candidate);
      
    logger.info("result",similarityResult)

      // Only include matches above minimum threshold
      if (similarityResult.confidence >= this.CONFIDENCE_BANDS.VERY_POOR) {
        matches.push({
          item_id: candidate._id,
          similarity_score: similarityResult.overall_score,
          confidence: similarityResult.confidence,
          reasons: similarityResult.reasons,
          detailed_analysis: this.mapToDetailedAnalysis(similarityResult.detailed_scores)
        });
      }
    }

    // Sort by confidence (descending) and limit results
    matches.sort((a, b) => b.confidence - a.confidence);
    const topMatches = matches.slice(0, this.maxMatches);

    console.log(`Found ${topMatches.length} matches with improved confidence scoring`);
    return topMatches;
  }

  private mapToDetailedAnalysis(detailedScores: { [key: string]: number }) {
    return {
      text_similarity: detailedScores.text_similarity || 0,
      image_similarity: detailedScores.field_similarity || 0, // Mapping field_similarity to image_similarity
      category_match: detailedScores.category_match || 0,
      location_proximity: detailedScores.location_similarity || 0,
      time_proximity: detailedScores.temporal_similarity || 0,
      keyword_overlap: detailedScores.keyword_overlap || 0,
      color_similarity: detailedScores.color_similarity || 0,
      semantic_similarity: detailedScores.semantic_similarity || 0
    };
  }

  private calculateComprehensiveSimilarity(item1: any, item2: any): SimilarityResult {
    const reasons: string[] = [];
    const detailedScores: { [key: string]: number } = {};
    
    // Calculate individual similarity components
    const textSimilarity = this.calculateTextSimilarity(item1, item2);
    const fieldSimilarity = this.calculateFieldSimilarity(item1, item2);

    const locationSimilarity = this.calculateLocationSimilarity(item1, item2);
    const temporalSimilarity = this.calculateTemporalSimilarity(item1, item2);
    const keywordSimilarity = this.calculateKeywordSimilarity(item1, item2);
    const colorSimilarity = this.calculateColorSimilarity(item1, item2);
    const semanticSimilarity = this.calculateSemanticSimilarity(item1, item2);

    // Component scores with their weights
    const components = [
      { name: 'text_similarity', weight: 0.3, score: textSimilarity },
      { name: 'field_similarity', weight: 0.2, score: fieldSimilarity },

      { name: 'location_similarity', weight: 0.15, score: locationSimilarity },
      { name: 'temporal_similarity', weight: 0.05, score: temporalSimilarity },
      { name: 'keyword_overlap', weight: 0.10, score: keywordSimilarity },
      { name: 'color_similarity', weight: 0.10, score: colorSimilarity },
      { name: 'semantic_similarity', weight: 0.1, score: semanticSimilarity }
    ];

    // Store detailed scores
    detailedScores.text_similarity = textSimilarity;
    detailedScores.field_similarity = fieldSimilarity;
 
    detailedScores.location_similarity = locationSimilarity;
    detailedScores.temporal_similarity = temporalSimilarity;
    detailedScores.keyword_overlap = keywordSimilarity;
    detailedScores.color_similarity = colorSimilarity;
    detailedScores.semantic_similarity = semanticSimilarity;

    // Calculate weighted scores only for components with meaningful scores
    let totalWeightedScore = 0;
    let totalWeight = 0;
    let activeComponents = 0;

    components.forEach(component => {
      // Only include components with scores above noise threshold
      if (component.score > 0.1) {
        totalWeightedScore += component.score * component.weight;
        totalWeight += component.weight;
        activeComponents++;

        // Add reasons based on component performance
        if (component.score >= 0.8) {
          reasons.push(`Excellent ${component.name.replace('_', ' ')}`);
        } else if (component.score >= 0.6) {
          reasons.push(`Good ${component.name.replace('_', ' ')}`);
        } else if (component.score >= 0.4) {
          reasons.push(`Moderate ${component.name.replace('_', ' ')}`);
        }
      }
    });

    // Calculate base overall score
    const overallScore = totalWeight > 0 ? totalWeightedScore / totalWeight : 0;



    return {
      overall_score: Math.round(overallScore * 1000) / 1000,
      confidence: Math.round(overallScore * 1000) / 1000,
      reasons,
      detailed_scores: detailedScores
    };
  }

  private calculateTextSimilarity(item1: any, item2: any): number {
    const text1 = this.prepareTextForAnalysis(item1);
    const text2 = this.prepareTextForAnalysis(item2);

    if (!text1 || !text2) return 0;

    // Simple cosine similarity approximation using word overlap
    const words1 = new Set(text1.toLowerCase().split(/\s+/));
    const words2 = new Set(text2.toLowerCase().split(/\s+/));

    const intersection = new Set([...words1].filter(word => words2.has(word)));
    const union = new Set([...words1, ...words2]);

    const jaccardSimilarity = intersection.size / union.size;

    // Fuzzy matching component
    const fuzzyScore = this.calculateFuzzyTextSimilarity(text1, text2);

    return (jaccardSimilarity * 0.6 + fuzzyScore * 0.4);
  }

  private calculateFuzzyTextSimilarity(text1: string, text2: string): number {
    // Simple Levenshtein-based similarity
    const distance = this.levenshteinDistance(text1.toLowerCase(), text2.toLowerCase());
    const maxLength = Math.max(text1.length, text2.length);
    return maxLength > 0 ? 1 - (distance / maxLength) : 0;
  }

  private levenshteinDistance(str1: string, str2: string): number {
    const matrix = Array(str2.length + 1).fill(null).map(() => Array(str1.length + 1).fill(null));

    for (let i = 0; i <= str1.length; i++) matrix[0][i] = i;
    for (let j = 0; j <= str2.length; j++) matrix[j][0] = j;

    for (let j = 1; j <= str2.length; j++) {
      for (let i = 1; i <= str1.length; i++) {
        const cost = str1[i - 1] === str2[j - 1] ? 0 : 1;
        matrix[j][i] = Math.min(
          matrix[j][i - 1] + 1,     // deletion
          matrix[j - 1][i] + 1,     // insertion
          matrix[j - 1][i - 1] + cost // substitution
        );
      }
    }

    return matrix[str2.length][str1.length];
  }

  private calculateFieldSimilarity(item1: any, item2: any): number {
    const scores: number[] = [];

    // Object similarity
    const objects1 = new Set((item1.aiMetadata?.imageAnalysis?.objects || []).map((obj: string) => obj.toLowerCase()));
    const objects2 = new Set((item2.aiMetadata?.imageAnalysis?.objects || []).map((obj: string) => obj.toLowerCase()));

    if (objects1.size > 0 && objects2.size > 0) {
      const intersection = new Set([...objects1].filter(obj => objects2.has(obj)));
      const union = new Set([...objects1, ...objects2]);
      scores.push(intersection.size / union.size);
    }

    // Additional field comparisons can be added here
    return scores.length > 0 ? scores.reduce((a, b) => a + b) / scores.length : 0;
  }

  private calculateColorSimilarity(item1: any, item2: any): number {
    const colors1 = item1.aiMetadata?.imageAnalysis?.colors || [];
    const colors2 = item2.aiMetadata?.imageAnalysis?.colors || [];

    if (colors1.length === 0 || colors2.length === 0) return 0;

    const primaryColor1 = colors1.reduce((prev: { percentage: number; }, curr: { percentage: number; }) => 
      prev.percentage > curr.percentage ? prev : curr
    ).color.toLowerCase();
    
    const primaryColor2 = colors2.reduce((prev: { percentage: number; }, curr: { percentage: number; }) => 
      prev.percentage > curr.percentage ? prev : curr
    ).color.toLowerCase();

    if (primaryColor1 === primaryColor2) {
      return 1.0;
    } else if (this.areSimilarColors(primaryColor1, primaryColor2)) {
      return 0.7;
    } else {
      return 0.2;
    }
  }

  private calculateSemanticSimilarity(item1: any, item2: any): number {
    // Placeholder for semantic similarity calculation
    // This could use word embeddings, semantic vectors, etc.
    const desc1 = item1.description?.toLowerCase() || '';
    const desc2 = item2.description?.toLowerCase() || '';
    
    if (!desc1 || !desc2) return 0;
    
    // Simple semantic similarity based on common meaningful words
    const semanticWords1 = this.extractSemanticWords(desc1);
    const semanticWords2 = this.extractSemanticWords(desc2);
    
    if (semanticWords1.size === 0 && semanticWords2.size === 0) return 0;
    
    const intersection = new Set([...semanticWords1].filter(word => semanticWords2.has(word)));
    const union = new Set([...semanticWords1, ...semanticWords2]);
    
    return intersection.size / union.size;
  }

  private extractSemanticWords(text: string): Set<string> {
    // Extract meaningful words (nouns, adjectives, etc.) excluding stop words
    const stopWords = new Set(['the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by', 'is', 'was', 'are', 'were', 'been', 'have', 'has', 'had', 'will', 'would', 'could', 'should']);
    
    return new Set(
      text.toLowerCase()
        .split(/\s+/)
        .filter(word => word.length > 2 && !stopWords.has(word))
    );
  }

  private calculateCategorySimilarity(item1: any, item2: any): number {
    const cat1 = item1.category?.toLowerCase() || '';
    const cat2 = item2.category?.toLowerCase() || '';

    if (!cat1 || !cat2) return 0;
    if (cat1 === cat2) return 1.0;

    // Category groupings for partial matches
    const categoryGroups = {
      tech: ['electronics', 'gadgets', 'devices', 'phone', 'mobile', 'computer'],
      personal: ['bags', 'wallets', 'jewelry', 'accessories', 'clothing'],
      academic: ['books', 'stationery', 'supplies', 'documents'],
      sports: ['sports', 'equipment', 'fitness'],
      keys: ['keys', 'keychains']
    };

    for (const [, categories] of Object.entries(categoryGroups)) {
      const cat1InGroup = categories.some(cat => cat1.includes(cat));
      const cat2InGroup = categories.some(cat => cat2.includes(cat));
      
      if (cat1InGroup && cat2InGroup) {
        return 0.7;
      }
    }

    // Fuzzy string matching for categories
    const fuzzyScore = this.calculateFuzzyTextSimilarity(cat1, cat2);
    return fuzzyScore > 0.6 ? fuzzyScore : 0;
  }

  private calculateLocationSimilarity(item1: any, item2: any): number {
    const loc1 = item1.location?.toLowerCase() || '';
    const loc2 = item2.location?.toLowerCase() || '';

    if (!loc1 || !loc2) return 0;
    if (loc1 === loc2) return 1.0;

    // Location keyword matching
    const locationKeywords = ['library', 'cafeteria', 'gate', 'building', 'hostel', 'campus', 'block'];
    const commonKeywords = locationKeywords.filter(keyword => 
      loc1.includes(keyword) && loc2.includes(keyword)
    );

    if (commonKeywords.length > 0) {
      return 0.8;
    }

    // Fuzzy location matching
    const fuzzyScore = this.calculateFuzzyTextSimilarity(loc1, loc2);
    return fuzzyScore > 0.5 ? fuzzyScore : 0;
  }

  private calculateTemporalSimilarity(item1: any, item2: any): number {
    try {
      const date1 = new Date(item1.dateLostFound);
      const date2 = new Date(item2.dateLostFound);

      const diffHours = Math.abs(date1.getTime() - date2.getTime()) / (1000 * 60 * 60);

      if (diffHours <= 2) return 1.0;
      if (diffHours <= 12) return 0.9;
      if (diffHours <= 24) return 0.8;
      if (diffHours <= 72) return 0.6;
      if (diffHours <= 168) return 0.4;
      if (diffHours <= 720) return 0.2;

      return 0;
    } catch {
      return 0;
    }
  }

  private calculateKeywordSimilarity(item1: any, item2: any): number {
    const keywords1 = new Set([
      ...(item1.aiMetadata?.textAnalysis?.keywords || []),
      ...(item1.tags || []),
      ...(item1.aiMetadata?.imageAnalysis?.gemini_tags || [])
    ].map((kw: string) => kw.toLowerCase()));

    const keywords2 = new Set([
      ...(item2.aiMetadata?.textAnalysis?.keywords || []),
      ...(item2.tags || []),
      ...(item2.aiMetadata?.imageAnalysis?.gemini_tags || [])
    ].map((kw: string) => kw.toLowerCase()));

    if (keywords1.size === 0 && keywords2.size === 0) return 0;

    const intersection = new Set([...keywords1].filter(kw => keywords2.has(kw)));
    const union = new Set([...keywords1, ...keywords2]);

    return intersection.size / union.size;
  }

  private prepareTextForAnalysis(item: any): string {
    const parts = [
      item.title,
      item.description,
      item.category,
      ...(item.tags || []),
      ...(item.aiMetadata?.textAnalysis?.keywords || []),
      ...(item.aiMetadata?.imageAnalysis?.gemini_tags || []),
      item.aiMetadata?.imageAnalysis?.gemini_description || ''
    ].filter(Boolean);

    return parts.join(' ');
  }

  private areSimilarColors(color1: string, color2: string): boolean {
    const colorGroups = {
      dark: ['black', 'dark', 'navy', 'brown'],
      light: ['white', 'light', 'cream', 'silver'],
      warm: ['red', 'orange', 'yellow', 'pink'],
      cool: ['blue', 'green', 'purple', 'cyan']
    };

    for (const [, colors] of Object.entries(colorGroups)) {
      if (colors.some(c => color1.includes(c)) && colors.some(c => color2.includes(c))) {
        return true;
      }
    }

    return false;
  }

  getConfidenceBand(confidence: number): string {
    if (confidence >= this.CONFIDENCE_BANDS.EXCELLENT) return 'Excellent';
    if (confidence >= this.CONFIDENCE_BANDS.GOOD) return 'Good';
    if (confidence >= this.CONFIDENCE_BANDS.MODERATE) return 'Moderate';
    if (confidence >= this.CONFIDENCE_BANDS.POOR) return 'Poor';
    return 'Very Poor';
  }
}