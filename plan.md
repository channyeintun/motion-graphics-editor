# Refactoring Plan: Delete Layer Controls

We are introducing layer deletion capabilities to the motion graphics editor, adding both store actions, keyboard shortcuts, and visual UI controls.

---

## 1. Proposed Changes

### [MODIFY] [editorStore.ts](file:///Users/channyeintun/Desktop/Motion-Graphics-Editor/src/editor/store/editorStore.ts)

- Add `deleteLayer: (layerId: string) => void` to `EditorState` type and store implementation.
- Filter the deleted layer out of `project.layers`.
- Clear selection state (`selectedLayerIds`, `selectedClipId`, `selectedKeyframeId`) if they refer to the deleted layer.

### [MODIFY] [AppShell.tsx](file:///Users/channyeintun/Desktop/Motion-Graphics-Editor/src/app/AppShell.tsx)

- Import `Trash2` icon from `lucide-react`.
- In the Selection Inspector panel, next to the lock/visibility buttons, add a premium red-tinted Trash icon button to delete the active layer.
- In the global keyboard shortcut listener (`keydown`), support pressing `Delete` or `Backspace` to delete the selected layer when no keyframe is selected.

---

## 2. Verification Plan

- Run `vp check` to confirm TypeScript type-safety and syntax correctness.
- Run `vp build` to build production bundle.
