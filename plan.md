# Motion Graphics Editor Plan

## Goal

Build a browser-based motion graphics editor using React, TypeScript, and Three.js. The editor should let users compose animated scenes on a Three.js preview stage, arrange layers on a timeline, keyframe properties, preview playback in real time, and eventually export the result as video or a shareable project file.

This document is a planning artifact only. Implementation should start after this plan is reviewed and approved.

## Reference Assets

- `ui.png`
  - 1776 x 1728 PNG UI reference.
  - Shows the desired editor layout: large preview canvas on top, compact floating tool palette, transform gizmo, dark timeline panel, stacked tracks, colored clips, keyframes, audio waveform, playhead, and start/end controls.
- `threejs-motion-graphics-editor.mp4`
  - 2160 x 2160 MP4 reference.
  - Duration: about 9.53 seconds.
  - Shows animated text, shape, fade, slide, scale, cursor, background, and audio-driven timeline behavior.

## Product Shape

The first version should be a real editor, not a marketing page. On launch, users should see the working editing surface:

- Preview stage occupying the upper area.
- Timeline occupying the lower area.
- Floating creation/selection toolbar over the preview.
- Playback and timeline controls near the timeline header.
- Inspector controls for the selected object or keyframe.
- Project state persisted locally.

## Core User Workflows

1. Create a new project with a fixed canvas size, duration, frame rate, and background.
2. Add scene objects:
   - Text.
   - Basic shapes.
   - Images.
   - Simple 3D objects.
   - Audio.
3. Select, move, scale, rotate, and reorder objects.
4. Add clips to the timeline.
5. Add and edit keyframes for properties such as position, scale, rotation, opacity, color, text content, and material values.
6. Scrub the timeline and preview the animation at the current time.
7. Play and pause the timeline with audio sync.
8. Save and reload the project from local storage.
9. Export the project in a later phase.

## MVP Scope

The MVP should prioritize editor fundamentals over broad asset support.

### Must Have

- React + TypeScript app shell.
- Three.js preview renderer.
- Resizable editor layout with preview and timeline regions.
- Basic dark UI matching the reference.
- Layer/object model.
- Timeline with clips, playhead, scrubber, ruler, and horizontal scrolling.
- Text objects rendered in the Three.js scene.
- Shape objects rendered in the Three.js scene.
- Selection outlines and transform handles.
- Property inspector for selected object.
- Keyframe creation, deletion, and interpolation.
- Playback loop tied to timeline time.
- Project serialization to JSON.
- Local autosave.

### Should Have

- Audio track playback and waveform display.
- Preset animations:
  - Fade in/out.
  - Slide up/down/left/right.
  - Scale pop.
  - Type/text reveal.
- Timeline zoom.
- Multi-select.
- Undo/redo.
- Keyboard shortcuts.
- Import image assets.

### Later

- MP4/WebM export.
- Template library.
- Advanced easing editor.
- Motion paths.
- 3D camera animation.
- Asset library panel.
- Collaboration or cloud storage.

## Recommended Tech Stack

- App framework: Vite + React + TypeScript.
- Rendering: Three.js.
- React/Three integration: `@react-three/fiber` can be used for declarative scene composition, while direct Three.js APIs should still own lower-level renderer, camera, texture, and export details where needed.
- Three helpers: `@react-three/drei` for controls, text helpers, bounds, and common primitives.
- State management: Zustand or Redux Toolkit.
  - Recommendation: Zustand for a compact editor store with selectors and undo middleware.
- Timeline rendering:
  - Use React for timeline layout and interaction.
  - Use Canvas only for dense waveform/keyframe rendering if DOM performance becomes an issue.
- Styling: CSS modules, Tailwind, or plain CSS variables.
  - Recommendation: CSS variables plus scoped component styles for predictable editor theming.
- Icons: Lucide React.
- Audio: Web Audio API.
- Export:
  - Initial: JSON project export/import.
  - Later: `canvas.captureStream()`, `MediaRecorder`, WebCodecs where available, or server-side FFmpeg if higher reliability is needed.

