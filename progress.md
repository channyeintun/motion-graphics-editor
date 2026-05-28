# Progress Tracker: Layer Deletion

Track the implementation of Layer Deletion features.

## Task List

- [x] **Task 1: Add deleteLayer Store Action**
  - [x] Add `deleteLayer` to `EditorState` in `src/editor/store/editorStore.ts`.
  - [x] Filter layers and clean up selection references.
- [x] **Task 2: Wire Deletion UI & Key Bindings**
  - [x] Add `Trash2` icon to selection header in `src/app/AppShell.tsx`.
  - [x] Add Backspace/Delete keyboard shortcut to delete layer in `src/app/AppShell.tsx`.
- [x] **Task 3: Verification & Production Build**
  - [x] Run formatting (`vp check --fix`) and syntax validation (`vp check`) — all 25 files pass.
  - [x] Ensure the application builds correctly (`vp build`).

## Summary

All three tasks completed and committed (`8968e97`). The delete layer feature is fully implemented:
- `deleteLayer(layerId)` in the Zustand store handles smart re-selection of adjacent layers and clears stale clip/keyframe selections.
- A `Trash2` icon button appears in the layer inspector header.
- Pressing `Delete` or `Backspace` (when focus is outside an input/textarea) deletes the selected layer; if a keyframe is selected it still deletes the keyframe first.
