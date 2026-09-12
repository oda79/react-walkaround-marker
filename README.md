# @oda79/react-walkaround-marker

A controlled React canvas component for freehand annotations over PNG, JPG, and WebP images. Marks stay in the source image's natural coordinates, so JSON remains valid as the component resizes.

```tsx
const [marks, setMarks] = useState<WalkaroundData | null>(null);

<WalkaroundMarker src="/vehicle.png" value={marks} onChange={setMarks} mode="draw" color="#ef4444" strokeWidth={10} />;
```

`value` is authoritative. One completed pointer gesture emits one mark through `onChange`; marks are never flattened into the image. `mode="view"`, `disabled`, and a missing `onChange` make the surface read-only. The public `delete` mode is reserved for a later release and is currently read-only.

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
