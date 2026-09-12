import { describe, expect, it } from "vitest";
import { findMarkAtPoint, markContainsPoint } from "../src/canvas/hitTest";
import type { WalkaroundMark } from "../src/types";

const first: WalkaroundMark = { id: "first", color: "#f00", width: 4, points: [{ x: 100, y: 100 }, { x: 300, y: 100 }] };
const second: WalkaroundMark = { id: "second", color: "#0f0", width: 4, points: [{ x: 100, y: 100 }, { x: 300, y: 100 }] };

describe("mark hit testing", () => {
  it("matches direct and touch-friendly near-line taps, but not distant taps", () => {
    expect(markContainsPoint(first, { x: 200, y: 100 }, 16)).toBe(true);
    expect(markContainsPoint(first, { x: 200, y: 115 }, 16)).toBe(true);
    expect(markContainsPoint(first, { x: 200, y: 120 }, 16)).toBe(false);
  });

  it("prefers the visually topmost/latest matching mark", () => {
    expect(findMarkAtPoint([first, second], { x: 200, y: 100 }, { width: 500, height: 250 }, 1000, 500)?.id).toBe("second");
  });

  it("keeps matching the same natural point after responsive resizing", () => {
    expect(findMarkAtPoint([first], { x: 200, y: 100 }, { width: 500, height: 250 }, 1000, 500)?.id).toBe("first");
    expect(findMarkAtPoint([first], { x: 200, y: 100 }, { width: 1000, height: 500 }, 1000, 500)?.id).toBe("first");
  });
});
