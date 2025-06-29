# import numpy as np
# from typing import List, Dict, Any, Tuple
# import asyncio
# from sklearn.metrics.pairwise import cosine_similarity
# from sklearn.feature_extraction.text import TfidfVectorizer
# from fuzzywuzzy import fuzz
# import spacy

# from datetime import datetime, timedelta
# import re
# from utils.logger import logger

# class AdvancedMatchingService:
#     def __init__(self):
#         self.nlp = None
#         self.tfidf_vectorizer = TfidfVectorizer(
#             max_features=1000,
#             stop_words='english',
#             ngram_range=(1, 3)  # Include trigrams for better matching
#         )
#         self.confidence_threshold = 0.6
#         self.max_matches = 10

#     async def initialize(self):
#         try:
#             # Load spaCy model for advanced NLP
#             self.nlp = spacy.load("en_core_web_sm")
#             logger.info("Advanced matching service initialized successfully")
#         except Exception as e:
#             logger.error(f"Failed to initialize advanced matching service: {str(e)}")
#             # Fallback without spaCy
#             self.nlp = None

#     async def find_matches(self, request_data: Dict[str, Any]) -> List[Dict[str, Any]]:
#         try:
#             source_item = request_data['source_item']
#             candidate_items = request_data['candidate_items']
#             match_threshold = request_data.get('match_threshold', self.confidence_threshold)
#             max_matches = request_data.get('max_matches', self.max_matches)

#             logger.info(f"Finding enhanced matches for item {source_item['id']} against {len(candidate_items)} candidates")

#             matches = []

#             for candidate in candidate_items:
                
#                 similarity_result = await self.calculate_comprehensive_similarity(source_item, candidate)
#                 logger.info(similarity_result['confidence'])
#                 if similarity_result['confidence'] >= match_threshold:
#                     matches.append({
#                         'item_id': candidate['id'],
#                         'similarity_score': similarity_result['overall_score'],
#                         'confidence': similarity_result['confidence'],
#                         'reasons': similarity_result['reasons'],
#                         'detailed_analysis': similarity_result['detailed_scores']
#                     })

#             # Sort by confidence and limit results
#             matches.sort(key=lambda x: x['confidence'], reverse=True)
#             top_matches = matches[:max_matches]

#             logger.info(f"Found {len(top_matches)} enhanced matches above threshold {match_threshold}")
#             return top_matches

#         except Exception as e:
#             logger.error(f"Error in advanced matching: {str(e)}")
#             return []

#     async def calculate_comprehensive_similarity(self, item1: Dict[str, Any], item2: Dict[str, Any]) -> Dict[str, Any]:
#         try:
#             reasons = []
#             detailed_scores = {}
#             total_score = 0
#             weight_sum = 0

#             # 1. Enhanced Text Analysis Similarity (35% weight)
#             text_sim = await self.calculate_enhanced_text_similarity(item1, item2)
#             if text_sim > 0.4:
#                 total_score += text_sim * 0.35
#                 weight_sum += 0.35
#                 detailed_scores['text_similarity'] = text_sim
#                 if text_sim > 0.8:
#                     reasons.append('High text similarity')
#                 else:
#                     reasons.append('Moderate text similarity')

#             # 2. Semantic Field Matching (25% weight)
#             field_sim = await self.calculate_field_similarity(item1, item2)
#             if field_sim > 0.5:
#                 total_score += field_sim * 0.25
#                 weight_sum += 0.25
#                 detailed_scores['field_similarity'] = field_sim
#                 reasons.append('Field analysis match')

#             # 3. Visual Feature Similarity (20% weight)
#             image_sim = self.calculate_image_similarity(item1, item2)
#             if image_sim > 0.5:
#                 total_score += image_sim * 0.2
#                 weight_sum += 0.2
#                 detailed_scores['image_similarity'] = image_sim
#                 reasons.append('Visual feature match')

#             # 4. Category and Entity Matching (10% weight)
#             category_sim = self.calculate_enhanced_category_similarity(item1, item2)
#             if category_sim > 0:
#                 total_score += category_sim * 0.1
#                 weight_sum += 0.1
#                 detailed_scores['category_match'] = category_sim
#                 if category_sim == 1:
#                     reasons.append('Exact category match')
#                 else:
#                     reasons.append('Related category')

#             # 5. Location and Temporal Analysis (5% weight)
#             location_time_sim = self.calculate_location_time_similarity(item1, item2)
#             if location_time_sim > 0:
#                 total_score += location_time_sim * 0.05
#                 weight_sum += 0.05
#                 detailed_scores['location_time_similarity'] = location_time_sim
#                 reasons.append('Location/time proximity')

#             # 6. Keyword and Entity Overlap (5% weight)
#             keyword_sim = await self.calculate_advanced_keyword_similarity(item1, item2)
#             if keyword_sim > 0:
#                 total_score += keyword_sim * 0.05
#                 weight_sum += 0.05
#                 detailed_scores['keyword_overlap'] = keyword_sim
#                 reasons.append('Keyword/entity match')

#             # Calculate final confidence
#             overall_score = total_score / weight_sum if weight_sum > 0 else 0
#             confidence = self.calculate_enhanced_confidence_score(detailed_scores, overall_score, item1, item2)

#             return {
#                 'overall_score': overall_score,
#                 'confidence': confidence,
#                 'reasons': reasons,
#                 'detailed_scores': detailed_scores
#             }

