import { act, fireEvent, render } from "@testing-library/react";
import { createRef, useState } from "react";
import { describe, expect, it, vi } from "vitest";
import { WalkaroundMarker, type WalkaroundMarkerHandle } from "../src/WalkaroundMarker";
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

  it("requests deletion and preserves complete mark metadata until confirmation", () => {
    const onChange = vi.fn();
    const onDeleteRequest = vi.fn();
    const value: WalkaroundData = {
      version: 1, imageWidth: 1000, imageHeight: 500,
      marks: [{ id: "damage", color: "#f00", width: 6, points: [{ x: 100, y: 100 }, { x: 300, y: 100 }], metadata: { issueId: "123" } }]
    };
    const { container } = render(<WalkaroundMarker src="vehicle.png" value={value} onChange={onChange} mode="delete" onDeleteRequest={onDeleteRequest} />);
    const canvas = loadImage(container);
    pointer(canvas, "pointerdown", { pointerId: 1, clientX: 110, clientY: 70 });

    expect(onDeleteRequest).toHaveBeenCalledWith(value.marks[0], expect.any(Function), expect.any(Function));
    expect(onChange).not.toHaveBeenCalled();
    (onDeleteRequest.mock.calls[0][1] as () => void)();
    expect((onChange.mock.calls[0][0] as WalkaroundData).marks).toEqual([]);
    expect(value.marks[0].metadata).toEqual({ issueId: "123" });
  });

  it("leaves marks unchanged when a delete request is cancelled", () => {
    const onChange = vi.fn();
    const onDeleteRequest = vi.fn();
    const value: WalkaroundData = {
      version: 1, imageWidth: 1000, imageHeight: 500,
      marks: [{ id: "damage", color: "#f00", width: 6, points: [{ x: 100, y: 100 }, { x: 300, y: 100 }] }]
    };
    const { container } = render(<WalkaroundMarker src="vehicle.png" value={value} onChange={onChange} mode="delete" onDeleteRequest={onDeleteRequest} />);
    pointer(loadImage(container), "pointerdown", { pointerId: 1, clientX: 110, clientY: 70 });

    (onDeleteRequest.mock.calls[0][2] as () => void)();
    expect(onChange).not.toHaveBeenCalled();
  });

  it("invalidates a pending delete when the parent replaces the document", () => {
    const onChange = vi.fn();
    const onDeleteRequest = vi.fn();
    const original: WalkaroundData = {
      version: 1, imageWidth: 1000, imageHeight: 500,
      marks: [{ id: "same-id", color: "#f00", width: 6, points: [{ x: 100, y: 100 }, { x: 300, y: 100 }] }]
    };
    const replacement: WalkaroundData = { ...original, marks: [{ ...original.marks[0], color: "#0f0" }] };
    const rendered = render(<WalkaroundMarker src="vehicle.png" value={original} onChange={onChange} mode="delete" onDeleteRequest={onDeleteRequest} />);
    const canvas = loadImage(rendered.container);
    pointer(canvas, "pointerdown", { pointerId: 1, clientX: 110, clientY: 70 });
    rendered.rerender(<WalkaroundMarker src="vehicle.png" value={replacement} onChange={onChange} mode="delete" onDeleteRequest={onDeleteRequest} />);

    (onDeleteRequest.mock.calls[0][1] as () => void)();
    expect(onChange).not.toHaveBeenCalled();
  });

  it("invalidates a pending clear when the parent replaces the document", () => {
    const markerRef = createRef<WalkaroundMarkerHandle>();
    const onChange = vi.fn();
    const onClearRequest = vi.fn();
    const original: WalkaroundData = {
      version: 1, imageWidth: 1000, imageHeight: 500,
      marks: [{ id: "original", color: "#f00", width: 6, points: [{ x: 100, y: 100 }] }]
    };
    const replacement: WalkaroundData = { ...original, marks: [{ ...original.marks[0], id: "replacement" }] };
    const rendered = render(<WalkaroundMarker ref={markerRef} src="vehicle.png" value={original} onChange={onChange} onClearRequest={onClearRequest} />);
    loadImage(rendered.container);
    act(() => markerRef.current?.clear());
    rendered.rerender(<WalkaroundMarker ref={markerRef} src="vehicle.png" value={replacement} onChange={onChange} onClearRequest={onClearRequest} />);

    (onClearRequest.mock.calls[0][0] as () => void)();
    expect(onChange).not.toHaveBeenCalled();
  });

  it("undoes and redoes drawing through the public handle", () => {
    const markerRef = createRef<WalkaroundMarkerHandle>();
    const onChange = vi.fn();
    function HistoryMarker() {
      const [value, setValue] = useState<WalkaroundData | null>(null);
      return <WalkaroundMarker ref={markerRef} src="vehicle.png" value={value} onChange={(next) => { onChange(next); setValue(next); }} />;
    }
    const { container } = render(<HistoryMarker />);
    const canvas = loadImage(container);
    pointer(canvas, "pointerdown", { pointerId: 1, clientX: 20, clientY: 30 });
    pointer(canvas, "pointerup", { pointerId: 1, clientX: 20, clientY: 30 });
    expect(markerRef.current?.canUndo()).toBe(true);

    act(() => markerRef.current?.undo());
    expect((onChange.mock.calls[1][0] as WalkaroundData).marks).toEqual([]);
    expect(markerRef.current?.canRedo()).toBe(true);

    act(() => markerRef.current?.redo());
    expect((onChange.mock.calls[2][0] as WalkaroundData).marks).toHaveLength(1);
  });

  it("undoes and redoes a confirmed delete, including mark metadata", () => {
    const markerRef = createRef<WalkaroundMarkerHandle>();
    const onChange = vi.fn();
    const initial: WalkaroundData = {
      version: 1, imageWidth: 1000, imageHeight: 500,
      marks: [{ id: "damage", color: "#f00", width: 6, points: [{ x: 100, y: 100 }], metadata: { issueId: "123" } }]
    };
    function DeleteHistoryMarker() {
      const [value, setValue] = useState(initial);
      return <WalkaroundMarker ref={markerRef} src="vehicle.png" value={value} mode="delete" onChange={(next) => { onChange(next); setValue(next); }} onDeleteRequest={(_mark, confirm) => confirm()} />;
    }
    const { container } = render(<DeleteHistoryMarker />);
    pointer(loadImage(container), "pointerdown", { pointerId: 1, clientX: 60, clientY: 70 });
    expect((onChange.mock.calls[0][0] as WalkaroundData).marks).toEqual([]);

    act(() => markerRef.current?.undo());
    expect((onChange.mock.calls[1][0] as WalkaroundData).marks[0].metadata).toEqual({ issueId: "123" });
    act(() => markerRef.current?.redo());
    expect((onChange.mock.calls[2][0] as WalkaroundData).marks).toEqual([]);
  });

  it("confirms clear and can undo and redo the complete clear", () => {
    const markerRef = createRef<WalkaroundMarkerHandle>();
    const onChange = vi.fn();
    const onClearRequest = vi.fn();
    const initial: WalkaroundData = {
      version: 1, imageWidth: 1000, imageHeight: 500,
      marks: [{ id: "damage", color: "#f00", width: 6, points: [{ x: 100, y: 100 }], metadata: { issueId: "123" } }]
    };
    function ClearHistoryMarker() {
      const [value, setValue] = useState(initial);
      return <WalkaroundMarker ref={markerRef} src="vehicle.png" value={value} onChange={(next) => { onChange(next); setValue(next); }} onClearRequest={onClearRequest} />;
    }
    const { container } = render(<ClearHistoryMarker />);
    loadImage(container);
    act(() => markerRef.current?.clear());
    expect(onClearRequest).toHaveBeenCalledOnce();
    act(() => (onClearRequest.mock.calls[0][0] as () => void)());
    expect((onChange.mock.calls[0][0] as WalkaroundData).marks).toEqual([]);

    act(() => markerRef.current?.undo());
    expect((onChange.mock.calls[1][0] as WalkaroundData).marks[0].metadata).toEqual({ issueId: "123" });
    act(() => markerRef.current?.redo());
    expect((onChange.mock.calls[2][0] as WalkaroundData).marks).toEqual([]);
  });

  it("clears the redo branch when a new edit follows undo", () => {
    const markerRef = createRef<WalkaroundMarkerHandle>();
    const onChange = vi.fn();
    function BranchHistoryMarker() {
      const [value, setValue] = useState<WalkaroundData | null>(null);
      return <WalkaroundMarker ref={markerRef} src="vehicle.png" value={value} onChange={(next) => { onChange(next); setValue(next); }} />;
    }
    const { container } = render(<BranchHistoryMarker />);
    const canvas = loadImage(container);
    pointer(canvas, "pointerdown", { pointerId: 1, clientX: 20, clientY: 30 });
    pointer(canvas, "pointerup", { pointerId: 1, clientX: 20, clientY: 30 });
    act(() => markerRef.current?.undo());
    expect(markerRef.current?.canRedo()).toBe(true);
    pointer(canvas, "pointerdown", { pointerId: 2, clientX: 120, clientY: 30 });
    pointer(canvas, "pointerup", { pointerId: 2, clientX: 120, clientY: 30 });

    expect(markerRef.current?.canRedo()).toBe(false);
    act(() => markerRef.current?.redo());
    expect(onChange).toHaveBeenCalledTimes(3);
  });

  it("resets history when the parent replaces the current document", () => {
    const markerRef = createRef<WalkaroundMarkerHandle>();
    const onChange = vi.fn();
    const initial: WalkaroundData = {
      version: 1, imageWidth: 1000, imageHeight: 500,
      marks: [{ id: "original", color: "#f00", width: 6, points: [{ x: 100, y: 100 }] }]
    };
    const rendered = render(<WalkaroundMarker ref={markerRef} src="vehicle.png" value={initial} onChange={onChange} mode="delete" onDeleteRequest={(_mark, confirm) => confirm()} />);
    pointer(loadImage(rendered.container), "pointerdown", { pointerId: 1, clientX: 60, clientY: 70 });
    const emitted = onChange.mock.calls[0][0] as WalkaroundData;
    rendered.rerender(<WalkaroundMarker ref={markerRef} src="vehicle.png" value={emitted} onChange={onChange} mode="delete" onDeleteRequest={(_mark, confirm) => confirm()} />);
    expect(markerRef.current?.canUndo()).toBe(true);
    const replacement: WalkaroundData = { ...initial, marks: [{ ...initial.marks[0], id: "replacement", color: "#0f0" }] };
    rendered.rerender(<WalkaroundMarker ref={markerRef} src="vehicle.png" value={replacement} onChange={onChange} mode="delete" onDeleteRequest={(_mark, confirm) => confirm()} />);

    expect(markerRef.current?.canUndo()).toBe(false);
    expect(markerRef.current?.canRedo()).toBe(false);
    act(() => markerRef.current?.undo());
    expect(onChange).toHaveBeenCalledTimes(1);
  });

  it("preserves history when the parent supplies equivalent cloned values", () => {
    const markerRef = createRef<WalkaroundMarkerHandle>();
    const onChange = vi.fn();
    const rendered = render(<WalkaroundMarker ref={markerRef} src="vehicle.png" value={null} onChange={onChange} />);
    const canvas = loadImage(rendered.container);
    pointer(canvas, "pointerdown", { pointerId: 1, clientX: 20, clientY: 30 });
    pointer(canvas, "pointerup", { pointerId: 1, clientX: 20, clientY: 30 });
    const emitted = onChange.mock.calls[0][0] as WalkaroundData;
    const clone = () => JSON.parse(JSON.stringify(emitted)) as WalkaroundData;

    rendered.rerender(<WalkaroundMarker ref={markerRef} src="vehicle.png" value={clone()} onChange={onChange} />);
    rendered.rerender(<WalkaroundMarker ref={markerRef} src="vehicle.png" value={clone()} onChange={onChange} />);
    expect(markerRef.current?.canUndo()).toBe(true);
    act(() => markerRef.current?.undo());
    expect((onChange.mock.calls[1][0] as WalkaroundData).marks).toEqual([]);
  });
});
