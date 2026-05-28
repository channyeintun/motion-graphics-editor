import { create } from "zustand";
import { sampleLayer } from "../engine/animationSampler";
import { createDefaultProject } from "../model/defaultProject";
import type {
  AnimatableProperty,
  BackgroundAnimationPreset,
  Clip,
  ClipTransition,
  Easing,
  Layer,
  Scene,
  SceneBackground,
  SceneTransition,
  TextContent,
  Project,
  ShapeContent,
  ModelContent,
  Transform,
} from "../model/project";
import { clampClipEdge, clampClipMove, minClipDuration } from "../timeline/timelineMath";

export const STORAGE_KEY = "motion-graphics-editor.project";

type EditorState = {
  project: Project;
  selectedLayerIds: string[];
  selectedSceneId: string | null;
  selectedClipId: string | null;
  selectedKeyframeId: string | null;
  currentTime: number;
  isPlaying: boolean;
  loopPlayback: boolean;
  selectLayer: (layerId: string | null, additive?: boolean) => void;
  selectScene: (sceneId: string | null) => void;
  selectClip: (clipId: string | null) => void;
  selectKeyframe: (keyframeId: string | null) => void;
  replaceProject: (project: Project) => void;
  addTextLayer: () => void;
  addShapeLayer: (shape?: "rectangle" | "circle" | "triangle" | "star" | "polygon") => void;
  add3DModelLayer: (shape: "cube" | "sphere" | "cylinder" | "cone" | "torus") => void;
  addImageLayer: (name: string, src: string, width: number, height: number) => void;
  addAudioLayer: (name: string, src: string, waveform: number[], duration: number) => void;
  renameLayer: (layerId: string, name: string) => void;
  deleteLayer: (layerId: string) => void;
  toggleLayerVisibility: (layerId: string) => void;
  toggleLayerLock: (layerId: string) => void;
  reorderLayer: (layerId: string, direction: "up" | "down") => void;
  updateTextLayer: (layerId: string, value: string) => void;
  updateTextStyle: (
    layerId: string,
    patch: Partial<Pick<TextContent, "fontSize" | "fontWeight" | "letterSpacing">>,
  ) => void;
  updateLayerColor: (layerId: string, color: string) => void;
  updateModelMaterial: (
    layerId: string,
    patch: Partial<
      Pick<ModelContent, "roughness" | "metalness" | "emissive" | "emissiveIntensity" | "wireframe">
    >,
  ) => void;
  updateTransformProperty: (
    layerId: string,
    property: "x" | "y" | "rotation" | "scaleX" | "scaleY" | "skewX" | "skewY",
    value: number,
  ) => void;
  updateLayerOpacity: (layerId: string, opacity: number) => void;
  updateLayerPosition: (layerId: string, x: number, y: number) => void;
  moveLayerObject: (layerId: string, nextX: number, nextY: number) => void;
  moveClip: (clipId: string, nextStart: number) => void;
  trimClip: (clipId: string, edge: "start" | "end", nextTime: number) => void;
  setClipEnabled: (clipId: string, enabled: boolean) => void;
  updateClipTransition: (
    clipId: string,
    edge: "in" | "out",
    patch: Partial<ClipTransition>,
  ) => void;
  createSceneAtPlayhead: () => void;
  deleteScene: (sceneId: string) => void;
  moveSceneBoundary: (sceneId: string, nextTime: number) => void;
  updateSceneName: (sceneId: string, name: string) => void;
  updateSceneBackground: (sceneId: string, patch: Partial<SceneBackground>) => void;
  updateSceneTransition: (sceneId: string, patch: Partial<SceneTransition>) => void;
  addKeyframe: (
    layerId: string,
    property: "x" | "y" | "rotation" | "scaleX" | "scaleY" | "skewX" | "skewY" | "opacity",
  ) => void;
  moveKeyframe: (keyframeId: string, nextTime: number) => void;
  updateKeyframeEasing: (keyframeId: string, easing: Easing) => void;
  deleteKeyframe: (keyframeId: string) => void;
  setPlaying: (isPlaying: boolean) => void;
  setLoopPlayback: (loopPlayback: boolean) => void;
  seek: (time: number) => void;
};

function getInitialProject() {
  if (typeof window === "undefined") {
    return normalizeProject(createDefaultProject());
  }

  const storedValue = window.localStorage.getItem(STORAGE_KEY);

  if (!storedValue) {
    return normalizeProject(createDefaultProject());
  }

  try {
    return normalizeProject(JSON.parse(storedValue) as Project);
  } catch {
    return normalizeProject(createDefaultProject());
  }
}

function isLayerLocked(project: Project, layerId: string) {
  return project.layers.some((layer) => layer.id === layerId && layer.locked);
}

type NumericProperty = Extract<
  AnimatableProperty,
  "x" | "y" | "rotation" | "scaleX" | "scaleY" | "skewX" | "skewY" | "opacity"