#         except Exception as e:
#             logger.error(f"Error calculating comprehensive similarity: {str(e)}")
#             return {
#                 'overall_score': 0,
#                 'confidence': 0,
#                 'reasons': [],
#                 'detailed_scores': {}
#             }

#     async def calculate_enhanced_text_similarity(self, item1: Dict[str, Any], item2: Dict[str, Any]) -> float:
#         try:
#             # Combine multiple text similarity approaches
#             logger.info("hiii")
#             logger.info(item1)
#             # 1. Embedding similarity
#             embedding_sim = 0
#             if (item1.get('text_embedding') and item2.get('text_embedding') and 
#                 len(item1['text_embedding']) > 0 and len(item2['text_embedding']) > 0):
                
#                 embedding1 = np.array(item1['text_embedding']).reshape(1, -1)
#                 embedding2 = np.array(item2['text_embedding']).reshape(1, -1)
#                 embedding_sim = cosine_similarity(embedding1, embedding2)[0][0]

#             # 2. TF-IDF similarity
#             tfidf_sim = 0
#             text1 = self.prepare_enhanced_text_for_analysis(item1)
#             text2 = self.prepare_enhanced_text_for_analysis(item2)
            
#             if text1 and text2:
#                 tfidf_matrix = self.tfidf_vectorizer.fit_transform([text1, text2])
#                 tfidf_sim = cosine_similarity(tfidf_matrix[0:1], tfidf_matrix[1:2])[0][0]

#             # 3. Fuzzy string similarity
#             fuzzy_sim = fuzz.ratio(text1, text2) / 100.0

#             # Weighted combination
#             final_sim = (embedding_sim * 0.5 + tfidf_sim * 0.3 + fuzzy_sim * 0.2)
#             return max(0, final_sim)

#         except Exception as e:
#             logger.error(f"Error calculating enhanced text similarity: {str(e)}")
#             return 0

#     async def calculate_field_similarity(self, item1: Dict[str, Any], item2: Dict[str, Any]) -> float:
#         try:
#             analysis1 = item1.get('text_analysis', {})
#             analysis2 = item2.get('text_analysis', {})
            
#             if not analysis1 or not analysis2:
#                 return 0

#             field_scores = []
            
#             # Color similarity
#             color1 = analysis1.get('color_mentioned', 'false')
#             color2 = analysis2.get('color_mentioned', 'false')
#             if color1 != 'false' and color2 != 'false':
#                 if color1 == color2:
#                     field_scores.append(1.0)
#                 elif self.are_similar_colors(color1, color2):
#                     field_scores.append(0.7)
#                 else:
#                     field_scores.append(0.2)

#             # Brand similarity
#             brand1 = analysis1.get('brand_mentioned', 'false')
#             brand2 = analysis2.get('brand_mentioned', 'false')
#             if brand1 != 'false' and brand2 != 'false':
#                 if brand1 == brand2:
#                     field_scores.append(1.0)
#                 else:
#                     field_scores.append(0.1)

#             # Location similarity
#             loc1 = analysis1.get('location_mentioned', 'false')
#             loc2 = analysis2.get('location_mentioned', 'false')
#             if loc1 == 'true' and loc2 == 'true':
#                 field_scores.append(0.8)

#             # Size similarity
#             size1 = analysis1.get('size_mentioned', 'false')
#             size2 = analysis2.get('size_mentioned', 'false')
#             if size1 == 'true' and size2 == 'true':
#                 field_scores.append(0.6)

#             # Condition similarity
#             cond1 = analysis1.get('condition_mentioned', 'false')
#             cond2 = analysis2.get('condition_mentioned', 'false')
#             if cond1 == 'true' and cond2 == 'true':
#                 field_scores.append(0.5)

#             # Urgency level similarity
#             urgency1 = analysis1.get('urgency_level', 'medium')
#             urgency2 = analysis2.get('urgency_level', 'medium')
#             if urgency1 == urgency2:
#                 field_scores.append(0.4)

#             # Emotional tone similarity
#             emotion1 = analysis1.get('emotional_tone', 'concerned')
#             emotion2 = analysis2.get('emotional_tone', 'concerned')
#             if emotion1 == emotion2:
#                 field_scores.append(0.3)
#             elif self.are_similar_emotions(emotion1, emotion2):
#                 field_scores.append(0.2)

#             return np.mean(field_scores) if field_scores else 0

#         except Exception as e:
#             logger.error(f"Error calculating field similarity: {str(e)}")
#             return 0

#     def calculate_image_similarity(self, item1: Dict[str, Any], item2: Dict[str, Any]) -> float:
#         try:
#             features1 = item1.get('image_features', [])
#             features2 = item2.get('image_features', [])

#             if not features1 or not features2 or len(features1) != len(features2):
#                 return 0

#             # Cosine similarity between image features
#             features1 = np.array(features1).reshape(1, -1)
#             features2 = np.array(features2).reshape(1, -1)
            
#             similarity = cosine_similarity(features1, features2)[0][0]
#             return max(0, similarity)

#         except Exception as e:
#             logger.error(f"Error calculating image similarity: {str(e)}")
#             return 0

#     def calculate_enhanced_category_similarity(self, item1: Dict[str, Any], item2: Dict[str, Any]) -> float:
#         try:
#             cat1 = item1.get('category', '').lower()
#             cat2 = item2.get('category', '').lower()

