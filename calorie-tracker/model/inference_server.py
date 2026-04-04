"""
FastAPI Inference Server for Food Recognition

Serves the fine-tuned ViT model via a REST API.
Used as the backend for the mobile/web app's scan feature.

Usage:
    uvicorn inference_server:app --host 0.0.0.0 --port 8000

API:
    POST /predict
    Body: { "image": "<base64-encoded-image>" }
    Response: {
        "food_name": "Pizza",
        "confidence": 0.94,
        "calories_per_serving": 266,
        ...
    }
"""

import os
import json
import base64
import io
from contextlib import asynccontextmanager
from typing import Optional

import torch
import numpy as np
from PIL import Image
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from transformers import ViTForImageClassification, ViTImageProcessor
from torchvision import transforms


# ============================================================
# Configuration
# ============================================================

MODEL_DIR = os.getenv("MODEL_DIR", "./trained_model/food101_vit")
NUTRITION_FILE = os.getenv("NUTRITION_FILE", "./data/food101_prepared/nutrition_data.json")
PORT = int(os.getenv("PORT", 8000))
TOP_K = 3  # Number of alternative predictions


# ============================================================
# Global State
# ============================================================

model = None
processor = None
id2label = None
nutrition_data = None
device = None


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Load model on startup."""
    global model, processor, id2label, nutrition_data, device

    print(f"🧠 Loading model from {MODEL_DIR}...")
    device = torch.device("cuda" if torch.cuda.is_available() else "cpu")

    model = ViTForImageClassification.from_pretrained(MODEL_DIR)
    processor = ViTImageProcessor.from_pretrained(MODEL_DIR)
    model.to(device)
    model.eval()

    # Load label mapping
    label_path = os.path.join(MODEL_DIR, "id2label.json")
    if os.path.exists(label_path):
        with open(label_path) as f:
            id2label = {int(k): v for k, v in json.load(f).items()}
    else:
        id2label = model.config.id2label

    # Load nutrition data
    if os.path.exists(NUTRITION_FILE):
        with open(NUTRITION_FILE) as f:
            nutrition_data = json.load(f)
    else:
        nutrition_data = {}

    print(f"  ✅ Model loaded on {device}")
    print(f"  ✅ {len(id2label)} food classes")
    print(f"  ✅ {len(nutrition_data)} nutrition entries")

    yield  # App runs here

    print("👋 Shutting down...")


# ============================================================
# FastAPI App
# ============================================================

app = FastAPI(
    title="Food Recognition API",
    description="AI-powered food recognition and calorie estimation",
    version="1.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ============================================================
# Request / Response Models
# ============================================================

class PredictionRequest(BaseModel):
    image: str  # Base64-encoded image

class AlternativePrediction(BaseModel):
    food_name: str
    confidence: float
    calories_per_serving: float

class PredictionResponse(BaseModel):
    food_name: str
    confidence: float
    calories_per_serving: float
    serving_size: float
    serving_unit: str
    protein_g: float
    carbs_g: float
    fat_g: float
    alternatives: list[AlternativePrediction]


# ============================================================
# Prediction Endpoint
# ============================================================

@app.post("/predict", response_model=PredictionResponse)
async def predict(request: PredictionRequest):
    """Predict food from a base64-encoded image."""
    global model, processor, id2label, nutrition_data, device

    if model is None:
        raise HTTPException(status_code=503, detail="Model not loaded")

    try:
        # Decode image
        image_bytes = base64.b64decode(request.image)
        image = Image.open(io.BytesIO(image_bytes)).convert("RGB")

        # Preprocess
        inputs = processor(images=image, return_tensors="pt").to(device)

        # Predict
        with torch.no_grad():
            outputs = model(**inputs)
            probs = torch.softmax(outputs.logits, dim=-1)

        # Get top-K predictions
        top_probs, top_indices = torch.topk(probs[0], TOP_K)

        results = []
        for prob, idx in zip(top_probs, top_indices):
            label = id2label.get(idx.item(), f"class_{idx.item()}")
            label_key = label.lower().replace(" ", "_")
            nutrition = nutrition_data.get(label_key, {})

            results.append({
                "food_name": label,
                "confidence": round(prob.item(), 4),
                "calories_per_serving": nutrition.get("calories_per_serving", 200),
                "serving_size": nutrition.get("serving_size", 1),
                "serving_unit": nutrition.get("serving_unit", "serving"),
                "protein_g": nutrition.get("protein_g", 10),
                "carbs_g": nutrition.get("carbs_g", 25),
                "fat_g": nutrition.get("fat_g", 8),
            })

        # Primary result
        primary = results[0]
        alternatives = [
            AlternativePrediction(
                food_name=r["food_name"],
                confidence=r["confidence"],
                calories_per_serving=r["calories_per_serving"],
            )
            for r in results[1:]
        ]

        return PredictionResponse(
            food_name=primary["food_name"],
            confidence=primary["confidence"],
            calories_per_serving=primary["calories_per_serving"],
            serving_size=primary["serving_size"],
            serving_unit=primary["serving_unit"],
            protein_g=primary["protein_g"],
            carbs_g=primary["carbs_g"],
            fat_g=primary["fat_g"],
            alternatives=alternatives,
        )

    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Prediction failed: {str(e)}")


@app.get("/health")
async def health():
    """Health check endpoint."""
    return {
        "status": "ok",
        "model_loaded": model is not None,
        "device": str(device) if device else "none",
    }


# ============================================================
# Main
# ============================================================

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=PORT)
