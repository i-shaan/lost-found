# import numpy as np
# import requests
# from PIL import Image
# import torch
# import torchvision.transforms as transforms
# from torchvision.models import resnet50
# import io
# import cv2
# import google.generativeai as genai
# from sklearn.cluster import KMeans
# import webcolors
# from typing import Dict, List, Optional
# import asyncio
# import aiohttp
# import base64
# import os
# from ultralytics import YOLO
# import logging

# # Configure logging
# logging.basicConfig(level=logging.INFO)
# logger = logging.getLogger(__name__)

# class ImageAnalyzer:
#     def __init__(self, gemini_api_key: Optional[str] = None):
#         """
#         Initialize the ImageAnalyzer with Gemini API and computer vision models.
        
#         Args:
#             gemini_api_key (str): Your Gemini API key (will use env var if not provided)
#         """
#         # Configure Gemini API
#         api_key = gemini_api_key or os.getenv('GEMINI_API_KEY')
#         if not api_key:
#             logger.warning("GEMINI_API_KEY not found. Gemini analysis will be disabled.")
#             self.gemini_model = None
#         else:
#             try:
#                 genai.configure(api_key=api_key)
#                 self.gemini_model = genai.GenerativeModel('gemini-1.5-flash')
#                 logger.info("Gemini API configured successfully")
#             except Exception as e:
#                 logger.error(f"Failed to configure Gemini API: {e}")
#                 self.gemini_model = None
        
#         # Load pre-trained ResNet model for feature extraction
#         try:
#             self.resnet_model = resnet50(weights='IMAGENET1K_V1')
#             self.resnet_model.eval()
            
#             # Remove the final classification layer for feature extraction
#             self.feature_extractor = torch.nn.Sequential(*list(self.resnet_model.children())[:-1])
#             logger.info("ResNet model loaded successfully")
#         except Exception as e:
#             logger.error(f"Failed to load ResNet model: {e}")
#             self.resnet_model = None
#             self.feature_extractor = None
        
#         # Load YOLO model for object detection
#         try:
#             # Try to load YOLO model, fallback to smaller version if needed
#             model_path = 'yolov8n.pt'  # Nano version for faster inference
#             self.yolo_model = YOLO(model_path)
#             logger.info("YOLO model loaded successfully")
#         except Exception as e:
#             logger.warning(f"YOLO model not available: {e}. Using fallback object detection.")
#             self.yolo_model = None
        
#         # Image preprocessing transforms
#         self.transform = transforms.Compose([
#             transforms.Resize((224, 224)),
#             transforms.ToTensor(),
#             transforms.Normalize(mean=[0.485, 0.456, 0.406], 
#                                std=[0.229, 0.224, 0.225])
#         ])
        
#         # Color clustering parameters
#         self.n_colors = 5
        
#     async def analyze(self, image_url: str) -> Dict:
#         """
#         Comprehensive image analysis using multiple AI models.
        
#         Args:
#             image_url (str): Cloudinary URL of the image
            
#         Returns:
#             Dict: Analysis results including features, objects, colors, and descriptions
#         """
#         try:
#             logger.info(f"Starting analysis for image: {image_url}")
            
#             # Download and preprocess image
#             image_pil, image_cv = await self._download_and_preprocess_image(image_url)
            
#             # Run all analysis tasks concurrently
#             analysis_tasks = []
            
#             # Always try to extract features and colors
#             analysis_tasks.extend([
#                 self._extract_features(image_pil),
#                 self._extract_dominant_colors(image_pil),
#                 self._extract_image_metadata(image_pil)
#             ])
            
#             # Add object detection task
#             if self.yolo_model:
#                 analysis_tasks.append(self._detect_objects_yolo(image_cv))
#             elif self.gemini_model:
#                 analysis_tasks.append(self._detect_objects_gemini(image_url))
#             else:
#                 analysis_tasks.append(self._detect_objects_fallback(image_pil))
            
#             # Add Gemini analysis if available
#             if self.gemini_model:
#                 analysis_tasks.append(self._analyze_with_gemini(image_url))
#             else:
#                 analysis_tasks.append(self._create_fallback_gemini_analysis())
            
#             results = await asyncio.gather(*analysis_tasks, return_exceptions=True)
            
#             # Process results safely
#             features = results[0] if not isinstance(results[0], Exception) else []
#             colors = results[1] if not isinstance(results[1], Exception) else []
#             metadata = results[2] if not isinstance(results[2], Exception) else {}
#             objects = results[3] if not isinstance(results[3], Exception) else []
#             gemini_analysis = results[4] if not isinstance(results[4], Exception) else {}
            
