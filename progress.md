# Progress Tracker: XState Store Refactoring

Track the implementation of Option 1 (using `@xstate/store-react` for viewport interaction controls).

## Task List

- [x] **Task 1: Implement viewportStore**
  - [x] Create `src/editor/store/viewportStore.ts` using `@xstate/store`'s `createStore`.
  - [x] Define initial context and event reducers for modes and dropdowns.
- [x] **Task 2: Refactor Zustand Store**
  - [x] Remove viewport interaction fields and actions from `src/editor/store/editorStore.ts`.
- [ ] **Task 3: Refactor Viewport Component**
  - [ ] Integrate `@xstate/store-react` `useSelector` in `src/editor/preview/PreviewViewport.tsx`.
- [ ] **Task 4: Refactor AppShell Controls**
  - [ ] Connect toolbar navigation and dropdown actions to `viewportStore` using `useSelector` and `.send()`.
- [ ] **Task 5: Verification & Production Build**
  - [ ] Run formatting (`vp fmt --write`) and syntax validation (`vp check`).
  - [ ] Ensure the application builds correctly (`vp build`).
