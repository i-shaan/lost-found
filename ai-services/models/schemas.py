
from pydantic import BaseModel
from typing import List, Optional, Dict, Any
from datetime import datetime

class TextAnalysisRequest(BaseModel):
    title: str
    description: str
    category: str
    tags: Optional[List[str]] = []

class TextAnalysisResponse(BaseModel):
    keywords: List[str]
    sentiment: str
    category: str
    urgency_level: str
    location_mentioned: str
    brand_mentioned: str
    color_mentioned: str
    size_mentioned: str
    condition_mentioned: str
    emotional_tone: str
    text_length: int
    word_count: int
    has_contact_info: bool

class ImageAnalysisResponse(BaseModel):
    objects: List[str]
    colors: List[Dict[str, Any]]
    gemini_description: str
    gemini_tags: List[str]

class EmbeddingRequest(BaseModel):
    text: Optional[Dict[str, Any]] = None
    images: Optional[Dict[str, Any]] = None

class EmbeddingResponse(BaseModel):
    textEmbedding: List[float]
    imageFeatures: List[float]

class ItemData(BaseModel):
    id: str
    text_embedding: Optional[List[float]] = []
    image_features: Optional[List[float]] = []
    text_analysis: Optional[Dict[str, Any]] = {}
    image_analysis: Optional[Dict[str, Any]] = {}
    category: str
    location: str
    date_lost_found: str
    tags: Optional[List[str]] = []

class AdvancedMatchingRequest(BaseModel):
    source_item: ItemData
    candidate_items: List[ItemData]
    match_threshold: Optional[float] = 0.6
    max_matches: Optional[int] = 10

class DetailedAnalysis(BaseModel):
    text_similarity: Optional[float] = 0
    image_similarity: Optional[float] = 0
    category_match: Optional[float] = 0
    location_proximity: Optional[float] = 0
    time_proximity: Optional[float] = 0
    keyword_overlap: Optional[float] = 0
    color_similarity: Optional[float] = 0
    entity_similarity: Optional[float] = 0

class AdvancedMatchResult(BaseModel):
    item_id: str
    similarity_score: float
    confidence: float
    reasons: List[str]
    detailed_analysis: DetailedAnalysis

# Legacy compatibility
class SimilarityRequest(BaseModel):
    embeddings: Dict[str, List[float]]
    type: str
    limit: int = 10

class SimilarityResult(BaseModel):
    item_id: str
    similarity_score: float
    confidence: float
    reasons: List[str]