#             if cat1 == cat2:
#                 return 1.0

#             # Enhanced category groups with more granular matching
#             category_groups = {
#                 'tech_primary': ['electronics', 'gadgets', 'devices'],
#                 'tech_secondary': ['chargers', 'cables', 'accessories'],
#                 'personal_primary': ['bags & wallets', 'jewelry & accessories'],
#                 'personal_secondary': ['clothing', 'personal items'],
#                 'academic': ['books & stationery', 'office supplies'],
#                 'sports': ['sports equipment', 'fitness'],
#                 'keys': ['keys', 'key chains'],
#                 'documents': ['documents & cards', 'certificates']
#             }

#             # Check for primary group matches
#             for group, categories in category_groups.items():
#                 if cat1 in categories and cat2 in categories:
#                     if 'primary' in group:
#                         return 0.9
#                     else:
#                         return 0.7

#             # Fuzzy string matching for categories
#             fuzzy_score = fuzz.ratio(cat1, cat2) / 100.0
#             return fuzzy_score if fuzzy_score > 0.6 else 0

#         except Exception as e:
#             logger.error(f"Error calculating enhanced category similarity: {str(e)}")
#             return 0

#     def calculate_location_time_similarity(self, item1: Dict[str, Any], item2: Dict[str, Any]) -> float:
#         try:
#             # Location similarity
#             location_sim = self.calculate_enhanced_location_similarity(item1, item2)
            
#             # Time similarity
#             time_sim = self.calculate_enhanced_temporal_similarity(item1, item2)
            
#             # Weighted combination (location is more important)
#             return location_sim * 0.7 + time_sim * 0.3

#         except Exception as e:
#             logger.error(f"Error calculating location/time similarity: {str(e)}")
#             return 0

# def calculate_enhanced_location_similarity(self, item1: Dict[str, Any], item2: Dict[str, Any]) -> float:
#     try:
#         name1 = item1.get('location', '').lower()
#         name2 = item2.get('location', '').lower()

#         if not name1 or not name2:
#             return 0

#         # Exact match
#         if name1 == name2:
#             return 1.0

#         # Enhanced location matching with building/area recognition
#         location_synonyms = {
#             'library': ['lib', 'central library', 'main library'],
#             'cafeteria': ['cafe', 'canteen', 'food court', 'mess'],
#             'gate': ['entrance', 'exit', 'main gate', 'front gate'],
#             'hostel': ['dorm', 'dormitory', 'residence'],
#             'academic': ['academic block', 'class', 'classroom', 'lecture hall'],
#             'sports': ['sports complex', 'gym', 'ground', 'field']
#         }

#         # Check for synonym matches
#         for location_type, synonyms in location_synonyms.items():
#             if any(syn in name1 for syn in synonyms) and any(syn in name2 for syn in synonyms):
#                 return 0.8

#         # Fuzzy string matching
#         fuzzy_score = fuzz.partial_ratio(name1, name2) / 100.0

#         # Check for common location keywords
#         location_keywords = ['library', 'cafeteria', 'gate', 'building', 'hostel', 'campus', 'block']
#         common_keywords = [kw for kw in location_keywords if kw in name1 and kw in name2]

#         if common_keywords:
#             fuzzy_score = max(fuzzy_score, 0.7)

#         return fuzzy_score if fuzzy_score > 0.5 else 0

#     except Exception as e:
#         logger.error(f"Error calculating enhanced location similarity: {str(e)}")
#         return 0

#     def calculate_enhanced_temporal_similarity(self, item1: Dict[str, Any], item2: Dict[str, Any]) -> float:
#         try:
#             date1_str = item1.get('date_lost_found')
#             date2_str = item2.get('date_lost_found')

#             if not date1_str or not date2_str:
#                 return 0

#             # Parse dates
#             date1 = datetime.fromisoformat(date1_str.replace('Z', '+00:00'))
#             date2 = datetime.fromisoformat(date2_str.replace('Z', '+00:00'))

#             # Calculate time difference in hours
#             diff_hours = abs((date1 - date2).total_seconds()) / 3600

#             # Enhanced temporal scoring
#             if diff_hours <= 2:
#                 return 1.0  # Within 2 hours
#             elif diff_hours <= 12:
#                 return 0.9  # Same day
#             elif diff_hours <= 24:
#                 return 0.8  # Within 24 hours
#             elif diff_hours <= 72:
#                 return 0.6  # Within 3 days
#             elif diff_hours <= 168:
#                 return 0.4  # Within a week
#             elif diff_hours <= 720:
#                 return 0.2  # Within a month

#             return 0

#         except Exception as e:
#             logger.error(f"Error calculating enhanced temporal similarity: {str(e)}")
#             return 0

#     async def calculate_advanced_keyword_similarity(self, item1: Dict[str, Any], item2: Dict[str, Any]) -> float:
#         try:
#             # Extract keywords from text analysis
#             keywords1 = set(item1.get('text_analysis', {}).get('keywords', []))
#             keywords2 = set(item2.get('text_analysis', {}).get('keywords', []))

#             # Add tags
#             tags1 = set(item1.get('tags', []))
#             tags2 = set(item2.get('tags', []))

#             # Combine all keywords
#             all_keywords1 = keywords1.union(tags1)
#             all_keywords2 = keywords2.union(tags2)

#             if not all_keywords1 and not all_keywords2:
#                 return 0