#             # Combine all analysis results
#             analysis_result = {
#                 "features": features,
#                 "objects": objects,
#                 "colors": colors,
#                 "gemini_description": gemini_analysis.get("description", ""),
#                 "gemini_tags": gemini_analysis.get("tags", []),
#                 "metadata": metadata,
#                 "confidence": self._calculate_confidence(objects, colors, gemini_analysis),
#                 "analysis_timestamp": str(np.datetime64('now')),
#                 "models_used": self._get_models_used()
#             }
            
#             logger.info("Image analysis completed successfully")
#             return analysis_result
            
#         except Exception as e:
#             logger.error(f"Image analysis failed: {str(e)}")
#             # Return a fallback result instead of raising exception
#             return {
#                 "features": [],
#                 "objects": ["unknown"],
#                 "colors": ["gray"],
#                 "gemini_description": f"Analysis failed: {str(e)}",
#                 "gemini_tags": ["error"],
#                 "metadata": {},
#                 "confidence": 0.1,
#                 "analysis_timestamp": str(np.datetime64('now')),
#                 "models_used": self._get_models_used(),
#                 "error": str(e)
#             }

#     async def _download_and_preprocess_image(self, image_url: str) -> tuple:
#         """Download and preprocess image for analysis."""
#         try:
#             async with aiohttp.ClientSession(timeout=aiohttp.ClientTimeout(total=30)) as session:
#                 async with session.get(image_url) as response:
#                     if response.status != 200:
#                         raise Exception(f"Failed to download image: HTTP {response.status}")
                    
#                     image_data = await response.read()
                    
#                     # Create PIL Image
#                     image_pil = Image.open(io.BytesIO(image_data)).convert('RGB')
                    
#                     # Create OpenCV image
#                     image_array = np.array(image_pil)
#                     image_cv = cv2.cvtColor(image_array, cv2.COLOR_RGB2BGR)
                    
#                     return image_pil, image_cv
#         except Exception as e:
#             logger.error(f"Failed to download image: {e}")
#             raise

#     async def _extract_features(self, image: Image.Image) -> List[float]:
#         """Extract deep features using ResNet."""
#         if not self.feature_extractor:
#             logger.warning("ResNet feature extractor not available")
#             return []
        
#         try:
#             # Preprocess image
#             input_tensor = self.transform(image).unsqueeze(0)
            
#             # Extract features
#             with torch.no_grad():
#                 features = self.feature_extractor(input_tensor)
#                 features = features.squeeze().numpy()
                
#                 # Reduce dimensionality for storage efficiency
#                 features_reduced = features[:100].tolist()  # Take first 100 features
                
#             return features_reduced
#         except Exception as e:
#             logger.error(f"Feature extraction failed: {e}")
#             return []

#     async def _detect_objects_yolo(self, image_cv: np.ndarray) -> List[str]:
#         """Detect objects using YOLO model."""
#         try:
#             results = self.yolo_model(image_cv, verbose=False)
            
#             objects = []
#             for result in results:
#                 for box in result.boxes:
#                     class_id = int(box.cls)
#                     class_name = result.names[class_id]
#                     confidence = float(box.conf)
                    
#                     if confidence > 0.5:  # Confidence threshold
#                         objects.append(class_name)
            
#             # Remove duplicates and return top objects
#             unique_objects = list(set(objects))
#             return unique_objects[:10]  # Return top 10 objects
            
#         except Exception as e:
#             logger.error(f"YOLO object detection failed: {e}")
#             return []

#     async def _detect_objects_gemini(self, image_url: str) -> List[str]:
#         """Detect objects using Gemini Vision API as fallback."""
#         try:
#             # Download image for Gemini
#             async with aiohttp.ClientSession(timeout=aiohttp.ClientTimeout(total=30)) as session:
#                 async with session.get(image_url) as response:
#                     image_data = await response.read()
            
#             # Convert to base64 for Gemini
#             image_base64 = base64.b64encode(image_data).decode('utf-8')
            
#             prompt = """
#             Analyze this image and identify all objects, items, and things visible in the image.
#             Return only a comma-separated list of object names, no descriptions or explanations.
#             Focus on concrete, identifiable objects.
#             Example: chair, table, laptop, book, cup, plant
#             """
            
#             response = await asyncio.to_thread(
#                 self.gemini_model.generate_content,
#                 [prompt, {"mime_type": "image/jpeg", "data": image_base64}]
#             )
            
#             if response.text:
#                 objects = [obj.strip().lower() for obj in response.text.split(',') if obj.strip()]
#                 return objects[:15]  # Return top 15 objects
            
#             return []
            
