"""
Fine-Tune Vision Transformer (ViT) on Food-101

This script fine-tunes google/vit-base-patch16-224 on the Food-101 dataset
using transfer learning. It freezes early transformer layers and fine-tunes
the classification head + last 2 encoder blocks.

Usage:
    python fine_tune_food_model.py

Requirements:
    - GPU with 8GB+ VRAM (or Google Colab with GPU)
    - ~4GB disk space for model + dataset
"""

import os
import json
import torch
import numpy as np
from datetime import datetime
from datasets import load_dataset
from transformers import (
    ViTForImageClassification,
    ViTImageProcessor,
    TrainingArguments,
    Trainer,
)
from torchvision import transforms
import evaluate


# ============================================================
# Configuration
# ============================================================

MODEL_NAME = "google/vit-base-patch16-224"
DATASET_NAME = "ethz/food101"
OUTPUT_DIR = "./checkpoints/food101_vit"
FINAL_MODEL_DIR = "./trained_model/food101_vit"

# Training hyperparameters
NUM_EPOCHS = 5
BATCH_SIZE = 32           # Reduce to 16 if GPU OOM
LEARNING_RATE = 2e-5
WEIGHT_DECAY = 0.01
WARMUP_RATIO = 0.1
FP16 = True               # Mixed precision training

# Freeze strategy
FREEZE_LAYERS = True
UNFREEZE_LAST_N_BLOCKS = 2  # Fine-tune last N transformer blocks


# ============================================================
# Dataset Setup
# ============================================================

def setup_dataset():
    """Load and preprocess Food-101 dataset."""
    print("📥 Loading Food-101 dataset...")
    dataset = load_dataset(DATASET_NAME)

    # Get class info
    class_names = dataset['train'].features['label'].names
    num_classes = len(class_names)
    id2label = {i: name.replace("_", " ").title() for i, name in enumerate(class_names)}
    label2id = {v: k for k, v in id2label.items()}

    print(f"  ✅ {len(dataset['train'])} train / {len(dataset['validation'])} test images")
    print(f"  ✅ {num_classes} food classes")

    return dataset, id2label, label2id, num_classes


def get_transforms(processor):
    """Create preprocessing transforms using the ViT processor."""
    # Training transforms with augmentation
    train_transforms = transforms.Compose([
        transforms.RandomResizedCrop(processor.size['height'], scale=(0.75, 1.0)),
        transforms.RandomHorizontalFlip(),
        transforms.RandomRotation(15),
        transforms.ColorJitter(brightness=0.3, contrast=0.3, saturation=0.3, hue=0.1),
        transforms.RandomAffine(degrees=0, translate=(0.1, 0.1), shear=5),
        transforms.RandomGrayscale(p=0.05),
    ])

    eval_transforms = transforms.Compose([
        transforms.Resize(processor.size['height'] + 32),
        transforms.CenterCrop(processor.size['height']),
    ])

    def preprocess_train(examples):
        images = [train_transforms(img.convert("RGB")) for img in examples["image"]]
        inputs = processor(images=images, return_tensors="pt")
        inputs["labels"] = examples["label"]
        return inputs

    def preprocess_eval(examples):
        images = [eval_transforms(img.convert("RGB")) for img in examples["image"]]
        inputs = processor(images=images, return_tensors="pt")
        inputs["labels"] = examples["label"]
        return inputs

    return preprocess_train, preprocess_eval


# ============================================================
# Model Setup
# ============================================================

def setup_model(num_classes, id2label, label2id):
    """Load and configure ViT model for fine-tuning."""
    print(f"\n🧠 Loading {MODEL_NAME}...")

    model = ViTForImageClassification.from_pretrained(
        MODEL_NAME,
        num_labels=num_classes,
        id2label=id2label,
        label2id=label2id,
        ignore_mismatched_sizes=True,  # New classifier head
    )

    if FREEZE_LAYERS:
        # Freeze embeddings
        for param in model.vit.embeddings.parameters():
            param.requires_grad = False

        # Freeze all encoder blocks except the last N
        total_blocks = len(model.vit.encoder.layer)
        freeze_until = total_blocks - UNFREEZE_LAST_N_BLOCKS

        for i, layer in enumerate(model.vit.encoder.layer):
            if i < freeze_until:
                for param in layer.parameters():
                    param.requires_grad = False

        # Count trainable parameters
        trainable = sum(p.numel() for p in model.parameters() if p.requires_grad)
        total = sum(p.numel() for p in model.parameters())
        print(f"  ✅ Frozen {freeze_until}/{total_blocks} encoder blocks")
        print(f"  ✅ Trainable parameters: {trainable:,} / {total:,} ({100*trainable/total:.1f}%)")
    else:
        total = sum(p.numel() for p in model.parameters())
        print(f"  ✅ All parameters trainable: {total:,}")

    return model