#             # Enhanced keyword matching with fuzzy similarity
#             exact_matches = all_keywords1.intersection(all_keywords2)
#             fuzzy_matches = 0

#             # Check for fuzzy matches between remaining keywords
#             remaining1 = all_keywords1 - exact_matches
#             remaining2 = all_keywords2 - exact_matches

#             for kw1 in remaining1:
#                 for kw2 in remaining2:
#                     if fuzz.ratio(kw1, kw2) > 80:  # 80% similarity threshold
#                         fuzzy_matches += 0.8

#             total_matches = len(exact_matches) + fuzzy_matches
#             total_keywords = len(all_keywords1.union(all_keywords2))

#             return total_matches / total_keywords if total_keywords > 0 else 0

#         except Exception as e:
#             logger.error(f"Error calculating advanced keyword similarity: {str(e)}")
#             return 0

#     def calculate_enhanced_confidence_score(self, detailed_scores: Dict[str, float], overall_score: float, item1: Dict, item2: Dict) -> float:
#         try:
#             # Base confidence from overall score
#             confidence = overall_score

#             # Boost confidence based on multiple matching factors
#             matching_factors = len([score for score in detailed_scores.values() if score > 0.5])
            
#             # Enhanced confidence boosting
#             if matching_factors >= 5:
#                 confidence *= 1.3
#             elif matching_factors >= 4:
#                 confidence *= 1.2
#             elif matching_factors >= 3:
#                 confidence *= 1.1
#             elif matching_factors >= 2:
#                 confidence *= 1.05

#             # Penalty for very few matching factors
#             if matching_factors < 2:
#                 confidence *= 0.7

#             # Special boosts for high-confidence individual scores
#             if detailed_scores.get('text_similarity', 0) > 0.9:
#                 confidence *= 1.15
#             if detailed_scores.get('field_similarity', 0) > 0.8:
#                 confidence *= 1.1
#             if detailed_scores.get('category_match', 0) == 1.0:
#                 confidence *= 1.05

#             # Boost for items with rich metadata
#             if self.has_rich_metadata(item1) and self.has_rich_metadata(item2):
#                 confidence *= 1.1

#             return min(confidence, 1.0)

#         except Exception as e:
#             logger.error(f"Error calculating enhanced confidence score: {str(e)}")
#             return overall_score

#     def has_rich_metadata(self, item: Dict) -> bool:
#         """Check if item has rich metadata for better matching"""
#         text_analysis = item.get('text_analysis', {})
        
#         rich_features = 0
#         if text_analysis.get('color_mentioned') != 'false':
#             rich_features += 1
#         if text_analysis.get('brand_mentioned') != 'false':
#             rich_features += 1
#         if text_analysis.get('size_mentioned') == 'true':
#             rich_features += 1
#         if text_analysis.get('condition_mentioned') == 'true':
#             rich_features += 1
#         if len(text_analysis.get('keywords', [])) > 5:
#             rich_features += 1
#         if item.get('image_features') and len(item['image_features']) > 0:
#             rich_features += 1

#         return rich_features >= 3

#     def are_similar_colors(self, color1: str, color2: str) -> bool:
#         """Check if two colors are similar"""
#         color_groups = {
#             'dark': ['black', 'dark', 'navy', 'maroon'],
#             'light': ['white', 'light', 'cream', 'beige'],
#             'warm': ['red', 'orange', 'yellow', 'pink'],
#             'cool': ['blue', 'green', 'purple', 'cyan'],
#             'neutral': ['brown', 'gray', 'grey', 'silver']
#         }
        
#         for group, colors in color_groups.items():
#             if color1 in colors and color2 in colors:
#                 return True
#         return False

#     def are_similar_emotions(self, emotion1: str, emotion2: str) -> bool:
#         """Check if two emotions are similar"""
#         emotion_groups = {
#             'negative': ['worried', 'frustrated', 'desperate', 'anxious'],
#             'positive': ['hopeful', 'relieved', 'calm', 'optimistic'],
#             'neutral': ['concerned', 'surprised']
#         }
        
#         for group, emotions in emotion_groups.items():
#             if emotion1 in emotions and emotion2 in emotions:
#                 return True
#         return False

#     def prepare_enhanced_text_for_analysis(self, item: Dict[str, Any]) -> str:
#         try:
#             text_parts = []
            
#             # Add text analysis keywords with higher weight
#             text_analysis = item.get('text_analysis', {})
#             if text_analysis.get('keywords'):
#                 # Repeat important keywords for higher weight
#                 keywords = text_analysis['keywords']
#                 text_parts.extend(keywords * 2)  # Double weight for keywords
            
#             # Add category with high weight
#             if item.get('category'):
#                 text_parts.extend([item['category']] * 3)
            
#             # Add tags
#             if item.get('tags'):
#                 text_parts.extend(item['tags'])
            
#             # Add specific field information with weights
#             if text_analysis.get('color_mentioned') != 'false':
#                 text_parts.extend([f"color {text_analysis['color_mentioned']}"] * 2)
            
#             if text_analysis.get('brand_mentioned') != 'false':
#                 text_parts.extend([f"brand {text_analysis['brand_mentioned']}"] * 3)
            
#             if text_analysis.get('location_mentioned') == 'true':
#                 text_parts.append('location mentioned')
            
#             # Add emotional context
#             emotional_tone = text_analysis.get('emotional_tone', '')
#             if emotional_tone:
#                 text_parts.append(emotional_tone)

