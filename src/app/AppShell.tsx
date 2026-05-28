import { useCallback, useEffect, useEffectEvent, useMemo, useRef, useState } from "react";
import type { ChangeEvent, ReactNode } from "react";
import {
  ArrowDown,
  ArrowUp,
  Clapperboard,
  Box,
  Boxes,
  Camera,
  Circle,
  ChevronDown,
  Cone,
  Cylinder,
  Grid2x2,
  Hand,
  Download,
  Eye,
  EyeOff,
  FileUp,
  Image as ImageIcon,
  Lock,
  LockOpen,
  Maximize2,
  Move,
  Pentagon,
  Pause,
  Play,
  Redo2,
  Repeat,
  RotateCw,
  Square,
  Star,
  Torus,
  Trash2,
  Triangle,
  Type,
  Undo2,
  Volume2,
} from "lucide-react";
import {
  getAssetPayload,
  persistInlineProjectAssets,
  sanitizeProjectForStorage,
  saveAssetPayload,
} from "../editor/assets/assetPayloadStore";
import {
  buildProjectPackage,
  parseProjectPackage,
  PROJECT_PACKAGE_EXTENSION,
} from "../editor/assets/projectPackage";
import { sampleLayer } from "../editor/engine/animationSampler";
import { sampleSceneState, type SampledSceneState } from "../editor/engine/sceneSampler";
import { toPreviewObject } from "../editor/model/preview";
import type {
  BackgroundAnimationPreset,
  Easing,
  ImportedModelContent,
  ModelAssetFormat,
  Project,
  Scene,
  TransitionPreset,
} from "../editor/model/project";
import { isImportedModelContent, isPrimitiveModelContent } from "../editor/model/project";
import type { GLTF } from "three/examples/jsm/loaders/GLTFLoader.js";
import { PreviewViewport } from "../editor/preview/PreviewViewport";
import { drawSceneBackdropFrame } from "../editor/preview/sceneBackdrop";
import { STORAGE_KEY, useEditorStore } from "../editor/store/editorStore";
import { useSelector } from "@xstate/store-react";
import { viewportStore } from "../editor/store/viewportStore";
import { TimelinePanel } from "../editor/timeline/TimelinePanel";

type ToolbarIcon = typeof Move;

const TRANSFORM_TOOL_OPTIONS = [
  { mode: "translate", icon: Move, label: "Move" },
  { mode: "rotate", icon: RotateCw, label: "Rotate" },
  { mode: "scale", icon: Maximize2, label: "Scale" },
] satisfies ReadonlyArray<{
  mode: "translate" | "rotate" | "scale";
  icon: ToolbarIcon;
  label: string;
}>;

const MODEL_TOOL_OPTIONS = [
  { shape: "cube", icon: Box, label: "Cube" },
  { shape: "sphere", icon: Circle, label: "Sphere" },
  { shape: "cylinder", icon: Cylinder, label: "Cylinder" },
  { shape: "cone", icon: Cone, label: "Cone" },
  { shape: "torus", icon: Torus, label: "Torus" },
] satisfies ReadonlyArray<{
  shape: "cube" | "sphere" | "cylinder" | "cone" | "torus";
  icon: ToolbarIcon;
  label: string;
}>;

const SHAPE_TOOL_OPTIONS = [
  { shape: "rectangle", icon: Square, label: "Rectangle" },
  { shape: "circle", icon: Circle, label: "Circle" },
  { shape: "triangle", icon: Triangle, label: "Triangle" },
  { shape: "star", icon: Star, label: "Star" },
  { shape: "polygon", icon: Pentagon, label: "Polygon" },
] satisfies ReadonlyArray<{
  shape: "rectangle" | "circle" | "triangle" | "star" | "polygon";
  icon: ToolbarIcon;
  label: string;
}>;

const EASING_OPTIONS: Easing[] = ["linear", "easeIn", "easeOut", "easeInOut"];

const TRANSITION_OPTIONS: { value: TransitionPreset; label: string }[] = [
  { value: "none", label: "None" },
  { value: "fade", label: "Fade" },
  { value: "slideFromLeft", label: "Slide From Left" },
  { value: "slideFromRight", label: "Slide From Right" },
  { value: "slideFromTop", label: "Slide From Top" },
  { value: "slideFromBottom", label: "Slide From Bottom" },
  { value: "zoomIn", label: "Zoom In" },
  { value: "zoomOut", label: "Zoom Out" },
];

const BACKGROUND_ANIMATION_OPTIONS: {
  value: BackgroundAnimationPreset;
  label: string;
}[] = [
  { value: "none", label: "Static" },
  { value: "drift", label: "Drift" },
  { value: "pulse", label: "Pulse" },
];

const MAX_HISTORY_ENTRIES = 100;
const MIN_EXPORT_HEIGHT = 1080;
const EXPORT_VIDEO_BITRATE = 16_000_000;

type ResolvedAssetUrlEntry = {
  url: string;
  revoke: boolean;
};

function pushProjectSnapshot(history: Project[], snapshot: Project) {
  history.push(snapshot);

  if (history.length > MAX_HISTORY_ENTRIES) {
    history.shift();
  }
}

function snapshotResolvedAssetUrls(entries: Map<string, ResolvedAssetUrlEntry>) {
  return Object.fromEntries([...entries].map(([assetId, entry]) => [assetId, entry.url]));
}

function revokeResolvedAssetUrls(entries: Iterable<ResolvedAssetUrlEntry>) {
  for (const entry of entries) {
    if (!entry.revoke) {
      continue;
    }

    URL.revokeObjectURL(entry.url);
  }
}

function downloadBlob(blob: Blob, fileName: string) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");

  link.href = url;
  link.download = fileName;
  link.click();
  URL.revokeObjectURL(url);
}

function getAssetDisplayName(fileName: string) {
  return fileName.replace(/\.[^.]+$/, "");
}

function getProjectFileName(project: Project, extension: string) {
  const baseName = project.name.toLowerCase().replaceAll(/\s+/g, "-");
  return `${baseName}${extension}`;
}

function getImportMimeType(file: File, fallback: string) {
  return file.type || fallback;
}

function getModelImportMimeType(file: File) {
  return (
    file.type || (getModelFormat(file.name) === "gltf" ? "model/gltf+json" : "model/gltf-binary")
  );
}

function waitForAnimationFrame() {
  return new Promise<void>((resolve) => {
    window.requestAnimationFrame(() => resolve());
  });
}

function getSupportedWebmMimeType() {
  if (typeof MediaRecorder === "undefined") {
    return null;
  }

  const candidates = ["video/webm;codecs=vp9", "video/webm;codecs=vp8", "video/webm"];

  return candidates.find((mimeType) => MediaRecorder.isTypeSupported(mimeType)) ?? null;
}

function createCompositeExportCanvas(sourceCanvas: HTMLCanvasElement) {
  const aspectRatio = sourceCanvas.width / Math.max(sourceCanvas.height, 1);
  const targetHeight = Math.max(sourceCanvas.height, MIN_EXPORT_HEIGHT);
  const compositeCanvas = document.createElement("canvas");

  compositeCanvas.width = Math.round(targetHeight * aspectRatio);
  compositeCanvas.height = targetHeight;
  return compositeCanvas;
}

function drawCompositeExportFrame(
  targetCanvas: HTMLCanvasElement,
  sourceCanvas: HTMLCanvasElement,
  sceneState: SampledSceneState,
) {
  const context = targetCanvas.getContext("2d");

  if (!context) {
    return false;
  }

  context.imageSmoothingEnabled = true;
  context.imageSmoothingQuality = "high";
  drawSceneBackdropFrame(context, sceneState);
  context.drawImage(sourceCanvas, 0, 0, targetCanvas.width, targetCanvas.height);
  return true;
}

