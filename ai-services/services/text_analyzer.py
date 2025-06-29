# # pylint: disable=missing-class-docstring

# from sentence_transformers import SentenceTransformer
# import numpy as np
# import re
# from typing import List, Optional
# import os
# import google.generativeai as genai

# class TextAnalyzer:
#     def __init__(self):
#         # Load sentence transformer model for embeddings
#         # Keep this local model as it's optimized for semantic similarity
#         try:
#             self.embedding_model = SentenceTransformer('all-MiniLM-L6-v2')
#         except Exception as e:
#             print(f"Warning: Could not load sentence transformer model: {e}")
#             self.embedding_model = None
        
#         # Configure Gemini API
#         api_key = os.getenv('GEMINI_API_KEY')
#         if api_key:
#             genai.configure(api_key=api_key)
#             self.gemini_model = genai.GenerativeModel('gemini-1.5-flash')
#         else:
#             self.gemini_model = None
        
#         # Categories for classification
#         self.categories = [
#             "electronics", "jewelry", "clothing", "bags", "keys", 
#             "documents", "toys", "sports", "books", "accessories", "other"
#         ]

#     async def analyze(self, text: str) -> dict:
#         """Comprehensive text analysis including embeddings, keywords, sentiment, and category"""
#         try:
#             result = {}
            
#             # Generate text embedding (keep local model for this)
#             if self.embedding_model:
#                 embedding = self.embedding_model.encode(text)
#                 result["embedding"] = embedding.tolist()
#             else:
#                 result["embedding"] = []
            
#             # Use Gemini for advanced analysis if available
#             if self.gemini_model:
#                 gemini_analysis = await self._analyze_with_gemini(text)
#                 result.update(gemini_analysis)
#             else:
#                 # Fallback to simple analysis
#                 result.update({
#                     "keywords": self._extract_keywords_simple(text),
#                     "sentiment": self._analyze_sentiment_simple(text),
#                     "category": self._classify_category_simple(text)
#                 })
            
#             # Add additional metadata
#             result["text_length"] = len(text)
#             result["word_count"] = len(text.split())
#             result["has_contact_info"] = self._detect_contact_info(text)
            
#             return result
            
#         except Exception as e:
#             # Return fallback analysis
#             return {
#                 "embedding": [],
#                 "keywords": self._extract_keywords_simple(text),
#                 "sentiment": self._analyze_sentiment_simple(text),
#                 "category": self._classify_category_simple(text),
#                 "text_length": len(text),
#                 "word_count": len(text.split()),
#                 "has_contact_info": self._detect_contact_info(text),
#                 "error": str(e)
#             }

#     async def _analyze_with_gemini(self, text: str) -> dict:
#         """Use Gemini for advanced text analysis"""
#         try:
#             prompt = f"""Analyze this lost and found item description and provide detailed analysis:

# Text: "{text}"

# Please provide analysis in the following JSON format:
# {{
#   "keywords": ["list of 5-10 most relevant keywords"],
#   "sentiment": 0.5,
#   "category": "electronics",
#   "urgency_level": "medium",
#   "location_mentioned": true,
#   "brand_mentioned": "Apple",
#   "color_mentioned": "black",
#   "size_mentioned": "small",
#   "condition_mentioned": "good",
#   "emotional_tone": "concerned"
# }}

# Guidelines:
# - Keywords: Extract the most relevant and descriptive words
# - Sentiment: Scale from -1 (very negative/desperate) to +1 (very positive/hopeful), 0 is neutral
# - Category: Choose from {', '.join(self.categories)}
# - Urgency: low, medium, high based on language used
# - Location/brand/color/size/condition: true if mentioned, otherwise false
# - If brand/color/size/condition mentioned, include the specific value
# - Emotional tone: calm, concerned, desperate, hopeful, grateful, etc.

# Respond only with valid JSON."""

#             response = self.gemini_model.generate_content(prompt)
#             content = response.text.strip()
            
#             # Clean up response (remove markdown formatting if present)
#             if content.startswith('```json'):
#                 content = content.replace('```json', '').replace('```', '').strip()
#             elif content.startswith('```'):
#                 content = content.replace('```', '').strip()
            
