# Task 3 — Public package polish, toolbar, docs, demo, npm readiness

Repository: `oda79/react-walkaround-marker`

Prerequisites: Tasks 1 and 2 are complete.

## Goal

Turn the working component into a clean public package suitable for Big Van Rental and other React applications.

Do not redesign the core canvas/data/history architecture unless fixing a discovered bug.

## Final public exports

Expose only useful public API:

```ts
WalkaroundMarker
WalkaroundMarkerProps
WalkaroundMarkerHandle

WalkaroundData
WalkaroundMark
WalkaroundPoint
WalkaroundMode

serializeWalkaround
parseWalkaround
```

Avoid exporting internal canvas helpers unless necessary.

## Optional built-in toolbar

Add a minimal optional toolbar.

Recommended props:

```ts
showToolbar?: boolean;
showUndoRedo?: boolean;
showClear?: boolean;
```

Toolbar actions:

```text
Draw
Remove
Undo
Redo
Clear
```

Do not show a View button by default.

`view` remains available programmatically:

```tsx
<WalkaroundMarker mode="view" ... />
```

Consumers must be able to hide the toolbar and provide their own controls.

## Mode control

Prefer:

```ts
mode?: WalkaroundMode;
onModeChange?: (mode: WalkaroundMode) => void;
```

If `mode` is supplied, treat it as controlled.

If internal toolbar mode is allowed when `mode` is omitted, document the behavior clearly.

Default mode remains `draw`.

## Drawing defaults

Finalize:

```ts
color?: string;
strokeWidth?: number;
```

Defaults:

```text
#ef4444
10
```

Changing these props affects newly created marks only. Existing marks must not be rewritten.

## Confirmation integration

Document delete and clear callbacks so applications can show their own dialogs:

```text
Remove the mark?
Clear all marks?
```

Do not depend on shadcn/ui, Tailwind, Material UI, etc.

## Accessibility

For the built-in toolbar:

- use real buttons;
- use accessible labels;
- use `aria-pressed` for Draw/Remove where appropriate;
- disable unavailable Undo/Redo;
- preserve keyboard focus visibility;
- provide sensible titles/labels.

Canvas drawing itself does not need a full keyboard drawing implementation.

## Styling

Keep styles lightweight and isolated.

Do not:

- add global resets;
- assume Tailwind;
- use CRM-specific styles.

Allow customization through `className`, CSS variables, and/or documented class names.

## Demo application

Provide a proper demo with:

- sample image;
- Draw/Remove;
- Undo/Redo;
- Clear;
- color control;
- stroke width control;
- JSON preview/export;
- JSON import/restore;
- programmatic View mode;
- responsive resizing.

The demo should be sufficient for manual desktop/touchscreen verification.

Do not include private Big Van Rental assets in the public repository unless explicitly intended.

## README

Document:

### Installation

```bash
pnpm add @oda79/react-walkaround-marker
```

### Basic use

```tsx
const [data, setData] = useState<WalkaroundData | null>(null);

<WalkaroundMarker
  src="/vehicle.png"
  value={data}
  onChange={setData}
/>
```

### Configured use

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

### View-only

```tsx
<WalkaroundMarker
  src="/vehicle.png"
  value={savedData}
  mode="view"
/>
```

### Metadata

Explain that package metadata is opaque:

```ts
metadata: {
  issueId: "...",
  photoId: "..."
}
```

### Persistence

Show:

```ts
serializeWalkaround(data)
parseWalkaround(json)
```

### Confirmations

Show application-owned delete/clear confirmation flow.

### Coordinate semantics

Explicitly explain that points and stroke widths are stored in natural-image coordinates, not display pixels.

### API reference

Document props, types, defaults, ref methods, modes, history behavior, and validation behavior.

## Package metadata

Configure for:

```text
name: @oda79/react-walkaround-marker
version: 0.1.0
license: MIT
repository: https://github.com/oda79/react-walkaround-marker
```

Also configure description, keywords, homepage/bugs, exports, types, peer dependencies, and published files.

Ensure React is not bundled as a duplicate runtime dependency.

Generate TypeScript declarations.

Modern ESM output is sufficient if documented; add CJS only if there is a clear compatibility reason.

## CI

Add GitHub Actions for:

```text
install
lint
typecheck
test
build
```

Do not automatically publish to npm yet.

## CRM integration example

Document usage conceptually:

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

CRM stores `WalkaroundData` as JSON and may put its own IDs into `mark.metadata`.

Do not put CRM-specific domain logic into this package.

## Final tests

Ensure coverage for:

- toolbar mode switching;
- Undo/Redo disabled states;
- Clear;
- configured color/width;
- view mode;
- external controls/ref;
- serialization;
- metadata;
- resize behavior;
- delete confirmation integration.

## Out of scope

Do not add:

- npm auto-publishing;
- release automation;
- flattened image export;
- zoom/pan;
- shapes/text/arrows;
- crop/rotate;
- partial eraser;
- backend/storage integration;
- CRM-specific logic.

## Acceptance criteria

1. Public API is stable and documented.
2. Optional toolbar offers Draw, Remove, Undo, Redo, Clear.
3. View remains programmatic and does not need a visible button.
4. Consumers can replace toolbar/dialog UX.
5. README covers install, persistence, metadata, modes, coordinates, and confirmations.
6. Demo shows the complete v1 feature set.
7. Package is ready for public npm publication.
8. CI runs lint/typecheck/test/build.
9. No CRM-specific logic leaks into the public package.
10. Package can be installed/linked into Big Van Rental without architectural changes.
