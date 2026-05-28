import { useCallback, useEffect, useEffectEvent, useMemo, useRef, useState } from "react";
import type { ChangeEvent, ReactNode } from "react";
import {
  ArrowDown,
  ArrowUp,
  Boxes,
  Camera,
  ChevronDown,
  Grid2x2,
  Hand,
  Download,
  Eye,
  EyeOff,
  FileUp,
  Image as ImageIcon,
  Lock,
  LockOpen,
  Monitor,
  MousePointer2,
  Pause,
  Play,
  Redo2,
  Repeat,
  Save,
  Square,
  Trash2,
  Type,
  Undo2,
  Volume2,
} from "lucide-react";
import { sampleLayer } from "../editor/engine/animationSampler";
import { toPreviewObject } from "../editor/model/preview";
import type { Project } from "../editor/model/project";
import { PreviewViewport } from "../editor/preview/PreviewViewport";
import { STORAGE_KEY, useEditorStore } from "../editor/store/editorStore";
import { useSelector } from "@xstate/store-react";
import { viewportStore } from "../editor/store/viewportStore";
import { TimelinePanel } from "../editor/timeline/TimelinePanel";

export function AppShell() {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const imageInputRef = useRef<HTMLInputElement | null>(null);
  const audioInputRef = useRef<HTMLInputElement | null>(null);
  const audioElementsRef = useRef(new Map<string, HTMLAudioElement>());
  const playbackTimeRef = useRef(0);
  const previewCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const historyRef = useRef<Project[]>([]);
  const futureRef = useRef<Project[]>([]);
  const skipHistoryRef = useRef(false);
  const lastProjectRef = useRef<string>("");
  const [historyState, setHistoryState] = useState({ canUndo: false, canRedo: false });
  const [showGuides, setShowGuides] = useState(true);
  const [showInspectorOverlay, setShowInspectorOverlay] = useState(true);
  const [timelineZoom, setTimelineZoom] = useState(140);

  const interactionMode = useSelector(viewportStore, (state) => state.context.interactionMode);
  const transformMode = useSelector(viewportStore, (state) => state.context.transformMode);
  const activeDropdown = useSelector(viewportStore, (state) => state.context.activeDropdown);

  const project = useEditorStore((state) => state.project);
  const currentTime = useEditorStore((state) => state.currentTime);
  const isPlaying = useEditorStore((state) => state.isPlaying);
  const loopPlayback = useEditorStore((state) => state.loopPlayback);
  const selectedLayerIds = useEditorStore((state) => state.selectedLayerIds);
  const selectedClipId = useEditorStore((state) => state.selectedClipId);
  const selectedKeyframeId = useEditorStore((state) => state.selectedKeyframeId);
  const addTextLayer = useEditorStore((state) => state.addTextLayer);
  const addShapeLayer = useEditorStore((state) => state.addShapeLayer);
  const add3DModelLayer = useEditorStore((state) => state.add3DModelLayer);
  const addImageLayer = useEditorStore((state) => state.addImageLayer);
  const addAudioLayer = useEditorStore((state) => state.addAudioLayer);
  const selectLayer = useEditorStore((state) => state.selectLayer);
  const selectClip = useEditorStore((state) => state.selectClip);
  const selectKeyframe = useEditorStore((state) => state.selectKeyframe);
  const renameLayer = useEditorStore((state) => state.renameLayer);
  const deleteLayer = useEditorStore((state) => state.deleteLayer);
  const toggleLayerVisibility = useEditorStore((state) => state.toggleLayerVisibility);
  const toggleLayerLock = useEditorStore((state) => state.toggleLayerLock);
  const reorderLayer = useEditorStore((state) => state.reorderLayer);
  const updateTextLayer = useEditorStore((state) => state.updateTextLayer);
  const updateLayerColor = useEditorStore((state) => state.updateLayerColor);
  const updateTransformProperty = useEditorStore((state) => state.updateTransformProperty);
  const updateLayerOpacity = useEditorStore((state) => state.updateLayerOpacity);
  const moveLayerObject = useEditorStore((state) => state.moveLayerObject);
  const replaceProject = useEditorStore((state) => state.replaceProject);
  const moveClip = useEditorStore((state) => state.moveClip);
  const trimClip = useEditorStore((state) => state.trimClip);
  const addKeyframe = useEditorStore((state) => state.addKeyframe);
  const moveKeyframe = useEditorStore((state) => state.moveKeyframe);
  const deleteKeyframe = useEditorStore((state) => state.deleteKeyframe);
  const setPlaying = useEditorStore((state) => state.setPlaying);
  const setLoopPlayback = useEditorStore((state) => state.setLoopPlayback);
  const seek = useEditorStore((state) => state.seek);

  const sampledLayers = useMemo(
    () => project.layers.map((layer) => sampleLayer(layer, currentTime)),
    [currentTime, project.layers],
  );

  const previewObjects = useMemo(
    () => sampledLayers.map((layer) => toPreviewObject(layer)).filter((object) => object !== null),
    [sampledLayers],
  );

  const selectedId = selectedLayerIds[0] ?? null;
  const selectedLayer = project.layers.find((layer) => layer.id === selectedId) ?? null;
  const selectedClip = useMemo(
    () =>
      project.layers.flatMap((layer) => layer.clips).find((clip) => clip.id === selectedClipId) ??
      null,
    [project.layers, selectedClipId],
  );
  const selectedObject = useMemo(() => {
    if (!selectedLayer) {
      return null;
    }

    return toPreviewObject(sampleLayer(selectedLayer, currentTime), true);
  }, [currentTime, selectedLayer]);
  const selectedValues = useMemo(
    () => ({
      x: selectedObject?.x ?? selectedLayer?.object.transform.x ?? 0,
      y: selectedObject?.y ?? selectedLayer?.object.transform.y ?? 0,
      scaleX: selectedObject?.scaleX ?? selectedLayer?.object.transform.scaleX ?? 1,
      scaleY: selectedObject?.scaleY ?? selectedLayer?.object.transform.scaleY ?? 1,
      rotation: selectedObject?.rotation ?? selectedLayer?.object.transform.rotation ?? 0,
      opacity: selectedObject?.opacity ?? selectedLayer?.object.opacity ?? 1,
    }),
    [selectedLayer, selectedObject],
  );
  const selectionLocked = selectedLayer?.locked ?? false;

  playbackTimeRef.current = currentTime;

  const syncHistoryState = useCallback(() => {
    setHistoryState({
      canUndo: historyRef.current.length > 0,
      canRedo: futureRef.current.length > 0,
    });
  }, []);

  const saveProject = useEffectEvent((nextProject: Project) => {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(nextProject));
    } catch (error) {
      console.warn("Failed to persist motion graphics project.", error);
    }
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
    const serializedProject = JSON.stringify(project);

    if (!lastProjectRef.current) {
      lastProjectRef.current = serializedProject;
      syncHistoryState();
      return;
    }

    if (serializedProject === lastProjectRef.current) {
      return;
    }

    if (skipHistoryRef.current) {
      skipHistoryRef.current = false;
      lastProjectRef.current = serializedProject;
      syncHistoryState();
      return;
    }

    historyRef.current.push(JSON.parse(lastProjectRef.current) as Project);
    futureRef.current = [];
    lastProjectRef.current = serializedProject;
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
    const nextMap = new Map<string, HTMLAudioElement>();
    const previousMap = audioElementsRef.current;

    for (const asset of project.assets) {
      if (asset.type !== "audio") {
        continue;
      }

      const existing = audioElementsRef.current.get(asset.id);
      const audio = existing ?? new Audio(asset.src);
      audio.src = asset.src;
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
  }, [project.assets]);

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

    const contents = await file.text();
    replaceProject(JSON.parse(contents) as Project);
    event.target.value = "";
  };

  const handleImageImport = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];

    if (!file) {
      return;
    }

    try {
      const src = await readFileAsDataUrl(file);
      const { width, height } = await readImageDimensions(src);
      const longestSide = Math.max(width, height, 1);
      const previewWidth = Number(((width / longestSide) * 2.8).toFixed(3));
      const previewHeight = Number(((height / longestSide) * 2.8).toFixed(3));
      addImageLayer(file.name.replace(/\.[^.]+$/, ""), src, previewWidth, previewHeight);
    } finally {
      event.target.value = "";
    }
  };

  const handleAudioImport = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];

    if (!file) {
      return;
    }

    const audioContext = new AudioContext();

    try {
      const [src, buffer] = await Promise.all([readFileAsDataUrl(file), file.arrayBuffer()]);
      const decoded = await audioContext.decodeAudioData(buffer.slice(0));
      const waveform = createWaveform(decoded.getChannelData(0));
      addAudioLayer(file.name.replace(/\.[^.]+$/, ""), src, waveform, decoded.duration);
    } finally {
      await audioContext.close();
      event.target.value = "";
    }
  };

  const handleExport = () => {
    const blob = new Blob([JSON.stringify(project, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${project.name.toLowerCase().replaceAll(/\s+/g, "-")}.json`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const handleExportPng = () => {
    const canvas = previewCanvasRef.current;

    if (!canvas) {
      return;
    }

    const link = document.createElement("a");
    link.href = canvas.toDataURL("image/png");
    link.download = `${project.name.toLowerCase().replaceAll(/\s+/g, "-")}.png`;
    link.click();
  };

  const handleExportWebm = () => {
    const canvas = previewCanvasRef.current;

    if (!canvas || typeof MediaRecorder === "undefined") {
      return;
    }

    const previousLoopPlayback = loopPlayback;
    const chunks: Blob[] = [];
    const recorder = new MediaRecorder(canvas.captureStream(project.fps), {
      mimeType: "video/webm",
    });
    recorder.ondataavailable = (event) => {
      if (event.data.size > 0) {
        chunks.push(event.data);
      }
    };
    recorder.onstop = () => {
      const blob = new Blob(chunks, { type: "video/webm" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `${project.name.toLowerCase().replaceAll(/\s+/g, "-")}.webm`;
      link.click();
      URL.revokeObjectURL(url);
    };

    seek(0);
    setLoopPlayback(false);
    window.requestAnimationFrame(() => {
      recorder.start();
      setPlaying(true);
      window.setTimeout(
        () => {
          setPlaying(false);
          setLoopPlayback(previousLoopPlayback);
          seek(project.duration);

          if (recorder.state !== "inactive") {
            recorder.stop();
          }
        },
        project.duration * 1000 + Math.ceil(1000 / project.fps),
      );
    });
  };

  const undoProject = useCallback(() => {
    const previousProject = historyRef.current.pop();

    if (!previousProject) {
      return;
    }

    futureRef.current.push(JSON.parse(JSON.stringify(project)) as Project);
    skipHistoryRef.current = true;
    syncHistoryState();
    replaceProject(previousProject);
  }, [project, replaceProject, syncHistoryState]);

  const redoProject = useCallback(() => {
    const nextProject = futureRef.current.pop();

    if (!nextProject) {
      return;
    }

    historyRef.current.push(JSON.parse(JSON.stringify(project)) as Project);
    skipHistoryRef.current = true;
    syncHistoryState();
    replaceProject(nextProject);
  }, [project, replaceProject, syncHistoryState]);

  const canUndo = historyState.canUndo;
  const canRedo = historyState.canRedo;

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
    <main className="min-h-screen bg-[linear-gradient(180deg,_#ddd9d2_0%,_#b8b2ab_42%,_#0d0f14_100%)] text-slate-100">
      <input
        ref={fileInputRef}
        type="file"
        accept="application/json"
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
        ref={audioInputRef}
        type="file"
        accept="audio/*"
        className="hidden"
        onChange={handleAudioImport}
      />

      <div className="mx-auto flex min-h-screen w-full max-w-[1600px] flex-col gap-3 p-3 md:p-4">
        <section className="relative min-h-[66vh] overflow-hidden rounded-[36px] border border-black/12 bg-[linear-gradient(180deg,_rgba(255,255,255,0.26),_rgba(255,255,255,0.02)_20%,_rgba(0,0,0,0.2)_100%)] shadow-[0_30px_110px_rgba(0,0,0,0.22)]">
          <div className="pointer-events-none absolute inset-x-0 top-0 h-24 bg-[linear-gradient(180deg,_rgba(255,255,255,0.28),_transparent)]" />

          <div className="absolute left-4 top-4 z-20 flex items-center gap-2">
            <div className="flex items-center rounded-full bg-black/75 p-1 shadow-[0_12px_32px_rgba(0,0,0,0.32)] backdrop-blur-xl border border-white/5">
              <button
                type="button"
                onClick={() =>
                  viewportStore.send({
                    type: "setInteractionMode",
                    mode: interactionMode === "pan" ? "select" : "pan",
                  })
                }
                className={`flex h-8 px-3 items-center justify-center rounded-full transition-all ${interactionMode === "pan" ? "bg-white/16 text-white font-medium" : "text-slate-400 hover:text-slate-200"}`}
                title="Pan tool (Hand)"
              >
                <Hand className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={() =>
                  viewportStore.send({
                    type: "setInteractionMode",
                    mode: interactionMode === "orbit" ? "select" : "orbit",
                  })
                }
                className={`flex h-8 px-3 items-center justify-center rounded-full transition-all ${interactionMode === "orbit" ? "bg-white/16 text-white font-medium" : "text-slate-400 hover:text-slate-200"}`}
                title="Camera orbit tool (Camera)"
              >
                <Camera className="h-4 w-4" />
              </button>
            </div>

            <div className="flex items-center gap-1 rounded-2xl bg-black/75 p-1 shadow-[0_12px_32px_rgba(0,0,0,0.32)] backdrop-blur-xl border border-white/5">
              <button
                type="button"
                onClick={() => setShowGuides((value) => !value)}
                className={`flex h-8 w-8 items-center justify-center rounded-xl transition ${showGuides ? "text-white bg-white/10" : "text-slate-400 hover:text-slate-200"}`}
                title="Toggle grid guides"
              >
                <Grid2x2 className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={() => setShowInspectorOverlay((value) => !value)}
                className={`flex h-8 w-8 items-center justify-center rounded-xl transition ${showInspectorOverlay ? "text-white bg-white/10" : "text-slate-400 hover:text-slate-200"}`}
                title="Toggle inspector overlay"
              >
                <Monitor className="h-4 w-4" />
              </button>
            </div>
          </div>

          <div className="absolute right-4 top-4 z-20 flex items-start gap-3">
            <div className="flex items-center gap-2 rounded-[20px] border border-black/10 bg-black/55 px-3 py-2 text-[11px] font-medium text-slate-200 shadow-[0_12px_32px_rgba(0,0,0,0.28)] backdrop-blur-xl">
              <span className="uppercase tracking-[0.28em] text-slate-400">Canvas</span>
              <span>
                {project.width} x {project.height}
              </span>
              <span className="text-slate-500">•</span>
              <span>{project.fps} FPS</span>
              <span className="text-slate-500">•</span>
              <span>{currentTime.toFixed(2)}s</span>
              <div className="ml-2 flex items-center gap-1 border-l border-white/10 pl-2">
                <ChromeIconButton
                  icon={Download}
                  title="Export project JSON"
                  onClick={handleExport}
                />
                <ChromeIconButton
                  icon={FileUp}
                  title="Import project JSON"
                  onClick={() => fileInputRef.current?.click()}
                />
              </div>
            </div>
            <ViewportGizmo />
          </div>

          <PreviewViewport
            objects={previewObjects}
            selectedId={selectedId}
            onSelect={selectLayer}
            onMove={moveLayerObject}
            showGuides={showGuides}
            onCanvasReady={(canvas) => {
              previewCanvasRef.current = canvas;
            }}
          />

          <div className="absolute bottom-5 left-1/2 z-30 -translate-x-1/2">
            <div className="relative">
              <div className="flex items-center gap-1.5 rounded-full border border-white/10 bg-black/75 p-1.5 text-slate-100 shadow-[0_20px_50px_rgba(0,0,0,0.45)] backdrop-blur-xl">
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
                    className={`flex h-9 items-center gap-1 rounded-full pl-3 pr-2.5 transition ${interactionMode === "select" ? "bg-[#6f7bf6] text-white shadow-[0_4px_12px_rgba(111,123,246,0.35)] font-semibold" : "text-slate-300 hover:bg-white/5"}`}
                    title="Select and Transform Tool"
                  >
                    <MousePointer2 className="h-4 w-4" />
                    <span className="text-[10px] uppercase tracking-wider">{transformMode}</span>
                    <ChevronDown className="h-3 w-3 opacity-60" />
                  </button>

                  {activeDropdown === "select" ? (
                    <div className="absolute bottom-12 left-0 z-50 flex w-36 flex-col gap-1 rounded-2xl border border-white/10 bg-black/88 p-1.5 shadow-[0_12px_32px_rgba(0,0,0,0.5)] backdrop-blur-xl">
                      <button
                        type="button"
                        onClick={() => {
                          viewportStore.send({ type: "setTransformMode", mode: "translate" });
                          viewportStore.send({ type: "setActiveDropdown", dropdown: null });
                        }}
                        className={`flex h-8 items-center rounded-xl px-2.5 text-left text-xs transition ${transformMode === "translate" ? "bg-white/10 text-white font-medium" : "text-slate-400 hover:bg-white/5 hover:text-white"}`}
                      >
                        Translate (Move)
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          viewportStore.send({ type: "setTransformMode", mode: "rotate" });
                          viewportStore.send({ type: "setActiveDropdown", dropdown: null });
                        }}
                        className={`flex h-8 items-center rounded-xl px-2.5 text-left text-xs transition ${transformMode === "rotate" ? "bg-white/10 text-white font-medium" : "text-slate-400 hover:bg-white/5 hover:text-white"}`}
                      >
                        Rotate
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          viewportStore.send({ type: "setTransformMode", mode: "scale" });
                          viewportStore.send({ type: "setActiveDropdown", dropdown: null });
                        }}
                        className={`flex h-8 items-center rounded-xl px-2.5 text-left text-xs transition ${transformMode === "scale" ? "bg-white/10 text-white font-medium" : "text-slate-400 hover:bg-white/5 hover:text-white"}`}
                      >
                        Scale
                      </button>
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
                    <div className="absolute bottom-12 left-1/2 z-50 flex w-36 -translate-x-1/2 flex-col gap-1 rounded-2xl border border-white/10 bg-black/88 p-1.5 shadow-[0_12px_32px_rgba(0,0,0,0.5)] backdrop-blur-xl">
                      {(["cube", "sphere", "cylinder", "cone", "torus"] as const).map((shape) => (
                        <button
                          key={shape}
                          type="button"
                          onClick={() => {
                            add3DModelLayer(shape);
                            viewportStore.send({ type: "setActiveDropdown", dropdown: null });
                          }}
                          className="flex h-8 items-center rounded-xl px-2.5 text-left text-xs text-slate-400 transition hover:bg-white/5 hover:text-white capitalize"
                        >
                          {shape} 3D
                        </button>
                      ))}
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

                {/* Audio upload */}
                <button
                  type="button"
                  onClick={() => audioInputRef.current?.click()}
                  className="flex h-9 w-9 items-center justify-center rounded-full text-slate-300 transition hover:bg-white/5 hover:text-white"
                  title="Import audio layer"
                >
                  <Volume2 className="h-4.5 w-4.5" />
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
                    <div className="absolute bottom-12 right-0 z-50 flex w-36 flex-col gap-1 rounded-2xl border border-white/10 bg-black/88 p-1.5 shadow-[0_12px_32px_rgba(0,0,0,0.5)] backdrop-blur-xl">
                      {(["rectangle", "circle", "triangle", "star", "polygon"] as const).map(
                        (shape) => (
                          <button
                            key={shape}
                            type="button"
                            onClick={() => {
                              addShapeLayer(shape);
                              viewportStore.send({ type: "setActiveDropdown", dropdown: null });
                            }}
                            className="flex h-8 items-center rounded-xl px-2.5 text-left text-xs text-slate-400 transition hover:bg-white/5 hover:text-white capitalize"
                          >
                            {shape}
                          </button>
                        ),
                      )}
                    </div>
                  ) : null}
                </div>
              </div>
            </div>
          </div>

          {selectedLayer && showInspectorOverlay ? (
            <div className="absolute bottom-5 right-5 z-20 hidden w-[360px] lg:block">
              <div className="rounded-[24px] border border-white/10 bg-[#101218]/88 p-4 text-sm text-slate-200 shadow-[0_24px_70px_rgba(0,0,0,0.42)] backdrop-blur-xl">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-[11px] uppercase tracking-[0.28em] text-slate-500">
                      Selection
                    </p>
                    <h2 className="mt-1 truncate text-base font-semibold text-white">
                      {selectedObject?.name ?? selectedLayer.name}
                    </h2>
                    <p className="text-xs text-slate-400">
                      {(selectedObject?.type ?? selectedLayer.type).toUpperCase()} •{" "}
                      {selectedClip
                        ? `${selectedClip.start.toFixed(2)}s - ${selectedClip.end.toFixed(2)}s`
                        : "No clip"}
                    </p>
                  </div>
                  <div className="flex items-center gap-1">
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

                <div className="mt-4 grid grid-cols-2 gap-2">
                  <MiniField label="Name">
                    <input
                      value={selectedLayer.name}
                      onChange={(event) =>
                        selectedId && renameLayer(selectedId, event.target.value)
                      }
                      disabled={selectionLocked}
                      className="h-9 w-full rounded-xl border border-white/8 bg-black/30 px-3 text-sm text-white disabled:cursor-not-allowed disabled:opacity-40"
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

                {selectedLayer.type !== "audio" ? (
                  <>
                    <div className="mt-2 grid grid-cols-2 gap-2">
                      <MiniField label="Opacity">
                        <input
                          type="number"
                          min="0"
                          max="1"
                          step="0.05"
                          value={selectedValues.opacity}
                          onChange={(event) =>
                            selectedId && updateLayerOpacity(selectedId, Number(event.target.value))
                          }
                          disabled={selectionLocked}
                          className="h-9 w-full rounded-xl border border-white/8 bg-black/30 px-3 text-sm text-white disabled:cursor-not-allowed disabled:opacity-40"
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
                          className="h-9 w-full rounded-xl border border-white/8 bg-black/30 px-2 py-1 disabled:cursor-not-allowed disabled:opacity-40"
                        />
                      </MiniField>
                      <MiniField label="X">
                        <input
                          type="number"
                          value={selectedValues.x}
                          onChange={(event) =>
                            selectedId &&
                            updateTransformProperty(selectedId, "x", Number(event.target.value))
                          }
                          disabled={selectionLocked}
                          className="h-9 w-full rounded-xl border border-white/8 bg-black/30 px-3 text-sm text-white disabled:cursor-not-allowed disabled:opacity-40"
                        />
                      </MiniField>
                      <MiniField label="Y">
                        <input
                          type="number"
                          value={selectedValues.y}
                          onChange={(event) =>
                            selectedId &&
                            updateTransformProperty(selectedId, "y", Number(event.target.value))
                          }
                          disabled={selectionLocked}
                          className="h-9 w-full rounded-xl border border-white/8 bg-black/30 px-3 text-sm text-white disabled:cursor-not-allowed disabled:opacity-40"
                        />
                      </MiniField>
                      <MiniField label="Scale X">
                        <input
                          type="number"
                          step="0.05"
                          value={selectedValues.scaleX}
                          onChange={(event) =>
                            selectedId &&
                            updateTransformProperty(
                              selectedId,
                              "scaleX",
                              Number(event.target.value),
                            )
                          }
                          disabled={selectionLocked}
                          className="h-9 w-full rounded-xl border border-white/8 bg-black/30 px-3 text-sm text-white disabled:cursor-not-allowed disabled:opacity-40"
                        />
                      </MiniField>
                      <MiniField label="Scale Y">
                        <input
                          type="number"
                          step="0.05"
                          value={selectedValues.scaleY}
                          onChange={(event) =>
                            selectedId &&
                            updateTransformProperty(
                              selectedId,
                              "scaleY",
                              Number(event.target.value),
                            )
                          }
                          disabled={selectionLocked}
                          className="h-9 w-full rounded-xl border border-white/8 bg-black/30 px-3 text-sm text-white disabled:cursor-not-allowed disabled:opacity-40"
                        />
                      </MiniField>
                      <MiniField label="Rotation">
                        <input
                          type="number"
                          step="0.05"
                          value={selectedValues.rotation}
                          onChange={(event) =>
                            selectedId &&
                            updateTransformProperty(
                              selectedId,
                              "rotation",
                              Number(event.target.value),
                            )
                          }
                          disabled={selectionLocked}
                          className="h-9 w-full rounded-xl border border-white/8 bg-black/30 px-3 text-sm text-white disabled:cursor-not-allowed disabled:opacity-40"
                        />
                      </MiniField>
                    </div>
                  </>
                ) : (
                  <div className="mt-3 rounded-2xl border border-white/8 bg-black/20 px-3 py-3 text-xs text-slate-400">
                    Audio layers use clip timing and playback controls. Transform and visual
                    keyframe controls are not shown here.
                  </div>
                )}

                {selectedLayer.type === "text" &&
                selectedLayer.object.content &&
                "value" in selectedLayer.object.content ? (
                  <MiniField label="Text" className="mt-3">
                    <textarea
                      value={selectedLayer.object.content.value}
                      onChange={(event) =>
                        selectedId && updateTextLayer(selectedId, event.target.value)
                      }
                      rows={2}
                      disabled={selectionLocked}
                      className="w-full rounded-xl border border-white/8 bg-black/30 px-3 py-2 text-sm text-white disabled:cursor-not-allowed disabled:opacity-40"
                    />
                  </MiniField>
                ) : null}

                {selectedLayer.type !== "audio" ? (
                  <div className="mt-3 flex flex-wrap gap-2">
                    {(["x", "y", "scaleX", "scaleY", "rotation", "opacity"] as const).map(
                      (property) => (
                        <button
                          key={property}
                          type="button"
                          onClick={() => selectedId && addKeyframe(selectedId, property)}
                          disabled={selectionLocked}
                          className="rounded-full border border-white/10 bg-white/6 px-3 py-1.5 text-[11px] font-medium uppercase tracking-[0.14em] text-slate-200 disabled:cursor-not-allowed disabled:opacity-40"
                        >
                          + {property}
                        </button>
                      ),
                    )}
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
                ) : null}
              </div>
            </div>
          ) : null}
        </section>

        <section className="overflow-hidden rounded-[34px] border border-white/8 bg-[#13161b] shadow-[0_28px_80px_rgba(0,0,0,0.34)]">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/8 px-4 py-3">
            <div className="flex flex-wrap items-center gap-2">
              <TransportButton
                icon={isPlaying ? Pause : Play}
                label={isPlaying ? "Pause" : "Play"}
                title={isPlaying ? "Pause timeline" : "Play timeline"}
                onClick={() => setPlaying(!isPlaying)}
                active={isPlaying}
              />
              <TransportButton
                icon={Repeat}
                label={loopPlayback ? "Loop On" : "Loop Off"}
                title="Toggle timeline looping"
                onClick={() => setLoopPlayback(!loopPlayback)}
                active={loopPlayback}
              />
              <TransportButton
                icon={Undo2}
                label="Undo"
                title="Undo"
                onClick={undoProject}
                disabled={!canUndo}
              />
              <TransportButton
                icon={Redo2}
                label="Redo"
                title="Redo"
                onClick={redoProject}
                disabled={!canRedo}
              />
            </div>

            <label className="inline-flex items-center gap-3 rounded-full border border-white/10 bg-white/5 px-3 py-2 text-xs text-slate-300">
              <span className="uppercase tracking-[0.26em] text-slate-500">Zoom</span>
              <input
                type="range"
                min="80"
                max="240"
                step="10"
                value={timelineZoom}
                onChange={(event) => setTimelineZoom(Number(event.target.value))}
                className="w-32 accent-[#6f7bf6]"
              />
            </label>

            <div className="flex flex-wrap items-center gap-2">
              <TransportButton
                icon={Download}
                label="JSON"
                title="Export project JSON"
                onClick={handleExport}
              />
              <TransportButton
                icon={Save}
                label="PNG"
                title="Export preview PNG"
                onClick={handleExportPng}
              />
              <TransportButton
                icon={Monitor}
                label="WebM"
                title="Export preview WebM"
                onClick={handleExportWebm}
              />
              <TimelineMetaPill label="Start" value={`${(selectedClip?.start ?? 0).toFixed(2)}s`} />
              <TimelineMetaPill
                label="End"
                value={`${(selectedClip?.end ?? project.duration).toFixed(2)}s`}
              />
            </div>
          </div>

          <TimelinePanel
            layers={project.layers}
            assets={project.assets}
            duration={project.duration}
            zoom={timelineZoom}
            currentTime={currentTime}
            selectedLayerIds={selectedLayerIds}
            selectedClipId={selectedClipId}
            selectedKeyframeId={selectedKeyframeId}
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

function readFileAsDataUrl(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = () => {
      if (typeof reader.result === "string") {
        resolve(reader.result);
        return;
      }

      reject(new Error("Failed to read audio asset."));
    };
    reader.onerror = () => {
      reject(reader.error ?? new Error("Failed to read audio asset."));
    };
    reader.readAsDataURL(file);
  });
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
  icon: typeof MousePointer2;
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

function TransportButton({
  icon: Icon,
  label,
  title,
  onClick,
  active = false,
  disabled = false,
}: {
  icon: typeof MousePointer2;
  label: string;
  title: string;
  onClick: () => void;
  active?: boolean;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      title={title}
      onClick={onClick}
      disabled={disabled}
      className={`inline-flex h-10 items-center gap-2 rounded-full border px-3 text-xs font-medium transition ${active ? "border-[#8e99ff]/50 bg-[#6f7bf6]/22 text-white" : "border-white/10 bg-white/5 text-slate-200 hover:bg-white/9"} disabled:cursor-not-allowed disabled:opacity-40`}
    >
      <Icon className="h-3.5 w-3.5" />
      <span>{label}</span>
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

function ViewportGizmo() {
  return (
    <div className="flex h-20 w-20 items-center justify-center rounded-full border border-black/20 bg-[#121318]/92 shadow-[0_20px_40px_rgba(0,0,0,0.32)] backdrop-blur">
      <div className="relative h-11 w-11">
        <span className="absolute left-1/2 top-0 h-4 w-1 -translate-x-1/2 rounded-full bg-[#7ef2ad]" />
        <span className="absolute bottom-0 left-1/2 h-4 w-1 -translate-x-1/2 rounded-full bg-[#4ade80]" />
        <span className="absolute left-0 top-1/2 h-1 w-4 -translate-y-1/2 rounded-full bg-[#f43f5e]" />
        <span className="absolute right-0 top-1/2 h-1 w-4 -translate-y-1/2 rounded-full bg-[#fb7185]" />
        <span className="absolute left-1/2 top-1/2 h-3 w-3 -translate-x-1/2 -translate-y-1/2 rounded-full border border-[#6aa8ff]/60 bg-[#6aa8ff]" />
        <span className="absolute left-1/2 top-0 h-2.5 w-2.5 -translate-x-1/2 rounded-full bg-[#86efac]" />
        <span className="absolute bottom-0 left-1/2 h-2.5 w-2.5 -translate-x-1/2 rounded-full bg-[#4ade80]" />
        <span className="absolute left-0 top-1/2 h-2.5 w-2.5 -translate-y-1/2 rounded-full bg-[#e11d48]" />
        <span className="absolute right-0 top-1/2 h-2.5 w-2.5 -translate-y-1/2 rounded-full bg-[#fb7185]" />
      </div>
    </div>
  );
}
