import { create } from "zustand";
import { createDefaultProject } from "../model/defaultProject";
import type { Project } from "../model/project";
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
  addShapeLayer: () => void;
  addAudioLayer: (name: string, src: string, waveform: number[], duration: number) => void;
  renameLayer: (layerId: string, name: string) => void;
  toggleLayerVisibility: (layerId: string) => void;
  toggleLayerLock: (layerId: string) => void;
  reorderLayer: (layerId: string, direction: "up" | "down") => void;
  updateTextLayer: (layerId: string, value: string) => void;
  updateLayerColor: (layerId: string, color: string) => void;
  updateLayerOpacity: (layerId: string, opacity: number) => void;
  updateLayerPosition: (layerId: string, x: number, y: number) => void;
  moveLayerObject: (layerId: string, nextX: number, nextY: number) => void;
  moveClip: (clipId: string, nextStart: number) => void;
  trimClip: (clipId: string, edge: "start" | "end", nextTime: number) => void;
  addKeyframe: (
    layerId: string,
    property: "x" | "y" | "rotation" | "scaleX" | "scaleY" | "opacity",
  ) => void;
  moveKeyframe: (keyframeId: string, nextTime: number) => void;
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
                transform: { x: 0, y: 0, rotation: 0, scaleX: 1, scaleY: 1 },
                opacity: 1,
                style: { color: "#18181b" },
                content: { value: "New Title", fontSize: 0.85 },
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
  addShapeLayer: () => {
    set((state) => {
      const layerId = `shape-${crypto.randomUUID()}`;
      return {
        project: {
          ...state.project,
          layers: [
            {
              id: layerId,
              name: `Shape ${state.project.layers.length + 1}`,
              type: "shape",
              visible: true,
              locked: false,
              object: {
                id: `${layerId}-object`,
                transform: { x: 0, y: 0, rotation: 0, scaleX: 1, scaleY: 1 },
                opacity: 1,
                style: { color: "#f97316" },
                content: { shape: "rectangle", width: 2.2, height: 0.8 },
              },
              clips: [
                {
                  id: `${layerId}-clip`,
                  layerId,
                  name: "Shape Clip",
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
                transform: { x: 0, y: 0, rotation: 0, scaleX: 1, scaleY: 1 },
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
  updateLayerOpacity: (layerId, opacity) => {
    set((state) => ({
      project: {
        ...state.project,
        layers: state.project.layers.map((layer) =>
          layer.id === layerId && !layer.locked
            ? {
                ...layer,
                object: {
                  ...layer.object,
                  opacity,
                },
              }
            : layer,
        ),
      },
    }));
  },
  updateLayerPosition: (layerId, x, y) => {
    set((state) => ({
      project: {
        ...state.project,
        layers: state.project.layers.map((layer) =>
          layer.id === layerId && !layer.locked
            ? {
                ...layer,
                object: {
                  ...layer.object,
                  transform: {
                    ...layer.object.transform,
                    x,
                    y,
                  },
                },
              }
            : layer,
        ),
      },
    }));
  },
  moveLayerObject: (layerId, nextX, nextY) => {
    set((state) => ({
      project: {
        ...state.project,
        layers: state.project.layers.map((layer) =>
          layer.id === layerId && !layer.locked
            ? {
                ...layer,
                object: {
                  ...layer.object,
                  transform: {
                    ...layer.object.transform,
                    x: nextX,
                    y: nextY,
                  },
                },
              }
            : layer,
        ),
      },
    }));
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
  addKeyframe: (layerId, property) => {
    set((state) => ({
      project: {
        ...state.project,
        layers: state.project.layers.map((layer) => {
          if (layer.id !== layerId || layer.locked) {
            return layer;
          }

          const clip = layer.clips[0];

          if (!clip) {
            return layer;
          }

          const value =
            property === "opacity" ? layer.object.opacity : layer.object.transform[property];

          return {
            ...layer,
            clips: [
              {
                ...clip,
                keyframes: [
                  ...clip.keyframes,
                  {
                    id: `${clip.id}-${property}-${crypto.randomUUID()}`,
                    time: state.currentTime,
                    property,
                    value,
                    easing: "easeInOut",
                  },
                ],
              },
              ...layer.clips.slice(1),
            ],
          };
        }),
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
