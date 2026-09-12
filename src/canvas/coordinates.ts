import type { WalkaroundPoint } from "../types";

export type DisplaySize = {
  width: number;
  height: number;
};

/** Converts a point from the displayed image to its natural-image coordinate. */
export function displayPointToNatural(
  clientX: number,
  clientY: number,
  rect: Pick<DOMRect, "left" | "top" | "width" | "height">,
  imageWidth: number,
  imageHeight: number
): WalkaroundPoint {
  if (rect.width <= 0 || rect.height <= 0) {
    throw new Error("Cannot convert a point for an image with no displayed size.");
  }

  // Clamping allows a captured pointer to finish just outside the image without
  // producing geometry outside of the source image.
  const x = Math.min(Math.max(clientX - rect.left, 0), rect.width);
  const y = Math.min(Math.max(clientY - rect.top, 0), rect.height);

  return {
    x: (x / rect.width) * imageWidth,
    y: (y / rect.height) * imageHeight
  };
}

export function naturalToDisplayScale(
  display: DisplaySize,
  imageWidth: number,
  imageHeight: number) {
  return {
    x: display.width / imageWidth,
    y: display.height / imageHeight
  };
}