#             # Parse JSON response
#             import json
#             try:
#                 result = json.loads(content)
                
#                 # Validate and clean the result
#                 cleaned_result = {
#                     "keywords": result.get("keywords", [])[:10],  # Limit to 10 keywords
#                     "sentiment": max(-1.0, min(1.0, result.get("sentiment", 0.0))),  # Clamp to [-1, 1]
#                     "category": result.get("category", "other").lower(),
#                     "urgency_level": result.get("urgency_level", "medium"),
#                     "location_mentioned": result.get("location_mentioned", False),
#                     "brand_mentioned": result.get("brand_mentioned", False),
#                     "color_mentioned": result.get("color_mentioned", False),
#                     "size_mentioned": result.get("size_mentioned", False),
#                     "condition_mentioned": result.get("condition_mentioned", False),
#                     "emotional_tone": result.get("emotional_tone", "neutral")
#                 }
                
#                 # Validate category
#                 if cleaned_result["category"] not in self.categories:
#                     cleaned_result["category"] = "other"
                
#                 return cleaned_result
                
#             except json.JSONDecodeError:
#                 # Parse manually if JSON parsing fails
#                 return self._parse_gemini_response_manual(content, text)
                
#         except Exception as e:
#             print(f"Gemini analysis error: {e}")
#             # Fallback to simple analysis
#             return {
#                 "keywords": self._extract_keywords_simple(text),
#                 "sentiment": self._analyze_sentiment_simple(text),
#                 "category": self._classify_category_simple(text),
#                 "urgency_level": "medium",
#                 "location_mentioned": False,
#                 "brand_mentioned": False,
#                 "color_mentioned": False,
#                 "size_mentioned": False,
#                 "condition_mentioned": False,
#                 "emotional_tone": "neutral"
#             }

#     def _parse_gemini_response_manual(self, content: str, text: str) -> dict:
#         """Manually parse Gemini response if JSON parsing fails"""
#         try:
#             result = {
#                 "keywords": self._extract_keywords_simple(text),
#                 "sentiment": 0.0,
#                 "category": "other",
#                 "urgency_level": "medium",
#                 "location_mentioned": False,
#                 "brand_mentioned": False,
#                 "color_mentioned": False,
#                 "size_mentioned": False,
#                 "condition_mentioned": False,
#                 "emotional_tone": "neutral"
#             }
            
#             lines = content.strip().split('\n')
            
#             for line in lines:
#                 line = line.strip()
#                 if 'keywords' in line.lower() and ':' in line:
#                     # Extract keywords
#                     keywords_text = line.split(':', 1)[1].strip()
#                     import re
#                     keywords = re.findall(r'["\']([^"\']+)["\']|(\w+)', keywords_text)
#                     flat_keywords = [kw[0] if kw[0] else kw[1] for kw in keywords if kw[0] or kw[1]]
#                     if flat_keywords:
#                         result["keywords"] = flat_keywords[:10]
                
#                 elif 'sentiment' in line.lower() and ':' in line:
#                     try:
#                         sentiment_text = line.split(':', 1)[1].strip()
#                         sentiment = float(re.search(r'-?[\d.]+', sentiment_text).group())
#                         result["sentiment"] = max(-1.0, min(1.0, sentiment))
#                     except:
#                         pass
                
#                 elif 'category' in line.lower() and ':' in line:
#                     category = line.split(':', 1)[1].strip().strip('"\'').lower()
#                     if category in self.categories:
#                         result["category"] = category
            
#             return result
            
#         except Exception:
#             return {
#                 "keywords": self._extract_keywords_simple(text),
#                 "sentiment": self._analyze_sentiment_simple(text),
#                 "category": self._classify_category_simple(text),
#                 "urgency_level": "medium",
#                 "location_mentioned": False,
#                 "brand_mentioned": False,
#                 "color_mentioned": False,
#                 "size_mentioned": False,
#                 "condition_mentioned": False,
#                 "emotional_tone": "neutral"
#             }

#     def _extract_keywords_simple(self, text: str) -> List[str]:
#         """Simple keyword extraction fallback"""
#         words = re.findall(r'\b\w+\b', text.lower())
        
