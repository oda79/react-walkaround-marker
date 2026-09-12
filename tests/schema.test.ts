import { describe, expect, it } from "vitest";
import { parseWalkaround, serializeWalkaround } from "../src/serialization/schema";
import type { WalkaroundData } from "../src/types";

const data: WalkaroundData = {
  version: 1,
  imageWidth: 1536,
  imageHeight: 1024,
  marks: [{
    id: "mark-1",
    points: [{ x: 640, y: 315 }],
    color: "#ef4444",
    width: 10,
    metadata: { source: "inspection", flags: ["urgent"], nested: { visible: true } }
  }]
};

describe("walkaround JSON", () => {
  it("round-trips marks and opaque JSON-compatible metadata", () => {
    expect(parseWalkaround(serializeWalkaround(data))).toEqual(data);
  });

  it("rejects malformed JSON and unsupported versions", () => {
    expect(() => parseWalkaround("not json")).toThrow("malformed JSON");
    expect(() => parseWalkaround(JSON.stringify({ ...data, version: 2 }))).toThrow("version must be 1");
  });

  it("rejects invalid marks", () => {
    expect(() => parseWalkaround(JSON.stringify({ ...data, marks: [{ ...data.marks[0], width: 0 }] })))
      .toThrow("width must be a positive finite number");
  });

  it("rejects metadata that is not made of plain JSON objects", () => {
    const dataWithDate = {
      ...data,
      marks: [{ ...data.marks[0], metadata: { recordedAt: new Date("2026-01-01T00:00:00.000Z") } }]
    };
    expect(() => serializeWalkaround(dataWithDate)).toThrow("metadata must be a JSON-compatible object");
  });
});
