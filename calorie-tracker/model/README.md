# Vision Model Fine-Tuning for Food Recognition

This directory contains the complete pipeline for fine-tuning a Vision Transformer (ViT) model on the Food-101 dataset for food recognition and calorie estimation.

## Architecture

- **Base Model**: `google/vit-base-patch16-224` (Vision Transformer pre-trained on ImageNet-21k)
- **Dataset**: [Food-101](https://huggingface.co/datasets/ethz/food101) — 101,000 images across 101 food categories
- **Framework**: PyTorch + Hugging Face Transformers
- **Target**: >90% top-1 accuracy on Food-101 test set

## Setup

### Prerequisites
- Python 3.9+
- CUDA-capable GPU (8GB+ VRAM recommended)
- Or use Google Colab with GPU runtime

### Install Dependencies
```bash
pip install -r requirements.txt
```

## Training Pipeline

### Step 1: Prepare Dataset
```bash
python prepare_dataset.py
```
This downloads Food-101, applies augmentations, and creates train/val/test splits.

### Step 2: Fine-Tune the Model
```bash
python fine_tune_food_model.py
```
This fine-tunes the ViT model with transfer learning. Training takes approximately:
- **GPU (RTX 3080/4080)**: ~2-3 hours
- **Google Colab (T4)**: ~4-5 hours
- **Google Colab Pro (A100)**: ~1 hour

### Step 3: Evaluate
```bash
python evaluate_model.py
```
Reports accuracy, precision, recall, and confusion matrix.

### Step 4: Export for Deployment
```bash
python export_model.py
```
Exports the model to ONNX format and pushes to Hugging Face Hub.

## Deployment Options

1. **Hugging Face Inference Endpoint** (Recommended)
   - Push model to HF Hub → Create serverless endpoint
   - Automatic scaling, pay per request

2. **Supabase Edge Function**
   - Call HF Inference API from a Supabase Edge Function
   - See `supabase/functions/recognize-food/`

3. **Custom FastAPI Server**
   - Self-hosted endpoint using the exported model
   - Maximum control & customization

## File Structure
```
model/
├── README.md               ← You are here
├── requirements.txt        ← Python dependencies
├── prepare_dataset.py      ← Dataset download & augmentation
├── fine_tune_food_model.py ← Main training script
├── evaluate_model.py       ← Evaluation & metrics
├── export_model.py         ← Export to ONNX / HF Hub
├── food_classes.json       ← Food-101 class labels + nutrition data
└── inference_server.py     ← Simple FastAPI inference endpoint
```