#         # Enhanced stop words list
#         stop_words = {
#             'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 
#             'of', 'with', 'by', 'is', 'was', 'are', 'were', 'been', 'have', 'has', 
#             'had', 'do', 'does', 'did', 'will', 'would', 'could', 'should', 'may', 
#             'might', 'must', 'can', 'this', 'that', 'these', 'those', 'i', 'you', 
#             'he', 'she', 'it', 'we', 'they', 'my', 'your', 'his', 'her', 'its', 
#             'our', 'their', 'me', 'him', 'her', 'us', 'them', 'myself', 'yourself',
#             'lost', 'found', 'please', 'help', 'if', 'any', 'some', 'all', 'very'
#         }
        
#         keywords = [word for word in words if word not in stop_words and len(word) > 2]
        
#         # Get most frequent keywords
#         from collections import Counter
#         word_freq = Counter(keywords)
        
#         return [word for word, freq in word_freq.most_common(10)]

#     def _analyze_sentiment_simple(self, text: str) -> float:
#         """Simple sentiment analysis fallback"""
#         text_lower = text.lower()
        
#         positive_words = [
#             'found', 'help', 'please', 'reward', 'important', 'valuable', 'thanks', 
#             'grateful', 'appreciate', 'hope', 'contact', 'return', 'safe'
#         ]
#         negative_words = [
#             'lost', 'missing', 'stolen', 'urgent', 'desperate', 'worried', 'panic',
#             'stress', 'emergency', 'critical', 'devastated', 'heartbroken'
#         ]
        
#         # Count words with weights
#         pos_score = 0
#         neg_score = 0
        
#         for word in positive_words:
#             if word in text_lower:
#                 pos_score += text_lower.count(word)
        
#         for word in negative_words:
#             if word in text_lower:
#                 neg_score += text_lower.count(word)
        
#         if pos_score + neg_score == 0:
#             return 0.0
        
#         # Normalize to [-1, 1] range
#         return (pos_score - neg_score) / (pos_score + neg_score)

#     def _classify_category_simple(self, text: str) -> str:
#         """Simple category classification fallback"""
#         text_lower = text.lower()
        
#         # Enhanced category keywords
#         category_keywords = {
#             "electronics": [
#                 "phone", "mobile", "smartphone", "iphone", "android", "laptop", 
#                 "computer", "tablet", "ipad", "camera", "headphones", "earbuds",
#                 "charger", "cable", "power bank", "watch", "smartwatch", "device","calculator"
#             ],
#             "jewelry": [
#                 "ring", "necklace", "bracelet", "watch", "earrings", "pendant",
#                 "chain", "diamond", "gold", "silver", "jewelry", "precious"
#             ],
#             "clothing": [
#                 "shirt", "jacket", "coat", "pants", "jeans", "dress", "skirt",
#                 "shoes", "sneakers", "boots", "hat", "cap", "scarf", "gloves"
#             ],
#             "bags": [
#                 "backpack", "purse", "wallet", "handbag", "briefcase", "bag",
#                 "luggage", "suitcase", "tote", "clutch", "messenger bag"
#             ],
#             "keys": [
#                 "keys", "key", "keychain", "car key", "house key", "office key",
#                 "key fob", "remote", "key ring"
#             ],
#             "documents": [
#                 "passport", "license", "driver license", "id card", "credit card",
#                 "debit card", "insurance card", "certificate", "diploma", "document"
#             ],
#             "toys": [
#                 "toy", "doll", "stuffed animal", "teddy bear", "game", "puzzle",
#                 "lego", "action figure"
#             ],
#             "sports": [
#                 "ball", "football", "basketball", "tennis", "soccer", "bike",
#                 "bicycle", "skateboard", "helmet", "equipment", "gear"
#             ],
#             "books": [
#                 "book", "notebook", "journal", "diary", "textbook", "pen",
#                 "pencil", "folder", "binder", "planner"
#             ],
#             "accessories": [
#                 "glasses", "sunglasses", "scarf", "belt", "umbrella", "hair band",
#                 "clip", "accessory"
#             ]
#         }
        
#         # Score each category
#         category_scores = {}
#         for category, keywords in category_keywords.items():
#             score = sum(1 for keyword in keywords if keyword in text_lower)
#             if score > 0:
#                 category_scores[category] = score
        
