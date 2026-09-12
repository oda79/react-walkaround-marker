import { fireEvent, render } from "@testing-library/react";
import { useState } from "react";
import { describe, expect, it, vi } from "vitest";
import { WalkaroundMarker } from "../src/WalkaroundMarker";
import type { WalkaroundData } from "../src/types";

vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue(null);

function pointer(canvas: HTMLCanvasElement, type: string, properties: { pointerId: number; clientX: number; clientY: number }) {
  const event = new MouseEvent(type, { bubbles: true, cancelable: true, clientX: properties.clientX, clientY: properties.clientY, button: 0 });
  Object.defineProperties(event, {
    pointerId: { value: properties.pointerId },
    pointerType: { value: "mouse" }
  });
  fireEvent(canvas, event);
}

function loadImage(container: HTMLElement) {
  const image = container.querySelector("img")!;
  Object.defineProperty(image, "naturalWidth", { value: 1000, configurable: true });
  Object.defineProperty(image, "naturalHeight", { value: 500, configurable: true });
  image.getBoundingClientRect = () => ({ left: 10, top: 20, width: 500, height: 250 } as DOMRect);
  fireEvent.load(image);
  return container.querySelector("canvas")!;
}

function ControlledMarker({ onChange }: { onChange: (data: WalkaroundData) => void }) {
  const [value, setValue] = useState<WalkaroundData | null>(null);
  return <WalkaroundMarker src="vehicle.png" value={value} onChange={(next) => { onChange(next); setValue(next); }} />;
}

describe("WalkaroundMarker", () => {
  it("saves the default red, 10px stroke style", () => {
    const onChange = vi.fn();
    const { container } = render(<WalkaroundMarker src="vehicle.png" value={null} onChange={onChange} />);
    const canvas = loadImage(container);
    pointer(canvas, "pointerdown", { pointerId: 1, clientX: 20, clientY: 30 });
    pointer(canvas, "pointerup", { pointerId: 1, clientX: 20, clientY: 30 });

    expect((onChange.mock.calls[0][0] as WalkaroundData).marks[0]).toMatchObject({
      color: "#ef4444",
      width: 10
    });
  });

  it("creates exactly one natural-coordinate mark per gesture using configured styling", () => {
    const onChange = vi.fn();
    const { container } = render(<WalkaroundMarker src="vehicle.png" value={null} onChange={onChange} color="#123456" strokeWidth={7} />);
    const canvas = loadImage(container);
    pointer(canvas, "pointerdown", { pointerId: 4, clientX: 260, clientY: 145 });
    pointer(canvas, "pointermove", { pointerId: 4, clientX: 510, clientY: 270 });
    pointer(canvas, "pointerup", { pointerId: 4, clientX: 510, clientY: 270 });

    expect(onChange).toHaveBeenCalledTimes(1);
    const next = onChange.mock.calls[0][0] as WalkaroundData;
    expect(next).toMatchObject({ version: 1, imageWidth: 1000, imageHeight: 500 });
    expect(next.marks).toHaveLength(1);
    expect(next.marks[0]).toMatchObject({ color: "#123456", width: 7, points: [{ x: 500, y: 250 }, { x: 1000, y: 500 }] });
  });

  it.each([{ mode: "view" as const }, { disabled: true }])("does not mutate when %#", (props) => {
    const onChange = vi.fn();
    const { container } = render(<WalkaroundMarker src="vehicle.png" value={null} onChange={onChange} {...props} />);
    const canvas = loadImage(container);
    pointer(canvas, "pointerdown", { pointerId: 1, clientX: 20, clientY: 30 });
    pointer(canvas, "pointerup", { pointerId: 1, clientX: 20, clientY: 30 });
    expect(onChange).not.toHaveBeenCalled();
  });

  it("does not commit a gesture if drawing becomes read-only before pointer-up", () => {
    const onChange = vi.fn();
    const rendered = render(<WalkaroundMarker src="vehicle.png" value={null} onChange={onChange} />);
    const canvas = loadImage(rendered.container);
    pointer(canvas, "pointerdown", { pointerId: 1, clientX: 20, clientY: 30 });
    rendered.rerender(<WalkaroundMarker src="vehicle.png" value={null} onChange={onChange} mode="view" />);
    pointer(canvas, "pointerup", { pointerId: 1, clientX: 20, clientY: 30 });
    expect(onChange).not.toHaveBeenCalled();
  });

  it("keeps simultaneous pointer gestures separate", () => {
    const onChange = vi.fn();
    const { container } = render(<ControlledMarker onChange={onChange} />);
    const canvas = loadImage(container);
    pointer(canvas, "pointerdown", { pointerId: 1, clientX: 20, clientY: 30 });
    pointer(canvas, "pointerdown", { pointerId: 2, clientX: 120, clientY: 30 });
    pointer(canvas, "pointerup", { pointerId: 1, clientX: 20, clientY: 30 });
    pointer(canvas, "pointerup", { pointerId: 2, clientX: 120, clientY: 30 });
    expect(onChange).toHaveBeenCalledTimes(2);
    expect((onChange.mock.calls[1][0] as WalkaroundData).marks).toHaveLength(2);
  });

  it("does not use an emitted mark when the controlled parent rejects it", () => {
    const onChange = vi.fn();
    const { container } = render(<WalkaroundMarker src="vehicle.png" value={null} onChange={onChange} />);
    const canvas = loadImage(container);
    pointer(canvas, "pointerdown", { pointerId: 1, clientX: 20, clientY: 30 });
    pointer(canvas, "pointerup", { pointerId: 1, clientX: 20, clientY: 30 });
    pointer(canvas, "pointerdown", { pointerId: 2, clientX: 120, clientY: 30 });
    pointer(canvas, "pointerup", { pointerId: 2, clientX: 120, clientY: 30 });

    expect(onChange).toHaveBeenCalledTimes(2);
    expect((onChange.mock.calls[0][0] as WalkaroundData).marks).toHaveLength(1);
    expect((onChange.mock.calls[1][0] as WalkaroundData).marks).toHaveLength(1);
  });
});
