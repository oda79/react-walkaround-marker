import { describe, expect, it } from "vitest";
import { displayPointToNatural } from "../src/canvas/coordinates";

describe("displayPointToNatural", () => {
  it("converts display pixels to the source image coordinate system", () => {
    expect(displayPointToNatural(330, 207.5, { left: 10, top: 50, width: 768, height: 512 }, 1536, 1024))
      .toEqual({ x: 640, y: 315 });
  });

  it("preserves natural geometry when the displayed image is resized", () => {
    const original = displayPointToNatural(330, 207.5, { left: 10, top: 50, width: 768, height: 512 }, 1536, 1024);
    const resized = displayPointToNatural(650, 365, { left: 10, top: 50, width: 1536, height: 1024 }, 1536, 1024);
    expect(resized).toEqual(original);
  });
});
