# Task 1 — Core drawing and JSON persistence

Repository: `oda79/react-walkaround-marker`

## Goal

Create the initial public React + TypeScript package for freehand drawing over a walkaround image.

This task establishes the package architecture, coordinate model, drawing behavior, and JSON persistence. Do not implement mark deletion, Undo/Redo, Clear All, or the final toolbar yet.

## Scope

The component must:

- accept a PNG/JPG/WebP image;
- render it as the immutable background;
- support freehand drawing with mouse, finger, or stylus;
- use Pointer Events;
- support `draw` and `view` modes;
- use configurable drawing color and stroke width;
- default to red and 10px;
- store each pointer gesture as one mark;
- preserve optional mark metadata;
- save/restore all marks as versioned JSON;
- remain correct when responsively resized.

## Package setup

Create npm-ready package:

```text
@oda79/react-walkaround-marker
```

Use:

- React
- TypeScript
- Canvas 2D API
- Pointer Events
- Vitest
- `tsup` or another lightweight library build tool

Do not use Fabric.js, Konva, PixiJS, or similar large graphics libraries.

React and ReactDOM should be peer dependencies.

Suggested structure:

```text
src/
  WalkaroundMarker.tsx
  types.ts
  canvas/
    coordinates.ts
    render.ts
    stroke.ts
  serialization/
    schema.ts
  index.ts
tests/
examples/
README.md
```

## Public data model

Export:

```ts
export type WalkaroundPoint = {
  x: number;
  y: number;
};

export type WalkaroundMark = {
  id: string;
  points: WalkaroundPoint[];
  color: string;
  width: number;
  metadata?: Record<string, unknown>;
};

export type WalkaroundData = {
  version: 1;
  imageWidth: number;
  imageHeight: number;
  marks: WalkaroundMark[];
};

export type WalkaroundMode = "draw" | "delete" | "view";
```

`delete` can exist in the public type now but does not need functional behavior until Task 2.

One pointer-down → pointer-up sequence = one `WalkaroundMark`.

## Coordinate system — hard requirement

Do not store points in current CSS/canvas display pixels.

Store coordinates in the source image's natural coordinate system:

```text
naturalWidth
naturalHeight
```

Example:

```text
source image: 1536 x 1024
stored point:  x=640, y=315
```

If displayed at 768 x 512, render using scale transforms. Resizing must never rewrite stored coordinates.

Stroke width should also be interpreted in natural-image coordinates and scale with the image.

## Component API

Implement a controlled component similar to:

```tsx
<WalkaroundMarker
  src="/vehicle.png"
  value={data}
  onChange={setData}
  mode="draw"
  color="#ef4444"
  strokeWidth={10}
/>
```

Required props:

```ts
type WalkaroundMarkerProps = {
  src: string;
  value: WalkaroundData | null;
  onChange?: (data: WalkaroundData) => void;

  mode?: WalkaroundMode;
  color?: string;
  strokeWidth?: number;

  className?: string;
  disabled?: boolean;
};
```

Defaults:

```text
mode = draw
color = #ef4444
strokeWidth = 10
```

`view` and `disabled` must prevent all mutation.

## Pointer input

Use only:

```text
pointerdown
pointermove
pointerup
pointercancel
```

Do not build separate mouse/touch paths.

Requirements:

- ignore non-primary mouse buttons;
- use `setPointerCapture`;
- append natural-coordinate points during movement;
- finalize on pointerup/pointercancel;
- use `touch-action: none` on the interactive surface;
- work with mouse, touch, and stylus.

## Rendering

Use Canvas 2D.

For strokes:

```text
lineCap = round
lineJoin = round
```

Lightweight smoothing is acceptable.

Do not flatten marks into the background image.

The canvas must support `devicePixelRatio` so it remains sharp on high-DPI screens.

Use `ResizeObserver` or equivalent to keep the component responsive while preserving source-image aspect ratio.

## Controlled state

`value` is the authoritative persisted state.

Temporary in-progress stroke state is allowed while drawing, but committed marks must come through `value`/`onChange`.

Support `value = null` as an empty/uninitialized state.

After image load, emitted data must use the actual source image dimensions.

Do not silently treat saved data for a different image size as if it belonged to the current image. Validate and surface a clear failure.

## JSON helpers

Export:

```ts
serializeWalkaround(data: WalkaroundData): string
parseWalkaround(json: string): WalkaroundData
```

Validate:

- version;
- dimensions;
- marks;
- point arrays;
- width;
- color;
- metadata shape.

`metadata` must remain opaque and JSON-compatible. Do not add CRM-specific fields.

## Demo

Provide a simple example showing:

- image loading;
- drawing;
- configurable color;
- configurable width;
- draw/view switching;
- current JSON;
- restoring from JSON.

No final toolbar required yet.

## Tests

Cover at least:

- defaults;
- image natural dimensions;
- display → natural coordinate conversion;
- conversion after resize;
- one pointer gesture creates one mark;
- configured color/width saved on mark;
- metadata survives serialize/parse;
- view mode cannot mutate;
- disabled mode cannot mutate;
- JSON round-trip;
- invalid JSON/version handling.

## Out of scope

Do not implement yet:

- delete selection;
- hit testing;
- confirmation dialogs;
- Undo;
- Redo;
- Clear All;
- polished toolbar;
- zoom/pan;
- shapes/text/arrows;
- partial eraser;
- CRM integration.

## Acceptance criteria

1. Package builds as a reusable React library.
2. PNG/JPG/WebP backgrounds work.
3. Freehand drawing works through Pointer Events.
4. Mouse/touch/stylus share the same code path.
5. Marks are stored in natural-image coordinates.
6. Responsive resize does not change JSON geometry.
7. Draw/view modes work.
8. Color and width are configurable, defaulting to red/10px.
9. Metadata is supported.
10. JSON can be exported and restored.
11. Tests, lint, typecheck, and build pass.
