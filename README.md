# @oda79/react-walkaround-marker

A controlled React canvas component for freehand annotations over a vehicle or other image. Marks remain editable JSON; the source image is never altered.

[Live demo](https://oda79.github.io/react-walkaround-marker/) · [Demo source](examples/demo) · [MIT license](LICENSE)

The live demo link becomes available after GitHub Pages is enabled as described below.

## Installation

```bash
pnpm add @oda79/react-walkaround-marker
```

This command requires the package to be published on npm. To try the project directly from this repository, use the demo instructions below.

`react` and `react-dom` 18 or later are peer dependencies. The package is ESM-only and is intended for modern React bundlers.

## Basic use

```tsx
import { useState } from "react";
import { WalkaroundMarker, type WalkaroundData } from "@oda79/react-walkaround-marker";

export default function Example() {
  const [data, setData] = useState<WalkaroundData | null>(null);

  return (
    <WalkaroundMarker
      src="/vehicle.png"
      value={data}
      onChange={setData}
    />
  );
}
```

Place `vehicle.png` in your app's public directory, or pass another image URL.

`value` is authoritative. Each completed pointer gesture emits one new mark through `onChange`; a parent that does not accept an emitted value leaves the displayed document unchanged.

## Configured use

```tsx
<WalkaroundMarker
  src="/vehicle.png"
  value={data}
  onChange={setData}
  color="#ef4444"
  strokeWidth={10}
  showToolbar
/>
```

`color` defaults to `#ef4444` and `strokeWidth` defaults to `10`. They apply only to marks created after the prop changes; saved marks retain their own color and width.

The toolbar is optional (`showToolbar` defaults to `false`) so applications can supply their own controls. It contains Draw, Remove, Undo, Redo, and Clear—never a View button. `showUndoRedo={false}` and `showClear={false}` hide those actions. It uses real buttons, accessible names, pressed states for Draw/Remove, and disables unavailable history actions.

## Modes and view-only use

```tsx
<WalkaroundMarker
  src="/vehicle.png"
  value={savedData}
  mode="view"
/>
```

Modes are `"draw"`, `"delete"` (labelled **Remove** in the toolbar), and `"view"`. `mode` makes mode controlled; update it in `onModeChange` when using the built-in toolbar:

```tsx
const [mode, setMode] = useState<WalkaroundMode>("draw");

<WalkaroundMarker
  src="/vehicle.png"
  value={data}
  onChange={setData}
  mode={mode}
  onModeChange={setMode}
  showToolbar
/>
```

When `mode` is omitted, the toolbar keeps its own mode state, starting in `"draw"`; `onModeChange` still reports toolbar selections. `disabled`, `mode="view"`, or omitting `onChange` makes the canvas read-only.

## Confirming removal and clear

The component does not impose a dialog library. Use the callbacks to show application-owned confirmation UI; only call `confirm` after the user accepts.

```tsx
<WalkaroundMarker
  src="/vehicle.png"
  value={data}
  onChange={setData}
  mode="delete"
  onDeleteRequest={(mark, confirm, cancel) => {
    openDialog("Remove the mark?", { confirm, cancel });
  }}
  onClearRequest={(confirm, cancel) => {
    openDialog("Clear all marks?", { confirm, cancel });
  }}
/>
```

Without these callbacks, deletion and clear happen immediately. Pending confirmations are tied to the document that requested them, so they cannot change a subsequently supplied document.

## Metadata and persistence

Metadata is an opaque JSON-compatible object stored on an individual mark. Applications can attach their own identifiers without the component interpreting them:

```ts
metadata: {
  issueId: "...",
  photoId: "..."
}
```

Persist validated documents with the helpers:

```ts
import { parseWalkaround, serializeWalkaround } from "@oda79/react-walkaround-marker";

if (data) {
  const json = serializeWalkaround(data);
  const restored = parseWalkaround(json);
}
```

`parseWalkaround` and `serializeWalkaround` validate version `1`, positive image dimensions, mark IDs, points, colors, widths, and JSON-compatible metadata. Invalid data throws an `Error`. The component also shows an error and declines edits when a saved document's dimensions differ from the loaded image.

## Coordinate semantics

Points and stroke widths are stored in **natural-image coordinates**, not display pixels. A mark remains in the same place and retains the same visual proportional thickness when the image is resized. A saved document must therefore be used with an image with the same natural dimensions.

## API

### `WalkaroundMarkerProps`

| Prop | Description |
| --- | --- |
| `src: string` | Image URL. |
| `value: WalkaroundData \| null` | Controlled saved document. |
| `onChange?: (data) => void` | Receives each accepted edit. Required for editing. |
| `mode?: WalkaroundMode` | Controlled mode: `draw`, `delete`, or `view`. |
| `onModeChange?: (mode) => void` | Reports built-in toolbar mode selections. |
| `color?: string` | New-mark color; default `#ef4444`. |
| `strokeWidth?: number` | New-mark natural-image width; default `10`. |
| `showToolbar?: boolean` | Shows the optional toolbar; default `false`. |
| `showUndoRedo?: boolean` | Shows toolbar Undo/Redo; default `true`. |
| `showClear?: boolean` | Shows toolbar Clear; default `true`. |
| `onDeleteRequest?` | Receives `(mark, confirm, cancel)` in Remove mode. |
| `onClearRequest?` | Receives `(confirm, cancel)` before clearing. |
| `disabled?: boolean` | Makes interaction read-only. |
| `className?: string` | Added to the root element. |

### Types

```ts
type WalkaroundPoint = { x: number; y: number };
type WalkaroundMark = {
  id: string;
  points: WalkaroundPoint[];
  color: string;
  width: number;
  metadata?: Record<string, unknown>;
};
type WalkaroundData = {
  version: 1;
  imageWidth: number;
  imageHeight: number;
  marks: WalkaroundMark[];
};
type WalkaroundMode = "draw" | "delete" | "view";
```

### Ref methods and history

Attach `WalkaroundMarkerHandle` to call `undo()`, `redo()`, `clear()`, `canUndo()`, and `canRedo()`. History covers drawing, confirmed removal, and confirmed clear after the controlled parent accepts the emitted document. A parent echo (including an equivalent cloned document) preserves history; a content-changing replacement starts a new history document. Rejected edits never become undoable.

## CRM integration

Store the controlled document with the booking or inspection record, and choose editability from the user's permission or the record's workflow state:

```tsx
<WalkaroundMarker
  src={booking.walkaroundDiagramUrl}
  value={conditionMarks}
  onChange={setConditionMarks}
  mode={canEdit ? "draw" : "view"}
  color="#ef4444"
  strokeWidth={10}
/>
```

Persist `conditionMarks` through the application's API using `serializeWalkaround`; restore and validate it with `parseWalkaround` before supplying it as `value`.

## Styling

No global styles, UI framework, or CSS reset is included. The root has `walkaround-marker`; the built-in toolbar and buttons have `walkaround-marker__toolbar` and `walkaround-marker__tool`. Use `className` and normal CSS to customize them. `--walkaround-marker-toolbar-gap` and `--walkaround-marker-toolbar-margin` customize toolbar spacing.

## Demo and development

The [demo](examples/demo/README.md) provides responsive desktop/touch verification, Draw/Remove/View controls, history, confirmation dialogs, color and width controls, and JSON export/restore.

```bash
pnpm install
pnpm build
pnpm test
pnpm typecheck
pnpm --filter demo dev
```

To publish the demo at `https://oda79.github.io/react-walkaround-marker/`, push this repository to GitHub and set **Settings → Pages → Build and deployment → Source** to **GitHub Actions**. The [Pages workflow](.github/workflows/pages.yml) builds the demo and deploys it on pushes to `main`; it can also be run manually from the Actions tab. The local development URL remains at `/`, while the Pages build uses the repository path.
