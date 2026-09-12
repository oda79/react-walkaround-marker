import type { WalkaroundData, WalkaroundMark, WalkaroundPoint } from "../types";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isPlainRecord(value: unknown): value is Record<string, unknown> {
  if (!isRecord(value)) return false;
  const prototype = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
}

function isJsonValue(value: unknown, ancestors = new Set<object>()): boolean {
  if (value === null || typeof value === "string" || typeof value === "boolean") return true;
  if (typeof value === "number") return Number.isFinite(value);
  if (!Array.isArray(value) && !isPlainRecord(value)) return false;
  if (ancestors.has(value)) return false;
  ancestors.add(value);
  const valid = Object.values(value).every((nested) => isJsonValue(nested, ancestors));
  ancestors.delete(value);
  return valid;
}

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(`Invalid walkaround JSON: ${message}`);
}

function validatePoint(value: unknown, markIndex: number, pointIndex: number): asserts value is WalkaroundPoint {
  assert(isRecord(value), `marks[${markIndex}].points[${pointIndex}] must be an object`);
  assert(typeof value.x === "number" && Number.isFinite(value.x), `marks[${markIndex}].points[${pointIndex}].x must be finite`);
  assert(typeof value.y === "number" && Number.isFinite(value.y), `marks[${markIndex}].points[${pointIndex}].y must be finite`);
}

function validateMark(value: unknown, index: number): asserts value is WalkaroundMark {
  assert(isRecord(value), `marks[${index}] must be an object`);
  assert(typeof value.id === "string" && value.id.length > 0, `marks[${index}].id must be a non-empty string`);
  assert(Array.isArray(value.points), `marks[${index}].points must be an array`);
  assert(value.points.length > 0, `marks[${index}].points must not be empty`);
  value.points.forEach((point, pointIndex) => validatePoint(point, index, pointIndex));
  assert(typeof value.color === "string" && value.color.length > 0, `marks[${index}].color must be a non-empty string`);
  assert(typeof value.width === "number" && Number.isFinite(value.width) && value.width > 0, `marks[${index}].width must be a positive finite number`);
  assert(value.metadata === undefined || (isPlainRecord(value.metadata) && isJsonValue(value.metadata)), `marks[${index}].metadata must be a JSON-compatible object`);
}

/** Validates a parsed value and returns it with the public data type. */
export function validateWalkaroundData(value: unknown): WalkaroundData {
  assert(isRecord(value), "root must be an object");
  assert(value.version === 1, "version must be 1");
  assert(typeof value.imageWidth === "number" && Number.isFinite(value.imageWidth) && value.imageWidth > 0, "imageWidth must be a positive finite number");
  assert(typeof value.imageHeight === "number" && Number.isFinite(value.imageHeight) && value.imageHeight > 0, "imageHeight must be a positive finite number");
  assert(Array.isArray(value.marks), "marks must be an array");
  value.marks.forEach(validateMark);
  return value as WalkaroundData;
}

export function serializeWalkaround(data: WalkaroundData): string {
  validateWalkaroundData(data);
  return JSON.stringify(data);
}

export function parseWalkaround(json: string): WalkaroundData {
  let value: unknown;
  try {
    value = JSON.parse(json);
  } catch {
    throw new Error("Invalid walkaround JSON: malformed JSON");
  }
  return validateWalkaroundData(value);
}
