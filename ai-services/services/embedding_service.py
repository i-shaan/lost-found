from sentence_transformers import SentenceTransformer
import numpy as np
from typing import Dict, List, Any
from utils.logger import logger

class EmbeddingService:
    def __init__(self):
        self.text_model = None
        self.ready = False

    async def initialize(self):
        try:
            # Initialize sentence transformer for text embeddings
            self.text_model = SentenceTransformer('all-MiniLM-L6-v2')
            self.ready = True
            logger.info("Embedding service initialized successfully")
            
        except Exception as e:
            logger.error(f"Failed to initialize embedding service: {str(e)}")
            raise

    def is_ready(self) -> bool:
        return self.ready

    async def generate_embeddings(self, request) -> Dict[str, List[float]]:
        try:
            result = {
                "textEmbedding": [],
                "imageFeatures": []
            }

            # Generate text embedding
            if request.text:
                text_content = self._prepare_text_content(request.text)
                text_embedding = self.text_model.encode(text_content)
                result["textEmbedding"] = text_embedding.tolist()
            else:
                result["textEmbedding"] = [0.0] * 384

            # Generate image features (basic implementation)
            if request.images:
                image_features = self._generate_image_features(request.images)
                result["imageFeatures"] = image_features
            else:
                result["imageFeatures"] = [0.0] * 100

            return result

        except Exception as e:
            logger.error(f"Embedding generation failed: {str(e)}")
            return {
                "textEmbedding": [0.0] * 384,
                "imageFeatures": [0.0] * 100
            }

    def _prepare_text_content(self, text_analysis: Dict[str, Any]) -> str:
        # Combine different text elements for embedding
        content_parts = []
        
        # Add keywords with higher weight
        if 'keywords' in text_analysis:
            keywords_text = ' '.join(text_analysis['keywords'])
            content_parts.append(keywords_text)
        
        # Add category information
        if 'category' in text_analysis:
            content_parts.append(text_analysis['category'])
        
        # Add color information if mentioned
        if 'color_mentioned' in text_analysis and text_analysis['color_mentioned'] != 'false':
            content_parts.append(f"color {text_analysis['color_mentioned']}")
        
        # Add emotional tone
        if 'emotional_tone' in text_analysis:
            content_parts.append(text_analysis['emotional_tone'])
        
        # Add urgency level
        if 'urgency_level' in text_analysis:
            content_parts.append(f"urgency {text_analysis['urgency_level']}")

        return ' '.join(content_parts)

    def _generate_image_features(self, image_analysis: Dict[str, Any]) -> List[float]:
        # Generate features from image analysis results
        features = [0.0] * 100
        
        try:
            # Color-based features
            if 'colors' in image_analysis and image_analysis['colors']:
                for i, color_info in enumerate(image_analysis['colors'][:5]):  # Top 5 colors
                    base_idx = i * 10
                    if base_idx + 1 < len(features):
                        # Encode color percentage
                        features[base_idx] = color_info.get('percentage', 0) / 100.0
                        
                        # Encode color type (simple hash-based encoding)
                        color_name = color_info.get('color', '')
                        color_hash = hash(color_name) % 1000 / 1000.0
                        features[base_idx + 1] = color_hash

            # Object-based features
            if 'objects' in image_analysis and image_analysis['objects']:
                for i, obj in enumerate(image_analysis['objects'][:10]):  # Top 10 objects
                    idx = 50 + i  # Start from index 50
                    if idx < len(features):
                        # Simple encoding based on object name hash
                        obj_hash = hash(obj) % 1000 / 1000.0
                        features[idx] = obj_hash

            # Gemini tags features
            if 'gemini_tags' in image_analysis and image_analysis['gemini_tags']:
                for i, tag in enumerate(image_analysis['gemini_tags'][:20]):  # Top 20 tags
                    idx = 70 + i  # Start from index 70
                    if idx < len(features):
                        tag_hash = hash(tag) % 1000 / 1000.0
                        features[idx] = tag_hash

        except Exception as e:
            logger.error(f"Error generating image features: {str(e)}")

        return features

    async def calculate_similarity(self, embedding1: List[float], embedding2: List[float]) -> float:
        try:
            if len(embedding1) != len(embedding2):
                return 0.0

            # Cosine similarity
            dot_product = np.dot(embedding1, embedding2)
            norm1 = np.linalg.norm(embedding1)
            norm2 = np.linalg.norm(embedding2)

            if norm1 == 0 or norm2 == 0:
                return 0.0

            similarity = dot_product / (norm1 * norm2)
            return max(0.0, min(1.0, similarity))  # Clamp between 0 and 1

        except Exception as e:
            logger.error(f"Similarity calculation failed: {str(e)}")
            return 0.0

    async def batch_generate_embeddings(self, items: List[Dict[str, Any]]) -> List[Dict[str, List[float]]]:
        results = []
        
        for item in items:
            try:
                # Prepare text content
                text_content = f"{item.get('title', '')} {item.get('description', '')}"
                text_embedding = self.text_model.encode(text_content)
                
                # Generate image features (placeholder - would need actual image processing)
                image_features = [0.0] * 100
                
                results.append({
                    "textEmbedding": text_embedding.tolist(),
                    "imageFeatures": image_features
                })
                
            except Exception as e:
                logger.error(f"Failed to generate embeddings for item {item.get('_id', 'unknown')}: {str(e)}")
                results.append({
                    "textEmbedding": [0.0] * 384,
                    "imageFeatures": [0.0] * 100
                })
        
        return results