#         except Exception as e:
#             logger.error(f"Gemini object detection failed: {e}")
#             return []

#     async def _detect_objects_fallback(self, image: Image.Image) -> List[str]:
#         """Fallback object detection using simple image analysis."""
#         try:
#             # Basic analysis based on image properties
#             width, height = image.size
#             aspect_ratio = width / height
            
#             objects = []
            
#             # Basic shape detection
#             if aspect_ratio > 2:
#                 objects.append("rectangular")
#             elif aspect_ratio < 0.5:
#                 objects.append("vertical")
#             else:
#                 objects.append("square")
            
#             # Basic color analysis for object hints
#             colors = await self._extract_dominant_colors(image)
#             if "black" in colors or "gray" in colors:
#                 objects.extend(["electronic", "device"])
#             if "brown" in colors:
#                 objects.extend(["wooden", "leather"])
#             if "metal" in colors or "silver" in colors:
#                 objects.extend(["metal", "jewelry"])
            
#             return objects[:5]
            
#         except Exception as e:
#             logger.error(f"Fallback object detection failed: {e}")
#             return ["unknown"]

#     async def _extract_dominant_colors(self, image: Image.Image) -> List[str]:
#         """Extract dominant colors using K-means clustering."""
#         try:
#             # Convert to numpy array and reshape
#             img_array = np.array(image)
            
#             # Resize image for faster processing
#             if img_array.shape[0] > 300 or img_array.shape[1] > 300:
#                 image_resized = image.resize((300, 300))
#                 img_array = np.array(image_resized)
            
#             pixels = img_array.reshape(-1, 3)
            
#             # Use k-means to find dominant colors
#             kmeans = KMeans(n_clusters=min(self.n_colors, len(pixels)), random_state=42, n_init=10)
#             kmeans.fit(pixels)
            
#             colors = []
#             for center in kmeans.cluster_centers_:
#                 color_name = self._rgb_to_color_name(center.astype(int))
#                 colors.append(color_name)
            
#             # Remove duplicates while preserving order
#             unique_colors = []
#             for color in colors:
#                 if color not in unique_colors:
#                     unique_colors.append(color)
            
#             return unique_colors
            
#         except Exception as e:
#             logger.error(f"Color extraction failed: {e}")
#             return ["unknown"]

#     async def _analyze_with_gemini(self, image_url: str) -> Dict:
#         """Get comprehensive analysis from Gemini Vision API."""
#         try:
#             # Download image for Gemini
#             async with aiohttp.ClientSession(timeout=aiohttp.ClientTimeout(total=30)) as session:
#                 async with session.get(image_url) as response:
#                     image_data = await response.read()
            
#             # Convert to base64 for Gemini
#             image_base64 = base64.b64encode(image_data).decode('utf-8')
            
#             prompt = """
#             Analyze this image comprehensively and provide:
#             1. A very very detailed description of what you see - describe every minute minute detail you observe
#             2. A list of relevant tags/keywords for categorization
            
#             Format your response as:
#             DESCRIPTION: [your description here]
#             TAGS: [comma-separated tags]
            
#             Focus on objects, colors, style, setting, and any notable features.
#             """
            
#             response = await asyncio.to_thread(
#                 self.gemini_model.generate_content,
#                 [prompt, {"mime_type": "image/jpeg", "data": image_base64}]
#             )
            
#             if response.text:
#                 lines = response.text.strip().split('\n')
#                 description = ""
#                 tags = []
                
#                 for line in lines:
#                     if line.startswith('DESCRIPTION:'):
#                         description = line.replace('DESCRIPTION:', '').strip()
#                     elif line.startswith('TAGS:'):
#                         tags_text = line.replace('TAGS:', '').strip()
#                         tags = [tag.strip().lower() for tag in tags_text.split(',') if tag.strip()]
                
#                 return {
#                     "description": description,
#                     "tags": tags
#                 }
            
#             return {"description": "", "tags": []}
            
#         except Exception as e:
#             logger.error(f"Gemini analysis failed: {e}")
#             return {"description": "", "tags": []}

#     async def _create_fallback_gemini_analysis(self) -> Dict:
#         """Create fallback analysis when Gemini is not available."""
#         return {
#             "description": "Gemini analysis not available",
#             "tags": ["unprocessed"]
#         }

#     async def _extract_image_metadata(self, image: Image.Image) -> Dict:
#         """Extract basic image metadata."""
#         try:
#             metadata = {
#                 "width": image.width,
#                 "height": image.height,
#                 "mode": image.mode,
#                 "format": getattr(image, 'format', 'Unknown'),
#                 "has_transparency": image.mode in ('RGBA', 'LA') or 'transparency' in image.info
#             }
            
