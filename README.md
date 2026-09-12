# @oda79/react-walkaround-marker

A controlled React canvas component for freehand annotations over PNG, JPG, and WebP images. Marks stay in the source image's natural coordinates, so JSON remains valid as the component resizes.

```tsx
const [marks, setMarks] = useState<WalkaroundData | null>(null);

<WalkaroundMarker src="/vehicle.png" value={marks} onChange={setMarks} mode="draw" color="#ef4444" strokeWidth={10} />;
```

`value` is authoritative. One completed pointer gesture emits one mark through `onChange`; marks are never flattened into the image. `mode="view"`, `disabled`, and a missing `onChange` make the surface read-only.

## Editing and history

Use mutually exclusive `draw`, `delete`, and `view` modes. Delete mode uses touch-friendly polyline hit testing and highlights the selected mark without changing persisted data. The optional callbacks let the host use any confirmation UI:

```tsx
const marker = useRef<WalkaroundMarkerHandle>(null);

<WalkaroundMarker
  ref={marker}
  src="/vehicle.png"
  value={marks}
  onChange={setMarks}
  mode="delete"
  onDeleteRequest={(mark, confirm) => openRemoveDialog(mark, confirm)}
  onClearRequest={(confirm) => openClearDialog(confirm)}
/>

<button onClick={() => marker.current?.undo()} disabled={!marker.current?.canUndo()}>Undo</button>
<button onClick={() => marker.current?.redo()} disabled={!marker.current?.canRedo()}>Redo</button>
<button onClick={() => marker.current?.clear()}>Clear all</button>
```

When no request callback is supplied, deletion and clear commit immediately. With a callback, the action only happens when its `confirm` function is called; `cancel` leaves the data unchanged. A request is bound to the document it came from, so a confirmation cannot affect a replacement document. Undo and redo cover drawing, deleting, and clearing, and preserve every mark field including metadata. A content-changing replacement of `value` is treated as a new document and resets history; a normal parent echo or an equivalent cloned value preserves it.

## Persistence

```ts
const json = serializeWalkaround(marks);
const restored = parseWalkaround(json);
```

The helpers validate version `1`, dimensions, marks, points, colors, widths, and JSON-compatible object metadata. Data for a different source-image size is rejected by the component with a clear error.

## Development

```bash
pnpm build
pnpm test
pnpm typecheck
pnpm --filter demo dev
```

The demo builds the local package automatically before Vite starts. See the [demo instructions](examples/demo/README.md) for the controls.
