import { useParams } from "react-router-dom";
import { useState, useEffect, useRef } from "react";
import api from "../api/api";
import stickmanImage from "../assets/etiket.png";
import { useNavigate } from "react-router-dom";

const Annotate = ({ showToast }) => {
  const { imageId } = useParams();
  const [image, setImage] = useState(null);
  const [topic, setTopic] = useState(null);
  const [labels, setLabels] = useState([]);
  const [selectedLabel, setSelectedLabel] = useState("");
  const [suggestedLabel, setSuggestedLabel] = useState(null);
  const [suggestScore, setSuggestScore] = useState(null);
  const [relevance, setRelevance] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [checking, setChecking] = useState(false);
  const [suggesting, setSuggesting] = useState(false);
  const [annotations, setAnnotations] = useState([]);
  const [loadingAnnotations, setLoadingAnnotations] = useState(false);
  // BBox drawing state
  const [drawing, setDrawing] = useState(false);
  const [startPt, setStartPt] = useState(null);
  const [currentRect, setCurrentRect] = useState(null);
  const [bboxLabel, setBboxLabel] = useState("");
  const [showBboxModal, setShowBboxModal] = useState(false);
  const [bboxToSubmit, setBboxToSubmit] = useState(null);
  const canvasRef = useRef();
  const imgRef = useRef();
  const [error, setError] = useState(null);
  const [showPreviewModal, setShowPreviewModal] = useState(false);
  const previewCanvasRef = useRef();

  // imageId veya id undefined ise API çağrısı yapma
  useEffect(() => {
    if (!imageId) {
      setError("Görsel bulunamadı veya geçersiz istek.");
      return;
    }
    fetchImage();
    fetchAnnotations();
    // eslint-disable-next-line
  }, [imageId]);

  useEffect(() => {
    drawOverlay();
    // eslint-disable-next-line
  }, [annotations, currentRect, image]);

  // Draw overlay for modal preview
  useEffect(() => {
    if (!showPreviewModal || !image) return;
    const canvas = previewCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    annotations
      .filter((a) => a.width !== 0 || a.height !== 0)
      .forEach((a) => {
        ctx.strokeStyle = "#2563eb";
        ctx.lineWidth = 2;
        ctx.strokeRect(a.x, a.y, a.width, a.height);
        ctx.font = "14px Inter";
        ctx.fillStyle = "#2563eb";
        ctx.fillText(a.label, a.x + 2, a.y - 2);
      });
  }, [showPreviewModal, image, annotations]);

  const fetchImage = async () => {
    try {
      const res = await api.get(`/images/detail/${imageId}`);
      setImage(res.data);
      fetchTopic(res.data.topic_id);
    } catch (err) {
      showToast &&
        showToast(
          "Görsel alınamadı: " + (err.response?.data?.detail || err.message)
        );
    }
  };

  const fetchTopic = async (topicId) => {
    try {
      const res = await api.get(`/topics`);
      const found = res.data.find((t) => String(t.id) === String(topicId));
      setTopic(found);
      if (found && found.candidate_labels) {
        let parsed = [];
        try {
          parsed = JSON.parse(found.candidate_labels);
        } catch {}
        setLabels(parsed);
      }
    } catch (err) {
      showToast &&
        showToast(
          "Konu bilgisi alınamadı: " +
            (err.response?.data?.detail || err.message)
        );
    }
  };

  const fetchAnnotations = async () => {
    setLoadingAnnotations(true);
    try {
      const res = await api.get(`/annotation/image/${imageId}/annotations`);
      setAnnotations(res.data);
    } catch (err) {
      showToast &&
        showToast(
          "Etiketler alınamadı: " + (err.response?.data?.detail || err.message)
        );
    } finally {
      setLoadingAnnotations(false);
    }
  };

  const handleDeleteAnnotation = async (id) => {
    try {
      await api.delete(`/annotation/${id}`);
      showToast && showToast("Etiket silindi.");
      fetchAnnotations();
    } catch (err) {
      showToast &&
        showToast(
          "Etiket silinemedi: " + (err.response?.data?.detail || err.message)
        );
    }
  };

  const handleSuggestLabel = async () => {
    setSuggesting(true);
    setSuggestedLabel(null);
    setSuggestScore(null);
    try {
      const res = await api.post(
        `/annotation/image/${imageId}/suggest_label`,
        {}
      );
      setSuggestedLabel(res.data.label);
      setSuggestScore(res.data.score);
      showToast &&
        showToast(
          `Önerilen etiket: ${res.data.label} (Skor: ${res.data.score.toFixed(
            2
          )})`
        );
    } catch (err) {
      showToast &&
        showToast(
          "Etiket önerilemedi: " + (err.response?.data?.detail || err.message)
        );
    } finally {
      setSuggesting(false);
    }
  };

  const handleCheckRelevance = async () => {
    setChecking(true);
    setRelevance(null);
    try {
      const res = await api.post(
        `/annotation/image/${imageId}/check_relevance`,
        {}
      );
      setRelevance(res.data.relevant);
      showToast &&
        showToast(
          res.data.relevant
            ? "Görsel konuya uygun."
            : "Görsel konuya uygun değil."
        );
    } catch (err) {
      showToast &&
        showToast(
          "Uygunluk kontrolü başarısız: " +
            (err.response?.data?.detail || err.message)
        );
    } finally {
      setChecking(false);
    }
  };

  const submitAnnotation = async () => {
    if (!selectedLabel) {
      showToast && showToast("Lütfen bir etiket seçin.");
      return;
    }
    setSubmitting(true);
    try {
      await api.post(`/annotation/image/${imageId}/annotations`, {
        label: selectedLabel,
        x: 0,
        y: 0,
        width: 0,
        height: 0,
        image_id: Number(imageId),
        category_id: topic?.category_id || 1,
      });
      showToast && showToast("Etiket kaydedildi!");
      fetchAnnotations();
    } catch (err) {
      showToast &&
        showToast(
          "Etiket gönderilemedi: " + (err.response?.data?.detail || err.message)
        );
    } finally {
      setSubmitting(false);
    }
  };

  // BBox drawing logic
  const handleCanvasMouseDown = (e) => {
    if (!imgRef.current) return;
    const rect = canvasRef.current.getBoundingClientRect();
    const x = (e.clientX - rect.left) * (canvasRef.current.width / rect.width);
    const y = (e.clientY - rect.top) * (canvasRef.current.height / rect.height);
    setStartPt({ x, y });
    setCurrentRect(null);
    setDrawing(true);
  };

  const handleCanvasMouseMove = (e) => {
    if (!drawing || !startPt || !imgRef.current) return;
    const rect = canvasRef.current.getBoundingClientRect();
    const x = (e.clientX - rect.left) * (canvasRef.current.width / rect.width);
    const y = (e.clientY - rect.top) * (canvasRef.current.height / rect.height);
    setCurrentRect({
      x: startPt.x,
      y: startPt.y,
      width: x - startPt.x,
      height: y - startPt.y,
    });
  };

  const handleCanvasMouseUp = (e) => {
    if (!drawing || !startPt || !imgRef.current) return;
    setDrawing(false);
    if (
      currentRect &&
      Math.abs(currentRect.width) > 10 &&
      Math.abs(currentRect.height) > 10
    ) {
      setBboxToSubmit({ ...currentRect });
      setShowBboxModal(true);
    }
    setCurrentRect(null);
    setStartPt(null);
  };

  const handleBboxLabelSubmit = async () => {
    if (!bboxLabel || !bboxToSubmit) return;
    setSubmitting(true);
    try {
      await api.post(`/annotation/image/${imageId}/annotations`, {
        label: bboxLabel,
        x: Math.round(bboxToSubmit.x),
        y: Math.round(bboxToSubmit.y),
        width: Math.round(bboxToSubmit.width),
        height: Math.round(bboxToSubmit.height),
        image_id: Number(imageId),
        category_id: topic?.category_id || 1,
      });
      showToast && showToast("Kutu kaydedildi!");
      setShowBboxModal(false);
      setBboxLabel("");
      setBboxToSubmit(null);
      fetchAnnotations();
    } catch (err) {
      showToast &&
        showToast(
          "Kutu gönderilemedi: " + (err.response?.data?.detail || err.message)
        );
    } finally {
      setSubmitting(false);
    }
  };

  // Draw overlay: existing bboxes and current rect
  const drawOverlay = () => {
    const canvas = canvasRef.current;
    const img = imgRef.current;
    if (!canvas || !img) return;
    const ctx = canvas.getContext("2d");
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    // Draw existing bboxes
    annotations
      .filter((a) => a.width !== 0 || a.height !== 0)
      .forEach((a) => {
        ctx.strokeStyle = "#2563eb";
        ctx.lineWidth = 2;
        ctx.strokeRect(a.x, a.y, a.width, a.height);
        ctx.font = "14px Inter";
        ctx.fillStyle = "#2563eb";
        ctx.fillText(a.label, a.x + 2, a.y - 2);
      });
    // Draw current rect
    if (currentRect) {
      ctx.strokeStyle = "#f59e42";
      ctx.lineWidth = 2;
      ctx.strokeRect(
        currentRect.x,
        currentRect.y,
        currentRect.width,
        currentRect.height
      );
    }
  };

  // Split annotations into label-only and bbox
  const labelAnnotations = annotations.filter(
    (a) => a.width === 0 && a.height === 0
  );
  const bboxAnnotations = annotations.filter(
    (a) => a.width !== 0 || a.height !== 0
  );

  return (
    <div className="min-h-screen flex flex-col items-center bg-gray-50 py-12 font-sans">
      <style>{`
      footer { display: none; }
    `}</style>

      <div className="w-full mt-6">
        <div className=" items-start mb-10">
          <h1 className="text-3xl font-extrabold mb-3 text-black ">
            Görseli Etiketle
          </h1>
          <p className="text-gray-600 text-base mb-20">
            {" "}
            Lütfen aşağıdaki görseli inceleyin ve içeriğine en uygun etiketi
            seçerek kaydedin.
          </p>

          {image && (
            <div className="mb-6 flex flex-col items-center">
              <div
                style={{
                  position: "relative",
                  width: image.width,
                  height: image.height,
                  maxWidth: 400,
                }}
              >
                <img
                  ref={imgRef}
                  src={`/uploaded_images/${image.filename}`}
                  alt={image.filename}
                  style={{ width: "100%", height: "auto", display: "block" }}
                  className="rounded mb-4 shadow"
                />
                <canvas
                  ref={canvasRef}
                  width={image.width}
                  height={image.height}
                  style={{
                    position: "absolute",
                    top: 0,
                    left: 0,
                    width: "100%",
                    height: "100%",
                    pointerEvents: "none",
                    zIndex: 2,
                  }}
                />

           
              </div>
            </div>
          )}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              submitAnnotation();
            }}
            className="flex flex-col gap-4"
          >
            <label className="font-semibold">Etiket</label>
            <select
              value={selectedLabel}
              onChange={(e) => setSelectedLabel(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-gray-900"
              required
            >
              <option value="">Etiket Seçin</option>
              {labels.map((label, idx) => (
                <option key={idx} value={label}>
                  {label}
                </option>
              ))}
            </select>
            <button
              type="submit"
              className="bg-black text-white font-bold px-6 py-2 rounded-full shadow hover:bg-gray-900 transition duration-300 cursor-pointer"
              disabled={submitting}
            >
              {submitting ? "Kaydediliyor..." : "Kaydet"}
            </button>
          </form>
          <div className="flex flex-col md:flex-row gap-2 mt-6 justify-center">
            <button
              onClick={handleSuggestLabel}
              className="bg-gray-100 hover:bg-gray-200 text-gray-800 px-4 py-2 rounded-xl border border-gray-300"
              disabled={suggesting}
            >
              {suggesting ? "Öneriliyor..." : "Etiket Öner"}
            </button>
            <button
              onClick={handleCheckRelevance}
              className="bg-gray-100 hover:bg-gray-200 text-gray-800 px-4 py-2 rounded-xl border border-gray-300"
              disabled={checking}
            >
              {checking ? "Kontrol..." : "Uygunluk Kontrolü"}
            </button>
          </div>
          {suggestedLabel && (
            <div className="mt-4 text-gray-500 font-semibold">
              Önerilen: {suggestedLabel} (Skor: {suggestScore})
            </div>
          )}
          {relevance !== null && (
            <div
              className={`mt-2 font-semibold text-center ${
                relevance ? "text-gray-500" : "text-gray-600"
              }`}
            >
              {relevance
                ? "Görsel konuya uygun."
                : "Görsel konuya uygun değil."}
            </div>
          )}
        </div>

        {/* 🔥 ÇİZGİ */}
        <div className="border-t border-gray-300 mt-15"></div>

        {/* Annotations List */}
        <div className="bg-gray-100 shadow-md rounded-md p-6 border border-gray-100 mt-10">
          <h2 className="text-xl font-semibold mb-4 text-gray-700">
            Eklenen Etiketler
          </h2>
          {loadingAnnotations ? (
            <div>Yükleniyor...</div>
          ) : (
            <ul className="space-y-2">
              {annotations.map((ann) => (
                <li
                  key={ann.id}
                  className="flex flex-col md:flex-row md:items-center justify-between bg-gray-50 px-4 py-3 rounded-lg gap-2 border border-gray-200"
                >
                  <span>
                    <b>{ann.label}</b>
                    {ann.width !== 0 || ann.height !== 0 ? (
                      <span className="ml-2 text-xs text-gray-500">
                        BBox: x={ann.x}, y={ann.y}, w={ann.width}, h=
                        {ann.height}
                      </span>
                    ) : null}
                  </span>
                  <button
                    onClick={() => handleDeleteAnnotation(ann.id)}
                    className="text-red-500 hover:underline text-sm"
                  >
                    Sil
                  </button>
                </li>
              ))}
              {annotations.length === 0 && (
                <li className="text-gray-400">Henüz etiket yok.</li>
              )}
            </ul>
          )}
        </div>
      </div>

      {/* Modal Preview */}
      {showPreviewModal && image && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 px-4">
          <div className="bg-white rounded-2xl shadow-xl p-6 relative w-full max-w-2xl">
            <button
              className="absolute top-2 right-2 text-xl text-gray-500 hover:text-red-600"
              onClick={() => setShowPreviewModal(false)}
            >
              &times;
            </button>
            <h2 className="text-xl font-bold mb-4 text-blue-700 text-center">
              Etiketli Görsel Önizleme
            </h2>
            <div
              style={{
                position: "relative",
                width: image.width,
                height: image.height,
                maxWidth: 600,
              }}
            >
              <img
                src={`/uploaded_images/${image.filename}`}
                alt={image.filename}
                style={{ width: "100%", height: "auto", display: "block" }}
                className="rounded shadow"
              />
              <canvas
                width={image.width}
                height={image.height}
                ref={previewCanvasRef}
                style={{
                  position: "absolute",
                  top: 0,
                  left: 0,
                  width: "100%",
                  height: "100%",
                  pointerEvents: "none",
                  zIndex: 2,
                }}
              />
            </div>
            <div className="mt-4">
              <h3 className="font-semibold mb-2">Etiketler ve BBox'lar</h3>
              <ul className="text-sm space-y-1">
                {annotations
                  .filter((a) => a.width !== 0 || a.height !== 0)
                  .map((a) => (
                    <li key={a.id}>
                      <b>{a.label}</b> — x: {a.x}, y: {a.y}, w: {a.width}, h:{" "}
                      {a.height}
                    </li>
                  ))}
                {annotations.filter((a) => a.width !== 0 || a.height !== 0)
                  .length === 0 && <li className="text-gray-400">BBox yok.</li>}
              </ul>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Annotate;
