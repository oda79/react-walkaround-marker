import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent
} from "react";
import { displayPointToNatural, type DisplaySize } from "./canvas/coordinates";
import { renderMarks } from "./canvas/render";
import type { WalkaroundData, WalkaroundMark, WalkaroundMode } from "./types";

export type WalkaroundMarkerProps = {
  src: string;
  value: WalkaroundData | null;
  onChange?: (data: WalkaroundData) => void;
  mode?: WalkaroundMode;
  color?: string;
  strokeWidth?: number;
  className?: string;
  disabled?: boolean;
};

type ImageSize = { width: number; height: number };
type ActiveStroke = WalkaroundMark & { pointerId: number };

function createMarkId() {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") return crypto.randomUUID();
  return `mark-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function dimensionsError(value: WalkaroundData | null, imageSize: ImageSize | null) {
  if (!value || !imageSize) return null;
  if (value.imageWidth !== imageSize.width || value.imageHeight !== imageSize.height) {
    return `Saved marks are for a ${value.imageWidth} × ${value.imageHeight} image, but the loaded image is ${imageSize.width} × ${imageSize.height}.`;
  }
  return null;
}

export function WalkaroundMarker({
  src, value, onChange, mode = "draw", color = "#ef4444", strokeWidth = 10, className, disabled = false
}: WalkaroundMarkerProps) {
  const imageRef = useRef<HTMLImageElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const activeStrokesRef = useRef(new Map<number, ActiveStroke>());
  const [imageSize, setImageSize] = useState<ImageSize | null>(null);
  const [loadedSrc, setLoadedSrc] = useState<string | null>(null);
  const [displaySize, setDisplaySize] = useState<DisplaySize>({ width: 0, height: 0 });
  const [activeStrokes, setActiveStrokes] = useState<WalkaroundMark[]>([]);
  const [loadError, setLoadError] = useState<string | null>(null);

  const imageIsCurrent = loadedSrc === src;
  const incompatibleDimensions = imageIsCurrent ? dimensionsError(value, imageSize) : null;
  const resolvedColor = color.trim() ? color : "#ef4444";
  const resolvedWidth = Number.isFinite(strokeWidth) && strokeWidth > 0 ? strokeWidth : 10;
  const isMutable = imageIsCurrent && mode === "draw" && !disabled && Boolean(onChange) && !incompatibleDimensions && !loadError;

  const updateDisplaySize = useCallback(() => {
    const image = imageRef.current;
    if (!image) return;
    const rect = image.getBoundingClientRect();
    if (rect.width > 0 && rect.height > 0) {
      setDisplaySize((previous) => previous.width === rect.width && previous.height === rect.height
        ? previous : { width: rect.width, height: rect.height });
    }
  }, []);

  useEffect(() => {
    const image = imageRef.current;
    if (!image || typeof ResizeObserver === "undefined") return;
    const observer = new ResizeObserver(updateDisplaySize);
    observer.observe(image);
    return () => observer.disconnect();
  }, [updateDisplaySize]);

  useEffect(() => {
    window.addEventListener("resize", updateDisplaySize);
    return () => window.removeEventListener("resize", updateDisplaySize);
  }, [updateDisplaySize]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    if (!imageIsCurrent || !imageSize || incompatibleDimensions || loadError) {
      canvas.width = 1;
      canvas.height = 1;
      return;
    }
    renderMarks(canvas, {
      displaySize,
      imageWidth: imageSize.width,
      imageHeight: imageSize.height,
      pixelRatio: window.devicePixelRatio || 1,
      marks: [...(value?.marks ?? []), ...(isMutable ? activeStrokes : [])]
    });
  }, [activeStrokes, displaySize, imageIsCurrent, imageSize, incompatibleDimensions, isMutable, loadError, value]);

  const pointForEvent = useCallback((event: ReactPointerEvent<HTMLCanvasElement>) => {
    const image = imageRef.current;
    if (!image || !imageSize) return null;
    return displayPointToNatural(event.clientX, event.clientY, image.getBoundingClientRect(), imageSize.width, imageSize.height);
  }, [imageSize]);

  const handlePointerDown = useCallback((event: ReactPointerEvent<HTMLCanvasElement>) => {
    if (!isMutable || (event.pointerType === "mouse" && event.button !== 0)) return;
    const point = pointForEvent(event);
    if (!point) return;
    event.preventDefault();
    const stroke: ActiveStroke = { id: createMarkId(), points: [point], color: resolvedColor, width: resolvedWidth, pointerId: event.pointerId };
    activeStrokesRef.current.set(event.pointerId, stroke);
    setActiveStrokes(Array.from(activeStrokesRef.current.values()));
    try { event.currentTarget.setPointerCapture(event.pointerId); } catch { /* unavailable in some test DOMs */ }
  }, [isMutable, pointForEvent, resolvedColor, resolvedWidth]);

  const handlePointerMove = useCallback((event: ReactPointerEvent<HTMLCanvasElement>) => {
    const stroke = activeStrokesRef.current.get(event.pointerId);
    if (!stroke) return;
    const point = pointForEvent(event);
    if (!point) return;
    event.preventDefault();
    const nextStroke = { ...stroke, points: [...stroke.points, point] };
    activeStrokesRef.current.set(event.pointerId, nextStroke);
    setActiveStrokes(Array.from(activeStrokesRef.current.values()));
  }, [pointForEvent]);

  const finishPointer = useCallback((event: ReactPointerEvent<HTMLCanvasElement>) => {
    const stroke = activeStrokesRef.current.get(event.pointerId);
    if (!stroke) return;
    activeStrokesRef.current.delete(event.pointerId);
    setActiveStrokes(Array.from(activeStrokesRef.current.values()));
    const currentValue = value;
    if (!isMutable || !onChange || !imageSize || dimensionsError(currentValue, imageSize)) return;
    const finalPoint = pointForEvent(event);
    const lastPoint = stroke.points[stroke.points.length - 1];
    const completedStroke = finalPoint && (finalPoint.x !== lastPoint.x || finalPoint.y !== lastPoint.y)
      ? { ...stroke, points: [...stroke.points, finalPoint] }
      : stroke;
    const mark: WalkaroundMark = {
      id: completedStroke.id,
      points: completedStroke.points,
      color: completedStroke.color,
      width: completedStroke.width
    };
    const nextData: WalkaroundData = currentValue
      ? { ...currentValue, marks: [...currentValue.marks, mark] }
      : { version: 1, imageWidth: imageSize.width, imageHeight: imageSize.height, marks: [mark] };
    onChange(nextData);
  }, [imageSize, isMutable, onChange, pointForEvent, value]);

  const error = imageIsCurrent ? loadError || incompatibleDimensions : null;
  return (
    <div className={className}>
      <div style={{ position: "relative", width: "100%" }}>
        <img
          ref={imageRef} src={src} alt="Walkaround image" draggable={false}
          onLoad={(event) => {
            const image = event.currentTarget;
            activeStrokesRef.current.clear();
            setActiveStrokes([]);
            if (image.naturalWidth <= 0 || image.naturalHeight <= 0) {
              setLoadedSrc(src);
              setLoadError("The walkaround image has invalid natural dimensions.");
              return;
            }
            setLoadError(null);
            setImageSize({ width: image.naturalWidth, height: image.naturalHeight });
            setLoadedSrc(src);
            updateDisplaySize();
          }}
          onError={() => {
            activeStrokesRef.current.clear();
            setActiveStrokes([]);
            setLoadedSrc(src);
            setLoadError("The walkaround image could not be loaded.");
          }}
          style={{ display: "block", width: "100%", height: "auto", userSelect: "none" }}
        />
        <canvas
          ref={canvasRef} aria-label="Walkaround drawing surface"
          onPointerDown={handlePointerDown} onPointerMove={handlePointerMove}
          onPointerUp={finishPointer} onPointerCancel={finishPointer}
          style={{ position: "absolute", inset: 0, width: "100%", height: "100%", touchAction: "none", cursor: isMutable ? "crosshair" : "default" }}
        />
      </div>
      {error && <div role="alert">{error}</div>}
    </div>
  );
}