>;

function createDefaultTransform(): Transform {
  return {
    x: 0,
    y: 0,
    z: 0,
    rotationX: 0,
    rotationY: 0,
    rotation: 0,
    scaleX: 1,
    scaleY: 1,
    scaleZ: 1,
    skewX: 0,
    skewY: 0,
  };
}

function createDefaultClipTransition(): ClipTransition {
  return {
    preset: "none",
    duration: 0.6,
  };
}

function createDefaultSceneBackground(
  color = "#f3efe3",
  accent = "#d8c7a7",
  animation: BackgroundAnimationPreset = "none",
): SceneBackground {
  return {
    color,
    accent,
    animation,
  };
}

function createDefaultSceneTransition(
  preset: SceneTransition["preset"] = "none",
  duration = 0,
): SceneTransition {
  return {
    preset,
    duration,
  };
}

function createScene(
  id: string,
  name: string,
  start: number,
  end: number,
  background: SceneBackground,
  transitionToNext: SceneTransition,
): Scene {
  return {
    id,
    name,
    start,
    end,
    background,
    transitionToNext,
  };
}

const minimumSceneDuration = 0.25;

function getSceneAtTime(scenes: Scene[], time: number) {
  return scenes.find((scene) => time >= scene.start && time < scene.end) ?? scenes[scenes.length - 1] ?? null;
}

function clampSceneSplitTime(scene: Scene, time: number) {
  const earliestSplit = scene.start + minimumSceneDuration;
  const latestSplit = scene.end - minimumSceneDuration;

  if (latestSplit < earliestSplit) {
    return null;
  }

  return Math.min(latestSplit, Math.max(earliestSplit, time));
}

function clampSceneBoundaryTime(leftScene: Scene, rightScene: Scene, time: number) {
  const earliest = leftScene.start + minimumSceneDuration;
  const latest = rightScene.end - minimumSceneDuration;

  return Number(Math.min(latest, Math.max(earliest, time)).toFixed(2));
}

function buildFallbackScenes(project: Project) {
  if (project.id === "motion-editor-project") {
    const splitTime = Math.max(1.5, Number((project.duration / 2).toFixed(2)));
    return [
      createScene(
        "scene-intro",
        "Intro",
        0,
        splitTime,
        createDefaultSceneBackground(project.background || "#f3efe3", "#d8c7a7", "drift"),
        createDefaultSceneTransition("slideFromRight", 0.8),
      ),
      createScene(
        "scene-reveal",
        "Reveal",
        splitTime,
        project.duration,
        createDefaultSceneBackground("#dbeafe", "#8b5cf6", "pulse"),
        createDefaultSceneTransition(),
      ),
    ];
  }

  return [
    createScene(
      "scene-1",
      "Scene 1",
      0,
      project.duration,
      createDefaultSceneBackground(project.background || "#f3efe3"),
      createDefaultSceneTransition(),
    ),
  ];
}

function normalizeScenes(project: Project): Scene[] {
  const rawScenes = project.scenes && project.scenes.length > 0 ? project.scenes : buildFallbackScenes(project);
  const sortedScenes = [...rawScenes].sort((left, right) => left.start - right.start);

  return sortedScenes.map((scene, index) => {
    const previousScene = sortedScenes[index - 1];
    const nextScene = sortedScenes[index + 1];
    const start = index === 0 ? 0 : Math.max(previousScene?.end ?? 0, scene.start);
    const unclampedEnd = nextScene ? Math.max(start + minimumSceneDuration, nextScene.start) : project.duration;
    const end = index === sortedScenes.length - 1 ? Math.max(project.duration, start + minimumSceneDuration) : unclampedEnd;

    return {
      ...scene,
      start,
      end,
      background: {
        ...createDefaultSceneBackground(project.background || "#f3efe3"),
        ...scene.background,
      },
      transitionToNext: {
        ...createDefaultSceneTransition(),
        ...scene.transitionToNext,
      },
    };
  });
}

function stretchScenesToDuration(scenes: Scene[], duration: number) {
  if (scenes.length === 0) {
    return scenes;
  }

  return scenes.map((scene, index) =>
    index === scenes.length - 1
      ? {
          ...scene,
          end: Math.max(duration, scene.start + minimumSceneDuration),
        }
      : scene,
  );
}

function normalizeProject(project: Project): Project {
  const scenes = normalizeScenes(project);
  const layers = project.layers
    .filter((layer) => !(project.id === "motion-editor-project" && layer.id === "orb"))
    .map((layer) => ({
      ...layer,
      object: {
        ...layer.object,
        transform: {
          ...createDefaultTransform(),
          ...layer.object.transform,
        },
      },
      clips: layer.clips.map((clip) => ({
        ...clip,
        transitionIn: {
          ...createDefaultClipTransition(),
          ...clip.transitionIn,
        },
        transitionOut: {
          ...createDefaultClipTransition(),
          ...clip.transitionOut,
        },
      })),
    }));

  return {
    ...project,
    background: scenes[0]?.background.color ?? project.background,
    scenes,
    layers,
  };
}

