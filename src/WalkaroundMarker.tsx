import { forwardRef, useCallback, useEffect, useImperativeHandle, useRef, useState, type PointerEvent as ReactPointerEvent } from "react";
import { displayPointToNatural, type DisplaySize } from "./canvas/coordinates";
import { findMarkAtPoint } from "./canvas/hitTest";
import { renderMarks } from "./canvas/render";
import type { WalkaroundData, WalkaroundMark, WalkaroundMode } from "./types";

export type WalkaroundMarkerHandle = {
  undo(): void;
  redo(): void;
  clear(): void;
  canUndo(): boolean;
  canRedo(): boolean;
};

export type WalkaroundMarkerProps = {
  src: string;
  value: WalkaroundData | null;
  onChange?: (data: WalkaroundData) => void;
  mode?: WalkaroundMode;
  color?: string;
  strokeWidth?: number;
  className?: string;
  disabled?: boolean;
  /** Called after a mark is selected in delete mode. Calling confirm removes it. */
  onDeleteRequest?: (mark: WalkaroundMark, confirm: () => void, cancel: () => void) => void;
  /** Called before Clear All. Calling confirm commits the undoable clear. */
  onClearRequest?: (confirm: () => void, cancel: () => void) => void;
};

type ImageSize = { width: number; height: number };
type ActiveStroke = WalkaroundMark & { pointerId: number };
type Snapshot = WalkaroundData | null;

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

function snapshotSignature(value: Snapshot) {
  return value === null ? "null" : JSON.stringify(value);
}

function emptySnapshot(reference: WalkaroundData | null, imageSize: ImageSize | null): WalkaroundData | null {
  if (reference) return { ...reference, marks: [] };
  if (imageSize) return { version: 1, imageWidth: imageSize.width, imageHeight: imageSize.height, marks: [] };
  return null;
}