#         # Return category with highest score
#         if category_scores:
#             return max(category_scores.items(), key=lambda x: x[1])[0]
        
#         return "other"

#     def _detect_contact_info(self, text: str) -> bool:
#         """Detect if text contains contact information"""
#         # Simple patterns for contact info
#         email_pattern = r'\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b'
#         phone_pattern = r'\b\d{3}[-.]?\d{3}[-.]?\d{4}\b|\b\(\d{3}\)\s?\d{3}[-.]?\d{4}\b'
        
#         return bool(re.search(email_pattern, text) or re.search(phone_pattern, text))

#     async def extract_semantic_features(self, text: str) -> dict:
#         """Extract semantic features using Gemini"""
#         try:
#             if not self.gemini_model:
#                 return {"features": []}
            
#             prompt = f"""Extract semantic features from this lost and found description:

# Text: "{text}"

# Identify and extract:
# 1. Physical attributes (color, size, material, condition)
# 2. Functional attributes (purpose, usage, capabilities)
# 3. Contextual clues (location hints, time references, ownership clues)
# 4. Emotional indicators (urgency, attachment, value)

# Return as JSON:
# {{
#   "physical_attributes": {{"color": "black", "size": "small", "material": "plastic"}},
#   "functional_attributes": {{"type": "communication device", "brand": "Apple"}},
#   "contextual_clues": {{"location": "library", "time": "yesterday"}},
#   "emotional_indicators": {{"urgency": "high", "value": "high"}}
# }}"""

#             response = self.gemini_model.generate_content(prompt)
#             content = response.text.strip()
            
#             # Clean and parse response
#             if content.startswith('```json'):
#                 content = content.replace('```json', '').replace('```', '').strip()
            
#             import json
#             return json.loads(content)
            
#         except Exception:
#             return {"features": []}

#     def get_similarity_score(self, text1: str, text2: str) -> float:
#         """Calculate semantic similarity between two texts"""
#         try:
#             if not self.embedding_model:
#                 return 0.0
            
#             # Get embeddings
#             embedding1 = self.embedding_model.encode(text1)
#             embedding2 = self.embedding_model.encode(text2)
            
#             # Calculate cosine similarity
#             from numpy.linalg import norm
#             similarity = np.dot(embedding1, embedding2) / (norm(embedding1) * norm(embedding2))
            
#             return float(similarity)
            
#         except Exception:
#             return 0.0

#     def get_api_status(self) -> dict:
#         """Check API and model status"""
#         return {
#             "gemini_configured": self.gemini_model is not None,
#             "embedding_model_loaded": self.embedding_model is not None,
#             "api_key_set": os.getenv('GEMINI_API_KEY') is not None,
#             "categories_count": len(self.categories)
#         }
import re
import nltk
from nltk.corpus import stopwords
from nltk.tokenize import word_tokenize, sent_tokenize
from nltk.sentiment import SentimentIntensityAnalyzer
from transformers import pipeline
from sentence_transformers import SentenceTransformer
import asyncio
from typing import Dict, List, Any
import os
from utils.logger import logger
from .enhanced_text_analyzer import EnhancedTextAnalyzer