function getNumericPropertyValue(layer: Layer, property: NumericProperty) {
  return property === "opacity" ? layer.object.opacity : layer.object.transform[property];
}

function withNumericPropertyValue(layer: Layer, property: NumericProperty, value: number): Layer {
  if (property === "opacity") {
    return {
      ...layer,
      object: {
        ...layer.object,
        opacity: value,
      },
    };
  }

  return {
    ...layer,
    object: {
      ...layer.object,
      transform: {
        ...layer.object.transform,
        [property]: value,
      },
    },
  };
}

function upsertKeyframe(
  clip: Clip,
  property: NumericProperty,
  time: number,
  value: number,
): { clip: Clip; keyframeId: string } {
  const existing = clip.keyframes.find(
    (keyframe) => keyframe.property === property && Math.abs(keyframe.time - time) < 0.0001,
  );

  if (existing) {
    return {
      clip: {
        ...clip,
        keyframes: clip.keyframes.map((keyframe) =>
          keyframe.id === existing.id ? { ...keyframe, value } : keyframe,
        ),
      },
      keyframeId: existing.id,
    };
  }

  const keyframeId = `${clip.id}-${property}-${crypto.randomUUID()}`;
  return {
    clip: {
      ...clip,
      keyframes: [
        ...clip.keyframes,
        {
          id: keyframeId,
          time,
          property,
          value,
          easing: "easeInOut",
        },
      ],
    },
    keyframeId,
  };
}

function shouldWriteKeyframe(clip: Clip, property: NumericProperty, time: number) {
  return (
    clip.keyframes.some(
      (keyframe) => keyframe.property === property && Math.abs(keyframe.time - time) < 0.0001,
    ) || clip.keyframes.some((keyframe) => keyframe.property === property)
  );
}

function applyNumericValue(
  state: EditorState,
  layerId: string,
  property: NumericProperty,
  value: number,
  forceKeyframe = false,
) {
  let selectedKeyframeId = state.selectedKeyframeId;

  const layers = state.project.layers.map((layer) => {
    if (layer.id !== layerId || layer.locked) {
      return layer;
    }

    const clip = layer.clips[0];

    if (
      clip &&
      state.currentTime >= clip.start &&
      state.currentTime <= clip.end &&
      (forceKeyframe || shouldWriteKeyframe(clip, property, state.currentTime))
    ) {
      const { clip: nextClip, keyframeId } = upsertKeyframe(
        clip,
        property,
        state.currentTime,
        value,
      );
      selectedKeyframeId = keyframeId;
      return {
        ...layer,
        clips: [nextClip, ...layer.clips.slice(1)],
      };
    }

    return withNumericPropertyValue(layer, property, value);
  });

  return {
    project: {
      ...state.project,
      layers,
    },
    selectedKeyframeId,
  };
}