# ============================================================
# Metrics
# ============================================================

accuracy_metric = evaluate.load("accuracy")

def compute_metrics(eval_pred):
    predictions, labels = eval_pred
    predictions = np.argmax(predictions, axis=-1)
    return accuracy_metric.compute(predictions=predictions, references=labels)


# ============================================================
# Training
# ============================================================

def train():
    """Main training loop."""
    start_time = datetime.now()
    print(f"\n🚀 Starting food recognition model training at {start_time.strftime('%H:%M:%S')}")
    print("=" * 60)

    # 1. Setup dataset
    dataset, id2label, label2id, num_classes = setup_dataset()

    # 2. Setup processor and transforms
    processor = ViTImageProcessor.from_pretrained(MODEL_NAME)
    preprocess_train, preprocess_eval = get_transforms(processor)

    # 3. Preprocess dataset
    print("\n📦 Preprocessing dataset...")
    train_dataset = dataset['train'].with_transform(preprocess_train)
    eval_dataset = dataset['validation'].with_transform(preprocess_eval)

    # 4. Setup model
    model = setup_model(num_classes, id2label, label2id)

    # 5. Training arguments
    training_args = TrainingArguments(
        output_dir=OUTPUT_DIR,
        num_train_epochs=NUM_EPOCHS,
        per_device_train_batch_size=BATCH_SIZE,
        per_device_eval_batch_size=BATCH_SIZE * 2,
        learning_rate=LEARNING_RATE,
        weight_decay=WEIGHT_DECAY,
        warmup_ratio=WARMUP_RATIO,
        lr_scheduler_type="cosine",
        evaluation_strategy="epoch",
        save_strategy="epoch",
        load_best_model_at_end=True,
        metric_for_best_model="accuracy",
        greater_is_better=True,
        fp16=FP16 and torch.cuda.is_available(),
        logging_steps=100,
        report_to="none",
        remove_unused_columns=False,
        dataloader_num_workers=4,
        save_total_limit=2,
        push_to_hub=False,
    )

    # 6. Create Trainer
    trainer = Trainer(
        model=model,
        args=training_args,
        train_dataset=train_dataset,
        eval_dataset=eval_dataset,
        compute_metrics=compute_metrics,
    )

    # 7. Train!
    print(f"\n🏋️ Training for {NUM_EPOCHS} epochs...")
    print(f"  Batch size: {BATCH_SIZE}")
    print(f"  Learning rate: {LEARNING_RATE}")
    print(f"  Device: {'CUDA' if torch.cuda.is_available() else 'CPU'}")
    if torch.cuda.is_available():
        print(f"  GPU: {torch.cuda.get_device_name(0)}")
        print(f"  GPU Memory: {torch.cuda.get_device_properties(0).total_mem / 1e9:.1f} GB")

    train_result = trainer.train()

    # 8. Save final model
    print(f"\n💾 Saving model to {FINAL_MODEL_DIR}...")
    trainer.save_model(FINAL_MODEL_DIR)
    processor.save_pretrained(FINAL_MODEL_DIR)

    # Save class mapping
    with open(os.path.join(FINAL_MODEL_DIR, "id2label.json"), "w") as f:
        json.dump(id2label, f, indent=2)

    # 9. Final evaluation
    print("\n📊 Final evaluation on test set...")
    eval_results = trainer.evaluate()

    end_time = datetime.now()
    duration = end_time - start_time

    print("\n" + "=" * 60)
    print("🎉 Training Complete!")
    print(f"  Duration: {duration}")
    print(f"  Final accuracy: {eval_results.get('eval_accuracy', 0):.4f}")
    print(f"  Final loss: {eval_results.get('eval_loss', 0):.4f}")
    print(f"  Model saved to: {FINAL_MODEL_DIR}")
    print("=" * 60)

    return trainer, eval_results


# ============================================================
# Main
# ============================================================

if __name__ == "__main__":
    # Check GPU availability
    if torch.cuda.is_available():
        print(f"✅ CUDA available: {torch.cuda.get_device_name(0)}")
    else:
        print("⚠️ No GPU detected. Training will be slow on CPU.")
        print("   Consider using Google Colab with GPU runtime.")
        response = input("   Continue anyway? (y/n): ")
        if response.lower() != 'y':
            exit(0)

    trainer, results = train()