## Editor Layout

### Main Regions

- `AppShell`
  - Owns the full viewport editor layout.
- `PreviewViewport`
  - Contains the Three.js canvas.
  - Displays selected-object bounds and transform handles.
  - Hosts the floating object toolbar.
- `TimelinePanel`
  - Contains playback controls, time ruler, tracks, clips, keyframes, and audio waveform.
- `InspectorPanel`
  - Displays editable properties for the selected object, clip, or keyframe.
- `TopLeftViewportControls`
  - Hand, camera, and grid controls as shown in the reference.
- `ViewportGizmo`
  - Small orientation/control widget in the top-right of the preview.

### Visual Direction

- Preview stage: light neutral canvas with rounded black frame, matching the reference.
- Timeline: dark, dense, utility-focused editing surface.
- Clips: blue/purple for animation clips, green for audio, orange for keyframe/property tracks, gray for inactive/background clips.
- Toolbars: compact dark floating controls with icon buttons.
- Cards should be avoided except for modals or repeated assets. The primary interface should feel like a professional editing tool.

## Data Model

### Project

```ts
type Project = {
  id: string;
  name: string;
  version: number;
  width: number;
  height: number;
  fps: number;
  duration: number;
  background: Background;
  layers: Layer[];
  assets: Asset[];
  timeline: Timeline;
};
```

### Layer

```ts
type Layer = {
  id: string;
  name: string;
  type: "text" | "shape" | "image" | "model" | "audio" | "group";
  visible: boolean;
  locked: boolean;
  parentId?: string;
  object: SceneObject;
  clips: Clip[];
};
```

### Scene Object

```ts
type SceneObject = {
  id: string;
  transform: Transform;
  opacity: number;
  style: ObjectStyle;
  content?: TextContent | ShapeContent | ImageContent | ModelContent;
};
```

### Clip

```ts
type Clip = {
  id: string;
  layerId: string;
  name: string;
  start: number;
  end: number;
  enabled: boolean;
  keyframes: Keyframe[];
};
```

### Keyframe

```ts
type Keyframe = {
  id: string;
  time: number;
  property: AnimatableProperty;
  value: unknown;
  easing: Easing;
};
```

## Animation Engine

The animation engine should be deterministic and independent from React rendering.

Responsibilities:

- Resolve active clips at a given time.
- Interpolate keyframed properties.
- Apply easing.
- Produce a render-state snapshot for the Three.js scene.
- Keep audio, playhead, and preview time synchronized.

Recommended modules:

- `timelineClock`
  - Owns play, pause, seek, loop, frame stepping, and time conversion.
- `animationSampler`
  - Samples keyframes and computes object property values for a given time.
- `sceneComposer`
  - Converts project state into renderable Three.js scene state.
- `audioEngine`
  - Owns audio buffer decoding, playback, waveform peaks, and sync.

## Three.js Rendering Plan

### Scene Setup

- Orthographic camera for 2D motion graphics editing.
- Optional perspective camera for later 3D scenes.
- One main WebGL renderer.
- Separate overlay layer for selection bounds, guides, handles, and transform widgets.
- Use device pixel ratio carefully to keep the editor responsive on high-resolution displays.

### Object Types

- Text:
  - Use `troika-three-text` or Drei text helpers.
  - Support font size, weight, fill color, opacity, alignment, and text content.
- Shapes:
  - Rectangle, circle, rounded rectangle, line, and basic path support.
  - Use Three.js geometry/materials for fast rendering.
- Images:
  - Load as textures with asset metadata.
- 3D Objects:
  - Start with primitive cube/sphere/plane.
  - GLTF import can be a later phase.

### Interaction

- Pointer selection through raycasting.
- Drag-to-move on selected objects.
- Transform handles for scale and rotation.
- Snapping to canvas center, edges, and other object bounds.
- Selection rectangle and multi-select in later phase.

## Timeline Plan

### Timeline Features

