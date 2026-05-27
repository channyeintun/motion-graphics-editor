import { useMemo, useState } from "react";
import type { PreviewObject } from "../editor/model/preview";
import { previewObjects } from "../editor/model/preview";
import { PreviewViewport } from "../editor/preview/PreviewViewport";

const toolbarButtons = ["Select", "Text", "Shape", "Image", "Audio"];

export function AppShell() {
  const [objects, setObjects] = useState(previewObjects);
  const [selectedId, setSelectedId] = useState<string | null>(previewObjects[0]?.id ?? null);

  const selectedObject = useMemo(
    () => objects.find((object) => object.id === selectedId) ?? null,
    [objects, selectedId],
  );

  const timelineTracks = useMemo(
    () =>
      objects.map((object) => ({
        name: object.name,
        type: object.type === "text" ? "Text" : "Shape",
        color: object.type === "text" ? "bg-violet-500/80" : "bg-cyan-400/80",
      })),
    [objects],
  );

  const moveObject = (id: string, nextX: number, nextY: number) => {
    setObjects((currentObjects) =>
      currentObjects.map((object) =>
        object.id === id
          ? {
              ...object,
              x: nextX,
              y: nextY,
            }
          : object,
      ),
    );
  };

  return (
    <main className="min-h-screen bg-[#0a0b10] text-slate-100">
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

            <div className="absolute right-4 top-4 z-20 rounded-2xl border border-white/10 bg-black/45 px-3 py-2 text-xs text-slate-300 backdrop-blur">
              1080 x 1080 • 30 FPS
            </div>

            <PreviewViewport
              objects={objects}
              selectedId={selectedId}
              onSelect={setSelectedId}
              onMove={moveObject}
            />
          </div>

          <aside className="rounded-[28px] border border-white/10 bg-[#11141d] p-4 shadow-2xl shadow-black/20">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <div>
                <p className="text-xs uppercase tracking-[0.32em] text-slate-400">Inspector</p>
                <h2 className="mt-2 text-lg font-semibold text-white">
                  {selectedObject?.name ?? "Project"}
                </h2>
              </div>
              <span className="rounded-full border border-emerald-400/20 bg-emerald-400/10 px-2 py-1 text-[11px] text-emerald-300">
                {selectedObject ? "Selected" : "Ready"}
              </span>
            </div>

            <div className="mt-4 space-y-4 text-sm text-slate-300">
              <div className="rounded-2xl border border-white/8 bg-white/5 p-3">
                <p className="text-xs uppercase tracking-[0.28em] text-slate-500">Canvas</p>
                <div className="mt-3 grid grid-cols-2 gap-3">
                  <label className="space-y-2">
                    <span className="text-xs text-slate-400">Width</span>
                    <input
                      className="w-full rounded-xl border border-white/10 bg-black/30 px-3 py-2"
                      value="1080"
                      readOnly
                    />
                  </label>
                  <label className="space-y-2">
                    <span className="text-xs text-slate-400">Height</span>
                    <input
                      className="w-full rounded-xl border border-white/10 bg-black/30 px-3 py-2"
                      value="1080"
                      readOnly
                    />
                  </label>
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
                  </div>
                ) : (
                  <p className="mt-3 text-sm text-slate-400">
                    Select an object in the preview or timeline to edit its properties here.
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
                className="rounded-xl border border-white/10 bg-white/5 px-3 py-2"
              >
                Export
              </button>
            </div>
          </div>

          <div className="mt-4 overflow-hidden rounded-2xl border border-white/8 bg-[#090b10]">
            <div className="grid grid-cols-[220px_minmax(720px,1fr)] border-b border-white/8 text-xs text-slate-500">
              <div className="border-r border-white/8 px-4 py-3 uppercase tracking-[0.32em]">
                Layers
              </div>
              <div className="px-4 py-3 uppercase tracking-[0.32em]">0s 1s 2s 3s 4s 5s</div>
            </div>

            {timelineTracks.map((track, index) => {
              const object = objects[index] as PreviewObject | undefined;

              return (
                <div
                  key={track.name}
                  className="grid grid-cols-[220px_minmax(720px,1fr)] border-b border-white/6 last:border-b-0"
                >
                  <div className="flex items-center justify-between border-r border-white/6 px-4 py-4">
                    <div>
                      <p className="text-sm font-medium text-white">{track.name}</p>
                      <p className="text-xs text-slate-500">{track.type}</p>
                    </div>
                    <span className="h-2.5 w-2.5 rounded-full bg-white/35" />
                  </div>
                  <div className="relative px-4 py-4">
                    <div className="absolute inset-y-0 left-[22%] w-px bg-white/12" />
                    <button
                      type="button"
                      onClick={() => setSelectedId(object?.id ?? null)}
                      className={`h-12 w-full rounded-2xl border border-white/10 text-left transition hover:brightness-110 ${track.color} ${object?.id === selectedId ? "ring-2 ring-violet-300/70" : ""}`}
                    >
                      <span className="block px-4 py-3 text-sm font-medium text-white/95">
                        {object
                          ? `Preview X ${object.x.toFixed(2)} • Y ${object.y.toFixed(2)}`
                          : "Clip"}
                      </span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
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
