"""
Dataset Preparation for Food Recognition Model

Downloads Food-101 from Hugging Face, applies augmentations,
and prepares train/validation/test splits.
"""

import os
import json
from datasets import load_dataset
from torchvision import transforms
from PIL import Image
import torch


# ============================================================
# Configuration
# ============================================================

IMAGE_SIZE = 224
DATASET_NAME = "ethz/food101"
OUTPUT_DIR = "./data/food101_prepared"

# Data augmentation for training
train_transforms = transforms.Compose([
    transforms.RandomResizedCrop(IMAGE_SIZE, scale=(0.8, 1.0)),
    transforms.RandomHorizontalFlip(),
    transforms.RandomRotation(15),
    transforms.ColorJitter(brightness=0.2, contrast=0.2, saturation=0.2, hue=0.1),
    transforms.RandomAffine(degrees=0, translate=(0.1, 0.1)),
    transforms.ToTensor(),
    transforms.Normalize(
        mean=[0.485, 0.456, 0.406],
        std=[0.229, 0.224, 0.225]
    ),
])

# Validation/test transforms (no augmentation)
eval_transforms = transforms.Compose([
    transforms.Resize(256),
    transforms.CenterCrop(IMAGE_SIZE),
    transforms.ToTensor(),
    transforms.Normalize(
        mean=[0.485, 0.456, 0.406],
        std=[0.229, 0.224, 0.225]
    ),
])


# ============================================================
# Dataset Loading
# ============================================================

def prepare_dataset():
    """Download and prepare Food-101 dataset."""
    print("📥 Downloading Food-101 dataset from Hugging Face...")
    dataset = load_dataset(DATASET_NAME)

    print(f"\n📊 Dataset info:")
    print(f"  Train samples: {len(dataset['train'])}")
    print(f"  Test samples:  {len(dataset['validation'])}")

    # Get class labels
    class_names = dataset['train'].features['label'].names
    num_classes = len(class_names)
    print(f"  Classes: {num_classes}")
    print(f"  Sample classes: {class_names[:10]}...")

    # Create label mapping
    label_map = {i: name for i, name in enumerate(class_names)}

    # Save class mapping
    os.makedirs(OUTPUT_DIR, exist_ok=True)
    with open(os.path.join(OUTPUT_DIR, "label_map.json"), "w") as f:
        json.dump(label_map, f, indent=2)

    print(f"\n✅ Dataset prepared! Label map saved to {OUTPUT_DIR}/label_map.json")

    # Create nutrition mapping for common foods
    create_nutrition_mapping(class_names)

    return dataset, class_names


def create_nutrition_mapping(class_names):
    """
    Create a mapping from Food-101 class names to nutritional data.
    This is a representative sample — in production, use a proper nutrition API.
    """
    # Average calories per serving for Food-101 classes
    # (approximate values per standard serving)
    nutrition_data = {}

    # Default nutrition (per serving estimate)
    for name in class_names:
        nutrition_data[name] = {
            "name": name.replace("_", " ").title(),
            "calories_per_serving": 250,  # default estimate
            "serving_size": 1,
            "serving_unit": "serving",
            "protein_g": 10,
            "carbs_g": 30,
            "fat_g": 10,
        }

    # Override with known values for common foods
    known_nutrition = {
        "pizza": {"calories_per_serving": 266, "protein_g": 11, "carbs_g": 33, "fat_g": 10, "serving_unit": "slice"},
        "hamburger": {"calories_per_serving": 354, "protein_g": 20, "carbs_g": 29, "fat_g": 17, "serving_unit": "burger"},
        "hot_dog": {"calories_per_serving": 290, "protein_g": 10, "carbs_g": 24, "fat_g": 18, "serving_unit": "hot dog"},
        "french_fries": {"calories_per_serving": 365, "protein_g": 4, "carbs_g": 48, "fat_g": 17, "serving_unit": "medium"},
        "fried_rice": {"calories_per_serving": 328, "protein_g": 7, "carbs_g": 49, "fat_g": 12, "serving_unit": "cup"},
        "sushi": {"calories_per_serving": 200, "protein_g": 9, "carbs_g": 38, "fat_g": 1, "serving_unit": "6 pieces"},
        "steak": {"calories_per_serving": 271, "protein_g": 26, "carbs_g": 0, "fat_g": 18, "serving_unit": "6 oz"},
        "grilled_salmon": {"calories_per_serving": 208, "protein_g": 20, "carbs_g": 0, "fat_g": 13, "serving_unit": "fillet"},
        "caesar_salad": {"calories_per_serving": 180, "protein_g": 7, "carbs_g": 10, "fat_g": 13, "serving_unit": "bowl"},
        "greek_salad": {"calories_per_serving": 150, "protein_g": 5, "carbs_g": 8, "fat_g": 11, "serving_unit": "bowl"},
        "ice_cream": {"calories_per_serving": 207, "protein_g": 3.5, "carbs_g": 24, "fat_g": 11, "serving_unit": "cup"},
        "chocolate_cake": {"calories_per_serving": 352, "protein_g": 5, "carbs_g": 50, "fat_g": 15, "serving_unit": "slice"},
        "pancakes": {"calories_per_serving": 227, "protein_g": 8, "carbs_g": 28, "fat_g": 10, "serving_unit": "3 pancakes"},
        "waffles": {"calories_per_serving": 291, "protein_g": 8, "carbs_g": 33, "fat_g": 15, "serving_unit": "2 waffles"},
        "omelette": {"calories_per_serving": 154, "protein_g": 11, "carbs_g": 1, "fat_g": 12, "serving_unit": "1 omelette"},
        "tacos": {"calories_per_serving": 210, "protein_g": 9, "carbs_g": 21, "fat_g": 10, "serving_unit": "1 taco"},
        "chicken_curry": {"calories_per_serving": 243, "protein_g": 15, "carbs_g": 11, "fat_g": 16, "serving_unit": "cup"},
        "fried_chicken": {"calories_per_serving": 246, "protein_g": 19, "carbs_g": 9, "fat_g": 15, "serving_unit": "piece"},
        "apple_pie": {"calories_per_serving": 296, "protein_g": 2, "carbs_g": 43, "fat_g": 14, "serving_unit": "slice"},
        "donuts": {"calories_per_serving": 289, "protein_g": 5, "carbs_g": 33, "fat_g": 16, "serving_unit": "1 donut"},
    }

    for key, values in known_nutrition.items():
        if key in nutrition_data:
            nutrition_data[key].update(values)

    # Save nutrition mapping
    with open(os.path.join(OUTPUT_DIR, "nutrition_data.json"), "w") as f:
        json.dump(nutrition_data, f, indent=2)

    print(f"✅ Nutrition mapping saved to {OUTPUT_DIR}/nutrition_data.json")


def apply_transforms(examples, transform):
    """Apply image transforms to a batch of examples."""
    examples["pixel_values"] = [
        transform(image.convert("RGB")) for image in examples["image"]
    ]
    return examples


# ============================================================
# Main
# ============================================================

if __name__ == "__main__":
    dataset, class_names = prepare_dataset()

    print("\n🔍 Sample data point:")
    sample = dataset['train'][0]
    print(f"  Label: {class_names[sample['label']]} (index: {sample['label']})")
    print(f"  Image size: {sample['image'].size}")

    print("\n✅ Dataset preparation complete!")
    print(f"   Output directory: {OUTPUT_DIR}")
    print(f"   Files created:")
    print(f"   - label_map.json ({len(class_names)} classes)")
    print(f"   - nutrition_data.json (nutrition info for {len(class_names)} foods)")
    print(f"\n   Next step: Run fine_tune_food_model.py")