#             # Calculate aspect ratio
#             if image.height > 0:
#                 metadata["aspect_ratio"] = round(image.width / image.height, 2)
            
#             return metadata
            
#         except Exception as e:
#             logger.error(f"Metadata extraction failed: {e}")
#             return {}

#     def _rgb_to_color_name(self, rgb: np.ndarray) -> str:
#         """Convert RGB values to color names."""
#         try:
#             # Try to get exact color name
#             color_name = webcolors.rgb_to_name((int(rgb[0]), int(rgb[1]), int(rgb[2])))
#             return color_name.lower()
#         except ValueError:
#             # If exact match not found, find closest color
#             r, g, b = rgb
            
#             # Define color ranges
#             if r > 200 and g > 200 and b > 200:
#                 return "white"
#             elif r < 50 and g < 50 and b < 50:
#                 return "black"
#             elif r > 150 and g < 100 and b < 100:
#                 return "red"
#             elif r < 100 and g > 150 and b < 100:
#                 return "green"
#             elif r < 100 and g < 100 and b > 150:
#                 return "blue"
#             elif r > 150 and g > 150 and b < 100:
#                 return "yellow"
#             elif r > 150 and g < 100 and b > 150:
#                 return "purple"
#             elif r < 100 and g > 150 and b > 150:
#                 return "cyan"
#             elif r > 150 and g > 100 and b < 100:
#                 return "orange"
#             elif r > 100 and g > 100 and b > 100:
#                 return "gray"
#             else:
#                 return "brown"

#     def _calculate_confidence(self, objects: List, colors: List, gemini_analysis: Dict) -> float:
#         """Calculate overall confidence score based on analysis results."""
#         confidence = 0.0
        
#         # Base confidence from successful operations
#         if objects and len(objects) > 0:
#             confidence += 0.3
#         if colors and len(colors) > 0:
#             confidence += 0.2
#         if gemini_analysis.get("description"):
#             confidence += 0.3
#         if gemini_analysis.get("tags"):
#             confidence += 0.2
        
#         # Bonus for rich analysis
#         if len(objects) > 5:
#             confidence += 0.1
#         if len(colors) > 3:
#             confidence += 0.05
#         if len(gemini_analysis.get("tags", [])) > 5:
#             confidence += 0.05
        
#         return min(confidence, 1.0)

#     def _get_models_used(self) -> Dict[str, bool]:

#         """Get information about which models are being used."""
#         return {
#             "resnet": self.resnet_model is not None,
#             "yolo": self.yolo_model is not None,
#             "gemini": self.gemini_model is not None
#         }


import cv2
import numpy as np
from PIL import Image
import google.generativeai as genai
import io
import base64
from typing import List, Dict, Any
import os
from utils.logger import logger