- Time ruler with seconds and sub-second ticks.
- Playhead with draggable vertical line.
- Track rows mapped to layers.
- Clips as draggable, resizable blocks.
- Keyframes as small diamond markers.
- Timeline zoom and horizontal scroll.
- Audio waveform lane.
- Start/end range inputs.

### Timeline Operations

- Seek by clicking the ruler.
- Scrub by dragging the playhead.
- Move clips by dragging.
- Trim clip start/end.
- Add keyframe at current playhead.
- Drag keyframes horizontally to retime.
- Select clips/keyframes for inspector editing.

## State Management

Use a single editor store split into logical slices:

- `projectSlice`
  - Project metadata, layers, assets.
- `selectionSlice`
  - Selected object IDs, selected clip IDs, selected keyframe IDs.
- `timelineSlice`
  - Current time, playback state, zoom, scroll, visible range.
- `historySlice`
  - Undo/redo stacks.
- `uiSlice`
  - Active tool, panels, drag state, viewport settings.

State updates should be command-based where practical:

- `addTextLayer`
- `moveLayer`
- `setObjectTransform`
- `addKeyframe`
- `moveClip`
- `trimClip`
- `seekTimeline`

This will make undo/redo, persistence, and future collaboration easier.

## Persistence

### Phase 1

- Save project JSON to local storage.
- Autosave after debounced project changes.
- Add import/export JSON buttons.

### Phase 2

- Store larger assets in IndexedDB.
- Keep project JSON references to asset IDs.

### Phase 3

- Optional backend or cloud sync.

## Export Strategy

Export should not block the MVP unless required.

Recommended order:

1. Export project as JSON.
2. Export still frame as PNG from the current preview time.
3. Export WebM using `canvas.captureStream()` and `MediaRecorder`.
4. Add MP4 export through WebCodecs or server-side FFmpeg if required.

Audio + video export should be treated as a separate milestone because browser support and synchronization are non-trivial.

## Suggested File Structure

```txt
src/
  app/
    App.tsx
    AppShell.tsx
  editor/
    store/
      editorStore.ts
      projectSlice.ts
      timelineSlice.ts
      selectionSlice.ts
      historySlice.ts
    model/
      project.ts
      layer.ts
      clip.ts
      keyframe.ts
      animation.ts
    preview/
      PreviewViewport.tsx
      ThreeScene.tsx
      SelectionOverlay.tsx
      TransformHandles.tsx
      ViewportToolbar.tsx
      ViewportGizmo.tsx
    timeline/
      TimelinePanel.tsx
      TimelineRuler.tsx
      TimelineTrack.tsx
      TimelineClip.tsx
      KeyframeMarker.tsx
      WaveformTrack.tsx
    inspector/
      InspectorPanel.tsx
      TransformInspector.tsx
      TextInspector.tsx
      ClipInspector.tsx
    engine/
      timelineClock.ts
      animationSampler.ts
      easing.ts
      sceneComposer.ts
      audioEngine.ts
    assets/
      assetStore.ts
      loaders.ts
    ui/
      Button.tsx
      IconButton.tsx
      Slider.tsx
      NumberInput.tsx
      Popover.tsx
  styles/
    tokens.css
    editor.css
```

## Implementation Phases

### Phase 0: Project Setup

- Create Vite React TypeScript project.
- Add Three.js and editor UI dependencies.
- Add linting, formatting, and test setup.
- Establish CSS variables for editor theme.
- Add basic full-viewport app shell.

Deliverable: app boots into an empty editor shell.

### Phase 1: Preview Stage

- Add Three.js canvas.
- Add orthographic camera.
- Add static canvas frame matching the reference.
- Render sample text and shape objects from project state.
- Add object selection via pointer/raycasting.
- Add basic drag-to-move.

Deliverable: objects can be selected and moved on the preview stage.

### Phase 2: Project Model and Store

- Define project, layer, clip, and keyframe types.
- Add editor store.
- Add command-style mutations.
- Add local autosave.
- Add JSON import/export.

Deliverable: editor state is structured, serializable, and reloadable.

