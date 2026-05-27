import { useEffect, useEffectEvent, useMemo, useRef } from "react";
import type { ChangeEvent } from "react";
import { Download, FileUp, Save } from "lucide-react";
import { toPreviewObject } from "../editor/model/preview";
import type { Project } from "../editor/model/project";
import { PreviewViewport } from "../editor/preview/PreviewViewport";
import { STORAGE_KEY, useEditorStore } from "../editor/store/editorStore";
import { TimelinePanel } from "../editor/timeline/TimelinePanel";

const toolbarButtons = ["Select", "Text", "Shape", "Image", "Audio"];

export function AppShell() {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const project = useEditorStore((state) => state.project);
  const currentTime = useEditorStore((state) => state.currentTime);
  const selectedLayerIds = useEditorStore((state) => state.selectedLayerIds);
  const selectedClipId = useEditorStore((state) => state.selectedClipId);
  const selectLayer = useEditorStore((state) => state.selectLayer);
  const selectClip = useEditorStore((state) => state.selectClip);
  const moveLayerObject = useEditorStore((state) => state.moveLayerObject);
  const replaceProject = useEditorStore((state) => state.replaceProject);
  const moveClip = useEditorStore((state) => state.moveClip);
  const trimClip = useEditorStore((state) => state.trimClip);
  const seek = useEditorStore((state) => state.seek);

  const previewObjects = useMemo(
    () => project.layers.map(toPreviewObject).filter((object) => object !== null),
    [project.layers],
  );

  const selectedId = selectedLayerIds[0] ?? null;
  const selectedObject = previewObjects.find((object) => object.id === selectedId) ?? null;

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

  const handleImport = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];

    if (!file) {
      return;
    }

    const contents = await file.text();
    replaceProject(JSON.parse(contents) as Project);
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

  return (
    <main className="min-h-screen bg-[#0a0b10] text-slate-100">
      <input
        ref={fileInputRef}
        type="file"
        accept="application/json"
        className="hidden"
        onChange={handleImport}
      />

      <div className="flex min-h-screen flex-col gap-3 p-3 md:p-4">
        <section className="grid min-h-[64vh] flex-1 gap-3 xl:grid-cols-[minmax(0,1fr)_320px]">
          <div className="relative overflow-hidden rounded-[28px] border border-white/10 bg-[#0f1118] shadow-2xl shadow-black/30">
            <div className="absolute left-4 top-4 z-20 flex items-center gap-2 rounded-2xl border border-white/10 bg-black/45 p-2 backdrop-blur">
              {toolbarButtons.map((button) => (
                <button
                  key={button}
                  type="button"
                  className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs font-medium tracking-wide text-slate-200 transition hover:bg-white/10"
                >
                  {button}
                </button>
              ))}
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
                </div>
              </div>

              <div className="rounded-2xl border border-white/8 bg-white/5 p-3">
                <p className="text-xs uppercase tracking-[0.28em] text-slate-500">Selection</p>
                {selectedObject ? (
                  <div className="mt-3 space-y-3 text-sm text-slate-300">
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
                className="rounded-xl border border-white/10 bg-white/5 px-3 py-2"
              >
                Play
              </button>
              <button
                type="button"
                className="rounded-xl border border-white/10 bg-white/5 px-3 py-2"
              >
                Loop
              </button>
              <button
                type="button"
                onClick={handleExport}
                className="rounded-xl border border-white/10 bg-white/5 px-3 py-2"
              >
                Export JSON
              </button>
            </div>
          </div>

          <TimelinePanel
            layers={project.layers}
            duration={project.duration}
            currentTime={currentTime}
            selectedLayerId={selectedId}
            selectedClipId={selectedClipId}
            onSelectLayer={selectLayer}
            onSelectClip={selectClip}
            onSeek={seek}
            onMoveClip={moveClip}
            onTrimClip={trimClip}
          />
        </section>
      </div>
    </main>
  );
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-xl border border-white/8 bg-black/20 px-3 py-2">
      <span className="text-xs uppercase tracking-[0.24em] text-slate-500">{label}</span>
      <span className="font-medium text-white">{value}</span>
    </div>
  );
}