class ImageAnalyzer:
    def __init__(self):
        self.gemini_model = None
        self.ready = False

    async def initialize(self):
        try:
            # Initialize Gemini AI
            genai.configure(api_key=os.getenv("GEMINI_API_KEY"))
            self.gemini_model = genai.GenerativeModel('gemini-1.5-flash')
            
            self.ready = True
            logger.info("Image analyzer initialized successfully")
            
        except Exception as e:
            logger.error(f"Failed to initialize image analyzer: {str(e)}")
            # Don't raise exception - allow service to work without Gemini
            self.ready = True

    def is_ready(self) -> bool:
        return self.ready

    async def analyze(self, images) -> Dict[str, Any]:
        if not images:
            return self._get_empty_analysis()

        results = {
            "objects": [],
            "colors": [],
            "gemini_description": "",
            "gemini_tags": []
        }

        try:
            # Process first image (main analysis)
            main_image = await self._load_image(images[0])
            
            # Color analysis
            results["colors"] = self._analyze_colors(main_image)
            
            # Object detection (basic implementation)
            results["objects"] = self._detect_objects(main_image)
            
            # Gemini AI analysis (if available)
            if self.gemini_model:
                gemini_analysis = await self._analyze_with_gemini(images[0])
                results["gemini_description"] = gemini_analysis.get("description", "")
                results["gemini_tags"] = gemini_analysis.get("tags", [])

            return results

        except Exception as e:
            logger.error(f"Image analysis failed: {str(e)}")
            return self._get_empty_analysis()

    async def _load_image(self, image_file):
        # Read image from uploaded file
        contents = await image_file.read()
        image = Image.open(io.BytesIO(contents))
        
        # Convert to OpenCV format
        opencv_image = cv2.cvtColor(np.array(image), cv2.COLOR_RGB2BGR)
        return opencv_image

    def _analyze_colors(self, image) -> List[Dict[str, Any]]:
        try:
            # Resize image for faster processing
            small_image = cv2.resize(image, (150, 150))
            
            # Convert to RGB
            rgb_image = cv2.cvtColor(small_image, cv2.COLOR_BGR2RGB)
            
            # Reshape to list of pixels
            pixels = rgb_image.reshape(-1, 3)
            
            # Use K-means clustering to find dominant colors
            from sklearn.cluster import KMeans
            
            kmeans = KMeans(n_clusters=5, random_state=42, n_init=10)
            kmeans.fit(pixels)
            
            colors = []
            labels = kmeans.labels_
            
            for i, center in enumerate(kmeans.cluster_centers_):
                percentage = np.count_nonzero(labels == i) / len(labels) * 100
                color_name = self._rgb_to_color_name(center)
                
                colors.append({
                    "color": color_name,
                    "percentage": round(percentage, 1)
                })
            
            # Sort by percentage
            colors.sort(key=lambda x: x["percentage"], reverse=True)
            return colors[:3]  # Return top 3 colors

        except Exception as e:
            logger.error(f"Color analysis failed: {str(e)}")
            return []

    def _rgb_to_color_name(self, rgb):
        # Simple color name mapping
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
        try:
            # Basic object detection using contours
            gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
            blurred = cv2.GaussianBlur(gray, (5, 5), 0)
            edges = cv2.Canny(blurred, 50, 150)
            
            contours, _ = cv2.findContours(edges, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
            
            objects = []
            for contour in contours:
                area = cv2.contourArea(contour)
                if area > 1000:  # Filter small objects
                    # Basic shape classification
                    approx = cv2.approxPolyDP(contour, 0.02 * cv2.arcLength(contour, True), True)
                    
                    if len(approx) == 4:
                        objects.append("rectangular_object")
                    elif len(approx) > 8:
                        objects.append("circular_object")
                    else:
                        objects.append("irregular_object")
            
            return list(set(objects))[:5]  # Return unique objects, max 5

        except Exception as e:
            logger.error(f"Object detection failed: {str(e)}")
            return []

    async def _analyze_with_gemini(self, image_file) -> Dict[str, Any]:
        try:
            if not self.gemini_model:
                return {"description": "", "tags": []}

            # Reset file pointer
            await image_file.seek(0)
            contents = await image_file.read()
            
            # Convert to PIL Image for Gemini
            image = Image.open(io.BytesIO(contents))
            
            # Prompt for analysis
            prompt = """
            Analyze this image of a lost or found item. Provide:
            1. A detailed description of the item
            2. Key identifying features
            3. Color, size, condition details
            4. Any visible text, logos, or brands
            
            Format your response as:
            DESCRIPTION: [detailed description]
            TAGS: [comma-separated key features and identifying details]
            """
            
            response = self.gemini_model.generate_content([prompt, image])
            
            # Parse response
            description = ""
            tags = []
            
            if response.text:
                lines = response.text.split('\n')
                for line in lines:
                    if line.startswith('DESCRIPTION:'):
                        description = line.replace('DESCRIPTION:', '').strip()
                    elif line.startswith('TAGS:'):
                        tags_text = line.replace('TAGS:', '').strip()
                        tags = [tag.strip() for tag in tags_text.split(',') if tag.strip()]

            return {
                "description": description,
                "tags": tags[:10]  # Limit to 10 tags
            }

        except Exception as e:
            logger.error(f"Gemini analysis failed: {str(e)}")
            return {"description": "", "tags": []}

    def _get_empty_analysis(self) -> Dict[str, Any]:
        return {
            "objects": [],
            "colors": [],
            "gemini_description": "",
            "gemini_tags": []
        }

    async def generate_features(self, image_file) -> List[float]:
        try:
            image = await self._load_image(image_file)
            
            # Extract simple features (can be enhanced with deep learning)
            features = []
            
            # Color histogram features
            for i in range(3):  # RGB channels
                hist = cv2.calcHist([image], [i], None, [32], [0, 256])
                features.extend(hist.flatten())
            
            # Texture features using Gabor filters
            gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
            
            # Simple texture measures
            features.append(np.std(gray))  # Standard deviation
            features.append(np.mean(gray))  # Mean intensity
            
            # Pad or truncate to exactly 100 features
            if len(features) > 100:
                features = features[:100]
            else:
                features.extend([0.0] * (100 - len(features)))
            
            return features

        except Exception as e:
            logger.error(f"Feature extraction failed: {str(e)}")
            return [0.0] * 100