import re
import json
import nltk
from nltk.corpus import stopwords
from nltk.tokenize import word_tokenize, sent_tokenize
from nltk.sentiment import SentimentIntensityAnalyzer
import google.generativeai as genai
import openai
from transformers import pipeline
from sentence_transformers import SentenceTransformer
import asyncio
from typing import Dict, List, Any, Optional
import os
from utils.logger import logger

class EnhancedTextAnalyzer:
    def __init__(self):
        self.sentiment_analyzer = None
        self.embedding_model = None
        self.gemini_model = None
        self.openai_client = None
        self.emotion_classifier = None
        self.ready = False

    async def initialize(self):
        try:
            # Download required NLTK data
           
            nltk.download('stopwords', quiet=True)
            nltk.download('vader_lexicon', quiet=True)
            
            # Initialize models
            self.sentiment_analyzer = SentimentIntensityAnalyzer()
            self.embedding_model = SentenceTransformer('all-MiniLM-L6-v2')
            
            # Initialize Gemini AI
            if os.getenv("GEMINI_API_KEY"):
                genai.configure(api_key=os.getenv("GEMINI_API_KEY"))
                self.gemini_model = genai.GenerativeModel('gemini-1.5-flash')
            
            # Initialize OpenAI
            if os.getenv("OPENAI_API_KEY"):
                self.openai_client = openai.OpenAI(api_key=os.getenv("OPENAI_API_KEY"))
            
            # Initialize emotion classification pipeline
            self.emotion_classifier = pipeline(
                "text-classification",
                model="cardiffnlp/twitter-roberta-base-emotion",
                return_all_scores=True
            )
            
            self.ready = True
            logger.info("Enhanced text analyzer initialized successfully")
            
        except Exception as e:
            logger.error(f"Failed to initialize enhanced text analyzer: {str(e)}")
            raise

    def is_ready(self) -> bool:
        return self.ready

    async def analyze(self, description: str) -> Dict[str, Any]:
        """
        Enhanced text analysis using Gemini AI and advanced NLP
        """
        if not self.ready:
            raise Exception("Enhanced text analyzer not initialized")

        try:
            logger.info("Starting enhanced text analysis with Gemini AI")
            
            # Step 1: Get comprehensive analysis from Gemini AI
            gemini_analysis = await self._analyze_with_gemini(description)
            
            # Step 2: Perform detailed NLP analysis
            nlp_analysis = await self._perform_nlp_analysis(description)
            
            # Step 3: Extract specific fields
            field_analysis = await self._extract_specific_fields(description, gemini_analysis)
            
            # Step 4: Combine all analyses
            combined_analysis = {
                **field_analysis,
                **nlp_analysis,
                'text_length': len(description),
                'word_count': len(description.split()),
                'gemini_insights': gemini_analysis.get('insights', {}),
                'confidence_score': self._calculate_analysis_confidence(field_analysis, nlp_analysis)
            }
            
            logger.info("Enhanced text analysis completed successfully")
            return combined_analysis
            
        except Exception as e:
            logger.error(f"Enhanced text analysis failed: {str(e)}")
            return self._get_fallback_analysis(description)

    async def _analyze_with_gemini(self, description: str) -> Dict[str, Any]:
        """
        Use Gemini AI for comprehensive text analysis
        """
        try:
            if not self.gemini_model:
                return await self._analyze_with_openai(description)
            
            prompt = f"""
            Analyze this lost/found item description comprehensively and return a JSON response:
            
            Description: "{description}"
            
            Please analyze and return JSON with these exact fields:
            {{
                "keywords": ["list of 5-10 most important keywords"],
                "sentiment": "positive/negative/neutral",
                "category": "inferred category (electronics/accessories/clothing/etc)",
                "urgency_level": "low/medium/high",
                "location_mentioned": "true/false",
                "brand_mentioned": "brand name or false",
                "color_mentioned": "color name or false", 
                "size_mentioned": "true/false",
                "condition_mentioned": "true/false",
                "emotional_tone": "worried/hopeful/frustrated/calm/desperate/relieved",
                "has_contact_info": "true/false",
                "insights": {{
                    "item_value": "low/medium/high",
                    "owner_attachment": "low/medium/high",
                    "description_quality": "poor/good/excellent",
                    "specificity": "vague/moderate/detailed"
                }}
            }}
            
            Be precise and only return valid JSON.
            """
            
            response = self.gemini_model.generate_content(prompt)
            
            # Parse JSON response
            json_text = response.text.strip()
            if json_text.startswith('```json'):
                json_text = json_text[7:-3]
            elif json_text.startswith('```'):
                json_text = json_text[3:-3]
            
            analysis = json.loads(json_text)
            return analysis
            
        except Exception as e:
            logger.error(f"Gemini analysis failed: {str(e)}")
            return await self._analyze_with_openai(description)

   

    async def _perform_nlp_analysis(self, description: str) -> Dict[str, Any]:
        """
        Perform detailed NLP analysis using traditional methods
        """
        try:
            # Sentiment analysis
            sentiment_scores = self.sentiment_analyzer.polarity_scores(description)
            
            # Emotion analysis
            emotions = self.emotion_classifier(description)
            top_emotion = max(emotions[0], key=lambda x: x['score'])
            
            # Keyword extraction
            keywords = self._extract_advanced_keywords(description)
            
            # Entity extraction
            entities = self._extract_entities(description)
            
            return {
                'sentiment_scores': sentiment_scores,
                'emotion_confidence': top_emotion['score'],
                'extracted_keywords': keywords,
                'entities': entities,
                'readability_score': self._calculate_readability(description)
            }
            
        except Exception as e:
            logger.error(f"NLP analysis failed: {str(e)}")
            return {}

    async def _extract_specific_fields(self, description: str, gemini_analysis: Dict) -> Dict[str, Any]:
        """
        Extract and validate specific fields required for matching
        """
        desc_lower = description.lower()
        
        # Use Gemini results as primary, fallback to rule-based
        return {
            'keywords': gemini_analysis.get('keywords', self._extract_keywords_fallback(description)),
            'sentiment': self._normalize_sentiment(gemini_analysis.get('sentiment', 'neutral')),
            'category': gemini_analysis.get('category', self._infer_category(description)),
            'urgency_level': gemini_analysis.get('urgency_level', self._detect_urgency(description)),
            'location_mentioned': str(gemini_analysis.get('location_mentioned', self._has_location(description))).lower(),
            'brand_mentioned': gemini_analysis.get('brand_mentioned', self._extract_brand(description)),
            'color_mentioned': gemini_analysis.get('color_mentioned', self._extract_color(description)),
            'size_mentioned': str(gemini_analysis.get('size_mentioned', self._has_size(description))).lower(),
            'condition_mentioned': str(gemini_analysis.get('condition_mentioned', self._has_condition(description))).lower(),
            'emotional_tone': gemini_analysis.get('emotional_tone', self._analyze_emotion_tone(description)),
            'has_contact_info': gemini_analysis.get('has_contact_info', self._has_contact_info(description))
        }

    def _extract_advanced_keywords(self, text: str) -> List[str]:
        """
        Advanced keyword extraction using multiple techniques
        """
        # Clean and tokenize
        text_lower = text.lower()
        tokens = word_tokenize(text_lower)
        
        # Remove stopwords and punctuation
        stop_words = set(stopwords.words('english'))
        keywords = [word for word in tokens if word.isalnum() and word not in stop_words and len(word) > 2]
        
        # Add bigrams and trigrams
        bigrams = [f"{tokens[i]}_{tokens[i+1]}" for i in range(len(tokens)-1) 
                  if tokens[i] not in stop_words and tokens[i+1] not in stop_words]
        
        # Frequency analysis
        keyword_freq = {}
        for word in keywords + bigrams:
            keyword_freq[word] = keyword_freq.get(word, 0) + 1
        
        # Return top keywords
        sorted_keywords = sorted(keyword_freq.items(), key=lambda x: x[1], reverse=True)
        return [word for word, freq in sorted_keywords[:15]]

    def _extract_entities(self, text: str) -> Dict[str, List[str]]:
        """
        Extract named entities from text
        """
        entities = {
            'brands': [],
            'locations': [],
            'colors': [],
            'materials': [],
            'numbers': []
        }
        
        # Brand patterns
        brand_patterns = [
            r'\b(apple|samsung|sony|nike|adidas|puma|hp|dell|lenovo|asus|microsoft|google)\b',
            r'\b(rolex|casio|titan|fossil|seiko|omega)\b',
            r'\b(gucci|prada|louis vuitton|chanel|hermes)\b'
        ]
        
        for pattern in brand_patterns:
            matches = re.findall(pattern, text.lower())
            entities['brands'].extend(matches)
        
        # Location patterns
        location_patterns = [
            r'\b(library|cafeteria|gate|building|hostel|campus|college|university)\b',
            r'\b(near|at|in|outside|inside|between|behind)\s+(\w+)\b'
        ]
        
        for pattern in location_patterns:
            matches = re.findall(pattern, text.lower())
            if isinstance(matches[0], tuple) if matches else False:
                entities['locations'].extend([match[1] for match in matches])
            else:
                entities['locations'].extend(matches)
        
        # Color extraction
        colors = ['black', 'white', 'red', 'blue', 'green', 'yellow', 'brown', 'gray', 'silver', 'gold', 'pink', 'purple', 'orange']
        for color in colors:
            if color in text.lower():
                entities['colors'].append(color)
        
        # Material extraction
        materials = ['leather', 'plastic', 'metal', 'fabric', 'cotton', 'silk', 'wool', 'denim']
        for material in materials:
            if material in text.lower():
                entities['materials'].append(material)
        
        # Number extraction
        numbers = re.findall(r'\b\d+\b', text)
        entities['numbers'] = numbers
        
        return entities

    def _calculate_readability(self, text: str) -> float:
        """
        Calculate text readability score
        """
        sentences = sent_tokenize(text)
        words = word_tokenize(text)
        
        if len(sentences) == 0 or len(words) == 0:
            return 0.0
        
        avg_sentence_length = len(words) / len(sentences)
        avg_word_length = sum(len(word) for word in words) / len(words)
        
        # Simple readability score
        readability = 100 - (avg_sentence_length * 1.5) - (avg_word_length * 2)
        return max(0, min(100, readability))

    def _normalize_sentiment(self, sentiment: str) -> str:
        """
        Normalize sentiment to standard format
        """
        sentiment_lower = sentiment.lower()
        if sentiment_lower in ['positive', 'pos', '1']:
            return 'positive'
        elif sentiment_lower in ['negative', 'neg', '-1']:
            return 'negative'
        else:
            return 'neutral'

    def _infer_category(self, text: str) -> str:
        """
        Infer category from text content
        """
        text_lower = text.lower()
        
        category_keywords = {
            'electronics': ['phone', 'laptop', 'tablet', 'charger', 'headphones', 'camera', 'watch'],
            'accessories': ['wallet', 'purse', 'bag', 'jewelry', 'ring', 'necklace', 'bracelet'],
            'clothing': ['shirt', 'pants', 'jacket', 'shoes', 'dress', 'hat', 'scarf'],
            'documents': ['id', 'card', 'license', 'passport', 'certificate', 'document'],
            'keys': ['key', 'keychain', 'remote'],
            'books': ['book', 'notebook', 'textbook', 'novel', 'magazine'],
            'sports': ['ball', 'racket', 'equipment', 'gear', 'sports']
        }
        
        for category, keywords in category_keywords.items():
            if any(keyword in text_lower for keyword in keywords):
                return category
        
        return 'other'

    def _detect_urgency(self, text: str) -> str:
        """
        Detect urgency level from text
        """
        text_lower = text.lower()
        
        high_urgency = ['urgent', 'emergency', 'asap', 'immediately', 'important', 'desperately', 'please help']
        medium_urgency = ['please', 'help', 'need', 'missing', 'lost today', 'reward']
        
        if any(word in text_lower for word in high_urgency):
            return 'high'
        elif any(word in text_lower for word in medium_urgency):
            return 'medium'
        else:
            return 'low'

    def _has_location(self, text: str) -> bool:
        """
        Check if location is mentioned
        """
        location_indicators = [
            'near', 'at', 'in', 'outside', 'inside', 'between', 'behind', 'front',
            'library', 'cafeteria', 'gate', 'building', 'room', 'floor', 'campus',
            'college', 'university', 'school', 'hospital', 'park', 'mall', 'station'
        ]
        
        return any(indicator in text.lower() for indicator in location_indicators)

    def _extract_brand(self, text: str) -> str:
        """
        Extract brand mentions
        """
        brands = [
            'apple', 'samsung', 'sony', 'nike', 'adidas', 'puma', 'hp', 'dell',
            'lenovo', 'asus', 'acer', 'microsoft', 'google', 'amazon', 'flipkart',
            'rolex', 'casio', 'titan', 'fossil', 'seiko', 'omega', 'gucci', 'prada'
        ]
        
        text_lower = text.lower()
        for brand in brands:
            if brand in text_lower:
                return brand
        
        return 'false'

    def _extract_color(self, text: str) -> str:
        """
        Extract color mentions
        """
        colors = [
            'black', 'white', 'red', 'blue', 'green', 'yellow', 'orange',
            'purple', 'pink', 'brown', 'gray', 'grey', 'silver', 'gold',
            'cyan', 'magenta', 'maroon', 'navy', 'olive', 'lime', 'dark', 'light'
        ]
        
        text_lower = text.lower()
        for color in colors:
            if color in text_lower:
                return color
        
        return 'false'

    def _has_size(self, text: str) -> bool:
        """
        Check if size is mentioned
        """
        size_indicators = [
            'small', 'medium', 'large', 'big', 'huge', 'tiny', 'mini',
            'compact', 'xl', 'xxl', 'size', 'inch', 'cm', 'mm',
            'tall', 'short', 'wide', 'narrow', 'thick', 'thin'
        ]
        
        return any(size in text.lower() for size in size_indicators)

    def _has_condition(self, text: str) -> bool:
        """
        Check if condition is mentioned
        """
        condition_words = [
            'new', 'old', 'used', 'worn', 'damaged', 'broken', 'cracked',
            'scratched', 'mint', 'excellent', 'good', 'fair', 'poor',
            'working', 'not working', 'functional', 'defective'
        ]
        
        return any(condition in text.lower() for condition in condition_words)

    def _analyze_emotion_tone(self, text: str) -> str:
        """
        Analyze emotional tone
        """
        try:
            emotions = self.emotion_classifier(text)
            top_emotion = max(emotions[0], key=lambda x: x['score'])
            
            emotion_mapping = {
                'joy': 'hopeful',
                'optimism': 'hopeful',
                'anger': 'frustrated',
                'sadness': 'worried',
                'fear': 'worried',
                'surprise': 'surprised',
                'disgust': 'frustrated',
                'trust': 'calm'
            }
            
            return emotion_mapping.get(top_emotion['label'], 'concerned')
            
        except Exception:
            # Fallback to keyword-based analysis
            text_lower = text.lower()
            if any(word in text_lower for word in ['worried', 'anxious', 'desperate']):
                return 'worried'
            elif any(word in text_lower for word in ['angry', 'frustrated', 'annoyed']):
                return 'frustrated'
            elif any(word in text_lower for word in ['hope', 'hopeful', 'optimistic']):
                return 'hopeful'
            else:
                return 'concerned'

    def _has_contact_info(self, text: str) -> bool:
        """
        Check if contact information is present
        """
        phone_pattern = r'\b\d{10}\b|\b\d{3}[-.\s]\d{3}[-.\s]\d{4}\b'
        email_pattern = r'\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b'
        contact_words = ['call', 'contact', 'phone', 'email', 'reach', 'whatsapp', 'message']
        
        return (
            bool(re.search(phone_pattern, text)) or
            bool(re.search(email_pattern, text)) or
            any(word in text.lower() for word in contact_words)
        )

    def _calculate_analysis_confidence(self, field_analysis: Dict, nlp_analysis: Dict) -> float:
        """
        Calculate overall confidence in the analysis
        """
        confidence = 0.5  # Base confidence
        
        # Boost confidence based on detected features
        if field_analysis.get('color_mentioned') != 'false':
            confidence += 0.1
        if field_analysis.get('brand_mentioned') != 'false':
            confidence += 0.15
        if field_analysis.get('location_mentioned') == 'true':
            confidence += 0.1
        if field_analysis.get('size_mentioned') == 'true':
            confidence += 0.05
        if field_analysis.get('condition_mentioned') == 'true':
            confidence += 0.05
        
        # Boost based on text quality
        if field_analysis.get('word_count', 0) > 20:
            confidence += 0.1
        if len(field_analysis.get('keywords', [])) > 5:
            confidence += 0.05
        
        return min(confidence, 1.0)

    def _extract_keywords_fallback(self, text: str) -> List[str]:
        """
        Fallback keyword extraction
        """
        words = word_tokenize(text.lower())
        stop_words = set(stopwords.words('english'))
        keywords = [word for word in words if word.isalnum() and word not in stop_words and len(word) > 2]
        return list(set(keywords))[:10]

    def _get_basic_analysis(self, description: str) -> Dict[str, Any]:
        """
        Basic analysis when AI services fail
        """
        return {
            'keywords': self._extract_keywords_fallback(description),
            'sentiment': 'neutral',
            'category': self._infer_category(description),
            'urgency_level': self._detect_urgency(description),
            'location_mentioned': str(self._has_location(description)).lower(),
            'brand_mentioned': self._extract_brand(description),
            'color_mentioned': self._extract_color(description),
            'size_mentioned': str(self._has_size(description)).lower(),
            'condition_mentioned': str(self._has_condition(description)).lower(),
            'emotional_tone': 'concerned',
            'has_contact_info': self._has_contact_info(description)
        }

    def _get_fallback_analysis(self, description: str) -> Dict[str, Any]:
        """
        Fallback analysis when everything fails
        """
        basic = self._get_basic_analysis(description)
        basic.update({
            'text_length': len(description),
            'word_count': len(description.split()),
            'confidence_score': 0.5
        })
        return basic