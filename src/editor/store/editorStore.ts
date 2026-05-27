import { create } from "zustand";
import { createDefaultProject } from "../model/defaultProject";
import type { Project } from "../model/project";

export const STORAGE_KEY = "motion-graphics-editor.project";

type EditorState = {
  project: Project;
  selectedLayerIds: string[];
  selectedClipId: string | null;
  currentTime: number;
  isPlaying: boolean;
  loopPlayback: boolean;
  selectLayer: (layerId: string | null) => void;
  replaceProject: (project: Project) => void;
  moveLayerObject: (layerId: string, nextX: number, nextY: number) => void;
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
