import { useEffect, useEffectEvent, useMemo, useRef } from "react";
import type { ChangeEvent } from "react";
import {
  ArrowDown,
  ArrowUp,
  Download,
  Eye,
  EyeOff,
  FileUp,
  Lock,
  LockOpen,
  Save,
} from "lucide-react";
import { sampleLayer } from "../editor/engine/animationSampler";
import { toPreviewObject } from "../editor/model/preview";
import type { Project } from "../editor/model/project";
import { PreviewViewport } from "../editor/preview/PreviewViewport";
import { STORAGE_KEY, useEditorStore } from "../editor/store/editorStore";
import { TimelinePanel } from "../editor/timeline/TimelinePanel";

export function AppShell() {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const audioInputRef = useRef<HTMLInputElement | null>(null);
  const audioElementsRef = useRef(new Map<string, HTMLAudioElement>());
  const playbackTimeRef = useRef(0);
  const previewCanvasRef = useRef<HTMLCanvasElement | null>(null);

  const project = useEditorStore((state) => state.project);
  const currentTime = useEditorStore((state) => state.currentTime);
  const isPlaying = useEditorStore((state) => state.isPlaying);
  const loopPlayback = useEditorStore((state) => state.loopPlayback);
  const selectedLayerIds = useEditorStore((state) => state.selectedLayerIds);
  const selectedClipId = useEditorStore((state) => state.selectedClipId);
  const selectedKeyframeId = useEditorStore((state) => state.selectedKeyframeId);
  const addTextLayer = useEditorStore((state) => state.addTextLayer);
  const addShapeLayer = useEditorStore((state) => state.addShapeLayer);
  const addAudioLayer = useEditorStore((state) => state.addAudioLayer);
  const selectLayer = useEditorStore((state) => state.selectLayer);
  const selectClip = useEditorStore((state) => state.selectClip);
  const selectKeyframe = useEditorStore((state) => state.selectKeyframe);
  const renameLayer = useEditorStore((state) => state.renameLayer);
  const toggleLayerVisibility = useEditorStore((state) => state.toggleLayerVisibility);
  const toggleLayerLock = useEditorStore((state) => state.toggleLayerLock);
  const reorderLayer = useEditorStore((state) => state.reorderLayer);
  const updateTextLayer = useEditorStore((state) => state.updateTextLayer);
  const updateLayerColor = useEditorStore((state) => state.updateLayerColor);
  const updateLayerOpacity = useEditorStore((state) => state.updateLayerOpacity);
  const updateLayerPosition = useEditorStore((state) => state.updateLayerPosition);
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
    () => sampledLayers.map(toPreviewObject).filter((object) => object !== null),
    [sampledLayers],
  );

  const selectedId = selectedLayerIds[0] ?? null;
  const selectedLayer = project.layers.find((layer) => layer.id === selectedId) ?? null;
  const selectedObject = previewObjects.find((object) => object.id === selectedId) ?? null;

  playbackTimeRef.current = currentTime;

  const saveProject = useEffectEvent((nextProject: Project) => {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(nextProject));
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

    for (const asset of project.assets) {
      if (asset.type !== "audio") {
        continue;
      }

      const existing = audioElementsRef.current.get(asset.id);
      const audio = existing ?? new Audio(asset.src);
      audio.src = asset.src;
      nextMap.set(asset.id, audio);
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

      const insideClip = currentTime >= clip.start && currentTime <= clip.end;

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

  const handleAudioImport = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];

    if (!file) {
      return;
    }

    const src = URL.createObjectURL(file);
    const buffer = await file.arrayBuffer();
    const audioContext = new AudioContext();
    const decoded = await audioContext.decodeAudioData(buffer.slice(0));
    const waveform = createWaveform(decoded.getChannelData(0));
    addAudioLayer(file.name.replace(/\.[^.]+$/, ""), src, waveform, decoded.duration);
    await audioContext.close();
    event.target.value = "";
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
    setPlaying(true);
    recorder.start();
    window.setTimeout(
      () => {
        setPlaying(false);
        recorder.stop();
      },
      project.duration * 1000 + 150,
    );
  };

  return (
    <main className="min-h-screen bg-[#0a0b10] text-slate-100">
      <input
        ref={fileInputRef}
        type="file"
        accept="application/json"
        className="hidden"
        onChange={handleImport}
      />
      <input
        ref={audioInputRef}
        type="file"
        accept="audio/*"
        className="hidden"
        onChange={handleAudioImport}
      />

      <div className="flex min-h-screen flex-col gap-3 p-3 md:p-4">
        <section className="grid min-h-[64vh] flex-1 gap-3 xl:grid-cols-[minmax(0,1fr)_320px]">
          <div className="relative overflow-hidden rounded-[28px] border border-white/10 bg-[#0f1118] shadow-2xl shadow-black/30">
            <div className="absolute left-4 top-4 z-20 flex items-center gap-2 rounded-2xl border border-white/10 bg-black/45 p-2 backdrop-blur">
              <button
                type="button"
                className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs font-medium tracking-wide text-slate-200 transition hover:bg-white/10"
              >
                Select
              </button>
              <button
                type="button"
                onClick={addTextLayer}
                className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs font-medium tracking-wide text-slate-200 transition hover:bg-white/10"
              >
                Text
              </button>
              <button
                type="button"
                onClick={addShapeLayer}
                className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs font-medium tracking-wide text-slate-200 transition hover:bg-white/10"
              >
                Shape
              </button>
              <button
                type="button"
                className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs font-medium tracking-wide text-slate-500 transition"
              >
                Image
              </button>
              <button
                type="button"
                onClick={() => audioInputRef.current?.click()}
                className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs font-medium tracking-wide text-slate-200 transition hover:bg-white/10"
              >
                Audio
              </button>
            </div>

            <div className="absolute right-4 top-4 z-20 flex items-center gap-2 rounded-2xl border border-white/10 bg-black/45 px-3 py-2 text-xs text-slate-300 backdrop-blur">
              <span>
                {project.width} x {project.height} • {project.fps} FPS • {currentTime.toFixed(2)}s
              </span>
              <button
                type="button"
                onClick={handleExport}
                className="rounded-xl border border-white/10 bg-white/5 p-2 transition hover:bg-white/10"
                title="Export project JSON"
              >
                <Download className="h-3.5 w-3.5" />
              </button>
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="rounded-xl border border-white/10 bg-white/5 p-2 transition hover:bg-white/10"
                title="Import project JSON"
              >
                <FileUp className="h-3.5 w-3.5" />
              </button>
            </div>

            <PreviewViewport
              objects={previewObjects}
              selectedId={selectedId}
              onSelect={selectLayer}
              onMove={moveLayerObject}
              onCanvasReady={(canvas) => {
                previewCanvasRef.current = canvas;
              }}
            />
          </div>

          <aside className="rounded-[28px] border border-white/10 bg-[#11141d] p-4 shadow-2xl shadow-black/20">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <div>
                <p className="text-xs uppercase tracking-[0.32em] text-slate-400">Inspector</p>
                <h2 className="mt-2 text-lg font-semibold text-white">
                  {selectedObject?.name ?? project.name}
                </h2>
              </div>
              <span className="rounded-full border border-emerald-400/20 bg-emerald-400/10 px-2 py-1 text-[11px] text-emerald-300">
                {selectedObject ? "Selected" : "Autosave"}
              </span>
            </div>

            <div className="mt-4 space-y-4 text-sm text-slate-300">
              <div className="rounded-2xl border border-white/8 bg-white/5 p-3">
                <div className="flex items-center justify-between">
                  <p className="text-xs uppercase tracking-[0.28em] text-slate-500">Project</p>
                  <Save className="h-4 w-4 text-emerald-300" />
                </div>
                <div className="mt-3 space-y-3">
                  <DetailRow label="Storage" value="Local" />
                  <DetailRow label="Duration" value={`${project.duration}s`} />
                  <DetailRow label="Layers" value={`${project.layers.length}`} />
                  <DetailRow label="Playhead" value={`${currentTime.toFixed(2)}s`} />
                  <DetailRow label="Playback" value={isPlaying ? "Playing" : "Paused"} />
                </div>
              </div>

              <div className="rounded-2xl border border-white/8 bg-white/5 p-3">
                <p className="text-xs uppercase tracking-[0.28em] text-slate-500">Selection</p>
                {selectedObject ? (
                  <div className="mt-3 space-y-3 text-sm text-slate-300">
                    <label className="block space-y-2">
                      <span className="text-xs uppercase tracking-[0.24em] text-slate-500">
                        Layer Name
                      </span>
                      <input
                        value={selectedLayer?.name ?? ""}
                        onChange={(event) =>
                          selectedId && renameLayer(selectedId, event.target.value)
                        }
                        className="w-full rounded-xl border border-white/10 bg-black/30 px-3 py-2 text-sm text-white"
                      />
                    </label>
                    <DetailRow label="Type" value={selectedObject.type} />
                    <DetailRow
                      label="Position"
                      value={`${selectedObject.x.toFixed(2)}, ${selectedObject.y.toFixed(2)}`}
                    />
                    <DetailRow
                      label="Opacity"
                      value={`${Math.round(selectedObject.opacity * 100)}%`}
                    />
                    <DetailRow label="Clip" value={selectedClipId ?? "None"} />
                    <div className="grid grid-cols-2 gap-2 pt-1">
                      {(["x", "y", "scaleX", "scaleY", "rotation", "opacity"] as const).map(
                        (property) => (
                          <button
                            key={property}
                            type="button"
                            onClick={() => selectedId && addKeyframe(selectedId, property)}
                            className="rounded-xl border border-white/10 bg-black/30 px-3 py-2 text-xs font-medium text-slate-200 transition hover:bg-black/40"
                          >
                            Keyframe {property}
                          </button>
                        ),
                      )}
                    </div>
                    {selectedKeyframeId ? (
                      <button
                        type="button"
                        onClick={() => deleteKeyframe(selectedKeyframeId)}
                        className="w-full rounded-xl border border-rose-400/20 bg-rose-500/10 px-3 py-2 text-xs font-medium text-rose-200 transition hover:bg-rose-500/20"
                      >
                        Delete Selected Keyframe
                      </button>
                    ) : null}
                    <div className="grid grid-cols-2 gap-2 pt-1">
                      <label className="space-y-1 text-xs text-slate-400">
                        X
                        <input
                          type="number"
                          value={selectedLayer?.object.transform.x ?? 0}
                          onChange={(event) =>
                            selectedId &&
                            selectedLayer &&
                            updateLayerPosition(
                              selectedId,
                              Number(event.target.value),
                              selectedLayer.object.transform.y,
                            )
                          }
                          className="w-full rounded-xl border border-white/10 bg-black/30 px-3 py-2 text-sm text-white"
                        />
                      </label>
                      <label className="space-y-1 text-xs text-slate-400">
                        Y
                        <input
                          type="number"
                          value={selectedLayer?.object.transform.y ?? 0}
                          onChange={(event) =>
                            selectedId &&
                            selectedLayer &&
                            updateLayerPosition(
                              selectedId,
                              selectedLayer.object.transform.x,
                              Number(event.target.value),
                            )
                          }
                          className="w-full rounded-xl border border-white/10 bg-black/30 px-3 py-2 text-sm text-white"
                        />
                      </label>
                      <label className="space-y-1 text-xs text-slate-400">
                        Opacity
                        <input
                          type="number"
                          min="0"
                          max="1"
                          step="0.05"
                          value={selectedLayer?.object.opacity ?? 1}
                          onChange={(event) =>
                            selectedId && updateLayerOpacity(selectedId, Number(event.target.value))
                          }
                          className="w-full rounded-xl border border-white/10 bg-black/30 px-3 py-2 text-sm text-white"
                        />
                      </label>
                      <label className="space-y-1 text-xs text-slate-400">
                        Color
                        <input
                          type="color"
                          value={selectedLayer?.object.style.color ?? "#ffffff"}
                          onChange={(event) =>
                            selectedId && updateLayerColor(selectedId, event.target.value)
                          }
                          className="h-10 w-full rounded-xl border border-white/10 bg-black/30 px-2 py-1"
                        />
                      </label>
                    </div>
                    {selectedLayer?.type === "text" &&
                    selectedLayer.object.content &&
                    "value" in selectedLayer.object.content ? (
                      <label className="block space-y-2">
                        <span className="text-xs uppercase tracking-[0.24em] text-slate-500">
                          Text
                        </span>
                        <textarea
                          value={selectedLayer.object.content.value}
                          onChange={(event) =>
                            selectedId && updateTextLayer(selectedId, event.target.value)
                          }
                          rows={3}
                          className="w-full rounded-xl border border-white/10 bg-black/30 px-3 py-2 text-sm text-white"
                        />
                      </label>
                    ) : null}
                    <div className="grid grid-cols-2 gap-2 pt-1">
                      <button
                        type="button"
                        onClick={() => selectedId && toggleLayerVisibility(selectedId)}
                        className="inline-flex items-center justify-center gap-2 rounded-xl border border-white/10 bg-black/30 px-3 py-2 text-xs font-medium text-slate-200"
                      >
                        {selectedLayer?.visible ? (
                          <Eye className="h-3.5 w-3.5" />
                        ) : (
                          <EyeOff className="h-3.5 w-3.5" />
                        )}
                        {selectedLayer?.visible ? "Visible" : "Hidden"}
                      </button>
                      <button
                        type="button"
                        onClick={() => selectedId && toggleLayerLock(selectedId)}
                        className="inline-flex items-center justify-center gap-2 rounded-xl border border-white/10 bg-black/30 px-3 py-2 text-xs font-medium text-slate-200"
                      >
                        {selectedLayer?.locked ? (
                          <Lock className="h-3.5 w-3.5" />
                        ) : (
                          <LockOpen className="h-3.5 w-3.5" />
                        )}
                        {selectedLayer?.locked ? "Locked" : "Unlocked"}
                      </button>
                      <button
                        type="button"
                        onClick={() => selectedId && reorderLayer(selectedId, "up")}
                        className="inline-flex items-center justify-center gap-2 rounded-xl border border-white/10 bg-black/30 px-3 py-2 text-xs font-medium text-slate-200"
                      >
                        <ArrowUp className="h-3.5 w-3.5" />
                        Move Up
                      </button>
                      <button
                        type="button"
                        onClick={() => selectedId && reorderLayer(selectedId, "down")}
                        className="inline-flex items-center justify-center gap-2 rounded-xl border border-white/10 bg-black/30 px-3 py-2 text-xs font-medium text-slate-200"
                      >
                        <ArrowDown className="h-3.5 w-3.5" />
                        Move Down
                      </button>
                    </div>
                  </div>
                ) : (
                  <p className="mt-3 text-sm text-slate-400">
                    Select an object in the preview or timeline to inspect it.
                  </p>
                )}
              </div>
            </div>
          </aside>
        </section>

        <section className="rounded-[28px] border border-white/10 bg-[#0f1219] p-4 shadow-2xl shadow-black/30">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 pb-4">
            <div>
              <p className="text-xs uppercase tracking-[0.32em] text-slate-500">Timeline</p>
              <h2 className="mt-2 text-lg font-semibold text-white">Sequence</h2>
            </div>
            <div className="flex items-center gap-2 text-xs text-slate-300">
              <button
                type="button"
                onClick={() => setPlaying(!isPlaying)}
                className="rounded-xl border border-white/10 bg-white/5 px-3 py-2"
              >
                {isPlaying ? "Pause" : "Play"}
              </button>
              <button
                type="button"
                onClick={() => setLoopPlayback(!loopPlayback)}
                className="rounded-xl border border-white/10 bg-white/5 px-3 py-2"
              >
                {loopPlayback ? "Loop On" : "Loop Off"}
              </button>
              <button
                type="button"
                onClick={handleExport}
                className="rounded-xl border border-white/10 bg-white/5 px-3 py-2"
              >
                Export JSON
              </button>
              <button
                type="button"
                onClick={handleExportPng}
                className="rounded-xl border border-white/10 bg-white/5 px-3 py-2"
              >
                PNG
              </button>
              <button
                type="button"
                onClick={handleExportWebm}
                className="rounded-xl border border-white/10 bg-white/5 px-3 py-2"
              >
                WebM
              </button>
            </div>
          </div>

          <TimelinePanel
            layers={project.layers}
            assets={project.assets}
            duration={project.duration}
            currentTime={currentTime}
            selectedLayerId={selectedId}
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

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-xl border border-white/8 bg-black/20 px-3 py-2">
      <span className="text-xs uppercase tracking-[0.24em] text-slate-500">{label}</span>
      <span className="font-medium text-white">{value}</span>
    </div>
  );
}
