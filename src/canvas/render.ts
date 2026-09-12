import type { WalkaroundMark } from "../types";
import { naturalToDisplayScale, type DisplaySize } from "./coordinates";
import { drawStroke } from "./stroke";

export type RenderMarksOptions = {
  displaySize: DisplaySize;
  imageWidth: number;
  imageHeight: number;
  pixelRatio: number;
  marks: WalkaroundMark[];
  selectedMarkId?: string | null;
};

/** Clears and redraws vector marks without ever changing their stored points. */
export function renderMarks(canvas: HTMLCanvasElement, options: RenderMarksOptions) {
  const { displaySize, imageWidth, imageHeight, pixelRatio, marks, selectedMarkId } = options;
  const context = canvas.getContext("2d");
  if (!context || displaySize.width <= 0 || displaySize.height <= 0) return;

  const bitmapWidth = Math.max(1, Math.round(displaySize.width * pixelRatio));
  const bitmapHeight = Math.max(1, Math.round(displaySize.height * pixelRatio));
  if (canvas.width !== bitmapWidth) canvas.width = bitmapWidth;
  if (canvas.height !== bitmapHeight) canvas.height = bitmapHeight;

  context.setTransform(1, 0, 0, 1, 0, 0);
  context.clearRect(0, 0, canvas.width, canvas.height);

  const scale = naturalToDisplayScale(displaySize, imageWidth, imageHeight);
  context.setTransform(pixelRatio * scale.x, 0, 0, pixelRatio * scale.y, 0, 0);
  for (const mark of marks) {
    if (mark.id === selectedMarkId) {
      context.save();
      context.globalAlpha = 0.3;
      drawStroke(context, { ...mark, width: mark.width + Math.max(8, mark.width * 0.8) });
      context.restore();
    }
    drawStroke(context, mark);
  }
}
