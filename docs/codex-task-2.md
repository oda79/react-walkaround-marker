# Task 2 — Delete/select mode, Undo/Redo, Clear All

Repository: `oda79/react-walkaround-marker`

Prerequisite: Task 1 is complete.

## Goal

Add mark selection/removal and editing history without changing the coordinate/persistence architecture from Task 1.

Implement:

- functional `delete` mode;
- geometric hit testing;
- selection highlight;
- consumer-controlled delete confirmation;
- Undo;
- Redo;
- Clear All;
- history covering draw/delete/clear.

## Delete mode

In:

```tsx
mode="delete"
```

drawing must be disabled.

Click/tap on an existing mark should select the whole mark.

Deleting always removes the entire `WalkaroundMark`. Do not implement a pixel eraser or partial line erasure.

## Hit testing

Each mark is a polyline:

```text
p0 -> p1 -> ... -> pn
```

For click/tap:

1. convert pointer coordinates to natural-image coordinates;
2. calculate point-to-segment distance;
3. select a mark when inside an effective tolerance.

Use touch-friendly tolerance. A thin line should not require pixel-perfect tapping.

If multiple marks overlap, prefer the visually topmost/latest matching mark.

Hit testing must remain correct after responsive resizing.

## Selection highlight

Selected mark ID is temporary UI state and must not be persisted in `WalkaroundData`.

Highlight without changing saved mark color/width, e.g. draw a thicker translucent stroke behind the normal stroke.

Clear selection when:

- mode changes away from delete;
- deletion completes;
- selected mark no longer exists.

## Delete confirmation

Do not hardwire a UI library or modal into the core package.

Expose a consumer-controlled request flow, for example:

```ts
onDeleteRequest?: (
  mark: WalkaroundMark,
  confirm: () => void,
  cancel: () => void
) => void;
```

Equivalent API design is acceptable.

Expected flow:

```text
tap mark
-> highlight
-> ask consumer
-> "Remove the mark?"
-> confirm: remove mark
-> cancel: keep mark
```

The demo may use a simple confirm dialog, but CRM must be able to use its own dialog.

## History

Undo/Redo must cover:

- drawing a mark;
- deleting a mark;
- clearing all marks.

Do not implement Undo as "remove last stroke" only.

Use immutable snapshots or reversible operations; choose the simpler reliable approach.

All history operations must ultimately produce controlled state through `onChange`.

## Public history API

Expose a clean external control surface. A ref API is acceptable:

```ts
export type WalkaroundMarkerHandle = {
  undo(): void;
  redo(): void;
  clear(): void;
  canUndo(): boolean;
  canRedo(): boolean;
};
```

Equivalent APIs are acceptable if documented and easy for an external toolbar to consume.

## External value changes

Define safe behavior if the parent replaces `value` with another saved document.

History from the previous document must not replay into the new one.

Avoid treating the normal parent echo after `onChange` as a new external document.

Document the chosen history reset semantics.

## Clear All

Implement Clear All with confirmation support.

Expected UX:

```text
Clear all marks?
Cancel | Clear
```

After confirmation:

- marks become empty;
- clear is undoable;
- redo restores the clear after undo;
- no-op when already empty.

Use a consumer-controlled confirmation callback rather than depending on a UI framework.

## Metadata

All editing/history operations must preserve mark metadata exactly.

Example:

```ts
metadata: {
  issueId: "123",
  photoId: "abc"
}
```

Undo after delete must restore the complete mark including metadata.

## Modes

Modes are mutually exclusive:

```text
draw   -> create marks
delete -> select/request deletion
view   -> no modification
```

Do not model this as independent booleans.

## Tests

Hit testing:

- direct click selects;
- near-line touch tolerance selects;
- outside tolerance selects nothing;
- overlapping marks choose the expected mark;
- resize does not break hit testing.

Delete:

- delete mode cannot draw;
- draw mode does not trigger deletion;
- highlight does not mutate persistent data;
- confirm removes;
- cancel preserves;
- metadata is preserved.

History:

- undo/redo draw;
- undo/redo delete;
- clear;
- undo/redo clear;
- new edit after undo clears redo branch;
- external document replacement resets history safely.

View:

- no draw;
- no delete;
- mutation APIs behave consistently with read-only mode.

## Demo

Extend example with:

```text
Draw
Remove
Undo
Redo
Clear
```

`View` does not need a visible button.

Demonstrate confirmation, selection highlight, Undo/Redo, and Clear.

## Out of scope

Do not add:

- zoom/pan;
- shapes/text/arrows;
- partial eraser;
- flattened image export;
- CRM-specific issue forms;
- npm publication automation.

## Acceptance criteria

1. Delete mode selects whole marks by mouse/touch.
2. Selected marks are visibly highlighted.
3. Deletion uses consumer-controlled confirmation.
4. Confirm removes; Cancel preserves.
5. Undo/Redo works for draw/delete/clear.
6. Clear All is confirmable and undoable.
7. Metadata is never lost.
8. Draw/delete/view are mutually exclusive.
9. Tests, lint, typecheck, and build pass.