### Phase 3: Timeline MVP

- Build timeline panel.
- Add ruler, playhead, tracks, and clips.
- Add seek and scrub interactions.
- Add clip drag and trim.
- Link timeline time to preview render state.

Deliverable: timeline controls the preview time.

### Phase 4: Keyframes and Animation

- Add keyframe creation.
- Add interpolation for transform and opacity.
- Add easing presets.
- Display keyframes on timeline.
- Allow keyframe drag and deletion.

Deliverable: users can animate objects over time.

### Phase 5: Text and Shape Editing

- Add toolbar creation tools for text and shapes.
- Add inspector controls for text style, shape style, transform, and opacity.
- Add layer rename, visibility, lock, and reorder controls.

Deliverable: users can compose a simple animated scene.

### Phase 6: Playback and Audio

- Add playback clock.
- Add play, pause, restart, and loop.
- Add audio import.
- Add waveform generation.
- Sync audio playback to timeline time.

Deliverable: animation and audio preview together.

### Phase 7: Polish and Editor Ergonomics

- Add undo/redo.
- Add keyboard shortcuts.
- Add snapping and alignment guides.
- Add timeline zoom.
- Add multi-select.
- Add empty, loading, and error states.
- Improve responsive behavior.

Deliverable: editor feels usable for repeated work.

### Phase 8: Export

- Export still PNG.
- Export project JSON.
- Prototype WebM video export.
- Evaluate MP4 export path.

Deliverable: users can export useful output from the editor.

## Testing Plan

### Unit Tests

- Animation interpolation.
- Easing functions.
- Timeline time conversion.
- Clip trimming and movement.
- Project serialization/deserialization.
- Undo/redo command behavior.

### Integration Tests

- Add object, animate property, scrub timeline.
- Save project, reload, verify scene state.
- Drag clip, verify timing and preview state.
- Play timeline, verify clock progression.

### Visual/Interaction Tests

- Use Playwright to verify:
  - Editor boots without blank canvas.
  - Timeline and preview do not overlap.
  - Toolbar remains usable at desktop and mobile-ish widths.
  - Text fits inside buttons and timeline clips.
  - Canvas renders nonblank frames.

## Performance Considerations

- Keep animation sampling outside React render loops.
- Use selectors to avoid broad React re-renders.
- Batch timeline drag updates.
- Virtualize timeline rows if layer count grows.
- Use requestAnimationFrame for playback.
- Avoid re-creating Three.js materials/geometries unnecessarily.
- Cap preview resolution during editing, but allow full-resolution export later.

## Accessibility and Input

- Keyboard controls for playback, delete, undo/redo, and selection movement.
- Visible focus states for toolbar and timeline controls.
- Tooltips for icon-only buttons.
- Numeric inspector inputs for precise editing.
- Pointer events should work with mouse and trackpad.

## Risks

- Browser video export with audio sync can be unreliable across browsers.
- Dense timeline interactions can become complex without a clear command/state model.
- Text rendering in Three.js needs careful font loading and measurement.
- Drag/resize/keyframe interactions can cause excessive React re-renders if state is not sliced carefully.
- High-DPI 2160 x 2160 preview/export can be expensive on lower-end GPUs.

## Open Questions

1. Should the first version use a fixed square canvas like the reference, or support common aspect ratios from the start?
2. Is MP4 export required in-browser, or is WebM/project JSON acceptable for the first export milestone?
3. Should text animation presets exactly match the reference video, or is a flexible preset system enough?
4. Should the editor support 3D object editing in the MVP, or should the MVP focus on 2D motion graphics rendered through Three.js?
5. Should assets be local-only, or should the architecture prepare for backend/cloud storage?

## Definition of Done for MVP

- User can create text and shape layers.
- User can position objects on the Three.js preview stage.
- User can create clips on the timeline.
- User can add keyframes for transform and opacity.
- User can scrub and play the animation.
- User can save and reload the project locally.
- UI visually follows the provided reference: large preview, compact floating tools, dark timeline, clips, keyframes, and playback controls.
