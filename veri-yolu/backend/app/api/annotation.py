from fastapi import APIRouter, Depends, HTTPException, Body, Query
from sqlmodel import Session, select
from app.models.annotation import Annotation
from app.models.image import Image
from app.models.topic import Topic
from app.db.session import get_session
from typing import List, Optional
from app.services.clip_labeler import suggest_clip_label, is_image_relevant
from app.api.deps import get_current_user
from app.models.user import User, RoleEnum
import os
from app.services.yolo_labeler import run_yolov8_onnx, map_yolo_to_candidates
import json
from fastapi.responses import FileResponse
import csv
from PIL import Image as PILImage

UPLOAD_DIR = "uploaded_images"
TMP_DIR = os.path.join(os.path.dirname(__file__), "../services/tmp")
os.makedirs(TMP_DIR, exist_ok=True)

router = APIRouter()

@router.post("/image/{image_id}/annotations", response_model=Annotation)
def create_annotation(
    image_id: int,
    data: dict = Body(...),
    session: Session = Depends(get_session),
    user: User = Depends(get_current_user)
):
    db_image = session.get(Image, image_id)
    if not db_image:
        raise HTTPException(status_code=404, detail="Görsel bulunamadı.")

    annotation = Annotation(**data)
    annotation.image_id = image_id
    session.add(annotation)
    session.commit()
    session.refresh(annotation)
    return annotation


@router.get("/image/{image_id}/annotations", response_model=List[Annotation])
def list_annotations(
    image_id: int,
    session: Session = Depends(get_session)
):
    return session.exec(select(Annotation).where(Annotation.image_id == image_id)).all()


@router.put("/annotation/{annotation_id}", response_model=Annotation)
def update_annotation(
    annotation_id: int,
    data: Annotation,
    session: Session = Depends(get_session),
    user: User = Depends(get_current_user)
):
    annotation = session.get(Annotation, annotation_id)
    if not annotation:
        raise HTTPException(status_code=404, detail="Etiket bulunamadı.")

    image = session.get(Image, annotation.image_id)
    if image.uploader_id != user.id and user.role != RoleEnum.admin:
        raise HTTPException(status_code=403, detail="Etiket düzenleme yetkiniz yok.")

    annotation.label = data.label or annotation.label
    annotation.x = data.x
    annotation.y = data.y
    annotation.width = data.width
    annotation.height = data.height
    annotation.category_id = data.category_id

    session.add(annotation)
    session.commit()
    session.refresh(annotation)
    return annotation


@router.delete("/annotation/{annotation_id}")
def delete_annotation(annotation_id: int, session: Session = Depends(get_session)):
    annotation = session.get(Annotation, annotation_id)
    if not annotation:
        raise HTTPException(status_code=404, detail="Etiket bulunamadı.")
    session.delete(annotation)
    session.commit()
    return {"detail": "Silindi"}


@router.post("/image/{image_id}/suggest_label")
def suggest_label_endpoint(
    image_id: int,
    box: Optional[dict] = Body(None),
    session: Session = Depends(get_session)
):
    image = session.get(Image, image_id)
    if not image:
        raise HTTPException(status_code=404, detail="Görsel bulunamadı.")

    topic = session.get(Topic, image.topic_id)
    if not topic:
        raise HTTPException(status_code=404, detail="İlgili konu bulunamadı.")

    path = os.path.join(UPLOAD_DIR, image.filename)
    if box:
        # Gelecekte bbox kırpma desteklenebilir
        raise HTTPException(status_code=501, detail="Kutu destekli etiketleme henüz desteklenmiyor.")

    label, score = suggest_clip_label(path, topic.get_candidate_labels())
    return {"label": label, "score": score}


@router.post("/image/{image_id}/check_relevance")
def check_relevance_endpoint(
    image_id: int,
    session: Session = Depends(get_session)
):
    image = session.get(Image, image_id)
    if not image:
        raise HTTPException(status_code=404, detail="Görsel bulunamadı.")

    topic = session.get(Topic, image.topic_id)
    if not topic:
        raise HTTPException(status_code=404, detail="İlgili konu bulunamadı.")

    path = os.path.join(UPLOAD_DIR, image.filename)
    result = is_image_relevant(path, topic.get_candidate_labels())
    return {"relevant": result}


@router.post("/topic/{topic_id}/auto_annotate")
def auto_annotate_topic(
    topic_id: int,
    session: Session = Depends(get_session),
    user: User = Depends(get_current_user)
):
    topic = session.get(Topic, topic_id)
    if not topic:
        raise HTTPException(status_code=404, detail="Konu bulunamadı.")
    candidate_labels = topic.get_candidate_labels()
    images = session.exec(select(Image).where(Image.topic_id == topic_id)).all()
    if not images:
        raise HTTPException(status_code=404, detail="Bu konuda görsel yok.")

    results = []
    for image in images:
        image_path = os.path.join(UPLOAD_DIR, image.filename)
        yolo_boxes = run_yolov8_onnx(image_path)
        image_annots = []
        for box in yolo_boxes:
            # Crop bbox region for CLIP
            x1, y1, x2, y2 = map(int, box["bbox"])
            with PILImage.open(image_path) as im:
                crop = im.crop((x1, y1, x2, y2))
                crop_path = os.path.join(TMP_DIR, f"clip_crop_{image.id}_{x1}_{y1}_{x2}_{y2}.jpg")
                crop.save(crop_path)
            # Use CLIP to map to candidate labels
            from app.services.clip_labeler import suggest_clip_label
            label, score = suggest_clip_label(crop_path, candidate_labels)
            if not label or score < 0.3:
                # fallback to YOLO class mapping
                label = map_yolo_to_candidates(box["class_name"], candidate_labels)
            image_annots.append({
                "bbox": box["bbox"],
                "label": label,
                "score": float(box["score"]),
                "source": "auto"
            })
        results.append({
            "image_id": image.filename,
            "annotations": image_annots
        })
    # Save to JSON for export
    out_path = f"auto_annotations_topic_{topic_id}.json"
    with open(out_path, "w", encoding="utf-8") as f:
        json.dump({
            "topic": topic.title,
            "candidate_labels": candidate_labels,
            "images": results
        }, f, ensure_ascii=False, indent=2)
    return {"results": results, "json_file": out_path}


@router.get("/topic/{topic_id}/export_annotations")
def export_annotations_topic(
    topic_id: int,
    format: str = Query("json", description="Export format: json or csv")
):
    out_path = f"auto_annotations_topic_{topic_id}.json"
    if not os.path.exists(out_path):
        raise HTTPException(status_code=404, detail="Annotation JSON bulunamadı. Önce otomatik etiketleme yapın.")
    if format == "csv":
        csv_path = f"auto_annotations_topic_{topic_id}.csv"
        with open(out_path, "r", encoding="utf-8") as f:
            data = json.load(f)
        with open(csv_path, "w", newline='', encoding="utf-8") as csvfile:
            writer = csv.writer(csvfile)
            writer.writerow(["image_id", "bbox", "label", "score", "source"])
            for img in data["images"]:
                for ann in img["annotations"]:
                    bbox = ann["bbox"]
                    bbox_str = f"{bbox[0]},{bbox[1]},{bbox[2]},{bbox[3]}"
                    writer.writerow([
                        img["image_id"],
                        bbox_str,
                        ann["label"],
                        ann["score"],
                        ann["source"]
                    ])
        return FileResponse(csv_path, media_type="text/csv", filename=os.path.basename(csv_path))
    else:
        return FileResponse(out_path, media_type="application/json", filename=os.path.basename(out_path))
