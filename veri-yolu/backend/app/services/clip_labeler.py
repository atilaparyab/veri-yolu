import torch
import clip
from PIL import Image
from typing import List, Tuple

device = "cuda" if torch.cuda.is_available() else "cpu"
model, preprocess = clip.load("ViT-B/32", device=device)

def preprocess_image(image_path: str) -> torch.Tensor:
    pil_image = Image.open(image_path).convert("RGB")
    image_tensor = preprocess(pil_image)  # preprocess returns a torch.Tensor
    image_tensor = image_tensor.unsqueeze(0)  # Add batch dimension
    return image_tensor.to(device)

def suggest_clip_label(image_path: str, candidate_labels: List[str]) -> Tuple[str, float]:
    if not candidate_labels:
        return "", 0.0
    image_input = preprocess_image(image_path)
    text_tokens = clip.tokenize(candidate_labels).to(device)

    with torch.no_grad():
        image_features = model.encode_image(image_input)
        text_features = model.encode_text(text_tokens)
        logits_per_image = (image_features @ text_features.T).squeeze()
        probs = logits_per_image.softmax(dim=0).tolist()
        # Ensure probs is always a list, even for a single label
        if isinstance(probs, float):
            probs = [probs]

    best_idx = max(range(len(probs)), key=lambda i: probs[i])
    return candidate_labels[best_idx], probs[best_idx]

def is_image_relevant(image_path: str, candidate_labels: List[str], threshold: float = 0.7) -> tuple[bool, float, str]:
    if not candidate_labels:
        return True, 1.0, ""
    best_label, best_score = suggest_clip_label(image_path, candidate_labels)
    return best_score >= threshold, best_score, best_label
