"""
Export Fine-Tuned Model for Deployment

Supports:
1. ONNX export for fast inference
2. Push to Hugging Face Hub
3. TorchScript export
"""

import os
import json
import torch
from transformers import ViTForImageClassification, ViTImageProcessor
from huggingface_hub import HfApi


# ============================================================
# Configuration
# ============================================================

MODEL_DIR = "./trained_model/food101_vit"
ONNX_OUTPUT_DIR = "./exported_model/onnx"
HF_REPO_ID = "YOUR_USERNAME/food101-vit-finetuned"  # Change this


# ============================================================
# ONNX Export
# ============================================================

def export_to_onnx():
    """Export model to ONNX format for fast inference."""
    print("📦 Exporting model to ONNX...")

    model = ViTForImageClassification.from_pretrained(MODEL_DIR)
    processor = ViTImageProcessor.from_pretrained(MODEL_DIR)
    model.eval()

    os.makedirs(ONNX_OUTPUT_DIR, exist_ok=True)

    # Create dummy input
    dummy_input = torch.randn(1, 3, 224, 224)

    # Export
    onnx_path = os.path.join(ONNX_OUTPUT_DIR, "food_recognition.onnx")

    torch.onnx.export(
        model,
        dummy_input,
        onnx_path,
        export_params=True,
        opset_version=14,
        do_constant_folding=True,
        input_names=['pixel_values'],
        output_names=['logits'],
        dynamic_axes={
            'pixel_values': {0: 'batch_size'},
            'logits': {0: 'batch_size'},
        },
    )

    # Copy processor config
    processor.save_pretrained(ONNX_OUTPUT_DIR)

    # Copy label mapping
    src_labels = os.path.join(MODEL_DIR, "id2label.json")
    if os.path.exists(src_labels):
        import shutil
        shutil.copy(src_labels, os.path.join(ONNX_OUTPUT_DIR, "id2label.json"))

    file_size_mb = os.path.getsize(onnx_path) / (1024 * 1024)
    print(f"  ✅ ONNX model saved to {onnx_path} ({file_size_mb:.1f} MB)")

    # Validate ONNX model
    try:
        import onnx
        onnx_model = onnx.load(onnx_path)
        onnx.checker.check_model(onnx_model)
        print("  ✅ ONNX model validation passed!")
    except Exception as e:
        print(f"  ⚠️ ONNX validation warning: {e}")

    return onnx_path


# ============================================================
# Hugging Face Hub
# ============================================================

def push_to_hub():
    """Push model to Hugging Face Hub."""
    print(f"\n🚀 Pushing model to Hugging Face Hub: {HF_REPO_ID}")

    model = ViTForImageClassification.from_pretrained(MODEL_DIR)
    processor = ViTImageProcessor.from_pretrained(MODEL_DIR)

    model.push_to_hub(HF_REPO_ID, private=True)
    processor.push_to_hub(HF_REPO_ID, private=True)

    # Upload additional files
    api = HfApi()

    label_path = os.path.join(MODEL_DIR, "id2label.json")
    if os.path.exists(label_path):
        api.upload_file(
            path_or_fileobj=label_path,
            path_in_repo="id2label.json",
            repo_id=HF_REPO_ID,
            repo_type="model",
        )

    print(f"  ✅ Model pushed to https://huggingface.co/{HF_REPO_ID}")


# ============================================================
# TorchScript Export
# ============================================================

def export_to_torchscript():
    """Export model to TorchScript for mobile/edge deployment."""
    print("\n📦 Exporting model to TorchScript...")

    model = ViTForImageClassification.from_pretrained(MODEL_DIR)
    model.eval()

    os.makedirs("./exported_model/torchscript", exist_ok=True)

    # Trace model
    dummy_input = torch.randn(1, 3, 224, 224)
    traced_model = torch.jit.trace(model, dummy_input)

    script_path = "./exported_model/torchscript/food_recognition.pt"
    traced_model.save(script_path)

    file_size_mb = os.path.getsize(script_path) / (1024 * 1024)
    print(f"  ✅ TorchScript model saved to {script_path} ({file_size_mb:.1f} MB)")

    return script_path


# ============================================================
# Main
# ============================================================

if __name__ == "__main__":
    print("=" * 60)
    print("  Food Recognition Model Export")
    print("=" * 60)

    # 1. ONNX export
    onnx_path = export_to_onnx()

    # 2. TorchScript export
    ts_path = export_to_torchscript()

    # 3. Hub push (optional)
    print(f"\n  To push to Hugging Face Hub:")
    print(f"  1. Update HF_REPO_ID in this script")
    print(f"  2. Run: huggingface-cli login")
    print(f"  3. Uncomment and re-run push_to_hub()")
    # push_to_hub()

    print(f"\n✅ Export complete!")
    print(f"  ONNX:        {onnx_path}")
    print(f"  TorchScript: {ts_path}")