export const WalkaroundMarker = forwardRef<WalkaroundMarkerHandle, WalkaroundMarkerProps>(function WalkaroundMarker({
  src, value, onChange, mode = "draw", color = "#ef4444", strokeWidth = 10, className, disabled = false,
  onDeleteRequest, onClearRequest
}, ref) {
  const imageRef = useRef<HTMLImageElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const activeStrokesRef = useRef(new Map<number, ActiveStroke>());
  const historyPastRef = useRef<Snapshot[]>([]);
  const historyFutureRef = useRef<Snapshot[]>([]);
  const valueRef = useRef<Snapshot>(value);
  const expectedEchoRef = useRef<string | null>(null);
  const acceptedSignatureRef = useRef(snapshotSignature(value));
  const confirmationTokenRef = useRef(0);
  const sourceRef = useRef(src);
  const editableRef = useRef(false);
  const deleteEnabledRef = useRef(false);
  const onChangeRef = useRef(onChange);
  const [imageSize, setImageSize] = useState<ImageSize | null>(null);
  const [loadedSrc, setLoadedSrc] = useState<string | null>(null);
  const [displaySize, setDisplaySize] = useState<DisplaySize>({ width: 0, height: 0 });
  const [activeStrokes, setActiveStrokes] = useState<WalkaroundMark[]>([]);
  const [selectedMarkId, setSelectedMarkId] = useState<string | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  const imageIsCurrent = loadedSrc === src;
  const incompatibleDimensions = imageIsCurrent ? dimensionsError(value, imageSize) : null;
  const resolvedColor = color.trim() ? color : "#ef4444";
  const resolvedWidth = Number.isFinite(strokeWidth) && strokeWidth > 0 ? strokeWidth : 10;
  const canModify = imageIsCurrent && mode !== "view" && !disabled && Boolean(onChange) && !incompatibleDimensions && !loadError;
  const canDraw = canModify && mode === "draw";
  const canDelete = canModify && mode === "delete";
  valueRef.current = value;
  onChangeRef.current = onChange;
  editableRef.current = canModify;
  deleteEnabledRef.current = canDelete;

  // Parent echoes and equivalent cloned values preserve history. Only a content
  // change starts a new document, which also invalidates pending confirmations.
  useEffect(() => {
    const signature = snapshotSignature(value);
    if (expectedEchoRef.current === signature) {
      expectedEchoRef.current = null;
      acceptedSignatureRef.current = signature;
      return;
    }
    if (acceptedSignatureRef.current === signature) return;
    acceptedSignatureRef.current = signature;
    historyPastRef.current = [];
    historyFutureRef.current = [];
    confirmationTokenRef.current += 1;
    setSelectedMarkId(null);
  }, [value]);

  useEffect(() => {
    if (sourceRef.current === src) return;
    sourceRef.current = src;
    historyPastRef.current = [];
    historyFutureRef.current = [];
    expectedEchoRef.current = null;
    acceptedSignatureRef.current = snapshotSignature(valueRef.current);
    confirmationTokenRef.current += 1;
    setSelectedMarkId(null);
  }, [src]);

  useEffect(() => {
    if (mode !== "delete") setSelectedMarkId(null);
  }, [mode]);

  useEffect(() => {
    if (selectedMarkId && !value?.marks.some((mark) => mark.id === selectedMarkId)) setSelectedMarkId(null);
  }, [selectedMarkId, value]);

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
      displaySize, imageWidth: imageSize.width, imageHeight: imageSize.height,
      pixelRatio: window.devicePixelRatio || 1,
      marks: [...(value?.marks ?? []), ...(canDraw ? activeStrokes : [])], selectedMarkId
    });
  }, [activeStrokes, canDraw, displaySize, imageIsCurrent, imageSize, incompatibleDimensions, loadError, selectedMarkId, value]);

  const emit = useCallback((next: WalkaroundData) => {
    expectedEchoRef.current = snapshotSignature(next);
    onChangeRef.current?.(next);
  }, []);

  const commitEdit = useCallback((next: WalkaroundData) => {
    historyPastRef.current.push(valueRef.current);
    historyFutureRef.current = [];
    emit(next);
  }, [emit]);

  const removeMark = useCallback((id: string, documentSignature: string, token: number) => {
    if (!deleteEnabledRef.current || confirmationTokenRef.current !== token || snapshotSignature(valueRef.current) !== documentSignature) return;
    const current = valueRef.current;
    if (!current || !current.marks.some((mark) => mark.id === id)) return;
    commitEdit({ ...current, marks: current.marks.filter((mark) => mark.id !== id) });
    confirmationTokenRef.current += 1;
    setSelectedMarkId(null);
  }, [commitEdit]);

  const requestClear = useCallback(() => {
    if (!editableRef.current) return;
    const current = valueRef.current;
    if (!current || current.marks.length === 0) return;
    const documentSignature = snapshotSignature(current);
    const token = ++confirmationTokenRef.current;
    const confirm = () => {
      if (!editableRef.current || confirmationTokenRef.current !== token || snapshotSignature(valueRef.current) !== documentSignature) return;
      const latest = valueRef.current;
      if (!latest || latest.marks.length === 0) return;
      commitEdit({ ...latest, marks: [] });
      confirmationTokenRef.current += 1;
      setSelectedMarkId(null);
    };
    const cancel = () => {
      if (confirmationTokenRef.current !== token) return;
      confirmationTokenRef.current += 1;
    };
    if (onClearRequest) onClearRequest(confirm, cancel);
    else confirm();
  }, [commitEdit, onClearRequest]);

  const undo = useCallback(() => {
    if (!editableRef.current || historyPastRef.current.length === 0) return;
    const previous = historyPastRef.current.pop()!;
    historyFutureRef.current.push(valueRef.current);
    const next = previous ?? emptySnapshot(valueRef.current, imageSize);
    if (next) emit(next);
    setSelectedMarkId(null);
  }, [emit, imageSize]);

  const redo = useCallback(() => {
    if (!editableRef.current || historyFutureRef.current.length === 0) return;
    const next = historyFutureRef.current.pop()!;
    historyPastRef.current.push(valueRef.current);
    if (next !== null) emit(next);
    setSelectedMarkId(null);
  }, [emit]);

  useImperativeHandle(ref, () => ({
    undo, redo, clear: requestClear,
    canUndo: () => editableRef.current && historyPastRef.current.length > 0,
    canRedo: () => editableRef.current && historyFutureRef.current.length > 0
  }), [redo, requestClear, undo]);

  const pointForEvent = useCallback((event: ReactPointerEvent<HTMLCanvasElement>) => {
    const image = imageRef.current;
    if (!image || !imageSize) return null;
    return displayPointToNatural(event.clientX, event.clientY, image.getBoundingClientRect(), imageSize.width, imageSize.height);
  }, [imageSize]);

  const handlePointerDown = useCallback((event: ReactPointerEvent<HTMLCanvasElement>) => {
    if (event.pointerType === "mouse" && event.button !== 0) return;
    const point = pointForEvent(event);
    if (!point) return;
    if (canDelete && imageSize) {
      const hit = findMarkAtPoint(value?.marks ?? [], point, displaySize, imageSize.width, imageSize.height);
      setSelectedMarkId(hit?.id ?? null);
      if (hit) {
        const documentSignature = snapshotSignature(value);
        const token = ++confirmationTokenRef.current;
        const confirm = () => removeMark(hit.id, documentSignature, token);
        const cancel = () => {
          if (confirmationTokenRef.current !== token) return;
          confirmationTokenRef.current += 1;
          setSelectedMarkId(null);
        };
        if (onDeleteRequest) onDeleteRequest(hit, confirm, cancel);
        else confirm();
      }
      return;
    }
    if (!canDraw) return;
    event.preventDefault();
    const stroke: ActiveStroke = { id: createMarkId(), points: [point], color: resolvedColor, width: resolvedWidth, pointerId: event.pointerId };
    activeStrokesRef.current.set(event.pointerId, stroke);
    setActiveStrokes(Array.from(activeStrokesRef.current.values()));
    try { event.currentTarget.setPointerCapture(event.pointerId); } catch { /* unavailable in some test DOMs */ }
  }, [canDelete, canDraw, displaySize, imageSize, onDeleteRequest, pointForEvent, removeMark, resolvedColor, resolvedWidth, value]);

  const handlePointerMove = useCallback((event: ReactPointerEvent<HTMLCanvasElement>) => {
    const stroke = activeStrokesRef.current.get(event.pointerId);
    if (!stroke) return;
    const point = pointForEvent(event);
    if (!point) return;
    event.preventDefault();
    activeStrokesRef.current.set(event.pointerId, { ...stroke, points: [...stroke.points, point] });
    setActiveStrokes(Array.from(activeStrokesRef.current.values()));
  }, [pointForEvent]);

  const finishPointer = useCallback((event: ReactPointerEvent<HTMLCanvasElement>) => {
    const stroke = activeStrokesRef.current.get(event.pointerId);
    if (!stroke) return;
    activeStrokesRef.current.delete(event.pointerId);
    setActiveStrokes(Array.from(activeStrokesRef.current.values()));
    const current = valueRef.current;
    if (!canDraw || !imageSize || dimensionsError(current, imageSize)) return;
    const finalPoint = pointForEvent(event);
    const lastPoint = stroke.points[stroke.points.length - 1];
    const completedStroke = finalPoint && (finalPoint.x !== lastPoint.x || finalPoint.y !== lastPoint.y)
      ? { ...stroke, points: [...stroke.points, finalPoint] } : stroke;
    const mark: WalkaroundMark = { id: completedStroke.id, points: completedStroke.points, color: completedStroke.color, width: completedStroke.width };
    const nextData: WalkaroundData = current
      ? { ...current, marks: [...current.marks, mark] }
      : { version: 1, imageWidth: imageSize.width, imageHeight: imageSize.height, marks: [mark] };
    commitEdit(nextData);
  }, [canDraw, commitEdit, imageSize, pointForEvent]);

  const error = imageIsCurrent ? loadError || incompatibleDimensions : null;
  return <div className={className}>
    <div style={{ position: "relative", width: "100%" }}>
      <img ref={imageRef} src={src} alt="Walkaround image" draggable={false}
        onLoad={(event) => {
          const image = event.currentTarget;
          activeStrokesRef.current.clear(); setActiveStrokes([]);
          if (image.naturalWidth <= 0 || image.naturalHeight <= 0) {
            setLoadedSrc(src); setLoadError("The walkaround image has invalid natural dimensions."); return;
          }
          setLoadError(null); setImageSize({ width: image.naturalWidth, height: image.naturalHeight }); setLoadedSrc(src); updateDisplaySize();
        }}
        onError={() => { activeStrokesRef.current.clear(); setActiveStrokes([]); setLoadedSrc(src); setLoadError("The walkaround image could not be loaded."); }}
        style={{ display: "block", width: "100%", height: "auto", userSelect: "none" }} />
      <canvas ref={canvasRef} aria-label="Walkaround drawing surface" onPointerDown={handlePointerDown} onPointerMove={handlePointerMove}
        onPointerUp={finishPointer} onPointerCancel={finishPointer}
        style={{ position: "absolute", inset: 0, width: "100%", height: "100%", touchAction: "none", cursor: canDraw ? "crosshair" : canDelete ? "pointer" : "default" }} />
    </div>
    {error && <div role="alert">{error}</div>}
  </div>;
});
