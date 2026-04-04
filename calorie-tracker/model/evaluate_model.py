"""
Evaluate Fine-Tuned Food Recognition Model

Runs comprehensive evaluation including:
- Top-1 and Top-5 accuracy
- Per-class precision/recall/F1
- Confusion matrix visualization
- Error analysis (most confused pairs)
"""

import os
import json
import torch
import numpy as np
import matplotlib.pyplot as plt
import seaborn as sns
from datasets import load_dataset
from transformers import ViTForImageClassification, ViTImageProcessor
from torchvision import transforms
from sklearn.metrics import (
    classification_report,
    confusion_matrix,
    top_k_accuracy_score,
)
from tqdm import tqdm


# ============================================================
# Configuration
# ============================================================

MODEL_DIR = "./trained_model/food101_vit"
DATASET_NAME = "ethz/food101"
RESULTS_DIR = "./evaluation_results"
BATCH_SIZE = 64


# ============================================================
# Evaluation
# ============================================================

def evaluate_model():
    """Run full evaluation pipeline."""
    os.makedirs(RESULTS_DIR, exist_ok=True)

    # Load model and processor
    print("📥 Loading fine-tuned model...")
    model = ViTForImageClassification.from_pretrained(MODEL_DIR)
    processor = ViTImageProcessor.from_pretrained(MODEL_DIR)
    model.eval()

    device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
    model.to(device)
    print(f"  Device: {device}")

    # Load id2label
    with open(os.path.join(MODEL_DIR, "id2label.json"), "r") as f:
        id2label = json.load(f)
    id2label = {int(k): v for k, v in id2label.items()}

    # Load test dataset
    print("📥 Loading test dataset...")
    dataset = load_dataset(DATASET_NAME, split="validation")
    class_names = dataset.features['label'].names

    # Evaluation transforms
    eval_transforms = transforms.Compose([
        transforms.Resize(processor.size['height'] + 32),
        transforms.CenterCrop(processor.size['height']),
    ])

    # Run inference
    print(f"\n🔍 Evaluating on {len(dataset)} test images...")
    all_preds = []
    all_labels = []
    all_probs = []

    with torch.no_grad():
        for i in tqdm(range(0, len(dataset), BATCH_SIZE)):
            batch = dataset[i:i+BATCH_SIZE]
            images = [eval_transforms(img.convert("RGB")) for img in batch["image"]]
            inputs = processor(images=images, return_tensors="pt").to(device)

            outputs = model(**inputs)
            probs = torch.softmax(outputs.logits, dim=-1)
            preds = torch.argmax(probs, dim=-1)

            all_preds.extend(preds.cpu().numpy())
            all_labels.extend(batch["label"])
            all_probs.extend(probs.cpu().numpy())

    all_preds = np.array(all_preds)
    all_labels = np.array(all_labels)
    all_probs = np.array(all_probs)

    # ---- Metrics ----

    # Top-1 accuracy
    top1_acc = np.mean(all_preds == all_labels)
    print(f"\n📊 Results:")
    print(f"  Top-1 Accuracy: {top1_acc:.4f} ({top1_acc*100:.2f}%)")

    # Top-5 accuracy
    top5_acc = top_k_accuracy_score(all_labels, all_probs, k=5)
    print(f"  Top-5 Accuracy: {top5_acc:.4f} ({top5_acc*100:.2f}%)")

    # Classification report
    report = classification_report(
        all_labels, all_preds,
        target_names=[id2label.get(i, class_names[i]) for i in range(len(class_names))],
        output_dict=True,
    )

    # Save report
    print("\n💾 Saving evaluation results...")
    with open(os.path.join(RESULTS_DIR, "classification_report.json"), "w") as f:
        json.dump(report, f, indent=2)

    # Print top 10 best and worst classes
    class_f1 = {name: report[name]["f1-score"] for name in report if name not in ["accuracy", "macro avg", "weighted avg"]}
    sorted_classes = sorted(class_f1.items(), key=lambda x: x[1], reverse=True)

    print("\n🏆 Top 10 Best Classes:")
    for name, f1 in sorted_classes[:10]:
        print(f"  {name}: F1={f1:.4f}")

    print("\n⚠️ Top 10 Worst Classes:")
    for name, f1 in sorted_classes[-10:]:
        print(f"  {name}: F1={f1:.4f}")

    # ---- Confusion Matrix ----
    print("\n📊 Generating confusion matrix...")
    cm = confusion_matrix(all_labels, all_preds)

    # Plot confusion matrix (top 20 most confused classes)
    # Find most confused pairs
    np.fill_diagonal(cm, 0)
    confused_indices = np.unravel_index(np.argsort(cm.ravel())[-20:], cm.shape)
    confused_classes = set()
    for i, j in zip(confused_indices[0], confused_indices[1]):
        confused_classes.add(i)
        confused_classes.add(j)
    confused_classes = sorted(list(confused_classes))[:20]

    if len(confused_classes) > 0:
        cm_subset = confusion_matrix(all_labels, all_preds, labels=confused_classes)
        subset_names = [id2label.get(i, class_names[i])[:15] for i in confused_classes]

        fig, ax = plt.subplots(figsize=(14, 12))
        sns.heatmap(
            cm_subset, annot=True, fmt="d", cmap="YlOrRd",
            xticklabels=subset_names, yticklabels=subset_names,
            ax=ax
        )
        ax.set_xlabel("Predicted")
        ax.set_ylabel("True")
        ax.set_title("Confusion Matrix (Most Confused Classes)")
        plt.tight_layout()
        plt.savefig(os.path.join(RESULTS_DIR, "confusion_matrix.png"), dpi=150)
        print(f"  Saved to {RESULTS_DIR}/confusion_matrix.png")

    # ---- Summary ----
    summary = {
        "model": MODEL_DIR,
        "dataset": DATASET_NAME,
        "num_test_samples": len(dataset),
        "num_classes": len(class_names),
        "top1_accuracy": float(top1_acc),
        "top5_accuracy": float(top5_acc),
        "macro_f1": report["macro avg"]["f1-score"],
        "weighted_f1": report["weighted avg"]["f1-score"],
    }

    with open(os.path.join(RESULTS_DIR, "summary.json"), "w") as f:
        json.dump(summary, f, indent=2)

    print(f"\n✅ Evaluation complete! Results saved to {RESULTS_DIR}/")
    return summary


if __name__ == "__main__":
    summary = evaluate_model()
    print(f"\n{'='*60}")
    print(f"  Top-1 Accuracy: {summary['top1_accuracy']*100:.2f}%")
    print(f"  Top-5 Accuracy: {summary['top5_accuracy']*100:.2f}%")
    print(f"  Macro F1: {summary['macro_f1']:.4f}")
    print(f"{'='*60}")