export function AppShell() {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const imageInputRef = useRef<HTMLInputElement | null>(null);
  const modelInputRef = useRef<HTMLInputElement | null>(null);
  const audioInputRef = useRef<HTMLInputElement | null>(null);
  const audioElementsRef = useRef(new Map<string, HTMLAudioElement>());
  const playbackTimeRef = useRef(0);
  const previewCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const historyRef = useRef<Project[]>([]);
  const futureRef = useRef<Project[]>([]);
  const skipHistoryRef = useRef(false);
  const lastProjectRef = useRef<Project | null>(null);
  const saveRequestRef = useRef(0);
  const assetUrlEntriesRef = useRef(new Map<string, ResolvedAssetUrlEntry>());
  const activeProjectIdRef = useRef<string | null>(null);
  const [historyState, setHistoryState] = useState({ canUndo: false, canRedo: false });
  const [resolvedAssetUrls, setResolvedAssetUrls] = useState<Record<string, string>>({});
  const [showGuides, setShowGuides] = useState(true);
  const [showInspectorOverlay] = useState(true);
  const [timelineZoom, setTimelineZoom] = useState(140);

  const interactionMode = useSelector(viewportStore, (state) => state.context.interactionMode);
  const transformMode = useSelector(viewportStore, (state) => state.context.transformMode);
  const activeDropdown = useSelector(viewportStore, (state) => state.context.activeDropdown);

  const project = useEditorStore((state) => state.project);
  const currentTime = useEditorStore((state) => state.currentTime);
  const isPlaying = useEditorStore((state) => state.isPlaying);
  const loopPlayback = useEditorStore((state) => state.loopPlayback);
  const selectedLayerIds = useEditorStore((state) => state.selectedLayerIds);
  const selectedSceneId = useEditorStore((state) => state.selectedSceneId);
  const selectedClipId = useEditorStore((state) => state.selectedClipId);
  const selectedKeyframeId = useEditorStore((state) => state.selectedKeyframeId);
  const addTextLayer = useEditorStore((state) => state.addTextLayer);
  const addShapeLayer = useEditorStore((state) => state.addShapeLayer);
  const add3DModelLayer = useEditorStore((state) => state.add3DModelLayer);
  const addImportedModelLayer = useEditorStore((state) => state.addImportedModelLayer);
  const addImageLayer = useEditorStore((state) => state.addImageLayer);
  const addAudioLayer = useEditorStore((state) => state.addAudioLayer);
  const selectLayer = useEditorStore((state) => state.selectLayer);
  const selectScene = useEditorStore((state) => state.selectScene);
  const selectClip = useEditorStore((state) => state.selectClip);
  const selectKeyframe = useEditorStore((state) => state.selectKeyframe);
  const renameLayer = useEditorStore((state) => state.renameLayer);
  const deleteLayer = useEditorStore((state) => state.deleteLayer);
  const toggleLayerVisibility = useEditorStore((state) => state.toggleLayerVisibility);
  const toggleLayerLock = useEditorStore((state) => state.toggleLayerLock);
  const reorderLayer = useEditorStore((state) => state.reorderLayer);
  const updateTextLayer = useEditorStore((state) => state.updateTextLayer);
  const updateTextStyle = useEditorStore((state) => state.updateTextStyle);
  const updateLayerColor = useEditorStore((state) => state.updateLayerColor);
  const updateModelMaterial = useEditorStore((state) => state.updateModelMaterial);
  const updateTransformProperty = useEditorStore((state) => state.updateTransformProperty);
  const updateLayerOpacity = useEditorStore((state) => state.updateLayerOpacity);
  const moveLayerObject = useEditorStore((state) => state.moveLayerObject);
  const replaceProject = useEditorStore((state) => state.replaceProject);

  const handleScale = useCallback(
    (id: string, scaleX: number, scaleY: number) => {
      updateTransformProperty(id, "scaleX", scaleX);
      updateTransformProperty(id, "scaleY", scaleY);
    },
    [updateTransformProperty],
  );

  const handleRotate = useCallback(
    (id: string, rotation: number) => {
      updateTransformProperty(id, "rotation", rotation);
    },
    [updateTransformProperty],
  );
  const moveClip = useEditorStore((state) => state.moveClip);
  const trimClip = useEditorStore((state) => state.trimClip);
  const setClipEnabled = useEditorStore((state) => state.setClipEnabled);
  const updateClipTransition = useEditorStore((state) => state.updateClipTransition);
  const createSceneAtPlayhead = useEditorStore((state) => state.createSceneAtPlayhead);
  const deleteScene = useEditorStore((state) => state.deleteScene);
  const moveSceneBoundary = useEditorStore((state) => state.moveSceneBoundary);
  const updateSceneName = useEditorStore((state) => state.updateSceneName);
  const updateSceneBackground = useEditorStore((state) => state.updateSceneBackground);
  const updateSceneTransition = useEditorStore((state) => state.updateSceneTransition);
  const addKeyframe = useEditorStore((state) => state.addKeyframe);
  const moveKeyframe = useEditorStore((state) => state.moveKeyframe);
  const updateKeyframeEasing = useEditorStore((state) => state.updateKeyframeEasing);
  const deleteKeyframe = useEditorStore((state) => state.deleteKeyframe);
  const setPlaying = useEditorStore((state) => state.setPlaying);
  const setLoopPlayback = useEditorStore((state) => state.setLoopPlayback);
  const seek = useEditorStore((state) => state.seek);

  const sceneState = useMemo(() => sampleSceneState(project, currentTime), [currentTime, project]);
  const sampledLayers = useMemo(
    () => project.layers.map((layer) => sampleLayer(layer, sceneState.incomingTime)),
    [project.layers, sceneState.incomingTime],
  );

  const assetSources = useMemo(() => {
    const nextSources = new Map<string, string>();

    for (const asset of project.assets) {
      const assetSource = resolvedAssetUrls[asset.id] ?? asset.src;

      if (assetSource) {
        nextSources.set(asset.id, assetSource);
      }
    }

    return nextSources;
  }, [project.assets, resolvedAssetUrls]);

  const previewObjects = useMemo(
    () =>
      sampledLayers
        .map((layer) => toPreviewObject(layer, false, sceneState.incomingTime, assetSources))
        .filter((object) => object !== null),
    [assetSources, sampledLayers, sceneState.incomingTime],
  );

  const selectedId = selectedLayerIds[0] ?? null;
  const selectedLayer = project.layers.find((layer) => layer.id === selectedId) ?? null;
  const selectedClip = useMemo(
    () =>
      project.layers.flatMap((layer) => layer.clips).find((clip) => clip.id === selectedClipId) ??
      null,
    [project.layers, selectedClipId],
  );
  const inspectorClip = useMemo(() => {
    if (!selectedLayer) {
      return null;
    }

    return (
      selectedLayer.clips.find((clip) => clip.id === selectedClipId) ??
      selectedLayer.clips[0] ??
      null
    );
  }, [selectedClipId, selectedLayer]);
  const selectedKeyframe = useMemo(
    () => inspectorClip?.keyframes.find((keyframe) => keyframe.id === selectedKeyframeId) ?? null,
    [inspectorClip, selectedKeyframeId],
  );
  const selectedObject = useMemo(() => {
    if (!selectedLayer) {
      return null;
    }

    return toPreviewObject(
      sampleLayer(selectedLayer, sceneState.incomingTime),
      true,
      sceneState.incomingTime,
      assetSources,
    );
  }, [assetSources, sceneState.incomingTime, selectedLayer]);
  const activeScene = useMemo(
    () =>
      project.scenes.find((scene) => scene.id === selectedSceneId) ??
      sceneState.currentScene ??
      null,
    [project.scenes, sceneState.currentScene, selectedSceneId],
  );
  const activeSceneIndex = useMemo(
    () => (activeScene ? project.scenes.findIndex((scene) => scene.id === activeScene.id) : -1),
    [activeScene, project.scenes],
  );
  const previousScene = activeSceneIndex > 0 ? project.scenes[activeSceneIndex - 1] : null;
  const nextScene =
    activeSceneIndex >= 0 && activeSceneIndex < project.scenes.length - 1
      ? project.scenes[activeSceneIndex + 1]
      : null;
  const selectedValues = useMemo(
    () => ({
      x: selectedObject?.x ?? selectedLayer?.object.transform.x ?? 0,
      y: selectedObject?.y ?? selectedLayer?.object.transform.y ?? 0,
      z: selectedObject?.z ?? selectedLayer?.object.transform.z ?? 0,
      scaleX: selectedObject?.scaleX ?? selectedLayer?.object.transform.scaleX ?? 1,
      scaleY: selectedObject?.scaleY ?? selectedLayer?.object.transform.scaleY ?? 1,
      scaleZ: selectedObject?.scaleZ ?? selectedLayer?.object.transform.scaleZ ?? 1,
      skewX: selectedObject?.skewX ?? selectedLayer?.object.transform.skewX ?? 0,
      skewY: selectedObject?.skewY ?? selectedLayer?.object.transform.skewY ?? 0,
      rotationX: selectedObject?.rotationX ?? selectedLayer?.object.transform.rotationX ?? 0,
      rotationY: selectedObject?.rotationY ?? selectedLayer?.object.transform.rotationY ?? 0,
      rotation: selectedObject?.rotation ?? selectedLayer?.object.transform.rotation ?? 0,
      opacity: selectedObject?.opacity ?? selectedLayer?.object.opacity ?? 1,
    }),
    [selectedLayer, selectedObject],
  );
  const selectedTextContent = useMemo(() => {
    if (
      !selectedLayer ||
      selectedLayer.type !== "text" ||
      !selectedLayer.object.content ||
      !("value" in selectedLayer.object.content)
    ) {
      return null;
    }

    return selectedLayer.object.content;
  }, [selectedLayer]);
  const selectedModelContent = useMemo(() => {
    if (
      !selectedLayer ||
      selectedLayer.type !== "model" ||
      (!isPrimitiveModelContent(selectedLayer.object.content) &&
        !isImportedModelContent(selectedLayer.object.content))
    ) {
      return null;
    }

    return selectedLayer.object.content;
  }, [selectedLayer]);
  const selectionLocked = selectedLayer?.locked ?? false;

  playbackTimeRef.current = currentTime;

  const syncHistoryState = useCallback(() => {
    setHistoryState({
      canUndo: historyRef.current.length > 0,
      canRedo: futureRef.current.length > 0,
    });
  }, []);

  const registerResolvedAssetUrl = useCallback((assetId: string, url: string) => {
    const previousEntry = assetUrlEntriesRef.current.get(assetId);

    if (previousEntry?.revoke) {
      URL.revokeObjectURL(previousEntry.url);
    }

    assetUrlEntriesRef.current.set(assetId, { url, revoke: true });
    setResolvedAssetUrls(snapshotResolvedAssetUrls(assetUrlEntriesRef.current));
  }, []);

  const saveProject = useEffectEvent((nextProject: Project) => {
    const saveRequestId = saveRequestRef.current + 1;

    saveRequestRef.current = saveRequestId;

    void (async () => {
      try {
        await persistInlineProjectAssets(nextProject);

        if (saveRequestRef.current !== saveRequestId) {
          return;
        }

        window.localStorage.setItem(
          STORAGE_KEY,
          JSON.stringify(sanitizeProjectForStorage(nextProject)),
        );
      } catch (error) {
        console.warn("Failed to persist motion graphics project.", error);
      }
    })();
  });

  useEffect(() => {
    const handle = window.setTimeout(() => {
      saveProject(project);
    }, 250);

    return () => {
      window.clearTimeout(handle);
    };
  }, [project]);

  useEffect(() => {
    if (!lastProjectRef.current) {
      lastProjectRef.current = project;
      syncHistoryState();
      return;
    }

    if (project === lastProjectRef.current) {
      return;
    }

    if (skipHistoryRef.current) {
      skipHistoryRef.current = false;
      lastProjectRef.current = project;
      syncHistoryState();
      return;
    }

    pushProjectSnapshot(historyRef.current, lastProjectRef.current);
    futureRef.current = [];
    lastProjectRef.current = project;
    syncHistoryState();
  }, [project, syncHistoryState]);

  useEffect(() => {
    if (!isPlaying) {
      return;
    }

    let frameId = 0;
    let previous = performance.now();

    const tick = (now: number) => {
      const elapsed = (now - previous) / 1000;
      previous = now;
      const nextTime = playbackTimeRef.current + elapsed;

      if (nextTime >= project.duration) {
        if (loopPlayback) {
          seek(0);
        } else {
          seek(project.duration);
          setPlaying(false);
          return;
        }
      } else {
        seek(nextTime);
      }

      frameId = window.requestAnimationFrame(tick);
    };

    frameId = window.requestAnimationFrame(tick);

    return () => {
      window.cancelAnimationFrame(frameId);
    };
  }, [isPlaying, loopPlayback, project.duration, seek, setPlaying]);

  useEffect(() => {
    if (activeProjectIdRef.current !== project.id) {
      revokeResolvedAssetUrls(assetUrlEntriesRef.current.values());
      assetUrlEntriesRef.current.clear();
      activeProjectIdRef.current = project.id;
      setResolvedAssetUrls({});
    }

    const activeAssetIds = new Set(project.assets.map((asset) => asset.id));
    let removedAsset = false;

    for (const [assetId, entry] of assetUrlEntriesRef.current) {
      if (activeAssetIds.has(assetId)) {
        continue;
      }

      if (entry.revoke) {
        URL.revokeObjectURL(entry.url);
      }

      assetUrlEntriesRef.current.delete(assetId);
      removedAsset = true;
    }

    if (removedAsset) {
      setResolvedAssetUrls(snapshotResolvedAssetUrls(assetUrlEntriesRef.current));
    }

    const unresolvedAssets = project.assets.filter(
      (asset) => !asset.src && !assetUrlEntriesRef.current.has(asset.id),
    );

    if (unresolvedAssets.length === 0) {
      return;
    }

    let cancelled = false;

    void (async () => {
      const loadedEntries: Array<[string, ResolvedAssetUrlEntry]> = [];

      for (const asset of unresolvedAssets) {
        const payload = await getAssetPayload(project.id, asset.id);

        if (!payload) {
          continue;
        }

        loadedEntries.push([
          asset.id,
          {
            url: URL.createObjectURL(payload.blob),
            revoke: true,
          },
        ]);
      }

      if (cancelled) {
        revokeResolvedAssetUrls(loadedEntries.map(([, entry]) => entry));
        return;
      }

      let changed = false;

      for (const [assetId, entry] of loadedEntries) {
        if (assetUrlEntriesRef.current.has(assetId)) {
          if (entry.revoke) {
            URL.revokeObjectURL(entry.url);
          }

          continue;
        }

        assetUrlEntriesRef.current.set(assetId, entry);
        changed = true;
      }

      if (changed) {
        setResolvedAssetUrls(snapshotResolvedAssetUrls(assetUrlEntriesRef.current));
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [project.assets, project.id]);

  useEffect(() => {
    const assetUrlEntries = assetUrlEntriesRef.current;

    return () => {
      revokeResolvedAssetUrls(assetUrlEntries.values());
      assetUrlEntries.clear();
    };
  }, []);

  useEffect(() => {
    const nextMap = new Map<string, HTMLAudioElement>();
    const previousMap = audioElementsRef.current;

    for (const asset of project.assets) {
      if (asset.type !== "audio") {
        continue;
      }

      const assetSource = assetSources.get(asset.id);

      if (!assetSource) {
        continue;
      }

      const existing = audioElementsRef.current.get(asset.id);
      const audio = existing ?? new Audio(assetSource);
      audio.src = assetSource;
      nextMap.set(asset.id, audio);
    }

    for (const [assetId, audio] of previousMap) {
      if (nextMap.has(assetId)) {
        continue;
      }

      audio.pause();
      audio.src = "";
    }

    audioElementsRef.current = nextMap;
  }, [assetSources, project.assets]);

  useEffect(() => {
    for (const layer of project.layers) {
      if (layer.type !== "audio" || !layer.object.content || !("assetId" in layer.object.content)) {
        continue;
      }

      const audio = audioElementsRef.current.get(layer.object.content.assetId);
      const clip = layer.clips[0];

      if (!audio || !clip) {
        continue;
      }

      const insideClip = layer.visible && currentTime >= clip.start && currentTime <= clip.end;

      if (!insideClip) {
        audio.pause();
        audio.currentTime = 0;
        continue;
      }

      const clipTime = Math.max(0, currentTime - clip.start);

      if (Math.abs(audio.currentTime - clipTime) > 0.18) {
        audio.currentTime = clipTime;
      }

      if (isPlaying) {
        void audio.play();
      } else {
        audio.pause();
      }
    }
  }, [currentTime, isPlaying, project.layers]);

  const handleImport = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];

    if (!file) {
      return;
    }

    try {
      if (file.name.toLowerCase().endsWith(".json")) {
        const contents = await file.text();
        replaceProject(JSON.parse(contents) as Project);
      } else {
        const importedPackage = await parseProjectPackage(file);

        await Promise.all(
          importedPackage.payloads.map((payload) =>
            saveAssetPayload(importedPackage.project.id, payload.assetId, payload.blob, {
              fileName: payload.fileName,
              mimeType: payload.mimeType,
            }),
          ),
        );

        replaceProject(importedPackage.project);
      }
    } catch (error) {
      console.warn("Failed to import project package.", error);
      window.alert("Could not import that project. Use a .json export or a packaged .mge file.");
    } finally {
      event.target.value = "";
    }
  };

  const handleImageImport = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];

    if (!file) {
      return;
    }

    const temporaryUrl = URL.createObjectURL(file);
    let keepTemporaryUrl = false;

    try {
      const assetId = `image-${crypto.randomUUID()}`;
      const mimeType = getImportMimeType(file, "application/octet-stream");
      const { width, height } = await readImageDimensions(temporaryUrl);
      const longestSide = Math.max(width, height, 1);
      const previewWidth = Number(((width / longestSide) * 2.8).toFixed(3));
      const previewHeight = Number(((height / longestSide) * 2.8).toFixed(3));

      await saveAssetPayload(project.id, assetId, file, {
        fileName: file.name,
        mimeType,
      });

      addImageLayer(
        assetId,
        getAssetDisplayName(file.name),
        previewWidth,
        previewHeight,
        file.name,
        mimeType,
      );
      registerResolvedAssetUrl(assetId, temporaryUrl);
      keepTemporaryUrl = true;
    } catch (error) {
      console.warn("Failed to import image.", error);
      window.alert("Could not import that image.");
    } finally {
      if (!keepTemporaryUrl) {
        URL.revokeObjectURL(temporaryUrl);
      }

      event.target.value = "";
    }
  };

  const handleModelImport = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];

    if (!file) {
      return;
    }

    let objectUrl: string | null = null;
    let keepObjectUrl = false;

    try {
      const assetId = `model-${crypto.randomUUID()}`;
      const mimeType = getModelImportMimeType(file);
      const metadata = await inspectModelFile(file);

      await saveAssetPayload(project.id, assetId, file, {
        fileName: file.name,
        mimeType,
      });

      addImportedModelLayer(
        assetId,
        getAssetDisplayName(file.name),
        getModelFormat(file.name),
        metadata,
        file.name,
        mimeType,
      );
      objectUrl = URL.createObjectURL(file);
      registerResolvedAssetUrl(assetId, objectUrl);
      keepObjectUrl = true;
    } catch (error) {
      console.warn("Failed to import 3D model.", error);
      window.alert("Could not import that model. Use a GLB file or a self-contained GLTF file.");
    } finally {
      if (objectUrl && !keepObjectUrl) {
        URL.revokeObjectURL(objectUrl);
      }

      event.target.value = "";
    }
  };

  const handleAudioImport = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];

    if (!file) {
      return;
    }

    const audioContext = new AudioContext();
    let objectUrl: string | null = null;
    let keepObjectUrl = false;

    try {
      const assetId = `audio-${crypto.randomUUID()}`;
      const mimeType = getImportMimeType(file, "application/octet-stream");
      const buffer = await file.arrayBuffer();
      const decoded = await audioContext.decodeAudioData(buffer.slice(0));
      const waveform = createWaveform(decoded.getChannelData(0));

      await saveAssetPayload(project.id, assetId, file, {
        fileName: file.name,
        mimeType,
      });

      addAudioLayer(
        assetId,
        getAssetDisplayName(file.name),
        waveform,
        decoded.duration,
        file.name,
        mimeType,
      );
      objectUrl = URL.createObjectURL(file);
      registerResolvedAssetUrl(assetId, objectUrl);
      keepObjectUrl = true;
    } catch (error) {
      console.warn("Failed to import audio.", error);
      window.alert("Could not import that audio file.");
    } finally {
      if (objectUrl && !keepObjectUrl) {
        URL.revokeObjectURL(objectUrl);
      }

      await audioContext.close();
      event.target.value = "";
    }
  };

  const handleExport = async () => {
    try {
      const blob = await buildProjectPackage(project);
      downloadBlob(blob, getProjectFileName(project, PROJECT_PACKAGE_EXTENSION));
    } catch (error) {
      console.warn("Failed to export project package.", error);
      window.alert("Could not export that project package.");
    }
  };

  const handleExportPng = () => {
    const canvas = previewCanvasRef.current;

    if (!canvas) {
      return;
    }

    const compositeCanvas = createCompositeExportCanvas(canvas);

    if (!drawCompositeExportFrame(compositeCanvas, canvas, sceneState)) {
      return;
    }

    const link = document.createElement("a");
    link.href = compositeCanvas.toDataURL("image/png");
    link.download = `${project.name.toLowerCase().replaceAll(/\s+/g, "-")}.png`;
    link.click();
  };

  const handleExportWebm = () => {
    void (async () => {
      const canvas = previewCanvasRef.current;
      const mimeType = getSupportedWebmMimeType();

      if (!canvas || typeof MediaRecorder === "undefined" || !mimeType) {
        return;
      }

      const compositeCanvas = createCompositeExportCanvas(canvas);

      if (!drawCompositeExportFrame(compositeCanvas, canvas, sceneState)) {
        return;
      }

      const stream = compositeCanvas.captureStream(0);
      const videoTrack = stream.getVideoTracks()[0] as CanvasCaptureMediaStreamTrack | undefined;
      const previousLoopPlayback = loopPlayback;
      const previousIsPlaying = isPlaying;
      const previousTime = playbackTimeRef.current;
      const chunks: Blob[] = [];
      const recorder = new MediaRecorder(stream, {
        mimeType,
        videoBitsPerSecond: EXPORT_VIDEO_BITRATE,
      });
      const finishRecording = new Promise<Blob>((resolve, reject) => {
        recorder.onerror = (event) => {
          reject(event.error ?? new Error("Video export failed."));
        };
        recorder.onstop = () => {
          resolve(new Blob(chunks, { type: mimeType }));
        };
      });

      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunks.push(event.data);
        }
      };

      try {
        setPlaying(false);
        setLoopPlayback(false);
        recorder.start();

        const exportFps = Math.max(1, Math.round(project.fps));
        const frameCount = Math.max(1, Math.ceil(project.duration * exportFps));

        if (videoTrack && typeof videoTrack.requestFrame === "function") {
          for (let frameIndex = 0; frameIndex < frameCount; frameIndex += 1) {
            const frameTime = Math.min(project.duration, frameIndex / exportFps);

            seek(frameTime);
            await waitForAnimationFrame();
            drawCompositeExportFrame(compositeCanvas, canvas, sampleSceneState(project, frameTime));
            videoTrack.requestFrame();
          }
        } else {
          let compositeFrameId = 0;

          const drawFrame = () => {
            drawCompositeExportFrame(
              compositeCanvas,
              canvas,
              sampleSceneState(project, playbackTimeRef.current),
            );
            compositeFrameId = window.requestAnimationFrame(drawFrame);
          };

          seek(0);
          await waitForAnimationFrame();
          drawFrame();
          setPlaying(true);

          await new Promise<void>((resolve) => {
            window.setTimeout(
              () => {
                if (compositeFrameId) {
                  window.cancelAnimationFrame(compositeFrameId);
                }

                resolve();
              },
              project.duration * 1000 + Math.ceil(1000 / exportFps),
            );
          });
        }

        if (recorder.state !== "inactive") {
          recorder.stop();
        }

        const blob = await finishRecording;
        downloadBlob(blob, `${project.name.toLowerCase().replaceAll(/\s+/g, "-")}.webm`);
      } catch (error) {
        console.warn("Failed to export preview video.", error);
        window.alert("Could not export that preview video.");

        if (recorder.state !== "inactive") {
          recorder.stop();
        }
      } finally {
        stream.getTracks().forEach((track) => track.stop());
        seek(previousTime);
        setLoopPlayback(previousLoopPlayback);
        setPlaying(previousIsPlaying);
      }
    })();
  };

  const projectFileSection = (
    <InspectorSection title="Project">
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={handleExport}
          className="inline-flex h-8 items-center gap-1.5 rounded-full border border-white/10 bg-white/5 px-3 text-[11px] text-slate-300 transition hover:bg-white/10"
          title="Export project package"
        >
          <Download className="h-3 w-3" />
          Project
        </button>
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          className="inline-flex h-8 items-center gap-1.5 rounded-full border border-white/10 bg-white/5 px-3 text-[11px] text-slate-300 transition hover:bg-white/10"
          title="Import project package or legacy JSON"
        >
          <FileUp className="h-3 w-3" />
          Import
        </button>
        <button
          type="button"
          onClick={handleExportPng}
          className="inline-flex h-8 items-center gap-1 rounded-full border border-white/10 bg-white/5 px-3 text-[11px] text-slate-300 transition hover:bg-white/10"
          title="Export preview PNG"
        >
          PNG
        </button>
        <button
          type="button"
          onClick={handleExportWebm}
          className="inline-flex h-8 items-center gap-1 rounded-full border border-white/10 bg-white/5 px-3 text-[11px] text-slate-300 transition hover:bg-white/10"
          title="Export preview WebM"
        >
          WebM
        </button>
        <button
          type="button"
          onClick={() => audioInputRef.current?.click()}
          className="inline-flex h-8 items-center gap-1.5 rounded-full border border-white/10 bg-white/5 px-3 text-[11px] text-slate-300 transition hover:bg-white/10"
          title="Import audio layer"
        >
          <Volume2 className="h-3 w-3" />
          Audio
        </button>
      </div>
    </InspectorSection>
  );

  const undoProject = useCallback(() => {
    const previousProject = historyRef.current.pop();

    if (!previousProject) {
      return;
    }

    pushProjectSnapshot(futureRef.current, project);
    skipHistoryRef.current = true;
    syncHistoryState();
    replaceProject(previousProject);
  }, [project, replaceProject, syncHistoryState]);

  const redoProject = useCallback(() => {
    const nextProject = futureRef.current.pop();

    if (!nextProject) {
      return;
    }

    pushProjectSnapshot(historyRef.current, project);
    skipHistoryRef.current = true;
    syncHistoryState();
    replaceProject(nextProject);
  }, [project, replaceProject, syncHistoryState]);

  const canUndo = historyState.canUndo;
  const canRedo = historyState.canRedo;
  const activeTransformTool =
    TRANSFORM_TOOL_OPTIONS.find((option) => option.mode === transformMode) ??
    TRANSFORM_TOOL_OPTIONS[0];
  const ActiveTransformIcon = activeTransformTool.icon;

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.code === "Space") {
        event.preventDefault();
        setPlaying(!isPlaying);
        return;
      }

      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "z") {
        event.preventDefault();

        if (event.shiftKey) {
          redoProject();
        } else {
          undoProject();
        }

        return;
      }

      if (event.key === "Delete" || event.key === "Backspace") {
        const tag = (event.target as HTMLElement)?.tagName;
        const isEditing =
          tag === "INPUT" || tag === "TEXTAREA" || (event.target as HTMLElement)?.isContentEditable;
        if (isEditing) return;

        event.preventDefault();
        if (selectedKeyframeId) {
          deleteKeyframe(selectedKeyframeId);
        } else if (selectedId) {
          deleteLayer(selectedId);
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [
    deleteKeyframe,
    deleteLayer,
    isPlaying,
    redoProject,
    selectedId,
    selectedKeyframeId,
    setPlaying,
    undoProject,
  ]);

  return (
    <main className="min-h-screen bg-[linear-gradient(155deg,_#27282c_0%,_#1a1b1f_45%,_#0d0f14_100%)] text-slate-100">
      <input
        ref={fileInputRef}
        type="file"
        accept=".json,.mge,application/json,application/zip"
        className="hidden"
        onChange={handleImport}
      />
      <input
        ref={imageInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleImageImport}
      />
      <input
        ref={modelInputRef}
        type="file"
        accept=".glb,.gltf,model/gltf-binary,model/gltf+json"
        className="hidden"
        onChange={handleModelImport}
      />
      <input
        ref={audioInputRef}
        type="file"
        accept="audio/*"
        className="hidden"
        onChange={handleAudioImport}
      />

      <div className="mx-auto flex min-h-screen w-full max-w-[1600px] flex-col gap-2 p-2 md:p-3">
        <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_minmax(300px,32%)] md:items-stretch xl:grid-cols-[minmax(0,1fr)_minmax(340px,28%)]">
          {/* ─── Preview section ─────────────────────────────── */}
          <section className="relative min-h-[62vh] overflow-hidden rounded-[30px] border border-white/6 bg-[#0d0f14] shadow-[0_32px_100px_rgba(0,0,0,0.55)]">
            {/* Top-left compact toolbar */}
            <div className="absolute left-4 top-4 z-20">
              <div className="flex items-center gap-0.5 rounded-[14px] border border-white/8 bg-black/70 p-[3px] shadow-[0_8px_24px_rgba(0,0,0,0.4)] backdrop-blur-xl">
                <button
                  id="toolbar-pan"
                  type="button"
                  onClick={() =>
                    viewportStore.send({
                      type: "setInteractionMode",
                      mode: interactionMode === "pan" ? "select" : "pan",
                    })
                  }
                  className={`flex h-8 w-8 items-center justify-center rounded-[11px] transition-all ${
                    interactionMode === "pan"
                      ? "bg-white/15 text-white"
                      : "text-slate-400 hover:bg-white/8 hover:text-slate-200"
                  }`}
                  title="Pan tool"
                >
                  <Hand className="h-4 w-4" />
                </button>
                <button
                  id="toolbar-camera"
                  type="button"
                  onClick={() =>
                    viewportStore.send({
                      type: "setInteractionMode",
                      mode: interactionMode === "orbit" ? "select" : "orbit",
                    })
                  }
                  className={`flex h-8 w-8 items-center justify-center rounded-[11px] transition-all ${
                    interactionMode === "orbit"
                      ? "bg-white/15 text-white"
                      : "text-slate-400 hover:bg-white/8 hover:text-slate-200"
                  }`}
                  title="Camera orbit tool"
                >
                  <Camera className="h-4 w-4" />
                </button>
                <button
                  id="toolbar-grid"
                  type="button"
                  onClick={() => setShowGuides((v) => !v)}
                  className={`flex h-8 w-8 items-center justify-center rounded-[11px] transition-all ${
                    showGuides
                      ? "bg-white/15 text-white"
                      : "text-slate-400 hover:bg-white/8 hover:text-slate-200"
                  }`}
                  title="Toggle grid guides"
                >
                  <Grid2x2 className="h-4 w-4" />
                </button>
              </div>
            </div>

            <PreviewViewport
              objects={previewObjects}
              sceneState={sceneState}
              selectedId={selectedId}
              onSelect={selectLayer}
              onMove={moveLayerObject}
              onScale={handleScale}
              onRotate={handleRotate}
              showGuides={showGuides}
              onCanvasReady={(canvas) => {
                previewCanvasRef.current = canvas;
              }}
            />

            {/* Bottom floating toolbar */}
            <div className="absolute bottom-5 left-1/2 z-30 -translate-x-1/2">
              <div className="relative">
                <div className="flex items-center gap-1 rounded-full border border-white/10 bg-black/78 p-1.5 text-slate-100 shadow-[0_20px_50px_rgba(0,0,0,0.45)] backdrop-blur-xl">
                  {/* Select Tool with dropdown */}
                  <div className="relative flex items-center">
                    <button
                      type="button"
                      onClick={() => {
                        viewportStore.send({ type: "setInteractionMode", mode: "select" });
                        viewportStore.send({
                          type: "setActiveDropdown",
                          dropdown: activeDropdown === "select" ? null : "select",
                        });
                      }}
                      className={`flex h-9 items-center gap-1 rounded-full pl-3 pr-2 transition ${
                        interactionMode === "select"
                          ? "bg-[#6f7bf6] text-white shadow-[0_4px_12px_rgba(111,123,246,0.35)]"
                          : "text-slate-300 hover:bg-white/5"
                      }`}
                      title={`${activeTransformTool.label} transform tool`}
                      aria-label={`${activeTransformTool.label} transform tool`}
                    >
                      <ActiveTransformIcon className="h-4 w-4" />
                      <ChevronDown className="h-3 w-3 opacity-60" />
                    </button>

                    {activeDropdown === "select" ? (
                      <div className="absolute bottom-12 left-0 z-50 flex items-center gap-1 rounded-full border border-white/10 bg-black/88 p-1.5 shadow-[0_12px_32px_rgba(0,0,0,0.5)] backdrop-blur-xl">
                        {TRANSFORM_TOOL_OPTIONS.map(({ mode, icon, label }) => (
                          <ToolbarOptionButton
                            key={mode}
                            icon={icon}
                            title={label}
                            active={transformMode === mode}
                            onClick={() => {
                              viewportStore.send({ type: "setTransformMode", mode });
                              viewportStore.send({ type: "setActiveDropdown", dropdown: null });
                            }}
                          />
                        ))}
                      </div>
                    ) : null}
                  </div>

                  <div className="h-5 w-px bg-white/10" />

                  {/* 3D Shapes (Cube) Dropdown */}
                  <div className="relative">
                    <button
                      type="button"
                      onClick={() =>
                        viewportStore.send({
                          type: "setActiveDropdown",
                          dropdown: activeDropdown === "cube" ? null : "cube",
                        })
                      }
                      className={`flex h-9 w-9 items-center justify-center rounded-full transition ${activeDropdown === "cube" ? "bg-white/10 text-white" : "text-slate-300 hover:bg-white/5"}`}
                      title="Add 3D mesh layer"
                    >
                      <Boxes className="h-4.5 w-4.5" />
                    </button>

                    {activeDropdown === "cube" ? (
                      <div className="absolute bottom-12 left-1/2 z-50 grid w-44 -translate-x-1/2 grid-cols-3 gap-1 rounded-2xl border border-white/10 bg-black/88 p-1.5 shadow-[0_12px_32px_rgba(0,0,0,0.5)] backdrop-blur-xl">
                        {MODEL_TOOL_OPTIONS.map(({ shape, icon, label }) => (
                          <ToolbarOptionButton
                            key={shape}
                            icon={icon}
                            title={label}
                            onClick={() => {
                              add3DModelLayer(shape);
                              viewportStore.send({ type: "setActiveDropdown", dropdown: null });
                            }}
                          />
                        ))}
                        <button
                          type="button"
                          onClick={() => {
                            modelInputRef.current?.click();
                            viewportStore.send({ type: "setActiveDropdown", dropdown: null });
                          }}
                          className="col-span-3 mt-1 flex h-9 items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/6 px-3 text-xs font-medium text-slate-100 transition hover:bg-white/12"
                          title="Import GLB or GLTF model"
                        >
                          <FileUp className="h-4 w-4" />
                          Import model
                        </button>
                      </div>
                    ) : null}
                  </div>

                  {/* Text Layer */}
                  <button
                    type="button"
                    onClick={addTextLayer}
                    className="flex h-9 w-9 items-center justify-center rounded-full text-slate-300 transition hover:bg-white/5 hover:text-white"
                    title="Add text layer"
                  >
                    <Type className="h-4.5 w-4.5" />
                  </button>

                  {/* Image upload */}
                  <button
                    type="button"
                    onClick={() => imageInputRef.current?.click()}
                    className="flex h-9 w-9 items-center justify-center rounded-full text-slate-300 transition hover:bg-white/5 hover:text-white"
                    title="Import image layer"
                  >
                    <ImageIcon className="h-4.5 w-4.5" />
                  </button>

                  <div className="h-5 w-px bg-white/10" />

                  {/* 2D Shapes Dropdown */}
                  <div className="relative flex items-center">
                    <button
                      type="button"
                      onClick={() =>
                        viewportStore.send({
                          type: "setActiveDropdown",
                          dropdown: activeDropdown === "shape" ? null : "shape",
                        })
                      }
                      className={`flex h-9 items-center gap-0.5 rounded-full pl-2.5 pr-1.5 transition ${activeDropdown === "shape" ? "bg-white/10 text-white" : "text-slate-300 hover:bg-white/5"}`}
                      title="Add 2D shape layer"
                    >
                      <Square className="h-4 w-4" />
                      <ChevronDown className="h-3 w-3 opacity-60" />
                    </button>

                    {activeDropdown === "shape" ? (
                      <div className="absolute bottom-12 right-0 z-50 grid w-32 grid-cols-3 gap-1 rounded-2xl border border-white/10 bg-black/88 p-1.5 shadow-[0_12px_32px_rgba(0,0,0,0.5)] backdrop-blur-xl">
                        {SHAPE_TOOL_OPTIONS.map(({ shape, icon, label }) => (
                          <ToolbarOptionButton
                            key={shape}
                            icon={icon}
                            title={label}
                            onClick={() => {
                              addShapeLayer(shape);
                              viewportStore.send({ type: "setActiveDropdown", dropdown: null });
                            }}
                          />
                        ))}
                      </div>
                    ) : null}
                  </div>
                </div>
              </div>
            </div>
          </section>

          {showInspectorOverlay ? (
            <section className="h-full min-h-[62vh] overflow-hidden rounded-[30px] border border-white/6 bg-[#101218] shadow-[0_32px_100px_rgba(0,0,0,0.42)]">
              {selectedLayer ? (
                <div className="space-y-4 p-5 text-sm text-slate-200 md:max-h-[62vh] md:overflow-y-auto">
                  {activeScene ? (
                    <SceneInspectorSection
                      scene={activeScene}
                      previousScene={previousScene}
                      nextScene={nextScene}
                      onRename={updateSceneName}
                      onDelete={deleteScene}
                      onMoveBoundary={moveSceneBoundary}
                      onUpdateBackground={updateSceneBackground}
                      onUpdateTransition={updateSceneTransition}
                    />
                  ) : null}
                  <div className="space-y-3">
                    <div className="min-w-0">
                      <p className="text-[11px] uppercase tracking-[0.28em] text-slate-500">
                        Inspector
                      </p>
                      <h2 className="mt-1 text-xl font-semibold text-white">
                        {selectedObject?.name ?? selectedLayer.name}
                      </h2>
                      <div className="mt-2 flex flex-wrap gap-2 text-[11px] text-slate-400">
                        <span className="rounded-full border border-white/8 bg-white/6 px-2.5 py-1 uppercase tracking-[0.16em]">
                          {(selectedObject?.type ?? selectedLayer.type).toUpperCase()}
                        </span>
                        <span className="rounded-full border border-white/8 bg-white/6 px-2.5 py-1">
                          {inspectorClip
                            ? `${inspectorClip.start.toFixed(2)}s - ${inspectorClip.end.toFixed(2)}s`
                            : "No clip"}
                        </span>
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <ChromeIconButton
                        icon={Undo2}
                        title="Undo (⌘Z)"
                        onClick={undoProject}
                        disabled={!canUndo}
                      />
                      <ChromeIconButton
                        icon={Redo2}
                        title="Redo (⌘⇧Z)"
                        onClick={redoProject}
                        disabled={!canRedo}
                      />
                      <ChromeIconButton
                        icon={selectedLayer.visible ? Eye : EyeOff}
                        title={selectedLayer.visible ? "Hide layer" : "Show layer"}
                        onClick={() => selectedId && toggleLayerVisibility(selectedId)}
                      />
                      <ChromeIconButton
                        icon={selectedLayer.locked ? Lock : LockOpen}
                        title={selectedLayer.locked ? "Unlock layer" : "Lock layer"}
                        onClick={() => selectedId && toggleLayerLock(selectedId)}
                      />
                      <ChromeIconButton
                        icon={Trash2}
                        title="Delete layer"
                        onClick={() => selectedId && deleteLayer(selectedId)}
                      />
                    </div>
                  </div>

                  <InspectorSection title="Layer">
                    <div className="grid grid-cols-2 gap-3">
                      <MiniField label="Name">
                        <input
                          value={selectedLayer.name}
                          onChange={(event) =>
                            selectedId && renameLayer(selectedId, event.target.value)
                          }
                          disabled={selectionLocked}
                          className="h-10 w-full rounded-xl border border-white/8 bg-black/30 px-3 text-sm text-white disabled:cursor-not-allowed disabled:opacity-40"
                        />
                      </MiniField>
                      <MiniField label="Stack">
                        <div className="flex items-center gap-2">
                          <ChromeIconButton
                            icon={ArrowUp}
                            title="Move layer up"
                            onClick={() => selectedId && reorderLayer(selectedId, "up")}
                            disabled={selectionLocked}
                          />
                          <ChromeIconButton
                            icon={ArrowDown}
                            title="Move layer down"
                            onClick={() => selectedId && reorderLayer(selectedId, "down")}
                            disabled={selectionLocked}
                          />
                        </div>
                      </MiniField>
                    </div>
                  </InspectorSection>

                  {selectedLayer.type !== "audio" ? (
                    <InspectorSection title="Transform">
                      <div className="grid grid-cols-2 gap-3">
                        <MiniField label="Opacity">
                          <NumberInput
                            min="0"
                            max="1"
                            step="0.05"
                            value={selectedValues.opacity}
                            onValueChange={(value) =>
                              selectedId && updateLayerOpacity(selectedId, value)
                            }
                            disabled={selectionLocked}
                            className="h-10 w-full rounded-xl border border-white/8 bg-black/30 px-3 text-sm text-white disabled:cursor-not-allowed disabled:opacity-40"
                          />
                        </MiniField>
                        <MiniField label="Color">
                          <input
                            type="color"
                            value={selectedLayer.object.style.color}
                            onChange={(event) =>
                              selectedId && updateLayerColor(selectedId, event.target.value)
                            }
                            disabled={selectionLocked}
                            className="h-10 w-full rounded-xl border border-white/8 bg-black/30 px-2 py-1 disabled:cursor-not-allowed disabled:opacity-40"
                          />
                        </MiniField>
                        <MiniField label="X">
                          <NumberInput
                            value={selectedValues.x}
                            onValueChange={(value) =>
                              selectedId && updateTransformProperty(selectedId, "x", value)
                            }
                            disabled={selectionLocked}
                            className="h-10 w-full rounded-xl border border-white/8 bg-black/30 px-3 text-sm text-white disabled:cursor-not-allowed disabled:opacity-40"
                          />
                        </MiniField>
                        <MiniField label="Y">
                          <NumberInput
                            value={selectedValues.y}
                            onValueChange={(value) =>
                              selectedId && updateTransformProperty(selectedId, "y", value)
                            }
                            disabled={selectionLocked}
                            className="h-10 w-full rounded-xl border border-white/8 bg-black/30 px-3 text-sm text-white disabled:cursor-not-allowed disabled:opacity-40"
                          />
                        </MiniField>
                        <MiniField label="Z Depth">
                          <NumberInput
                            step="0.05"
                            value={selectedValues.z}
                            onValueChange={(value) =>
                              selectedId && updateTransformProperty(selectedId, "z", value)
                            }
                            disabled={selectionLocked}
                            className="h-10 w-full rounded-xl border border-white/8 bg-black/30 px-3 text-sm text-white disabled:cursor-not-allowed disabled:opacity-40"
                          />
                        </MiniField>
                        <MiniField label="Scale X">
                          <NumberInput
                            step="0.05"
                            value={selectedValues.scaleX}
                            onValueChange={(value) =>
                              selectedId && updateTransformProperty(selectedId, "scaleX", value)
                            }
                            disabled={selectionLocked}
                            className="h-10 w-full rounded-xl border border-white/8 bg-black/30 px-3 text-sm text-white disabled:cursor-not-allowed disabled:opacity-40"
                          />
                        </MiniField>
                        <MiniField label="Scale Y">
                          <NumberInput
                            step="0.05"
                            value={selectedValues.scaleY}
                            onValueChange={(value) =>
                              selectedId && updateTransformProperty(selectedId, "scaleY", value)
                            }
                            disabled={selectionLocked}
                            className="h-10 w-full rounded-xl border border-white/8 bg-black/30 px-3 text-sm text-white disabled:cursor-not-allowed disabled:opacity-40"
                          />
                        </MiniField>
                        <MiniField label="Skew X">
                          <NumberInput
                            step="0.05"
                            value={selectedValues.skewX}
                            onValueChange={(value) =>
                              selectedId && updateTransformProperty(selectedId, "skewX", value)
                            }
                            disabled={selectionLocked}
                            className="h-10 w-full rounded-xl border border-white/8 bg-black/30 px-3 text-sm text-white disabled:cursor-not-allowed disabled:opacity-40"
                          />
                        </MiniField>
                        <MiniField label="Skew Y">
                          <NumberInput
                            step="0.05"
                            value={selectedValues.skewY}
                            onValueChange={(value) =>
                              selectedId && updateTransformProperty(selectedId, "skewY", value)
                            }
                            disabled={selectionLocked}
                            className="h-10 w-full rounded-xl border border-white/8 bg-black/30 px-3 text-sm text-white disabled:cursor-not-allowed disabled:opacity-40"
                          />
                        </MiniField>
                        <MiniField label="Rotation">
                          <NumberInput
                            step="0.05"
                            value={selectedValues.rotation}
                            onValueChange={(value) =>
                              selectedId && updateTransformProperty(selectedId, "rotation", value)
                            }
                            disabled={selectionLocked}
                            className="h-10 w-full rounded-xl border border-white/8 bg-black/30 px-3 text-sm text-white disabled:cursor-not-allowed disabled:opacity-40"
                          />
                        </MiniField>
                        <MiniField label="Tilt X">
                          <NumberInput
                            step="0.05"
                            value={selectedValues.rotationX}
                            onValueChange={(value) =>
                              selectedId && updateTransformProperty(selectedId, "rotationX", value)
                            }
                            disabled={selectionLocked}
                            className="h-10 w-full rounded-xl border border-white/8 bg-black/30 px-3 text-sm text-white disabled:cursor-not-allowed disabled:opacity-40"
                          />
                        </MiniField>
                        <MiniField label="Tilt Y">
                          <NumberInput
                            step="0.05"
                            value={selectedValues.rotationY}
                            onValueChange={(value) =>
                              selectedId && updateTransformProperty(selectedId, "rotationY", value)
                            }
                            disabled={selectionLocked}
                            className="h-10 w-full rounded-xl border border-white/8 bg-black/30 px-3 text-sm text-white disabled:cursor-not-allowed disabled:opacity-40"
                          />
                        </MiniField>
                        <MiniField label="Scale Z">
                          <NumberInput
                            step="0.05"
                            value={selectedValues.scaleZ}
                            onValueChange={(value) =>
                              selectedId && updateTransformProperty(selectedId, "scaleZ", value)
                            }
                            disabled={selectionLocked}
                            className="h-10 w-full rounded-xl border border-white/8 bg-black/30 px-3 text-sm text-white disabled:cursor-not-allowed disabled:opacity-40"
                          />
                        </MiniField>
                      </div>
                    </InspectorSection>
                  ) : (
                    <InspectorSection title="Audio">
                      <div className="text-xs text-slate-400">
                        Audio layers use clip timing and playback controls. Transform and visual
                        keyframe controls are not shown here.
                      </div>
                    </InspectorSection>
                  )}

                  {selectedTextContent ? (
                    <>
                      <InspectorSection title="Content">
                        <MiniField label="Text">
                          <textarea
                            value={selectedTextContent.value}
                            onChange={(event) =>
                              selectedId && updateTextLayer(selectedId, event.target.value)
                            }
                            rows={3}
                            disabled={selectionLocked}
                            className="w-full rounded-xl border border-white/8 bg-black/30 px-3 py-2.5 text-sm text-white disabled:cursor-not-allowed disabled:opacity-40"
                          />
                        </MiniField>
                      </InspectorSection>
                      <InspectorSection title="Type Style">
                        <div className="grid grid-cols-2 gap-3">
                          <MiniField label="Font Size">
                            <NumberInput
                              step="0.05"
                              value={selectedTextContent.fontSize}
                              onValueChange={(value) =>
                                selectedId &&
                                updateTextStyle(selectedId, {
                                  fontSize: value,
                                })
                              }
                              disabled={selectionLocked}
                              className="h-10 w-full rounded-xl border border-white/8 bg-black/30 px-3 text-sm text-white disabled:cursor-not-allowed disabled:opacity-40"
                            />
                          </MiniField>
                          <MiniField label="Weight">
                            <NumberInput
                              min="100"
                              max="900"
                              step="100"
                              value={selectedTextContent.fontWeight ?? 400}
                              onValueChange={(value) =>
                                selectedId &&
                                updateTextStyle(selectedId, {
                                  fontWeight: value,
                                })
                              }
                              disabled={selectionLocked}
                              className="h-10 w-full rounded-xl border border-white/8 bg-black/30 px-3 text-sm text-white disabled:cursor-not-allowed disabled:opacity-40"
                            />
                          </MiniField>
                          <MiniField label="Letter Spacing" className="col-span-2">
                            <NumberInput
                              step="0.01"
                              value={selectedTextContent.letterSpacing ?? 0}
                              onValueChange={(value) =>
                                selectedId &&
                                updateTextStyle(selectedId, {
                                  letterSpacing: value,
                                })
                              }
                              disabled={selectionLocked}
                              className="h-10 w-full rounded-xl border border-white/8 bg-black/30 px-3 text-sm text-white disabled:cursor-not-allowed disabled:opacity-40"
                            />
                          </MiniField>
                        </div>
                      </InspectorSection>
                    </>
                  ) : null}

                  {selectedModelContent ? (
                    <>
                      {isImportedModelContent(selectedModelContent) ? (
                        <InspectorSection title="3D Asset">
                          <div className="grid grid-cols-2 gap-3">
                            <MiniField label="Animation" className="col-span-2">
                              <select
                                value={selectedModelContent.activeAnimation ?? ""}
                                onChange={(event) =>
                                  selectedId &&
                                  updateModelMaterial(selectedId, {
                                    activeAnimation: event.target.value,
                                  })
                                }
                                disabled={
                                  selectionLocked ||
                                  selectedModelContent.animationNames.length === 0
                                }
                                className="h-10 w-full rounded-xl border border-white/8 bg-black/30 px-3 text-sm text-white disabled:cursor-not-allowed disabled:opacity-40"
                              >
                                {selectedModelContent.animationNames.length === 0 ? (
                                  <option value="">No embedded animation</option>
                                ) : (
                                  selectedModelContent.animationNames.map((animationName) => (
                                    <option key={animationName} value={animationName}>
                                      {animationName || "Animation"}
                                    </option>
                                  ))
                                )}
                              </select>
                            </MiniField>
                            <MiniField label="Speed">
                              <NumberInput
                                min="0"
                                max="8"
                                step="0.05"
                                value={selectedModelContent.animationSpeed ?? 1}
                                onValueChange={(value) =>
                                  selectedId &&
                                  updateModelMaterial(selectedId, {
                                    animationSpeed: Math.max(0, value),
                                  })
                                }
                                disabled={
                                  selectionLocked ||
                                  selectedModelContent.animationNames.length === 0
                                }
                                className="h-10 w-full rounded-xl border border-white/8 bg-black/30 px-3 text-sm text-white disabled:cursor-not-allowed disabled:opacity-40"
                              />
                            </MiniField>
                            <MiniField label="Loop">
                              <label className="flex h-10 items-center gap-2 rounded-xl border border-white/8 bg-black/30 px-3 text-sm text-white">
                                <input
                                  type="checkbox"
                                  checked={
                                    (selectedModelContent.animationPlayback ?? "loop") === "loop"
                                  }
                                  onChange={(event) =>
                                    selectedId &&
                                    updateModelMaterial(selectedId, {
                                      animationPlayback: event.target.checked ? "loop" : "once",
                                    })
                                  }
                                  disabled={
                                    selectionLocked ||
                                    selectedModelContent.animationNames.length === 0
                                  }
                                  className="accent-white disabled:cursor-not-allowed"
                                />
                                <span>Loop</span>
                              </label>
                            </MiniField>
                          </div>
                        </InspectorSection>
                      ) : null}

                      <InspectorSection title="3D Material">
                        <div className="grid grid-cols-2 gap-3">
                          <MiniField label="Roughness">
                            <NumberInput
                              min="0"
                              max="1"
                              step="0.05"
                              value={selectedModelContent.roughness ?? 0.4}
                              onValueChange={(value) =>
                                selectedId &&
                                updateModelMaterial(selectedId, {
                                  roughness: value,
                                })
                              }
                              disabled={selectionLocked}
                              className="h-10 w-full rounded-xl border border-white/8 bg-black/30 px-3 text-sm text-white disabled:cursor-not-allowed disabled:opacity-40"
                            />
                          </MiniField>
                          <MiniField label="Metalness">
                            <NumberInput
                              min="0"
                              max="1"
                              step="0.05"
                              value={selectedModelContent.metalness ?? 0.1}
                              onValueChange={(value) =>
                                selectedId &&
                                updateModelMaterial(selectedId, {
                                  metalness: value,
                                })
                              }
                              disabled={selectionLocked}
                              className="h-10 w-full rounded-xl border border-white/8 bg-black/30 px-3 text-sm text-white disabled:cursor-not-allowed disabled:opacity-40"
                            />
                          </MiniField>
                          <MiniField label="Emissive">
                            <input
                              type="color"
                              value={selectedModelContent.emissive ?? "#000000"}
                              onChange={(event) =>
                                selectedId &&
                                updateModelMaterial(selectedId, {
                                  emissive: event.target.value,
                                })
                              }
                              disabled={selectionLocked}
                              className="h-10 w-full rounded-xl border border-white/8 bg-black/30 px-2 py-1 disabled:cursor-not-allowed disabled:opacity-40"
                            />
                          </MiniField>
                          <MiniField label="Glow">
                            <NumberInput
                              min="0"
                              max="5"
                              step="0.05"
                              value={selectedModelContent.emissiveIntensity ?? 0}
                              onValueChange={(value) =>
                                selectedId &&
                                updateModelMaterial(selectedId, {
                                  emissiveIntensity: value,
                                })
                              }
                              disabled={selectionLocked}
                              className="h-10 w-full rounded-xl border border-white/8 bg-black/30 px-3 text-sm text-white disabled:cursor-not-allowed disabled:opacity-40"
                            />
                          </MiniField>
                          <MiniField label="Wireframe" className="col-span-2">
                            <label className="flex h-9 items-center gap-2 rounded-xl border border-white/8 bg-black/30 px-3 text-sm text-white">
                              <input
                                type="checkbox"
                                checked={selectedModelContent.wireframe ?? false}
                                onChange={(event) =>
                                  selectedId &&
                                  updateModelMaterial(selectedId, {
                                    wireframe: event.target.checked,
                                  })
                                }
                                disabled={selectionLocked}
                                className="accent-white disabled:cursor-not-allowed"
                              />
                              <span>Render as wireframe mesh</span>
                            </label>
                          </MiniField>
                        </div>
                      </InspectorSection>
                    </>
                  ) : null}

                  {selectedLayer.type !== "audio" ? (
                    <InspectorSection title="Clip">
                      {inspectorClip ? (
                        <div className="grid grid-cols-2 gap-3">
                          <MiniField label="Delay">
                            <NumberInput
                              min="0"
                              step="0.05"
                              value={inspectorClip.start}
                              onValueChange={(value) => moveClip(inspectorClip.id, value)}
                              disabled={selectionLocked}
                              className="h-10 w-full rounded-xl border border-white/8 bg-black/30 px-3 text-sm text-white disabled:cursor-not-allowed disabled:opacity-40"
                            />
                          </MiniField>
                          <MiniField label="Duration">
                            <NumberInput
                              min="0.1"
                              step="0.05"
                              value={Number((inspectorClip.end - inspectorClip.start).toFixed(2))}
                              onValueChange={(value) =>
                                trimClip(
                                  inspectorClip.id,
                                  "end",
                                  inspectorClip.start + Math.max(0.1, value),
                                )
                              }
                              disabled={selectionLocked}
                              className="h-10 w-full rounded-xl border border-white/8 bg-black/30 px-3 text-sm text-white disabled:cursor-not-allowed disabled:opacity-40"
                            />
                          </MiniField>
                          <MiniField label="Enabled" className="col-span-2">
                            <label className="flex h-9 items-center gap-2 rounded-xl border border-white/8 bg-black/30 px-3 text-sm text-white">
                              <input
                                type="checkbox"
                                checked={inspectorClip.enabled}
                                onChange={(event) =>
                                  setClipEnabled(inspectorClip.id, event.target.checked)
                                }
                                disabled={selectionLocked}
                                className="accent-white disabled:cursor-not-allowed"
                              />
                              <span>Clip contributes to playback and preview sampling</span>
                            </label>
                          </MiniField>
                          <MiniField label="Transition In">
                            <select
                              value={inspectorClip.transitionIn?.preset ?? "none"}
                              onChange={(event) =>
                                updateClipTransition(inspectorClip.id, "in", {
                                  preset: event.target.value as TransitionPreset,
                                })
                              }
                              disabled={selectionLocked}
                              className="h-10 w-full rounded-xl border border-white/8 bg-black/30 px-3 text-sm text-white disabled:cursor-not-allowed disabled:opacity-40"
                            >
                              {TRANSITION_OPTIONS.map((option) => (
                                <option key={option.value} value={option.value}>
                                  {option.label}
                                </option>
                              ))}
                            </select>
                          </MiniField>
                          <MiniField label="In Duration">
                            <NumberInput
                              min="0"
                              step="0.05"
                              value={inspectorClip.transitionIn?.duration ?? 0.6}
                              onValueChange={(value) =>
                                updateClipTransition(inspectorClip.id, "in", {
                                  duration: Math.max(0, value),
                                })
                              }
                              disabled={selectionLocked}
                              className="h-10 w-full rounded-xl border border-white/8 bg-black/30 px-3 text-sm text-white disabled:cursor-not-allowed disabled:opacity-40"
                            />
                          </MiniField>
                          <MiniField label="Transition Out">
                            <select
                              value={inspectorClip.transitionOut?.preset ?? "none"}
                              onChange={(event) =>
                                updateClipTransition(inspectorClip.id, "out", {
                                  preset: event.target.value as TransitionPreset,
                                })
                              }
                              disabled={selectionLocked}
                              className="h-10 w-full rounded-xl border border-white/8 bg-black/30 px-3 text-sm text-white disabled:cursor-not-allowed disabled:opacity-40"
                            >
                              {TRANSITION_OPTIONS.map((option) => (
                                <option key={option.value} value={option.value}>
                                  {option.label}
                                </option>
                              ))}
                            </select>
                          </MiniField>
                          <MiniField label="Out Duration">
                            <NumberInput
                              min="0"
                              step="0.05"
                              value={inspectorClip.transitionOut?.duration ?? 0.6}
                              onValueChange={(value) =>
                                updateClipTransition(inspectorClip.id, "out", {
                                  duration: Math.max(0, value),
                                })
                              }
                              disabled={selectionLocked}
                              className="h-10 w-full rounded-xl border border-white/8 bg-black/30 px-3 text-sm text-white disabled:cursor-not-allowed disabled:opacity-40"
                            />
                          </MiniField>
                        </div>
                      ) : (
                        <p className="text-xs text-slate-500">
                          No clip is available for this layer.
                        </p>
                      )}

                      {selectedKeyframe ? (
                        <MiniField label="Keyframe Easing" className="mt-3">
                          <select
                            value={selectedKeyframe.easing}
                            onChange={(event) =>
                              updateKeyframeEasing(
                                selectedKeyframe.id,
                                event.target.value as Easing,
                              )
                            }
                            disabled={selectionLocked}
                            className="h-10 w-full rounded-xl border border-white/8 bg-black/30 px-3 text-sm text-white disabled:cursor-not-allowed disabled:opacity-40"
                          >
                            {EASING_OPTIONS.map((option) => (
                              <option key={option} value={option}>
                                {option}
                              </option>
                            ))}
                          </select>
                        </MiniField>
                      ) : (
                        <p className="mt-3 text-xs text-slate-500">
                          Select a keyframe in the timeline to tune its easing curve.
                        </p>
                      )}
                    </InspectorSection>
                  ) : null}

                  {selectedLayer.type !== "audio" ? (
                    <InspectorSection title="Keyframes">
                      <div className="flex flex-wrap gap-2">
                        {(
                          [
                            "x",
                            "y",
                            "z",
                            "scaleX",
                            "scaleY",
                            "scaleZ",
                            "skewX",
                            "skewY",
                            "rotationX",
                            "rotationY",
                            "rotation",
                            "opacity",
                          ] as const
                        ).map((property) => (
                          <button
                            key={property}
                            type="button"
                            onClick={() => selectedId && addKeyframe(selectedId, property)}
                            disabled={selectionLocked}
                            className="rounded-full border border-white/10 bg-white/6 px-3 py-1.5 text-[11px] font-medium uppercase tracking-[0.14em] text-slate-200 disabled:cursor-not-allowed disabled:opacity-40"
                          >
                            + {property}
                          </button>
                        ))}
                        {selectedKeyframeId ? (
                          <button
                            type="button"
                            onClick={() => deleteKeyframe(selectedKeyframeId)}
                            disabled={selectionLocked}
                            className="rounded-full border border-rose-400/20 bg-rose-500/10 px-3 py-1.5 text-[11px] font-medium uppercase tracking-[0.14em] text-rose-200 disabled:cursor-not-allowed disabled:opacity-40"
                          >
                            Remove keyframe
                          </button>
                        ) : null}
                      </div>
                    </InspectorSection>
                  ) : null}

                  {projectFileSection}
                </div>
              ) : (
                <div className="space-y-4 p-5 text-sm text-slate-200 md:max-h-[62vh] md:overflow-y-auto">
                  {activeScene ? (
                    <SceneInspectorSection
                      scene={activeScene}
                      previousScene={previousScene}
                      nextScene={nextScene}
                      onRename={updateSceneName}
                      onDelete={deleteScene}
                      onMoveBoundary={moveSceneBoundary}
                      onUpdateBackground={updateSceneBackground}
                      onUpdateTransition={updateSceneTransition}
                    />
                  ) : null}
                  <div className="flex min-h-[16rem] flex-col items-center justify-center gap-3 rounded-2xl border border-white/8 bg-black/18 p-6 text-center">
                    <p className="text-[11px] uppercase tracking-[0.28em] text-slate-500">
                      Layer Inspector
                    </p>
                    <p className="text-base font-semibold text-white">Nothing selected</p>
                    <p className="max-w-[18rem] text-sm leading-6 text-slate-400">
                      Select a layer or clip to inspect transforms and keyframes. Scene controls
                      stay available above.
                    </p>
                  </div>
                  {projectFileSection}
                </div>
              )}
            </section>
          ) : null}
        </div>

        {/* ─── Timeline section ─────────────────────────────── */}
        <section className="overflow-hidden rounded-[28px] border border-white/8 bg-[#13161b] shadow-[0_28px_80px_rgba(0,0,0,0.34)]">
          <div className="flex items-center justify-between gap-3 border-b border-white/8 px-4 py-3">
            {/* Left: Play/Pause square button */}
            <button
              id="timeline-play-pause"
              type="button"
              onClick={() => setPlaying(!isPlaying)}
              title={isPlaying ? "Pause timeline" : "Play timeline"}
              className={`flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-[14px] border text-white transition ${
                isPlaying
                  ? "border-[#8e99ff]/50 bg-[#6f7bf6]/25 text-[#b4bcff]"
                  : "border-white/10 bg-white/6 hover:bg-white/10"
              }`}
            >
              {isPlaying ? <Pause className="h-5 w-5" /> : <Play className="h-5 w-5" />}
            </button>

            {/* Right controls */}
            <div className="flex flex-wrap items-center gap-2">
              <button
                id="timeline-audio-import"
                type="button"
                title="Import audio layer"
                onClick={() => audioInputRef.current?.click()}
                className="flex h-9 w-9 items-center justify-center rounded-full border border-white/10 bg-white/5 text-slate-400 transition hover:bg-white/10 hover:text-slate-200"
              >
                <Volume2 className="h-4 w-4" />
              </button>
              <button
                id="timeline-loop"
                type="button"
                title={loopPlayback ? "Loop on" : "Loop off"}
                onClick={() => setLoopPlayback(!loopPlayback)}
                className={`flex h-9 w-9 items-center justify-center rounded-full border transition ${
                  loopPlayback
                    ? "border-[#8e99ff]/40 bg-[#6f7bf6]/20 text-[#b4bcff]"
                    : "border-white/10 bg-white/5 text-slate-400 hover:bg-white/10 hover:text-slate-200"
                }`}
              >
                <Repeat className="h-4 w-4" />
              </button>
              <label className="inline-flex items-center rounded-full border border-white/10 bg-white/5 px-3 py-2">
                <input
                  type="range"
                  min="80"
                  max="240"
                  step="10"
                  value={timelineZoom}
                  onChange={(event) => setTimelineZoom(Number(event.target.value))}
                  className="w-28 accent-white"
                />
              </label>
              <TimelineMetaPill label="Start" value={`${(selectedClip?.start ?? 0).toFixed(2)}`} />
              <TimelineMetaPill
                label="End"
                value={`${(selectedClip?.end ?? project.duration).toFixed(2)}`}
              />
            </div>
          </div>

          <TimelinePanel
            scenes={project.scenes}
            layers={project.layers}
            assets={project.assets}
            duration={project.duration}
            zoom={timelineZoom}
            currentTime={currentTime}
            selectedSceneId={selectedSceneId}
            selectedLayerIds={selectedLayerIds}
            selectedClipId={selectedClipId}
            selectedKeyframeId={selectedKeyframeId}
            activeSceneId={activeScene?.id ?? null}
            onCreateScene={createSceneAtPlayhead}
            onDeleteScene={deleteScene}
            onMoveSceneBoundary={moveSceneBoundary}
            onSelectScene={selectScene}
            onSelectLayer={selectLayer}
            onSelectClip={selectClip}
            onSelectKeyframe={selectKeyframe}
            onSeek={seek}
            onMoveClip={moveClip}
            onTrimClip={trimClip}
            onMoveKeyframe={moveKeyframe}
          />
        </section>
      </div>
    </main>
  );
}

