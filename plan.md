# Implementation Plan: Three.js Motion Graphics Editor Controls

This plan outlines the enhancements to our Three.js motion graphics editor by introducing advanced viewport navigation modes (Pan, Camera Orbit, Guides), transform tools (Translate, Rotate, Scale), and an expanded palette of 3D meshes (Cube, Sphere, Cylinder, Cone, Torus) and 2D shapes (Rectangle, Circle, Triangle, Star, Polygon).

## 1. State Management Comparison

To manage the advanced interactive behaviors of the Three.js viewport, we compare state management systems:

- **Zustand (Current)**:
  - **Pros**: High performance, extremely lightweight (~1.5kB), zero-boilerplate, perfect for high-frequency 60 FPS animation/timeline scrubbing ticks.
  - **Cons**: No native support for Finite State Machines (FSMs), which can lead to complex conditional logic (e.g. tracking interaction tools, dragging, and hover states concurrently).
- **XState (`xstate` + `@xstate/react`)**:
  - **Pros**: Formal FSMs and statecharts ensure total transition safety, preventing invalid interactive states (e.g. orbit camera rotating while resizing a shape). Excellent for modeling viewport tools.
  - **Cons**: Larger bundle size (~22kB), verbose setup, slower for high-frequency direct frame scrubbing.
- **XState Store (`@xstate/store-react`)**:
  - **Pros**: Super lightweight (~1kB) event-reducer model.
  - **Cons**: Lacks advanced statechart hierarchies and guard systems of full XState.

### Recommended Approach

Maintain **Zustand** as the core project and animation engine store because high-frequency 60 FPS timeline updates must be highly efficient. Introduce state variables in the store to represent viewport interaction tools (`interactionMode: "select" | "pan" | "orbit"`, and `transformMode: "translate" | "rotate" | "scale"`) to maintain code simplicity and performance, while designing clear transition boundaries in the UI handlers to act as a virtual state machine.

---

## 2. Screenshot Feature Analysis & UI Functionality

From the user's uploaded screenshots, we identify the following premium tools:

### Viewport Navigation Group (Top Left Group)

1. **Hand Tool (`Hand` icon)**: Activates Viewport Panning. Dragging pans the 3D grid/canvas view using camera position offsets.
2. **Camera Orbit Tool (`Video` icon)**: Enables Camera Orbit. Dragging orbits the camera around the 3D scene grid, letting the user view objects from all angles.
3. **Layout Grid / Quad-View Tool (`Grid2x2` icon)**: Toggles camera view overlays, snapping grids, or switches between different viewport layouts.

### Main Tool Selector (Bottom Middle Group)

1. **Select Pointer + Dropdown (`MousePointer2` + `v`)**: Selection & Transform modes:
   - **Select**: Simple layer selection.
   - **Translate (Move)**: Toggle translate gizmo mode.
   - **Rotate**: Toggle rotation gizmo mode.
   - **Scale**: Toggle scale gizmo mode.
2. **3D Mesh Shape Tool (`Cube` icon)**: Clicking opens a dropdown menu to insert 3D objects:
   - **Cube/Box** (`boxGeometry`)
   - **Sphere** (`sphereGeometry`)
   - **Cylinder** (`cylinderGeometry`)
   - **Cone** (`coneGeometry`)
   - **Torus** (`torusGeometry`)
3. **Text Tool (`T` icon)**: Adds customizable text.
4. **Image Upload Tool (`ImageIcon`)**: Uploads local images as flat textured meshes.
5. **2D Shape Tool + Dropdown (`Square` + `v`)**: Adds flat shapes/curves:
   - **Rectangle**
   - **Circle**
   - **Triangle**
   - **Star**
   - **Polygon**

---

## 3. Proposed Changes

We will implement these changes across the following key files:

### Model & Types

#### [MODIFY] [project.ts](file:///Users/channyeintun/Desktop/Motion-Graphics-Editor/src/editor/model/project.ts)

- Expand `LayerType` to support `"model"` (representing 3D shapes).
- Update `ShapeContent` to support diverse 2D shapes: `"rectangle" | "circle" | "triangle" | "star" | "polygon"`.
- Add custom parameters to `ShapeContent` (e.g. `sides`, `points`, `innerRadius`).
- Add `ModelContent` for 3D primitives: `"cube" | "sphere" | "cylinder" | "cone" | "torus"`.

#### [MODIFY] [preview.ts](file:///Users/channyeintun/Desktop/Motion-Graphics-Editor/src/editor/model/preview.ts)

- Update `PreviewObject` type to include new shape options, 3D model properties, and transform modifiers.
- Enhance `toPreviewObject` to map 3D model layers to 3D preview parameters.

### State & Actions

#### [MODIFY] [editorStore.ts](file:///Users/channyeintun/Desktop/Motion-Graphics-Editor/src/editor/store/editorStore.ts)

- Add `add3DModelLayer(shape)` to support box, sphere, cylinder, cone, and torus mesh layers.
- Update `addShapeLayer(shape)` to support triangle, star, and polygon 2D shapes.
- Update numeric transforms and animatable properties to support rotation and scaling inputs.

### Viewport Engine

#### [MODIFY] [PreviewViewport.tsx](file:///Users/channyeintun/Desktop/Motion-Graphics-Editor/src/editor/preview/PreviewViewport.tsx)

- Implement React Three Fiber rendering for 3D meshes (Cube, Sphere, Cylinder, Cone, Torus) and new 2D shapes.
- Add an `<OrbitControls>` camera tracking mechanism or standard pointer-drag listener when in camera orbit mode.
- Expand the visual bounding frame and selection indicators to align with the chosen shapes.

### User Interface Shell

#### [MODIFY] [AppShell.tsx](file:///Users/channyeintun/Desktop/Motion-Graphics-Editor/src/app/AppShell.tsx)

- Restructure the bottom toolbar to match the mockups perfectly:
  - Left Capsule: Viewport Pan (`Hand`) & Camera Orbit (`Video` / `Camera`) toggle.
  - Next Capsule: Grid/Layout toggle icon.
  - Middle Capsule: Select tool dropdown (Select, Translate, Rotate, Scale) + Cube (3D meshes) + Text + Image + 2D Shapes dropdown.
- Implement sleek glassmorphism dropdown menus, hover behaviors, and elegant custom icons.

---

## 4. Verification Plan

### Automated Checks

- Run `vp check` to confirm there are zero TypeScript compiler warnings or Oxlint violations.
- Run `vp build` to build the production output without errors.

### Manual Verification

- Visual verification of the UI toolbar design, verifying the layout matches the screenshot mockup.
- Interactive tests for adding, moving, rotating, and scaling 3D shapes and 2D shapes.
- Verification of panning, camera orbit, grid visibility, and viewport rendering.
