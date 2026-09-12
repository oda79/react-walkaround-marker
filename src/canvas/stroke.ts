import type { WalkaroundMark } from "../types";

/** Draws one mark after the context has been scaled to natural image units. */
export function drawStroke(context: CanvasRenderingContext2D, mark: WalkaroundMark) {
  const { points } = mark;
  if (points.length === 0) return;

  context.strokeStyle = mark.color;
  context.fillStyle = mark.color;
  context.lineWidth = mark.width;
  context.lineCap = "round";
  context.lineJoin = "round";

  if (points.length === 1) {
    context.beginPath();
    context.arc(points[0].x, points[0].y, mark.width / 2, 0, Math.PI * 2);
    context.fill();
    return;
  }

  context.beginPath();
  context.moveTo(points[0].x, points[0].y);
  for (let index = 1; index < points.length; index += 1) {
    context.lineTo(points[index].x, points[index].y);
  }
  context.stroke();
}
