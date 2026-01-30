import onnxruntime as ort
import numpy as np
from PIL import Image
import cv2
from typing import List, Tuple

YOLOV8_ONNX_PATH = "C:/Users/mmy/veri-yolu/backend/app/services/yolov8n.onnx"  # You should place this file in your backend/app/services directory or update the path

COCO_CLASSES = [
    "person", "bicycle", "car", "motorcycle", "airplane", "bus", "train", "truck", "boat", "traffic light",
    "fire hydrant", "stop sign", "parking meter", "bench", "bird", "cat", "dog", "horse", "sheep", "cow",
    "elephant", "bear", "zebra", "giraffe", "backpack", "umbrella", "handbag", "tie", "suitcase", "frisbee",
    "skis", "snowboard", "sports ball", "kite", "baseball bat", "baseball glove", "skateboard", "surfboard",
    "tennis racket", "bottle", "wine glass", "cup", "fork", "knife", "spoon", "bowl", "banana", "apple",
    "sandwich", "orange", "broccoli", "carrot", "hot dog", "pizza", "donut", "cake", "chair", "couch",
    "potted plant", "bed", "dining table", "toilet", "tv", "laptop", "mouse", "remote", "keyboard", "cell phone",
    "microwave", "oven", "toaster", "sink", "refrigerator", "book", "clock", "vase", "scissors", "teddy bear",
    "hair drier", "toothbrush"
]

def preprocess_yolo_image(image_path: str, input_size: int = 640) -> np.ndarray:
    img = Image.open(image_path).convert("RGB")
    img = img.resize((input_size, input_size))
    img_np = np.array(img)
    img_np = img_np.astype(np.float32) / 255.0
    img_np = np.transpose(img_np, (2, 0, 1))  # HWC to CHW
    img_np = np.expand_dims(img_np, axis=0)  # Add batch dim
    return img_np

def run_yolov8_onnx(image_path: str, conf_threshold: float = 0.25, iou_threshold: float = 0.45) -> List[dict]:
    session = ort.InferenceSession(YOLOV8_ONNX_PATH, providers=["CPUExecutionProvider"])
    input_name = session.get_inputs()[0].name
    img = preprocess_yolo_image(image_path)
    outputs = session.run(None, {input_name: img})
    preds = outputs[0]
    boxes = []
    preds_arr = np.array(preds)
    if preds_arr.ndim == 3:
        preds_arr = preds_arr[0]
    for pred in preds_arr:
        x, y, w, h, conf = pred[:5]
        class_scores = pred[5:]
        class_id = int(np.argmax(class_scores))
        score = class_scores[class_id] * conf
        if score < conf_threshold:
            continue
        # Convert xywh to xyxy
        x1 = x - w / 2
        y1 = y - h / 2
        x2 = x + w / 2
        y2 = y + h / 2
        boxes.append({
            "bbox": [float(x1), float(y1), float(x2), float(y2)],
            "class_id": class_id,
            "class_name": COCO_CLASSES[class_id] if class_id < len(COCO_CLASSES) else str(class_id),
            "score": float(score)
        })
    return boxes

def map_yolo_to_candidates(yolo_class_name: str, candidate_labels: List[str]) -> str:
    # Simple mapping: if YOLO class in candidate labels, use it; else "other objects"
    for label in candidate_labels:
        if label.lower() == yolo_class_name.lower():
            return label
    return "other objects" 