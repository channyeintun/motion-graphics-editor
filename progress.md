# Progress Tracker: Three.js Motion Graphics Editor Controls

This document tracks our progress during the execution of the implementation plan. After completing each task, we will update this tracker, run checks (oxlint, type checking, oxfmt), and commit the changes using the git CLI.

## Task List

- [x] **Task 1: Update Models & Types**
  - [x] Add 3D Mesh types and properties to `project.ts`.
  - [x] Expand 2D Shape types and attributes in `project.ts`.
  - [x] Update `PreviewObject` definitions and conversion mapping in `preview.ts`.
- [x] **Task 2: Implement Store States & Actions**
  - [x] Add `add3DModelLayer` action to `editorStore.ts`.
  - [x] Extend `addShapeLayer` action for premium 2D shapes in `editorStore.ts`.
  - [x] Integrate viewport interaction and transform mode fields (`interactionMode`, `transformMode`) into Zustand state.
- [x] **Task 3: Expand Viewport Engine Rendering & Camera Orbit**
  - [x] Implement R3F meshes for 3D primitives (Box, Sphere, Cylinder, Cone, Torus).
  - [x] Implement new 2D shapes (Triangle, Star, Polygon) in the previewer.
  - [x] Implement Camera Orbit controls when `interactionMode === "orbit"` in `PreviewViewport.tsx`.
  - [x] Render proper 3D selection indicators and wireframes.
- [x] **Task 4: Redesign UI Toolbar & Glassmorphic Dropdowns**
  - [x] Build the Navigation Group capsule (Hand, Orbit Camera) on the left.
  - [x] Build the layout/grid capsule in the viewport.
  - [x] Build the select tool dropdown selector (Translate, Rotate, Scale) in the middle.
  - [x] Build the Cube tool (3D shape dropdown selector).
  - [x] Build the Shape tool (2D shape dropdown selector).
  - [x] Polish styling, transitions, glassmorphic dropdown list, and high-fidelity visuals.
- [x] **Task 5: Verification & Polish**
  - [x] Ensure formatting (`vp fmt`) and lint checks (`vp check`) pass.
  - [x] Perform manual visual sanity checks.
