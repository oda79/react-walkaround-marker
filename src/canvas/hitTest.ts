import { naturalToDisplayScale, type DisplaySize } from "./coordinates";
import type { WalkaroundMark, WalkaroundPoint } from "../types";

/** Squared distance from a point to a finite line segment. */
export function pointToSegmentDistanceSquared(point: WalkaroundPoint, start: WalkaroundPoint, end: WalkaroundPoint) {
  const deltaX = end.x - start.x;
  const deltaY = end.y - start.y;
  const lengthSquared = deltaX * deltaX + deltaY * deltaY;
  if (lengthSquared === 0) {
    const x = point.x - start.x;
    const y = point.y - start.y;
    return x * x + y * y;
  }
  const projection = Math.max(0, Math.min(1, ((point.x - start.x) * deltaX + (point.y - start.y) * deltaY) / lengthSquared));
  const x = point.x - (start.x + projection * deltaX);
  const y = point.y - (start.y + projection * deltaY);
  return x * x + y * y;
}

export function markContainsPoint(mark: WalkaroundMark, point: WalkaroundPoint, tolerance: number) {
  const effectiveTolerance = Math.max(tolerance, mark.width / 2);
  const toleranceSquared = effectiveTolerance * effectiveTolerance;
  if (mark.points.length === 1) return pointToSegmentDistanceSquared(point, mark.points[0], mark.points[0]) <= toleranceSquared;
  for (let index = 1; index < mark.points.length; index += 1) {
    if (pointToSegmentDistanceSquared(point, mark.points[index - 1], mark.points[index]) <= toleranceSquared) return true;
  }
  return false;
}

/**
 * Finds the most recently drawn matching mark. Tolerance is kept at roughly
 * 16 CSS pixels, then converted to the natural image coordinate system.
 */
export function findMarkAtPoint(
  marks: WalkaroundMark[], point: WalkaroundPoint, displaySize: DisplaySize, imageWidth: number, imageHeight: number
) {
  const scale = naturalToDisplayScale(displaySize, imageWidth, imageHeight);
  const naturalTolerance = 16 / Math.max(Math.min(scale.x, scale.y), Number.EPSILON);
  for (let index = marks.length - 1; index >= 0; index -= 1) {
    if (markContainsPoint(marks[index], point, naturalTolerance)) return marks[index];
  }
  return null;
}
