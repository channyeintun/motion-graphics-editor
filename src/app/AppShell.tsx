const toolbarButtons = ["Select", "Text", "Shape", "Image", "Audio"];

const timelineTracks = [
  { name: "Headline", type: "Text", color: "bg-violet-500/80" },
  { name: "Accent Bar", type: "Shape", color: "bg-cyan-400/80" },
  { name: "Audio Bed", type: "Audio", color: "bg-emerald-500/80" },
];

export function AppShell() {
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

            <div className="flex h-full items-center justify-center bg-[radial-gradient(circle_at_top,_rgba(124,58,237,0.25),_transparent_35%),linear-gradient(180deg,_#141824,_#0b0e15)] p-6">
              <div className="relative aspect-square w-full max-w-[720px] rounded-[36px] border-[14px] border-black bg-[#f3efe3] shadow-[0_40px_80px_rgba(0,0,0,0.55)]">
                <div className="absolute inset-0 rounded-[22px] border border-black/10" />
                <div className="absolute inset-x-[18%] top-[20%] rounded-2xl border border-violet-500/30 bg-white/70 px-6 py-5 text-center text-[#12131a] shadow-lg backdrop-blur-sm">
                  <p className="text-xs font-semibold uppercase tracking-[0.35em] text-violet-600">
                    Preview
                  </p>
                  <h1 className="mt-3 text-4xl font-semibold tracking-tight">
                    Motion Graphics Editor
                  </h1>
                  <p className="mt-3 text-sm text-slate-600">
                    Project setup is complete. Preview, timeline, and inspector regions are ready
                    for implementation.
                  </p>
                </div>
              </div>
            </div>
          </div>

          <aside className="rounded-[28px] border border-white/10 bg-[#11141d] p-4 shadow-2xl shadow-black/20">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <div>
                <p className="text-xs uppercase tracking-[0.32em] text-slate-400">Inspector</p>
                <h2 className="mt-2 text-lg font-semibold text-white">Project</h2>
              </div>
              <span className="rounded-full border border-emerald-400/20 bg-emerald-400/10 px-2 py-1 text-[11px] text-emerald-300">
                Ready
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
                <p className="mt-3 text-sm text-slate-400">
                  Select an object in the preview or timeline to edit its properties here.
                </p>
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

            {timelineTracks.map((track) => (
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
                  <div className={`h-12 rounded-2xl border border-white/10 ${track.color}`} />
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>
    </main>
  );
}