export const useEditorStore = create<EditorState>((set) => {
  const initialProject = getInitialProject();

  return {
  project: initialProject,
  selectedLayerIds: ["headline"],
  selectedSceneId: null,
  selectedClipId: null,
  selectedKeyframeId: null,
  currentTime: 0,
  isPlaying: false,
  loopPlayback: true,
  selectLayer: (layerId, additive = false) => {
    set((state) => {
      if (!layerId) {
        return { selectedLayerIds: [] };
      }

      if (!additive) {
        return { selectedLayerIds: [layerId] };
      }

      const exists = state.selectedLayerIds.includes(layerId);
      return {
        selectedLayerIds: exists
          ? state.selectedLayerIds.filter((selectedLayerId) => selectedLayerId !== layerId)
          : [...state.selectedLayerIds, layerId],
      };
    });
  },
  selectScene: (sceneId) => {
    set({ selectedSceneId: sceneId });
  },
  selectClip: (clipId) => {
    set({ selectedClipId: clipId });
  },
  selectKeyframe: (keyframeId) => {
    set({ selectedKeyframeId: keyframeId });
  },
  replaceProject: (project) => {
    const normalizedProject = normalizeProject(project);
    set({
      project: normalizedProject,
      selectedLayerIds: normalizedProject.layers[0] ? [normalizedProject.layers[0].id] : [],
      selectedSceneId: null,
      selectedClipId: null,
      selectedKeyframeId: null,
      currentTime: 0,
      isPlaying: false,
    });
  },
  addTextLayer: () => {
    set((state) => {
      const layerId = `text-${crypto.randomUUID()}`;
      return {
        project: {
          ...state.project,
          layers: [
            {
              id: layerId,
              name: `Text ${state.project.layers.length + 1}`,
              type: "text",
              visible: true,
              locked: false,
              object: {
                id: `${layerId}-object`,
                transform: createDefaultTransform(),
                opacity: 1,
                style: { color: "#18181b" },
                content: { value: "New Title", fontSize: 0.85, fontWeight: 500, letterSpacing: 0 },
              },
              clips: [
                {
                  id: `${layerId}-clip`,
                  layerId,
                  name: "Text Clip",
                  start: 0,
                  end: state.project.duration,
                  enabled: true,
                  transitionIn: createDefaultClipTransition(),
                  transitionOut: createDefaultClipTransition(),
                  keyframes: [],
                },
              ],
            },
            ...state.project.layers,
          ],
        },
        selectedLayerIds: [layerId],
      };
    });
  },
  addShapeLayer: (shape = "rectangle") => {
    set((state) => {
      const layerId = `shape-${crypto.randomUUID()}`;
      const name = `${shape.charAt(0).toUpperCase() + shape.slice(1)} ${state.project.layers.length + 1}`;

      let color = "#f97316";
      let content: ShapeContent = { shape: "rectangle", width: 2.2, height: 0.8 };

      if (shape === "circle") {
        color = "#06b6d4";
        content = { shape: "circle", radius: 0.58 };
      } else if (shape === "triangle") {
        color = "#ec4899";
        content = { shape: "triangle", width: 1.6, height: 1.6 };
      } else if (shape === "star") {
        color = "#eab308";
        content = { shape: "star", points: 5, radius: 0.9, innerRadius: 0.38 };
      } else if (shape === "polygon") {
        color = "#a855f7";
        content = { shape: "polygon", sides: 6, radius: 0.8 };
      }

      return {
        project: {
          ...state.project,
          layers: [
            {
              id: layerId,
              name,
              type: "shape",
              visible: true,
              locked: false,
              object: {
                id: `${layerId}-object`,
                transform: createDefaultTransform(),
                opacity: 1,
                style: { color },
                content,
              },
              clips: [
                {
                  id: `${layerId}-clip`,
                  layerId,
                  name: `${shape.charAt(0).toUpperCase() + shape.slice(1)} Clip`,
                  start: 0,
                  end: state.project.duration,
                  enabled: true,
                  transitionIn: createDefaultClipTransition(),
                  transitionOut: createDefaultClipTransition(),
                  keyframes: [],
                },
              ],
            },
            ...state.project.layers,
          ],
        },
        selectedLayerIds: [layerId],
      };
    });
  },
  add3DModelLayer: (shape) => {
    set((state) => {
      const layerId = `model-${crypto.randomUUID()}`;
      const name = `${shape.charAt(0).toUpperCase() + shape.slice(1)} 3D ${state.project.layers.length + 1}`;

      const color =
        shape === "cube"
          ? "#ef4444"
          : shape === "sphere"
            ? "#3b82f6"
            : shape === "cylinder"
              ? "#10b981"
              : shape === "cone"
                ? "#f59e0b"
                : "#6366f1";

      const content: ModelContent =
        shape === "cube"
          ? {
              shape,
              width: 1.3,
              height: 1.3,
              depth: 1.3,
              roughness: 0.4,
              metalness: 0.1,
              emissive: "#000000",
              emissiveIntensity: 0,
              wireframe: false,
            }
          : shape === "sphere"
            ? {
                shape,
                radius: 0.8,
                radialSegments: 32,
                roughness: 0.4,
                metalness: 0.1,
                emissive: "#000000",
                emissiveIntensity: 0,
                wireframe: false,
              }
            : shape === "cylinder"
              ? {
                  shape,
                  radius: 0.6,
                  height: 1.4,
                  radialSegments: 32,
                  roughness: 0.4,
                  metalness: 0.1,
                  emissive: "#000000",
                  emissiveIntensity: 0,
                  wireframe: false,
                }
              : shape === "cone"
                ? {
                    shape,
                    radius: 0.7,
                    height: 1.4,
                    radialSegments: 32,
                    roughness: 0.4,
                    metalness: 0.1,
                    emissive: "#000000",
                    emissiveIntensity: 0,
                    wireframe: false,
                  }
                : {
                    shape,
                    radius: 0.7,
                    tubularRadius: 0.22,
                    radialSegments: 32,
                    roughness: 0.4,
                    metalness: 0.1,
                    emissive: "#000000",
                    emissiveIntensity: 0,
                    wireframe: false,
                  };

      return {
        project: {
          ...state.project,
          layers: [
            {
              id: layerId,
              name,
              type: "model",
              visible: true,
              locked: false,
              object: {
                id: `${layerId}-object`,
                transform: createDefaultTransform(),
                opacity: 1,
                style: { color },
                content,
              },
              clips: [
                {
                  id: `${layerId}-clip`,
                  layerId,
                  name: `${shape.charAt(0).toUpperCase() + shape.slice(1)} 3D Clip`,
                  start: 0,
                  end: state.project.duration,
                  enabled: true,
                  transitionIn: createDefaultClipTransition(),
                  transitionOut: createDefaultClipTransition(),
                  keyframes: [],
                },
              ],
            },
            ...state.project.layers,
          ],
        },
        selectedLayerIds: [layerId],
      };
    });
  },
  addImageLayer: (name, src, width, height) => {
    set((state) => {
      const assetId = `image-${crypto.randomUUID()}`;
      const layerId = `image-layer-${crypto.randomUUID()}`;

      return {
        project: {
          ...state.project,
          assets: [
            {
              id: assetId,
              name,
              type: "image",
              src,
              width,
              height,
            },
            ...state.project.assets,
          ],
          layers: [
            {
              id: layerId,
              name,
              type: "image",
              visible: true,
              locked: false,
              object: {
                id: `${layerId}-object`,
                transform: createDefaultTransform(),
                opacity: 1,
                style: { color: "#ffffff" },
                content: {
                  assetId,
                  src,
                  width,
                  height,
                },
              },
              clips: [
                {
                  id: `${layerId}-clip`,
                  layerId,
                  name: `${name} Image`,
                  start: 0,
                  end: state.project.duration,
                  enabled: true,
                  transitionIn: createDefaultClipTransition(),
                  transitionOut: createDefaultClipTransition(),
                  keyframes: [],
                },
              ],
            },
            ...state.project.layers,
          ],
        },
        selectedLayerIds: [layerId],
      };
    });
  },
  addAudioLayer: (name, src, waveform, duration) => {
    set((state) => {
      const assetId = `audio-${crypto.randomUUID()}`;
      const layerId = `audio-layer-${crypto.randomUUID()}`;
      const clipDuration =
        Number.isFinite(duration) && duration > 0 ? Math.max(duration, minClipDuration) : 1;
      const nextDuration = Math.max(
        state.project.duration,
        Math.ceil(clipDuration) || state.project.duration,
      );

      return {
        project: {
          ...state.project,
          duration: nextDuration,
          scenes: stretchScenesToDuration(state.project.scenes, nextDuration),
          timeline: {
            ...state.project.timeline,
            duration: nextDuration,
          },
          assets: [
            {
              id: assetId,
              name,
              type: "audio",
              src,
              waveform,
            },
            ...state.project.assets,
          ],
          layers: [
            {
              id: layerId,
              name,
              type: "audio",
              visible: true,
              locked: false,
              object: {
                id: `${layerId}-object`,
                transform: createDefaultTransform(),
                opacity: 1,
                style: { color: "#22c55e" },
                content: { assetId },
              },
              clips: [
                {
                  id: `${layerId}-clip`,
                  layerId,
                  name: `${name} Audio`,
                  start: 0,
                  end: clipDuration,
                  enabled: true,
                  transitionIn: createDefaultClipTransition(),
                  transitionOut: createDefaultClipTransition(),
                  keyframes: [],
                },
              ],
            },
            ...state.project.layers,
          ],
        },
        selectedLayerIds: [layerId],
      };
    });
  },
  renameLayer: (layerId, name) => {
    set((state) => {
      if (isLayerLocked(state.project, layerId)) {
        return state;
      }

      return {
        project: {
          ...state.project,
          layers: state.project.layers.map((layer) =>
            layer.id === layerId ? { ...layer, name } : layer,
          ),
        },
      };
    });
  },
  deleteLayer: (layerId) => {
    set((state) => {
      const remainingLayers = state.project.layers.filter((layer) => layer.id !== layerId);

      // Determine new selection after deletion
      const wasSelected = state.selectedLayerIds.includes(layerId);
      let nextSelectedLayerIds = state.selectedLayerIds.filter((id) => id !== layerId);

      if (wasSelected && nextSelectedLayerIds.length === 0 && remainingLayers.length > 0) {
        // Select the layer that was adjacent to the deleted one
        const deletedIndex = state.project.layers.findIndex((layer) => layer.id === layerId);
        const nextLayer = remainingLayers[Math.min(deletedIndex, remainingLayers.length - 1)];
        nextSelectedLayerIds = nextLayer ? [nextLayer.id] : [];
      }

      // Clear clip/keyframe selection if they belonged to the deleted layer
      const deletedLayer = state.project.layers.find((layer) => layer.id === layerId);
      const deletedClipIds = new Set(deletedLayer?.clips.map((clip) => clip.id) ?? []);
      const nextClipId = deletedClipIds.has(state.selectedClipId ?? "")
        ? null
        : state.selectedClipId;
      const nextKeyframeId = deletedLayer?.clips
        .flatMap((clip) => clip.keyframes)
        .some((kf) => kf.id === state.selectedKeyframeId)
        ? null
        : state.selectedKeyframeId;

      return {
        project: {
          ...state.project,
          layers: remainingLayers,
        },
        selectedLayerIds: nextSelectedLayerIds,
        selectedClipId: nextClipId,
        selectedKeyframeId: nextKeyframeId,
      };
    });
  },
  toggleLayerVisibility: (layerId) => {
    set((state) => ({
      project: {
        ...state.project,
        layers: state.project.layers.map((layer) =>
          layer.id === layerId ? { ...layer, visible: !layer.visible } : layer,
        ),
      },
    }));
  },
  toggleLayerLock: (layerId) => {
    set((state) => ({
      project: {
        ...state.project,
        layers: state.project.layers.map((layer) =>
          layer.id === layerId ? { ...layer, locked: !layer.locked } : layer,
        ),
      },
    }));
  },
  reorderLayer: (layerId, direction) => {
    set((state) => {
      if (isLayerLocked(state.project, layerId)) {
        return state;
      }

      const index = state.project.layers.findIndex((layer) => layer.id === layerId);

      if (index < 0) {
        return state;
      }

      const nextIndex =
        direction === "up"
          ? Math.max(0, index - 1)
          : Math.min(state.project.layers.length - 1, index + 1);

      if (index === nextIndex) {
        return state;
      }

      const layers = [...state.project.layers];
      const [layer] = layers.splice(index, 1);
      layers.splice(nextIndex, 0, layer);

      return {
        project: {
          ...state.project,
          layers,
        },
      };
    });
  },
  updateTextLayer: (layerId, value) => {
    set((state) => ({
      project: {
        ...state.project,
        layers: state.project.layers.map((layer) => {
          if (
            layer.id !== layerId ||
            layer.locked ||
            layer.type !== "text" ||
            !layer.object.content ||
            !("value" in layer.object.content)
          ) {
            return layer;
          }

          return {
            ...layer,
            object: {
              ...layer.object,
              content: {
                ...layer.object.content,
                value,
              },
            },
          };
        }),
      },
    }));
  },
  updateTextStyle: (layerId, patch) => {
    set((state) => ({
      project: {
        ...state.project,
        layers: state.project.layers.map((layer) => {
          if (
            layer.id !== layerId ||
            layer.locked ||
            layer.type !== "text" ||
            !layer.object.content ||
            !("value" in layer.object.content)
          ) {
            return layer;
          }

          return {
            ...layer,
            object: {
              ...layer.object,
              content: {
                ...layer.object.content,
                ...patch,
              },
            },
          };
        }),
      },
    }));
  },
  updateLayerColor: (layerId, color) => {
    set((state) => ({
      project: {
        ...state.project,
        layers: state.project.layers.map((layer) =>
          layer.id === layerId && !layer.locked
            ? {
                ...layer,
                object: {
                  ...layer.object,
                  style: { color },
                },
              }
            : layer,
        ),
      },
    }));
  },
  updateModelMaterial: (layerId, patch) => {
    set((state) => ({
      project: {
        ...state.project,
        layers: state.project.layers.map((layer) => {
          if (
            layer.id !== layerId ||
            layer.locked ||
            layer.type !== "model" ||
            !layer.object.content ||
            !("shape" in layer.object.content)
          ) {
            return layer;
          }

          return {
            ...layer,
            object: {
              ...layer.object,
              content: {
                ...layer.object.content,
                ...patch,
              },
            },
          };
        }),
      },
    }));
  },
  updateTransformProperty: (layerId, property, value) => {
    set((state) => applyNumericValue(state, layerId, property, value));
  },
  updateLayerOpacity: (layerId, opacity) => {
    set((state) => applyNumericValue(state, layerId, "opacity", opacity));
  },
  updateLayerPosition: (layerId, x, y) => {
    set((state) => {
      const withX = applyNumericValue(state, layerId, "x", x);
      return applyNumericValue(
        {
          ...state,
          ...withX,
          project: withX.project,
          selectedKeyframeId: withX.selectedKeyframeId,
        },
        layerId,
        "y",
        y,
      );
    });
  },
  moveLayerObject: (layerId, nextX, nextY) => {
    set((state) => {
      const withX = applyNumericValue(state, layerId, "x", nextX);
      return applyNumericValue(
        {
          ...state,
          ...withX,
          project: withX.project,
          selectedKeyframeId: withX.selectedKeyframeId,
        },
        layerId,
        "y",
        nextY,
      );
    });
  },
  moveClip: (clipId, nextStart) => {
    set((state) => ({
      project: {
        ...state.project,
        layers: state.project.layers.map((layer) => ({
          ...layer,
          clips: layer.clips.map((clip) => {
            if (clip.id !== clipId || layer.locked) {
              return clip;
            }

            const clipDuration = clip.end - clip.start;
            const start = clampClipMove(nextStart, state.project.duration, clipDuration);
            return {
              ...clip,
              start,
              end: start + clipDuration,
            };
          }),
        })),
      },
    }));
  },
  trimClip: (clipId, edge, nextTime) => {
    set((state) => ({
      project: {
        ...state.project,
        layers: state.project.layers.map((layer) => ({
          ...layer,
          clips: layer.clips.map((clip) => {
            if (clip.id !== clipId || layer.locked) {
              return clip;
            }

            const nextEdge = clampClipEdge(clip.start, clip.end, edge, nextTime);
            return {
              ...clip,
              start: nextEdge.start,
              end: Math.min(state.project.duration, nextEdge.end),
            };
          }),
        })),
      },
    }));
  },
  setClipEnabled: (clipId, enabled) => {
    set((state) => ({
      project: {
        ...state.project,
        layers: state.project.layers.map((layer) => ({
          ...layer,
          clips: layer.clips.map((clip) =>
            clip.id === clipId && !layer.locked ? { ...clip, enabled } : clip,
          ),
        })),
      },
    }));
  },
  updateClipTransition: (clipId, edge, patch) => {
    set((state) => ({
      project: {
        ...state.project,
        layers: state.project.layers.map((layer) => ({
          ...layer,
          clips: layer.clips.map((clip) => {
            if (clip.id !== clipId || layer.locked) {
              return clip;
            }

            const key = edge === "in" ? "transitionIn" : "transitionOut";
            return {
              ...clip,
              [key]: {
                ...(clip[key] ?? createDefaultClipTransition()),
                ...patch,
              },
            };
          }),
        })),
      },
    }));
  },
  createSceneAtPlayhead: () => {
    set((state) => {
      const targetScene =
        getSceneAtTime(state.project.scenes, state.currentTime) ??
        state.project.scenes.find((scene) => scene.id === state.selectedSceneId) ??
        null;

      if (!targetScene) {
        return state;
      }

      const splitTime = clampSceneSplitTime(targetScene, state.currentTime);

      if (splitTime === null) {
        return state;
      }

      const targetIndex = state.project.scenes.findIndex((scene) => scene.id === targetScene.id);

      if (targetIndex < 0) {
        return state;
      }

      const boundaryTransitionDuration = Number(
        Math.min(0.6, splitTime - targetScene.start, targetScene.end - splitTime).toFixed(2),
      );
      const nextSceneId = `scene-${crypto.randomUUID()}`;
      const nextScene = createScene(
        nextSceneId,
        `Scene ${state.project.scenes.length + 1}`,
        splitTime,
        targetScene.end,
        { ...targetScene.background },
        { ...targetScene.transitionToNext },
      );

      const scenes = state.project.scenes.map((scene, index) =>
        index === targetIndex
          ? {
              ...scene,
              end: splitTime,
              transitionToNext:
                boundaryTransitionDuration > 0
                  ? createDefaultSceneTransition("fade", boundaryTransitionDuration)
                  : createDefaultSceneTransition(),
            }
          : scene,
      );

      scenes.splice(targetIndex + 1, 0, nextScene);

      return {
        project: {
          ...state.project,
          scenes,
        },
        selectedSceneId: nextSceneId,
        currentTime: splitTime,
      };
    });
  },
  deleteScene: (sceneId) => {
    set((state) => {
      if (state.project.scenes.length <= 1) {
        return state;
      }

      const targetIndex = state.project.scenes.findIndex((scene) => scene.id === sceneId);

      if (targetIndex < 0) {
        return state;
      }

      const targetScene = state.project.scenes[targetIndex];
      const previousScene = targetIndex > 0 ? state.project.scenes[targetIndex - 1] : null;
      const nextScene =
        targetIndex < state.project.scenes.length - 1 ? state.project.scenes[targetIndex + 1] : null;

      const scenes = state.project.scenes
        .filter((scene) => scene.id !== sceneId)
        .map((scene) => {
          if (previousScene && scene.id === previousScene.id) {
            return {
              ...scene,
              end: targetScene.end,
            };
          }

          if (!previousScene && nextScene && scene.id === nextScene.id) {
            return {
              ...scene,
              start: 0,
            };
          }

          return scene;
        });

      const fallbackScene = previousScene ?? nextScene ?? scenes[0] ?? null;

      return {
        project: {
          ...state.project,
          background:
            fallbackScene && scenes[0]?.id === fallbackScene.id
              ? fallbackScene.background.color
              : state.project.background,
          scenes,
        },
        selectedSceneId: fallbackScene?.id ?? null,
        currentTime:
          fallbackScene
            ? Number(
                Math.min(
                  Math.max(fallbackScene.start, state.currentTime),
                  Math.max(fallbackScene.start, fallbackScene.end - 0.01),
                ).toFixed(2),
              )
            : state.currentTime,
      };
    });
  },
  moveSceneBoundary: (sceneId, nextTime) => {
    set((state) => {
      const boundaryIndex = state.project.scenes.findIndex((scene) => scene.id === sceneId);

      if (boundaryIndex < 0 || boundaryIndex >= state.project.scenes.length - 1) {
        return state;
      }

      const leftScene = state.project.scenes[boundaryIndex];
      const rightScene = state.project.scenes[boundaryIndex + 1];
      const boundaryTime = clampSceneBoundaryTime(leftScene, rightScene, nextTime);

      if (boundaryTime === leftScene.end) {
        return state;
      }

      const leftDuration = boundaryTime - leftScene.start;
      const rightDuration = rightScene.end - boundaryTime;
      const transitionDuration = Number(
        Math.min(leftScene.transitionToNext.duration, leftDuration, rightDuration).toFixed(2),
      );

      return {
        project: {
          ...state.project,
          scenes: state.project.scenes.map((scene, index) => {
            if (index === boundaryIndex) {
              return {
                ...scene,
                end: boundaryTime,
                transitionToNext: {
                  ...scene.transitionToNext,
                  duration: Math.max(0, transitionDuration),
                },
              };
            }

            if (index === boundaryIndex + 1) {
              return {
                ...scene,
                start: boundaryTime,
              };
            }

            return scene;
          }),
        },
      };
    });
  },
  updateSceneName: (sceneId, name) => {
    set((state) => ({
      project: {
        ...state.project,
        scenes: state.project.scenes.map((scene) =>
          scene.id === sceneId ? { ...scene, name } : scene,
        ),
      },
    }));
  },
  updateSceneBackground: (sceneId, patch) => {
    set((state) => ({
      project: {
        ...state.project,
        background:
          state.project.scenes[0]?.id === sceneId && patch.color
            ? patch.color
            : state.project.background,
        scenes: state.project.scenes.map((scene) =>
          scene.id === sceneId
            ? {
                ...scene,
                background: {
                  ...scene.background,
                  ...patch,
                },
              }
            : scene,
        ),
      },
    }));
  },
  updateSceneTransition: (sceneId, patch) => {
    set((state) => ({
      project: {
        ...state.project,
        scenes: state.project.scenes.map((scene) =>
          scene.id === sceneId
            ? {
                ...scene,
                transitionToNext: {
                  ...scene.transitionToNext,
                  ...patch,
                },
              }
            : scene,
        ),
      },
    }));
  },
  addKeyframe: (layerId, property) => {
    set((state) => {
      const layer = state.project.layers.find((candidateLayer) => candidateLayer.id === layerId);

      if (!layer || layer.locked) {
        return state;
      }

      const sampledLayer = sampleLayer(layer, state.currentTime);
      return applyNumericValue(
        state,
        layerId,
        property,
        getNumericPropertyValue(sampledLayer, property),
        true,
      );
    });
  },
  updateKeyframeEasing: (keyframeId, easing) => {
    set((state) => ({
      project: {
        ...state.project,
        layers: state.project.layers.map((layer) => ({
          ...layer,
          clips: layer.clips.map((clip) => ({
            ...clip,
            keyframes: clip.keyframes.map((keyframe) =>
              keyframe.id === keyframeId && !layer.locked ? { ...keyframe, easing } : keyframe,
            ),
          })),
        })),
      },
    }));
  },
  moveKeyframe: (keyframeId, nextTime) => {
    set((state) => ({
      project: {
        ...state.project,
        layers: state.project.layers.map((layer) => ({
          ...layer,
          clips: layer.clips.map((clip) => ({
            ...clip,
            keyframes: clip.keyframes.map((keyframe) =>
              keyframe.id === keyframeId && !layer.locked
                ? {
                    ...keyframe,
                    time: Math.min(clip.end, Math.max(clip.start, nextTime)),
                  }
                : keyframe,
            ),
          })),
        })),
      },
    }));
  },
  deleteKeyframe: (keyframeId) => {
    set((state) => ({
      project: {
        ...state.project,
        layers: state.project.layers.map((layer) => ({
          ...layer,
          clips: layer.clips.map((clip) => ({
            ...clip,
            keyframes: layer.locked
              ? clip.keyframes
              : clip.keyframes.filter((keyframe) => keyframe.id !== keyframeId),
          })),
        })),
      },
      selectedKeyframeId: state.selectedKeyframeId === keyframeId ? null : state.selectedKeyframeId,
    }));
  },
  setPlaying: (isPlaying) => {
    set({ isPlaying });
  },
  setLoopPlayback: (loopPlayback) => {
    set({ loopPlayback });
  },
  seek: (time) => {
    set((state) => ({
      currentTime: Math.min(state.project.duration, Math.max(0, time)),
    }));
  },
  };
});