function createWaveform(channelData: Float32Array) {
  const bucketCount = 64;
  const bucketSize = Math.max(1, Math.floor(channelData.length / bucketCount));
  const peaks: number[] = [];

  for (let bucketIndex = 0; bucketIndex < bucketCount; bucketIndex += 1) {
    const start = bucketIndex * bucketSize;
    const end = Math.min(channelData.length, start + bucketSize);
    let peak = 0;

    for (let index = start; index < end; index += 1) {
      peak = Math.max(peak, Math.abs(channelData[index] ?? 0));
    }

    peaks.push(peak);
  }

  return peaks;
}

async function inspectModelFile(
  file: File,
): Promise<Pick<ImportedModelContent, "width" | "height" | "depth" | "animationNames">> {
  const [{ GLTFLoader }, three] = await Promise.all([
    import("three/examples/jsm/loaders/GLTFLoader.js"),
    import("three"),
  ]);
  const source = getModelFormat(file.name) === "glb" ? await file.arrayBuffer() : await file.text();
  const loader = new GLTFLoader();
  const gltf = await loader.parseAsync(source, "");
  return getImportedModelMetadata(gltf, three);
}

function getImportedModelMetadata(
  gltf: GLTF,
  three: typeof import("three"),
): Pick<ImportedModelContent, "width" | "height" | "depth" | "animationNames"> {
  const box = new three.Box3().setFromObject(gltf.scene);

  if (box.isEmpty()) {
    return {
      width: 2.4,
      height: 2.4,
      depth: 2.4,
      animationNames: getUniqueAnimationNames(gltf.animations),
    };
  }

  const size = box.getSize(new three.Vector3());
  const longestSide = Math.max(size.x, size.y, size.z, 0.001);
  const fitScale = 2.6 / longestSide;

  return {
    width: roundModelSize(size.x * fitScale),
    height: roundModelSize(size.y * fitScale),
    depth: roundModelSize(size.z * fitScale),
    animationNames: getUniqueAnimationNames(gltf.animations),
  };
}