class TextAnalyzer:
    def __init__(self):
        self.enhanced_analyzer = EnhancedTextAnalyzer()
        self.ready = False

    async def initialize(self):
        try:
            await self.enhanced_analyzer.initialize()
            self.ready = True
            logger.info("Text analyzer initialized successfully")
            
        except Exception as e:
            logger.error(f"Failed to initialize text analyzer: {str(e)}")
            raise

    def is_ready(self) -> bool:
        return self.ready

    async def analyze(self, request) -> Dict[str, Any]:
        """
        Main analysis method that uses enhanced Gemini AI analysis
        """
        if not self.ready:
            raise Exception("Text analyzer not initialized")

        # Use only description for Gemini analysis as requested
        description = request.description
        
        try:
            # Use enhanced analyzer with Gemini AI
            analysis = await self.enhanced_analyzer.analyze(description)
            
            logger.info("Text analysis completed successfully")
            return analysis
            
        except Exception as e:
            logger.error(f"Text analysis failed: {str(e)}")
            # Fallback to basic analysis
            return self._get_fallback_analysis(description, request)

    def _get_fallback_analysis(self, description: str, request) -> Dict[str, Any]:
        """
        Fallback analysis when enhanced analysis fails
        """
        try:
            # Basic keyword extraction
            keywords = self._extract_basic_keywords(description)
            
            return {
                'keywords': keywords,
                'sentiment': "neutral",
                'category': request.category.lower() if hasattr(request, 'category') else 'other',
                'urgency_level': "medium",
                'location_mentioned': str(self._has_location_basic(description)).lower(),
                'brand_mentioned': "false",
                'color_mentioned': self._extract_color_basic(description),
                'size_mentioned': str(self._has_size_basic(description)).lower(),
                'condition_mentioned': str(self._has_condition_basic(description)).lower(),
                'emotional_tone': "concerned",
                'text_length': len(description),
                'word_count': len(description.split()),
                'has_contact_info': self._has_contact_info_basic(description),
                'confidence_score': 0.5
            }
        except Exception as e:
            logger.error(f"Fallback analysis failed: {str(e)}")
            return {
                'keywords': [],
                'sentiment': "neutral",
                'category': 'other',
                'urgency_level': "medium",
                'location_mentioned': "false",
                'brand_mentioned': "false",
                'color_mentioned': "false",
                'size_mentioned': "false",
                'condition_mentioned': "false",
                'emotional_tone': "concerned",
                'text_length': len(description),
                'word_count': len(description.split()),
                'has_contact_info': False,
                'confidence_score': 0.3
            }

    def _extract_basic_keywords(self, text: str) -> List[str]:
        """Basic keyword extraction"""
        try:
            words = text.lower().split()
            # Remove common stop words
            stop_words = {'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by', 'is', 'was', 'are', 'were', 'be', 'been', 'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'could', 'should', 'may', 'might', 'must', 'can', 'this', 'that', 'these', 'those', 'i', 'you', 'he', 'she', 'it', 'we', 'they', 'me', 'him', 'her', 'us', 'them', 'my', 'your', 'his', 'her', 'its', 'our', 'their'}
            keywords = [word for word in words if word not in stop_words and len(word) > 2]
            return list(set(keywords))[:10]
        except:
            return []

    def _has_location_basic(self, text: str) -> bool:
        """Basic location detection"""
        location_words = ['near', 'at', 'in', 'library', 'cafeteria', 'gate', 'building', 'campus']
        return any(word in text.lower() for word in location_words)

    def _extract_color_basic(self, text: str) -> str:
        """Basic color extraction"""
        colors = ['black', 'white', 'red', 'blue', 'green', 'yellow', 'brown', 'gray', 'silver', 'gold']
        text_lower = text.lower()
        for color in colors:
            if color in text_lower:
                return color
        return 'false'

    def _has_size_basic(self, text: str) -> bool:
        """Basic size detection"""
        size_words = ['small', 'medium', 'large', 'big', 'tiny', 'huge']
        return any(word in text.lower() for word in size_words)

    def _has_condition_basic(self, text: str) -> bool:
        """Basic condition detection"""
        condition_words = ['new', 'old', 'used', 'worn', 'damaged', 'broken', 'good', 'excellent']
        return any(word in text.lower() for word in condition_words)

    def _has_contact_info_basic(self, text: str) -> bool:
        """Basic contact info detection"""
        contact_patterns = [r'\d{10}', r'@', 'call', 'contact', 'phone', 'email']
        return any(re.search(pattern, text.lower()) for pattern in contact_patterns)

    async def generate_embedding(self, text: str) -> List[float]:
        try:
            if not self.ready:
                raise Exception("Text analyzer not initialized")
            
            # Use enhanced analyzer's embedding model
            if hasattr(self.enhanced_analyzer, 'embedding_model') and self.enhanced_analyzer.embedding_model:
                embedding = self.enhanced_analyzer.embedding_model.encode(text)
                return embedding.tolist()
            else:
                return [0.0] * 384  # Return zero vector as fallback
            
        except Exception as e:
            logger.error(f"Text embedding generation failed: {str(e)}")
            return [0.0] * 384  # Return zero vector as fallback