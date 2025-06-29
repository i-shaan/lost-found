
from fastapi import FastAPI, UploadFile, File, HTTPException, Depends, Security, Body
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from fastapi.middleware.cors import CORSMiddleware
import uvicorn
import os
from dotenv import load_dotenv
import nltk
from services.enhanced_text_analyzer import EnhancedTextAnalyzer
from services.text_analyzer import TextAnalyzer
from services.image_analyzer import ImageAnalyzer
from services.embedding_service import EmbeddingService
from services.advanced_matching_service import AdvancedMatchingService
from models.schemas import *
from utils.logger import logger
from pydantic import BaseModel, ValidationError
import traceback

load_dotenv()

class TextRequest(BaseModel):
    description: str
    
    class Config:
        # Allow extra fields to be ignored
        extra = "ignore"

app = FastAPI(
    title="Enhanced Lost & Found AI Services",
    description="Advanced AI-powered analysis and matching service with Gemini AI integration",
    version="3.0.0"
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Configure properly for production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Security
security = HTTPBearer()

def verify_api_key(credentials: HTTPAuthorizationCredentials = Security(security)):
    if credentials.credentials != os.getenv("AI_SERVICE_API_KEY", "dev-key"):
        raise HTTPException(status_code=401, detail="Invalid API key")
    return credentials.credentials

# Initialize services
enhanced_text_analyzer = EnhancedTextAnalyzer()
text_analyzer = TextAnalyzer()
image_analyzer = ImageAnalyzer()
embedding_service = EmbeddingService()
matching_service = AdvancedMatchingService()

@app.on_event("startup")
async def startup_event():
    logger.info("Starting Enhanced AI Services with Gemini AI...")
    try:
        await enhanced_text_analyzer.initialize()
        await text_analyzer.initialize()
        await image_analyzer.initialize()
        await embedding_service.initialize()
        await matching_service.initialize()
        logger.info("Enhanced AI Services initialized successfully")
    except Exception as e:
        logger.error(f"Service initialization failed: {str(e)}")
        logger.error(traceback.format_exc())

@app.get("/")
async def root():
    return {
        "message": "Enhanced Lost & Found AI Services with Gemini AI", 
        "status": "running", 
        "version": "3.0.0",
        "features": [
            "Gemini AI Text Analysis",
            "Advanced NLP Matching",
            "Multi-factor Similarity Scoring",
            "Enhanced Field Analysis",
            "Real-time Processing"
        ]
    }

@app.get("/health")
async def health_check():
    return {
        "status": "healthy",
        "services": {
            "enhanced_text_analyzer": enhanced_text_analyzer.is_ready() if hasattr(enhanced_text_analyzer, 'is_ready') else True,
            "text_analyzer": text_analyzer.is_ready() if hasattr(text_analyzer, 'is_ready') else True,
            "image_analyzer": image_analyzer.is_ready() if hasattr(image_analyzer, 'is_ready') else True,
            "embedding_service": embedding_service.is_ready() if hasattr(embedding_service, 'is_ready') else True,
            "matching_service": True
        },
        "ai_models": {
            "gemini_ai": bool(os.getenv("GEMINI_API_KEY")),
            "openai": bool(os.getenv("OPENAI_API_KEY")),
            "sentence_transformers": True,
            "spacy_nlp": True
        }
    }

@app.post("/analyze/text", response_model=TextAnalysisResponse)
async def analyze_text(
    request: TextAnalysisRequest,
    api_key: str = Depends(verify_api_key)
):
    try:
        logger.info(f"Analyzing text with enhanced Gemini AI for item: {request.title}")
        
        # Use enhanced text analyzer with Gemini AI
        analysis = await enhanced_text_analyzer.analyze(request.description)
        
        # Ensure all required fields are present
        response_data = {
            'keywords': analysis.get('keywords', []),
            'sentiment': analysis.get('sentiment', 'neutral'),
            'category': analysis.get('category', 'other'),
            'urgency_level': analysis.get('urgency_level', 'medium'),
            'location_mentioned': analysis.get('location_mentioned', 'false'),
            'brand_mentioned': analysis.get('brand_mentioned', 'false'),
            'color_mentioned': analysis.get('color_mentioned', 'false'),
            'size_mentioned': analysis.get('size_mentioned', 'false'),
            'condition_mentioned': analysis.get('condition_mentioned', 'false'),
            'emotional_tone': analysis.get('emotional_tone', 'concerned'),
            'text_length': analysis.get('text_length', len(request.description)),
            'word_count': analysis.get('word_count', len(request.description.split())),
            'has_contact_info': analysis.get('has_contact_info', False)
        }
        
        logger.info("Enhanced text analysis completed successfully")
        return TextAnalysisResponse(**response_data)
        
    except Exception as e:
        logger.error(f"Enhanced text analysis failed: {str(e)}")
        logger.error(traceback.format_exc())
        raise HTTPException(status_code=500, detail=f"Enhanced text analysis failed: {str(e)}")

@app.post("/analyze/images", response_model=ImageAnalysisResponse)
async def analyze_images(
    images: list[UploadFile] = File(...),
    api_key: str = Depends(verify_api_key)
):
    try:
        logger.info(f"Analyzing {len(images)} images")
        analysis = await image_analyzer.analyze(images)
        return ImageAnalysisResponse(**analysis)
    except Exception as e:
        logger.error(f"Image analysis failed: {str(e)}")
        logger.error(traceback.format_exc())
        raise HTTPException(status_code=500, detail=f"Image analysis failed: {str(e)}")

@app.post("/embeddings/generate", response_model=EmbeddingResponse)
async def generate_embeddings(
    request: EmbeddingRequest,
    api_key: str = Depends(verify_api_key)
):
    try:
        logger.info("Generating embeddings")
        embeddings = await embedding_service.generate_embeddings(request)
        return EmbeddingResponse(**embeddings)
    except Exception as e:
        logger.error(f"Embedding generation failed: {str(e)}")
        logger.error(traceback.format_exc())
        raise HTTPException(status_code=500, detail=f"Embedding generation failed: {str(e)}")

@app.post("/matching/find-matches", response_model=list[AdvancedMatchResult])
async def find_matches(
    request: AdvancedMatchingRequest,
    api_key: str = Depends(verify_api_key)
):
    try:
        logger.info(f"Finding enhanced AI matches for item: {request.source_item.id}")
        results = await matching_service.find_matches(request.dict())
        return [AdvancedMatchResult(**result) for result in results]
    except Exception as e:
        logger.error(f"Enhanced matching failed: {str(e)}")
        logger.error(traceback.format_exc())
        raise HTTPException(status_code=500, detail=f"Enhanced matching failed: {str(e)}")

@app.post("/matching/batch-update")
async def batch_update_embeddings(
    items: list[dict],
    api_key: str = Depends(verify_api_key)
):
    try:
        logger.info(f"Batch updating embeddings for {len(items)} items")
        results = await embedding_service.batch_generate_embeddings(items)
        return {"success": True, "updated": len(results), "results": results}
    except Exception as e:
        logger.error(f"Batch update failed: {str(e)}")
        logger.error(traceback.format_exc())
        raise HTTPException(status_code=500, detail=f"Batch update failed: {str(e)}")

# Enhanced endpoint with better error handling and validation
@app.post("/analyze/text-enhanced")
async def analyze_text_enhanced(
    payload: TextRequest,
    api_key: str = Depends(verify_api_key)
):
    try:
        logger.info(f"Received request for enhanced text analysis")
        logger.info(f"Payload description: {payload.description[:100]}...")  # Log first 100 chars
        
        # Validate input
        if not payload.description or len(payload.description.strip()) == 0:
            raise HTTPException(status_code=400, detail="Description cannot be empty")
        
        # Check if enhanced_text_analyzer is ready
        if not hasattr(enhanced_text_analyzer, 'analyze'):
            raise HTTPException(status_code=503, detail="Enhanced text analyzer not available")
        
        logger.info("Performing enhanced text analysis with Gemini AI")
        analysis = await enhanced_text_analyzer.analyze(payload.description)
       
        # Validate analysis result
        if not analysis:
            raise HTTPException(status_code=500, detail="Analysis returned empty result")
        
        logger.info("Enhanced text analysis completed successfully")
        logger.info("hi",analysis)
        return {
            "success": True,
            "analysis": analysis,
            "confidence": analysis.get('confidence_score', 0.5),
            "input_length": len(payload.description),
            "timestamp": os.getenv("TIMESTAMP", "unknown")
        }
        
    except ValidationError as e:
        logger.error(f"Validation error: {str(e)}")
        raise HTTPException(status_code=422, detail=f"Validation error: {str(e)}")
    except HTTPException:
        # Re-raise HTTP exceptions
        raise
    except Exception as e:
        logger.error(f"Enhanced text analysis failed: {str(e)}")
        logger.error(traceback.format_exc())
        raise HTTPException(status_code=500, detail=f"AI analysis failed: {str(e)}")

# Debug endpoint to check request structure
@app.post("/analyze/text-enhanced-debug")
async def analyze_text_enhanced_debug(
    payload: dict = Body(...),
    api_key: str = Depends(verify_api_key)
):
    try:
        logger.info(f"Debug - Raw payload received: {payload}")
        
        # Check payload structure
        analysis = {
            "payload_keys": list(payload.keys()) if isinstance(payload, dict) else "not_dict",
            "description_present": "description" in payload if isinstance(payload, dict) else False,
            "description_value": payload.get('description', 'NOT_FOUND') if isinstance(payload, dict) else "payload_not_dict",
            "description_type": type(payload.get('description', None)).__name__ if isinstance(payload, dict) else "unknown",
            "payload_type": type(payload).__name__
        }
        
        # Try to create TextRequest from payload
        try:
            text_request = TextRequest(**payload)
            analysis["validation_success"] = True
            analysis["validated_description"] = text_request.description
        except ValidationError as ve:
            analysis["validation_success"] = False
            analysis["validation_errors"] = str(ve)
        
        return {
            "success": True,
            "debug_info": analysis
        }
        
    except Exception as e:
        logger.error(f"Debug endpoint error: {str(e)}")
        return {
            "success": False,
            "error": str(e),
            "traceback": traceback.format_exc()
        }

# Alternative endpoint that accepts raw JSON
@app.post("/analyze/text-enhanced-alt")
async def analyze_text_enhanced_alt(
    request_data: dict = Body(...),
    api_key: str = Depends(verify_api_key)
):
    try:
        logger.info(f"Alternative endpoint - received data: {request_data}")
        
        # Extract description from various possible structures
        description = None
        if isinstance(request_data, dict):
            description = (
                request_data.get('description') or 
                request_data.get('text') or 
                request_data.get('content')
            )
        
        if not description:
            raise HTTPException(
                status_code=400, 
                detail="No description found in request. Please provide 'description', 'text', or 'content' field."
            )
        
        logger.info("Performing enhanced text analysis with Gemini AI")
        analysis = await enhanced_text_analyzer.analyze(description)
        
        return {
            "success": True,
            "analysis": analysis,
            "confidence": analysis.get('confidence_score', 0.5),
            "input_description": description[:100] + "..." if len(description) > 100 else description
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Alternative enhanced text analysis failed: {str(e)}")
        logger.error(traceback.format_exc())
        raise HTTPException(status_code=500, detail=f"AI analysis failed: {str(e)}")

if __name__ == "__main__":
    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=int(os.getenv("PORT", 8000)),
        reload=os.getenv("ENVIRONMENT") == "development"
    )