function getUniqueAnimationNames(animations: GLTF["animations"]) {
  const usedNames = new Set<string>();

  return animations.map((animation, index) => {
    const baseName = animation.name.trim() || `Animation ${index + 1}`;
    let name = baseName;
    let suffix = 2;

    while (usedNames.has(name)) {
      name = `${baseName} ${suffix}`;
      suffix += 1;
    }

    usedNames.add(name);
    return name;
  });
}

function roundModelSize(value: number) {
  return Number(Math.max(0.2, value).toFixed(3));
}

function getModelFormat(fileName: string): ModelAssetFormat {
  return fileName.toLowerCase().endsWith(".gltf") ? "gltf" : "glb";
}

function readImageDimensions(src: string) {
  return new Promise<{ width: number; height: number }>((resolve, reject) => {
    const image = new Image();

    image.onload = () => {
      resolve({
        width: image.naturalWidth || image.width,
        height: image.naturalHeight || image.height,
      });
    };
    image.onerror = () => {
      reject(new Error("Failed to read image dimensions."));
    };
    image.src = src;
  });
}

function ChromeIconButton({
  icon: Icon,
  title,
  onClick,
  active = false,
  disabled = false,
}: {
  icon: ToolbarIcon;
  title: string;
  onClick?: () => void;
  active?: boolean;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      title={title}
      onClick={onClick}
      disabled={disabled}
      className={`flex h-10 w-10 items-center justify-center rounded-[14px] border text-slate-100 transition ${active ? "border-[#8e99ff]/60 bg-[#6f7bf6] shadow-[0_10px_24px_rgba(111,123,246,0.34)]" : "border-white/10 bg-white/6 hover:bg-white/10"} disabled:cursor-not-allowed disabled:opacity-40`}
    >
      <Icon className="h-4 w-4" />
    </button>
  );
}

