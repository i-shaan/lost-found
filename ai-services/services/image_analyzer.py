import cv2
import numpy as np
from PIL import Image
import google.generativeai as genai
import io
import base64
from typing import List, Dict, Any
import os
import requests
from utils.logger import logger
from fastapi import HTTPException
from pydantic import BaseModel
import traceback

# Pydantic models for request/response
class ImageAnalysisRequest(BaseModel):
    image_urls: List[str]  # List of Cloudinary URLs

class ImageAnalysisResponse(BaseModel):
    objects: List[str]
    colors: List[Dict[str, Any]]
    gemini_description: str
    gemini_tags: List[str]

class ImageAnalyzer:
    def __init__(self):
        self.gemini_model = None
        self.ready = False

    async def initialize(self):
        try:
            # Initialize Gemini AI
            gemini_api_key = os.getenv("GEMINI_API_KEY")
            if gemini_api_key:
                genai.configure(api_key=gemini_api_key)
                self.gemini_model = genai.GenerativeModel('gemini-1.5-flash')
                logger.info("Gemini AI initialized successfully")
            else:
                logger.warning("GEMINI_API_KEY not found - Gemini analysis will be disabled")
            
            self.ready = True
            logger.info("Image analyzer initialized successfully")
            
        except Exception as e:
            logger.error(f"Failed to initialize image analyzer: {str(e)}")
            # Don't raise exception - allow service to work without Gemini
            self.ready = True

    def is_ready(self) -> bool:
        return self.ready

    async def analyze(self, image_urls: List[str]) -> Dict[str, Any]:
        """Analyze images from Cloudinary URLs"""
        if not image_urls:
            logger.warning("No image URLs provided")
            return self._get_empty_analysis()

        results = {
            "objects": [],
            "colors": [],
            "gemini_description": "",
            "gemini_tags": []
        }

        try:
            logger.info(f"Starting analysis of {len(image_urls)} images")
            
            # Process first image (main analysis)
            main_image_url = image_urls[0]
            logger.info(f"Processing main image: {main_image_url}")
            
            # Download and process image
            main_image = await self._load_image_from_url(main_image_url)
            
            # Color analysis
            logger.info("Performing color analysis")
            results["colors"] = self._analyze_colors(main_image)
            
            # Object detection (basic implementation)
            logger.info("Performing object detection")
            results["objects"] = self._detect_objects(main_image)
            
            # Gemini AI analysis (if available)
            if self.gemini_model:
                logger.info("Performing Gemini AI analysis")
                gemini_analysis = await self._analyze_with_gemini(main_image_url)
                results["gemini_description"] = gemini_analysis.get("description", "")
                results["gemini_tags"] = gemini_analysis.get("tags", [])
            else:
                logger.info("Skipping Gemini analysis - not available")

            logger.info("Image analysis completed successfully")
            return results

        except Exception as e:
            logger.error(f"Image analysis failed: {str(e)}")
            logger.error(traceback.format_exc())
            return self._get_empty_analysis()

    async def _load_image_from_url(self, image_url: str):
        """Load image from Cloudinary URL"""
        try:
            logger.info(f"Downloading image from: {image_url}")
            
            # Validate URL
            if not image_url.startswith(('http://', 'https://')):
                raise ValueError(f"Invalid URL format: {image_url}")
            
            # Download image from URL with timeout
            response = requests.get(image_url, timeout=30)
            response.raise_for_status()
            
            # Check if response contains image data
            if not response.content:
                raise ValueError("Empty response from URL")
            
            # Convert to PIL Image
            try:
                image = Image.open(io.BytesIO(response.content))
            except Exception as e:
                raise ValueError(f"Invalid image data: {str(e)}")
            
            # Convert to OpenCV format
            opencv_image = cv2.cvtColor(np.array(image), cv2.COLOR_RGB2BGR)
            
            logger.info(f"Successfully loaded image: {opencv_image.shape}")
            return opencv_image
            
        except requests.exceptions.RequestException as e:
            logger.error(f"Failed to download image from URL {image_url}: {str(e)}")
            raise HTTPException(status_code=400, detail=f"Failed to download image: {str(e)}")
        except Exception as e:
            logger.error(f"Failed to load image from URL {image_url}: {str(e)}")
            raise HTTPException(status_code=400, detail=f"Failed to process image: {str(e)}")

    def _analyze_colors(self, image) -> List[Dict[str, Any]]:
        """Analyze dominant colors in the image"""
        try:
            # Resize image for faster processing
            small_image = cv2.resize(image, (150, 150))
            
            # Convert to RGB
            rgb_image = cv2.cvtColor(small_image, cv2.COLOR_BGR2RGB)
            
            # Reshape to list of pixels
            pixels = rgb_image.reshape(-1, 3)
            
            # Try using K-means clustering to find dominant colors
            try:
                from sklearn.cluster import KMeans
                kmeans = KMeans(n_clusters=5, random_state=42, n_init=10)
                kmeans.fit(pixels)
                
                colors = []
                labels = kmeans.labels_
                
                for i, center in enumerate(kmeans.cluster_centers_):
                    percentage = np.count_nonzero(labels == i) / len(labels) * 100
                    if percentage > 5:  # Only include colors that make up >5% of image
                        color_name = self._rgb_to_color_name(center)
                        colors.append({
                            "color": color_name,
                            "percentage": round(percentage, 1)
                        })
                
                # Sort by percentage
                colors.sort(key=lambda x: x["percentage"], reverse=True)
                return colors[:3]  # Return top 3 colors
                
            except ImportError:
                logger.warning("scikit-learn not available, using basic color analysis")
                return self._basic_color_analysis(rgb_image)

        except Exception as e:
            logger.error(f"Color analysis failed: {str(e)}")
            return []

    def _basic_color_analysis(self, rgb_image) -> List[Dict[str, Any]]:
        """Basic color analysis without sklearn"""
        try:
            # Calculate average color of the entire image
            avg_color = np.mean(rgb_image.reshape(-1, 3), axis=0)
            primary_color = self._rgb_to_color_name(avg_color)
            
            # Simple analysis: return the dominant color
            return [{
                "color": primary_color,
                "percentage": 100.0
            }]
            
        except Exception as e:
            logger.error(f"Basic color analysis failed: {str(e)}")
            return []

    def _rgb_to_color_name(self, rgb):
        """Convert RGB values to color name"""
        r, g, b = rgb
        
        color_map = {
            'black': (0, 0, 0),
            'white': (255, 255, 255),
            'red': (255, 0, 0),
            'green': (0, 255, 0),
            'blue': (0, 0, 255),
            'yellow': (255, 255, 0),
            'cyan': (0, 255, 255),
            'magenta': (255, 0, 255),
            'brown': (165, 42, 42),
            'orange': (255, 165, 0),
            'pink': (255, 192, 203),
            'purple': (128, 0, 128),
            'gray': (128, 128, 128),
            'silver': (192, 192, 192),
        }
        
        min_distance = float('inf')
        closest_color = 'unknown'
        
        for color_name, color_rgb in color_map.items():
            distance = np.sqrt(sum((a - b) ** 2 for a, b in zip(rgb, color_rgb)))
            if distance < min_distance:
                min_distance = distance
                closest_color = color_name
        
        return closest_color

    def _detect_objects(self, image) -> List[str]:
        """Basic object detection using contours"""
        try:
            # Convert to grayscale
            gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
            
            # Apply Gaussian blur
            blurred = cv2.GaussianBlur(gray, (5, 5), 0)
            
            # Edge detection
            edges = cv2.Canny(blurred, 50, 150)
            
            # Find contours
            contours, _ = cv2.findContours(edges, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
            
            objects = []
            shape_counts = {"rectangular": 0, "circular": 0, "irregular": 0}
            
            for contour in contours:
                area = cv2.contourArea(contour)
                if area > 1000:  # Filter small objects
                    # Basic shape classification
                    approx = cv2.approxPolyDP(contour, 0.02 * cv2.arcLength(contour, True), True)
                    
                    if len(approx) == 4:
                        shape_counts["rectangular"] += 1
                    elif len(approx) > 8:
                        shape_counts["circular"] += 1
                    else:
                        shape_counts["irregular"] += 1
            
            # Convert counts to object descriptions
            for shape, count in shape_counts.items():
                if count > 0:
                    objects.append(f"{shape}_object")
            
            return objects[:5]  # Return max 5 objects

        except Exception as e:
            logger.error(f"Object detection failed: {str(e)}")
            return []

    async def _analyze_with_gemini(self, image_url: str) -> Dict[str, Any]:
        """Analyze image with Gemini AI"""
        try:
            if not self.gemini_model:
                logger.warning("Gemini model not available")
                return {"description": "", "tags": []}

            # Download image for Gemini
            response = requests.get(image_url, timeout=30)
            response.raise_for_status()
            
            # Convert to PIL Image for Gemini
            image = Image.open(io.BytesIO(response.content))
            
            # Prompt for lost & found item analysis
            prompt = """
            Analyze this image of a lost or found item. Provide a detailed analysis including:
            1. What type of item this is
            2. Key identifying features (color, size, condition, brand, etc.)
            3. Any visible text, logos, or distinctive markings
            4. The item's apparent condition and age
            5. Any unique characteristics that would help in identification
            
            Format your response as:
            DESCRIPTION: [detailed description of the item]
            TAGS: [comma-separated keywords: item type, colors, brands, conditions, materials, etc.]
            """
            
            # Generate content with Gemini
            response = self.gemini_model.generate_content([prompt, image])
            
            # Parse response
            description = ""
            tags = []
            
            if response.text:
                lines = response.text.split('\n')
                for line in lines:
                    line = line.strip()
                    if line.startswith('DESCRIPTION:'):
                        description = line.replace('DESCRIPTION:', '').strip()
                    elif line.startswith('TAGS:'):
                        tags_text = line.replace('TAGS:', '').strip()
                        tags = [tag.strip() for tag in tags_text.split(',') if tag.strip()]

            logger.info(f"Gemini analysis completed - Description: {description[:50]}...")
            return {
                "description": description,
                "tags": tags[:10]  # Limit to 10 tags
            }

        except Exception as e:
            logger.error(f"Gemini analysis failed: {str(e)}")
            return {"description": "", "tags": []}

    def _get_empty_analysis(self) -> Dict[str, Any]:
        """Return empty analysis result"""
        return {
            "objects": [],
            "colors": [],
            "gemini_description": "",
            "gemini_tags": []
        }

    async def generate_features(self, image_url: str) -> List[float]:
        """Generate numerical features from image for similarity matching"""
        try:
            image = await self._load_image_from_url(image_url)
            
            # Extract simple features
            features = []
            
            # Color histogram features
            for i in range(3):  # RGB channels
                hist = cv2.calcHist([image], [i], None, [32], [0, 256])
                features.extend(hist.flatten())
            
            # Texture features
            gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
            
            # Simple texture measures
            features.append(np.std(gray))  # Standard deviation
            features.append(np.mean(gray))  # Mean intensity
            
            # Edge density
            edges = cv2.Canny(gray, 50, 150)
            edge_density = np.sum(edges > 0) / (edges.shape[0] * edges.shape[1])
            features.append(edge_density)
            
            # Pad or truncate to exactly 100 features
            if len(features) > 100:
                features = features[:100]
            else:
                features.extend([0.0] * (100 - len(features)))
            
            return features

        except Exception as e:
            logger.error(f"Feature extraction failed: {str(e)}")
            return [0.0] * 100