# Progress Tracker: Layer Deletion

Track the implementation of Layer Deletion features.

## Task List

- [ ] **Task 1: Add deleteLayer Store Action**
  - [ ] Add `deleteLayer` to `EditorState` in `src/editor/store/editorStore.ts`.
  - [ ] Filter layers and clean up selection references.
- [ ] **Task 2: Wire Deletion UI & Key Bindings**
  - [ ] Add `Trash2` icon to selection header in `src/app/AppShell.tsx`.
  - [ ] Add Backspace/Delete keyboard shortcut to delete layer in `src/app/AppShell.tsx`.
- [ ] **Task 3: Verification & Production Build**
  - [ ] Run formatting (`vp fmt --write`) and syntax validation (`vp check`).
  - [ ] Ensure the application builds correctly (`vp build`).