function ToolbarOptionButton({
  icon: Icon,
  title,
  onClick,
  active = false,
}: {
  icon: ToolbarIcon;
  title: string;
  onClick: () => void;
  active?: boolean;
}) {
  return (
    <button
      type="button"
      title={title}
      aria-label={title}
      onClick={onClick}
      className={`flex h-8 w-8 items-center justify-center rounded-xl border transition ${
        active
          ? "border-[#8e99ff]/60 bg-[#6f7bf6] text-white shadow-[0_8px_20px_rgba(111,123,246,0.3)]"
          : "border-white/10 bg-white/4 text-slate-300 hover:bg-white/10 hover:text-white"
      }`}
    >
      <Icon className="h-4 w-4 shrink-0" />
    </button>
  );
}

function TimelineMetaPill({ label, value }: { label: string; value: string }) {
  return (
    <div className="inline-flex h-10 items-center gap-2 rounded-full border border-white/10 bg-black/20 px-3 text-xs text-slate-200">
      <span className="uppercase tracking-[0.22em] text-slate-500">{label}</span>
      <span className="font-medium text-white">{value}</span>
    </div>
  );
}

function MiniField({
  label,
  className = "",
  children,
}: {
  label: string;
  className?: string;
  children: ReactNode;
}) {
  return (
    <label className={`block space-y-1 ${className}`}>
      <span className="text-[10px] uppercase tracking-[0.26em] text-slate-500">{label}</span>
      {children}
    </label>
  );
}

