import { create } from "zustand";
import { createDefaultProject } from "../model/defaultProject";
import type { Project } from "../model/project";
import { clampClipEdge, clampClipMove } from "../timeline/timelineMath";

export const STORAGE_KEY = "motion-graphics-editor.project";

type EditorState = {
  project: Project;
  selectedLayerIds: string[];
  selectedClipId: string | null;
  currentTime: number;
  isPlaying: boolean;
  loopPlayback: boolean;
  selectLayer: (layerId: string | null) => void;
  selectClip: (clipId: string | null) => void;
  replaceProject: (project: Project) => void;
  moveLayerObject: (layerId: string, nextX: number, nextY: number) => void;
  moveClip: (clipId: string, nextStart: number) => void;
  trimClip: (clipId: string, edge: "start" | "end", nextTime: number) => void;
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

export const useEditorStore = create<EditorState>((set) => ({
  project: getInitialProject(),
  selectedLayerIds: ["headline"],
  selectedClipId: null,
  currentTime: 0,
  isPlaying: false,
  loopPlayback: true,
  selectLayer: (layerId) => {
    set({ selectedLayerIds: layerId ? [layerId] : [] });
  },
  selectClip: (clipId) => {
    set({ selectedClipId: clipId });
  },
  replaceProject: (project) => {
    set({
      project,
      selectedLayerIds: project.layers[0] ? [project.layers[0].id] : [],
      selectedClipId: null,
      currentTime: 0,
      isPlaying: false,
    });
  },
  moveLayerObject: (layerId, nextX, nextY) => {
    set((state) => ({
      project: {
        ...state.project,
        layers: state.project.layers.map((layer) =>
          layer.id === layerId
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
            if (clip.id !== clipId) {
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
            if (clip.id !== clipId) {
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