#             # Add urgency level
#             urgency = text_analysis.get('urgency_level', '')
#             if urgency:
#                 text_parts.append(f"urgency {urgency}")

#             return ' '.join(text_parts)

#         except Exception as e:
#             logger.error(f"Error preparing enhanced text for analysis: {str(e)}")
#             return ''




import numpy as np
from typing import List, Dict, Any, Tuple
import asyncio
from sklearn.metrics.pairwise import cosine_similarity
from sklearn.feature_extraction.text import TfidfVectorizer
from fuzzywuzzy import fuzz
import spacy
from geopy.distance import geodesic
from datetime import datetime, timedelta
import re
from utils.logger import logger

class AdvancedMatchingService:
    def __init__(self):
        self.nlp = None
        self.tfidf_vectorizer = TfidfVectorizer(
            max_features=1000,
            stop_words='english',
            ngram_range=(1, 3)  # Include trigrams for better matching
        )
        self.confidence_threshold = 0.7
        self.max_matches = 10

    async def initialize(self):
        try:
            # Load spaCy model for advanced NLP
            self.nlp = spacy.load("en_core_web_sm")
            logger.info("Advanced matching service initialized successfully")
        except Exception as e:
            logger.error(f"Failed to initialize advanced matching service: {str(e)}")
            # Fallback without spaCy
            self.nlp = None

    async def find_matches(self, request_data: Dict[str, Any]) -> List[Dict[str, Any]]:
        try:
            source_item = request_data['source_item']
            candidate_items = request_data['candidate_items']
            match_threshold = request_data.get('match_threshold', self.confidence_threshold)
            max_matches = request_data.get('max_matches', self.max_matches)

            # Get the source item ID - handle both MongoDB ObjectId format and string
            source_id = self._get_item_id(source_item)
            logger.info(f"Finding enhanced matches for item {source_id} against {len(candidate_items)} candidates")

            matches = []

            for candidate in candidate_items:
                similarity_result = await self.calculate_comprehensive_similarity(source_item, candidate)
                logger.info(similarity_result)
                if similarity_result['confidence'] >= 0.7:
                    matches.append({
                        'item_id': self._get_item_id(candidate),
                        'similarity_score': similarity_result['overall_score'],
                        'confidence': similarity_result['confidence'],
                        'reasons': similarity_result['reasons'],
                        'detailed_analysis': similarity_result['detailed_scores']
                    })

            # Sort by confidence and limit results
            matches.sort(key=lambda x: x['confidence'], reverse=True)
            top_matches = matches[:max_matches]

            logger.info(f"Found {len(top_matches)} enhanced matches above threshold {0.7}")
            return top_matches

        except Exception as e:
            logger.error(f"Error in advanced matching: {str(e)}")
            return []

    def _get_item_id(self, item: Dict[str, Any]) -> str:
        """Extract item ID from either MongoDB ObjectId format or direct string"""
        if '_id' in item:
            if isinstance(item['_id'], dict) and '$oid' in item['_id']:
                return item['_id']['$oid']
            return str(item['_id'])
        return item.get('id', 'unknown')

    def _get_date_from_item(self, item: Dict[str, Any]) -> datetime:
        """Extract date from MongoDB date format or ISO string"""
        date_field = item.get('dateLostFound')
        if not date_field:
            return None
            
        if isinstance(date_field, dict) and '$date' in date_field:
            return datetime.fromisoformat(date_field['$date'].replace('Z', '+00:00'))
        elif isinstance(date_field, str):
            return datetime.fromisoformat(date_field.replace('Z', '+00:00'))
        return None

    async def calculate_comprehensive_similarity(self, item1: Dict[str, Any], item2: Dict[str, Any]) -> Dict[str, Any]:
        try:
            reasons = []
            detailed_scores = {}
            total_score = 0
            weight_sum = 0

            # 1. Enhanced Text Analysis Similarity (35% weight)
            text_sim = await self.calculate_enhanced_text_similarity(item1, item2)
            if text_sim > 0.4:
                total_score += text_sim * 0.35
                weight_sum += 0.35
                detailed_scores['text_similarity'] = text_sim
                if text_sim > 0.8:
                    reasons.append('High text similarity')
                else:
                    reasons.append('Moderate text similarity')

            # 2. Semantic Field Matching (25% weight)
            field_sim = await self.calculate_field_similarity(item1, item2)
            if field_sim > 0.5:
                total_score += field_sim * 0.25
                weight_sum += 0.25
                detailed_scores['field_similarity'] = field_sim
                reasons.append('Field analysis match')

            # 3. Visual Feature Similarity (20% weight)
            image_sim = self.calculate_image_similarity(item1, item2)
            if image_sim > 0.5:
                total_score += image_sim * 0.2
                weight_sum += 0.2
                detailed_scores['image_similarity'] = image_sim
                reasons.append('Visual feature match')

            # 4. Category and Entity Matching (10% weight)
            category_sim = self.calculate_enhanced_category_similarity(item1, item2)
            if category_sim > 0:
                total_score += category_sim * 0.1
                weight_sum += 0.1
                detailed_scores['category_match'] = category_sim
                if category_sim == 1:
                    reasons.append('Exact category match')
                else:
                    reasons.append('Related category')

            # 5. Location and Temporal Analysis (5% weight)
            location_time_sim = self.calculate_location_time_similarity(item1, item2)
            if location_time_sim > 0:
                total_score += location_time_sim * 0.05
                weight_sum += 0.05
                detailed_scores['location_time_similarity'] = location_time_sim
                reasons.append('Location/time proximity')

            # 6. Keyword and Entity Overlap (5% weight)
            keyword_sim = await self.calculate_advanced_keyword_similarity(item1, item2)
            if keyword_sim > 0:
                total_score += keyword_sim * 0.05
                weight_sum += 0.05
                detailed_scores['keyword_overlap'] = keyword_sim
                reasons.append('Keyword/entity match')

            # Calculate final confidence
            overall_score = total_score / weight_sum if weight_sum > 0 else 0
            confidence = self.calculate_enhanced_confidence_score(detailed_scores, overall_score, item1, item2)

            return {
                'overall_score': overall_score,
                'confidence': confidence,
                'reasons': reasons,
                'detailed_scores': detailed_scores
            }

        except Exception as e:
            logger.error(f"Error calculating comprehensive similarity: {str(e)}")
            return {
                'overall_score': 0,
                'confidence': 0,
                'reasons': [],
                'detailed_scores': {}
            }

    async def calculate_enhanced_text_similarity(self, item1: Dict[str, Any], item2: Dict[str, Any]) -> float:
        try:
            # Combine multiple text similarity approaches
            
            # 1. Embedding similarity
            embedding_sim = 0
            embedding1 = item1.get('aiMetadata', {}).get('textEmbedding', [])
            embedding2 = item2.get('aiMetadata', {}).get('textEmbedding', [])
            
            if embedding1 and embedding2 and len(embedding1) > 0 and len(embedding2) > 0:
                embedding1 = np.array(embedding1).reshape(1, -1)
                embedding2 = np.array(embedding2).reshape(1, -1)
                embedding_sim = cosine_similarity(embedding1, embedding2)[0][0]

            # 2. TF-IDF similarity
            tfidf_sim = 0
            text1 = self.prepare_enhanced_text_for_analysis(item1)
            text2 = self.prepare_enhanced_text_for_analysis(item2)
            
            if text1 and text2:
                tfidf_matrix = self.tfidf_vectorizer.fit_transform([text1, text2])
                tfidf_sim = cosine_similarity(tfidf_matrix[0:1], tfidf_matrix[1:2])[0][0]

            # 3. Fuzzy string similarity
            fuzzy_sim = fuzz.ratio(text1, text2) / 100.0

            # Weighted combination
            final_sim = (embedding_sim * 0.5 + tfidf_sim * 0.3 + fuzzy_sim * 0.2)
            return max(0, final_sim)

        except Exception as e:
            logger.error(f"Error calculating enhanced text similarity: {str(e)}")
            return 0

    async def calculate_field_similarity(self, item1: Dict[str, Any], item2: Dict[str, Any]) -> float:
        try:
            analysis1 = item1.get('aiMetadata', {}).get('textAnalysis', {})
            analysis2 = item2.get('aiMetadata', {}).get('textAnalysis', {})
            
            image_analysis1 = item1.get('aiMetadata', {}).get('imageAnalysis', {})
            image_analysis2 = item2.get('aiMetadata', {}).get('imageAnalysis', {})
            
            if not analysis1 or not analysis2:
                return 0

            field_scores = []
            
            # Color similarity from image analysis
            colors1 = image_analysis1.get('colors', [])
            colors2 = image_analysis2.get('colors', [])
            
            if colors1 and colors2:
                # Get primary colors (highest percentage)
                primary_color1 = max(colors1, key=lambda x: x.get('percentage', 0)).get('color', '').lower()
                primary_color2 = max(colors2, key=lambda x: x.get('percentage', 0)).get('color', '').lower()
                
                if primary_color1 and primary_color2:
                    if primary_color1 == primary_color2:
                        field_scores.append(1.0)
                    elif self.are_similar_colors(primary_color1, primary_color2):
                        field_scores.append(0.7)
                    else:
                        field_scores.append(0.2)

            # Object similarity from image analysis
            objects1 = set(obj.lower() for obj in image_analysis1.get('objects', []))
            objects2 = set(obj.lower() for obj in image_analysis2.get('objects', []))
            
            if objects1 and objects2:
                object_overlap = len(objects1.intersection(objects2))
                object_union = len(objects1.union(objects2))
                if object_union > 0:
                    field_scores.append(object_overlap / object_union)

            # Gemini tags similarity
            tags1 = set(tag.lower() for tag in image_analysis1.get('gemini_tags', []))
            tags2 = set(tag.lower() for tag in image_analysis2.get('gemini_tags', []))
            
            if tags1 and tags2:
                tag_overlap = len(tags1.intersection(tags2))
                tag_union = len(tags1.union(tags2))
                if tag_union > 0:
                    field_scores.append((tag_overlap / tag_union) * 0.8)



         

  

            return np.mean(field_scores) if field_scores else 0

        except Exception as e:
            logger.error(f"Error calculating field similarity: {str(e)}")
            return 0

    def calculate_image_similarity(self, item1: Dict[str, Any], item2: Dict[str, Any]) -> float:
        try:
            features1 = item1.get('aiMetadata', {}).get('imageFeatures', [])
            features2 = item2.get('aiMetadata', {}).get('imageFeatures', [])

            if not features1 or not features2 or len(features1) != len(features2):
                return 0

            # Cosine similarity between image features
            features1 = np.array(features1).reshape(1, -1)
            features2 = np.array(features2).reshape(1, -1)
            
            similarity = cosine_similarity(features1, features2)[0][0]
            return max(0, similarity)

        except Exception as e:
            logger.error(f"Error calculating image similarity: {str(e)}")
            return 0

    def calculate_enhanced_category_similarity(self, item1: Dict[str, Any], item2: Dict[str, Any]) -> float:
        try:
            cat1 = item1.get('category', '').lower()
            cat2 = item2.get('category', '').lower()

            if cat1 == cat2:
                return 1.0

            # Enhanced category groups with more granular matching
            category_groups = {
                'tech_primary': ['electronics', 'gadgets', 'devices', 'phone', 'mobile'],
                'tech_secondary': ['chargers', 'cables', 'accessories', 'headphones'],
                'personal_primary': ['bags & wallets', 'jewelry & accessories', 'wallet'],
                'personal_secondary': ['clothing', 'personal items'],
                'academic': ['books & stationery', 'office supplies', 'books'],
                'sports': ['sports equipment', 'fitness'],
                'keys': ['keys', 'key chains'],
                'documents': ['documents & cards', 'certificates', 'id card']
            }

            # Check for primary group matches
            for group, categories in category_groups.items():
                if cat1 in categories and cat2 in categories:
                    if 'primary' in group:
                        return 0.9
                    else:
                        return 0.7

            # Fuzzy string matching for categories
            fuzzy_score = fuzz.ratio(cat1, cat2) / 100.0
            return fuzzy_score if fuzzy_score > 0.6 else 0

        except Exception as e:
            logger.error(f"Error calculating enhanced category similarity: {str(e)}")
            return 0

    def calculate_location_time_similarity(self, item1: Dict[str, Any], item2: Dict[str, Any]) -> float:
        try:
            # Location similarity
            location_sim = self.calculate_enhanced_location_similarity(item1, item2)
            
            # Time similarity
            time_sim = self.calculate_enhanced_temporal_similarity(item1, item2)
            
            # Weighted combination (location is more important)
            return location_sim * 0.7 + time_sim * 0.3

        except Exception as e:
            logger.error(f"Error calculating location/time similarity: {str(e)}")
            return 0

    def calculate_enhanced_location_similarity(self, item1: Dict[str, Any], item2: Dict[str, Any]) -> float:
        try:
            # Get location from the location field (now it's a direct string)
            loc1 = item1.get('location', '').lower()
            loc2 = item2.get('location', '').lower()

            if not loc1 or not loc2:
                return 0

            # Exact match
            if loc1 == loc2:
                return 1.0

            # Enhanced location matching with building/area recognition
            location_synonyms = {
                'library': ['lib', 'central library', 'main library'],
                'cafeteria': ['cafe', 'canteen', 'food court', 'mess'],
                'gate': ['entrance', 'exit', 'main gate', 'front gate'],
                'hostel': ['dorm', 'dormitory', 'residence'],
                'academic': ['academic block', 'class', 'classroom', 'lecture hall'],
                'sports': ['sports complex', 'gym', 'ground', 'field']
            }

            # Check for synonym matches
            for location_type, synonyms in location_synonyms.items():
                if any(syn in loc1 for syn in synonyms) and any(syn in loc2 for syn in synonyms):
                    return 0.8

            # Fuzzy string matching with higher threshold
            fuzzy_score = fuzz.partial_ratio(loc1, loc2) / 100.0
            
            # Check for common location keywords
            location_keywords = ['library', 'cafeteria', 'gate', 'building', 'hostel', 'campus', 'block']
            common_keywords = []
            
            for keyword in location_keywords:
                if keyword in loc1 and keyword in loc2:
                    common_keywords.append(keyword)

            if common_keywords:
                fuzzy_score = max(fuzzy_score, 0.7)

            return fuzzy_score if fuzzy_score > 0.5 else 0

        except Exception as e:
            logger.error(f"Error calculating enhanced location similarity: {str(e)}")
            return 0

    def calculate_enhanced_temporal_similarity(self, item1: Dict[str, Any], item2: Dict[str, Any]) -> float:
        try:
            date1 = self._get_date_from_item(item1)
            date2 = self._get_date_from_item(item2)

            if not date1 or not date2:
                return 0

            # Calculate time difference in hours
            diff_hours = abs((date1 - date2).total_seconds()) / 3600

            # Enhanced temporal scoring
            if diff_hours <= 2:
                return 1.0  # Within 2 hours
            elif diff_hours <= 12:
                return 0.9  # Same day
            elif diff_hours <= 24:
                return 0.8  # Within 24 hours
            elif diff_hours <= 72:
                return 0.6  # Within 3 days
            elif diff_hours <= 168:
                return 0.4  # Within a week
            elif diff_hours <= 720:
                return 0.2  # Within a month

            return 0

        except Exception as e:
            logger.error(f"Error calculating enhanced temporal similarity: {str(e)}")
            return 0

    async def calculate_advanced_keyword_similarity(self, item1: Dict[str, Any], item2: Dict[str, Any]) -> float:
        try:
            # Extract keywords from text analysis
            keywords1 = set(item1.get('aiMetadata', {}).get('textAnalysis', {}).get('keywords', []))
            keywords2 = set(item2.get('aiMetadata', {}).get('textAnalysis', {}).get('keywords', []))

            # Add tags (user-defined tags)
            tags1 = set(item1.get('tags', []))
            tags2 = set(item2.get('tags', []))

            # Add Gemini tags from image analysis
            gemini_tags1 = set(item1.get('aiMetadata', {}).get('imageAnalysis', {}).get('gemini_tags', []))
            gemini_tags2 = set(item2.get('aiMetadata', {}).get('imageAnalysis', {}).get('gemini_tags', []))

            # Combine all keywords
            all_keywords1 = keywords1.union(tags1).union(gemini_tags1)
            all_keywords2 = keywords2.union(tags2).union(gemini_tags2)

            # Convert to lowercase for comparison
            all_keywords1 = set(kw.lower() for kw in all_keywords1)
            all_keywords2 = set(kw.lower() for kw in all_keywords2)

            if not all_keywords1 and not all_keywords2:
                return 0

            # Enhanced keyword matching with fuzzy similarity
            exact_matches = all_keywords1.intersection(all_keywords2)
            fuzzy_matches = 0

            # Check for fuzzy matches between remaining keywords
            remaining1 = all_keywords1 - exact_matches
            remaining2 = all_keywords2 - exact_matches

            for kw1 in remaining1:
                for kw2 in remaining2:
                    if fuzz.ratio(kw1, kw2) > 80:  # 80% similarity threshold
                        fuzzy_matches += 0.8

            total_matches = len(exact_matches) + fuzzy_matches
            total_keywords = len(all_keywords1.union(all_keywords2))

            return total_matches / total_keywords if total_keywords > 0 else 0

        except Exception as e:
            logger.error(f"Error calculating advanced keyword similarity: {str(e)}")
            return 0

    def calculate_enhanced_confidence_score(self, detailed_scores: Dict[str, float], overall_score: float, item1: Dict, item2: Dict) -> float:
        try:
            # Base confidence from overall score
            confidence = overall_score

            # Boost confidence based on multiple matching factors
            matching_factors = len([score for score in detailed_scores.values() if score > 0.5])
            
            # Enhanced confidence boosting
            if matching_factors >= 5:
                confidence *= 1.3
            elif matching_factors >= 4:
                confidence *= 1.2
            elif matching_factors >= 3:
                confidence *= 1.1
            elif matching_factors >= 2:
                confidence *= 1.05

            # Penalty for very few matching factors
            if matching_factors < 2:
                confidence *= 0.7

            # Special boosts for high-confidence individual scores
            if detailed_scores.get('text_similarity', 0) > 0.9:
                confidence *= 1.15
            if detailed_scores.get('field_similarity', 0) > 0.8:
                confidence *= 1.1
            if detailed_scores.get('category_match', 0) == 1.0:
                confidence *= 1.05


            return min(confidence, 1.0)

        except Exception as e:
            logger.error(f"Error calculating enhanced confidence score: {str(e)}")
            return overall_score


    def are_similar_colors(self, color1: str, color2: str) -> bool:
        """Check if two colors are similar"""
        color_groups = {
            'dark': ['black', 'dark', 'navy', 'maroon', 'brown'],
            'light': ['white', 'light', 'cream', 'beige', 'silver'],
            'warm': ['red', 'orange', 'yellow', 'pink'],
            'cool': ['blue', 'green', 'purple', 'cyan'],
            'neutral': ['brown', 'gray', 'grey', 'silver', 'tan']
        }
        
        for group, colors in color_groups.items():
            if color1 in colors and color2 in colors:
                return True
        return False


    def prepare_enhanced_text_for_analysis(self, item: Dict[str, Any]) -> str:
        try:
            text_parts = []
            
            # Add title and description
            if item.get('title'):
                text_parts.extend([item['title']] * 3)  # Higher weight for title
            
            if item.get('description'):
                text_parts.append(item['description'])
            
            # Add AI metadata keywords with higher weight
            ai_metadata = item.get('aiMetadata', {})
            text_analysis = ai_metadata.get('textAnalysis', {})
            
            if text_analysis.get('keywords'):
                # Repeat important keywords for higher weight
                keywords = text_analysis['keywords']
                text_parts.extend(keywords * 2)  # Double weight for keywords
            
            # Add category with high weight
            if item.get('category'):
                text_parts.extend([item['category']] * 3)
            
            # Add user tags
            if item.get('tags'):
                text_parts.extend(item['tags'])
            
            # Add Gemini tags from image analysis
            image_analysis = ai_metadata.get('imageAnalysis', {})
            if image_analysis.get('gemini_tags'):
                text_parts.extend(image_analysis['gemini_tags'])
            
            # Add Gemini description
            if image_analysis.get('gemini_description'):
                text_parts.append(image_analysis['gemini_description'])
            
            # Add color information
            colors = image_analysis.get('colors', [])
            if colors:
                primary_color = max(colors, key=lambda x: x.get('percentage', 0)).get('color', '')
                if primary_color:
                    text_parts.extend([f"color {primary_color}"] * 2)    
            # Add objects from image analysis
            if image_analysis.get('objects'):
                text_parts.extend(image_analysis['objects'])         
            # Add location with high weight
            if item.get('location'):
                text_parts.extend([f"location {item['location']}"] * 2)
            return ' '.join(text_parts)

        except Exception as e:
            logger.error(f"Error preparing enhanced text for analysis: {str(e)}")
            return ''