function NumberInput({
  value,
  onValueChange,
  className,
  disabled = false,
  min,
  max,
  step,
  title,
}: {
  value: number | string;
  onValueChange: (value: number) => void;
  className: string;
  disabled?: boolean;
  min?: number | string;
  max?: number | string;
  step?: number | string;
  title?: string;
}) {
  const [draft, setDraft] = useState(String(value));
  const [isEditing, setIsEditing] = useState(false);

  useEffect(() => {
    if (!isEditing) {
      setDraft(String(value));
    }
  }, [isEditing, value]);

  const commitDraft = useCallback(
    (nextDraft: string) => {
      const normalized = nextDraft.trim();

      if (
        normalized === "" ||
        /^[-+]?$/.test(normalized) ||
        /^[-+]?\.$/.test(normalized) ||
        /^[-+]?\d+\.$/.test(normalized)
      ) {
        return false;
      }

      const nextValue = Number(normalized);

      if (!Number.isFinite(nextValue)) {
        return false;
      }

      onValueChange(nextValue);
      return true;
    },
    [onValueChange],
  );

  return (
    <input
      type="number"
      value={draft}
      min={min}
      max={max}
      step={step}
      title={title}
      disabled={disabled}
      onFocus={() => setIsEditing(true)}
      onChange={(event) => {
        const nextDraft = event.target.value;
        setDraft(nextDraft);
        commitDraft(nextDraft);
      }}
      onBlur={() => {
        setIsEditing(false);

        if (!commitDraft(draft)) {
          setDraft(String(value));
        }
      }}
      className={className}
    />
  );
}

