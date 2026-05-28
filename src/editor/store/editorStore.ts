import { create } from "zustand";
import { sampleLayer } from "../engine/animationSampler";
import { createDefaultProject } from "../model/defaultProject";
import type {
  AnimatableProperty,
  Clip,
  Easing,
  Layer,
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
  selectedClipId: string | null;
  selectedKeyframeId: string | null;
  currentTime: number;
  isPlaying: boolean;
  loopPlayback: boolean;
  selectLayer: (layerId: string | null, additive?: boolean) => void;
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
    return createDefaultProject();
  }

  const storedValue = window.localStorage.getItem(STORAGE_KEY);

  if (!storedValue) {
    return createDefaultProject();
  }

  try {
    return JSON.parse(storedValue) as Project;
  } catch {
    return createDefaultProject();
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
    rotation: 0,
    scaleX: 1,
    scaleY: 1,
    skewX: 0,
    skewY: 0,
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

export const useEditorStore = create<EditorState>((set) => ({
  project: getInitialProject(),
  selectedLayerIds: ["headline"],
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
  selectClip: (clipId) => {
    set({ selectedClipId: clipId });
  },
  selectKeyframe: (keyframeId) => {
    set({ selectedKeyframeId: keyframeId });
  },
  replaceProject: (project) => {
    set({
      project,
      selectedLayerIds: project.layers[0] ? [project.layers[0].id] : [],
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
}));