function InspectorSection({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="rounded-2xl border border-white/8 bg-black/18 p-3.5">
      <p className="text-[10px] uppercase tracking-[0.24em] text-slate-500">{title}</p>
      <div className="mt-3">{children}</div>
    </section>
  );
}

function SceneInspectorSection({
  scene,
  previousScene,
  nextScene,
  onRename,
  onDelete,
  onMoveBoundary,
  onUpdateBackground,
  onUpdateTransition,
}: {
  scene: Scene;
  previousScene: Scene | null;
  nextScene: Scene | null;
  onRename: (sceneId: string, name: string) => void;
  onDelete: (sceneId: string) => void;
  onMoveBoundary: (sceneId: string, nextTime: number) => void;
  onUpdateBackground: (sceneId: string, patch: Partial<Scene["background"]>) => void;
  onUpdateTransition: (sceneId: string, patch: Partial<Scene["transitionToNext"]>) => void;
}) {
  return (
    <InspectorSection title="Scene">
      <div className="grid grid-cols-2 gap-3">
        <MiniField label="Scene Name" className="col-span-2">
          <div className="flex items-center gap-2">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl border border-white/8 bg-white/6 text-slate-200">
              <Clapperboard className="h-4 w-4" />
            </span>
            <input
              value={scene.name}
              onChange={(event) => onRename(scene.id, event.target.value)}
              className="h-10 w-full rounded-xl border border-white/8 bg-black/30 px-3 text-sm text-white"
            />
            <button
              type="button"
              onClick={() => onDelete(scene.id)}
              disabled={!previousScene && !nextScene}
              title={
                previousScene || nextScene
                  ? `Delete ${scene.name}`
                  : "At least one scene must remain"
              }
              className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border transition ${previousScene || nextScene ? "border-white/8 bg-black/30 text-slate-300 hover:border-rose-300/35 hover:bg-rose-500/12 hover:text-rose-100" : "border-white/8 bg-black/20 text-slate-600"}`}
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
        </MiniField>
        <MiniField label="Start">
          <NumberInput
            step="0.05"
            value={scene.start.toFixed(2)}
            disabled={!previousScene}
            onValueChange={(value) => {
              if (!previousScene) {
                return;
              }

              onMoveBoundary(previousScene.id, value);
            }}
            title={
              previousScene
                ? "Move the shared boundary with the previous scene"
                : "The first scene is anchored to the project start"
            }
            className={`h-10 w-full rounded-xl border border-white/8 bg-black/30 px-3 text-sm text-white ${!previousScene ? "cursor-not-allowed text-slate-500" : ""}`}
          />
        </MiniField>
        <MiniField label="End">
          <NumberInput
            step="0.05"
            value={scene.end.toFixed(2)}
            disabled={!nextScene}
            onValueChange={(value) => {
              if (!nextScene) {
                return;
              }

              onMoveBoundary(scene.id, value);
            }}
            title={
              nextScene
                ? "Move the shared boundary with the next scene"
                : "The last scene is anchored to the project end"
            }
            className={`h-10 w-full rounded-xl border border-white/8 bg-black/30 px-3 text-sm text-white ${!nextScene ? "cursor-not-allowed text-slate-500" : ""}`}
          />
        </MiniField>
        <MiniField label="Background">
          <input
            type="color"
            value={scene.background.color}
            onChange={(event) => onUpdateBackground(scene.id, { color: event.target.value })}
            className="h-10 w-full rounded-xl border border-white/8 bg-black/30 px-2 py-1"
          />
        </MiniField>
        <MiniField label="Accent">
          <input
            type="color"
            value={scene.background.accent}
            onChange={(event) => onUpdateBackground(scene.id, { accent: event.target.value })}
            className="h-10 w-full rounded-xl border border-white/8 bg-black/30 px-2 py-1"
          />
        </MiniField>
        <MiniField label="BG Motion">
          <select
            value={scene.background.animation}
            onChange={(event) =>
              onUpdateBackground(scene.id, {
                animation: event.target.value as BackgroundAnimationPreset,
              })
            }
            className="h-10 w-full rounded-xl border border-white/8 bg-black/30 px-3 text-sm text-white"
          >
            {BACKGROUND_ANIMATION_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </MiniField>
        <MiniField label="Scene Switch">
          <select
            value={scene.transitionToNext.preset}
            onChange={(event) =>
              onUpdateTransition(scene.id, {
                preset: event.target.value as TransitionPreset,
              })
            }
            className="h-10 w-full rounded-xl border border-white/8 bg-black/30 px-3 text-sm text-white"
          >
            {TRANSITION_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </MiniField>
        <MiniField label="Switch Duration" className="col-span-2">
          <NumberInput
            min="0"
            step="0.05"
            value={scene.transitionToNext.duration}
            onValueChange={(value) =>
              onUpdateTransition(scene.id, {
                duration: Math.max(0, value),
              })
            }
            className="h-10 w-full rounded-xl border border-white/8 bg-black/30 px-3 text-sm text-white"
          />
        </MiniField>
      </div>
    </InspectorSection>
  );
}
