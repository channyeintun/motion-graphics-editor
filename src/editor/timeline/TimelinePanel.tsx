import { useEffect, useMemo, useRef, useState } from "react";
import type { Asset, Layer } from "../model/project";
import { clampTimelineValue } from "./timelineMath";

type TimelinePanelProps = {
  layers: Layer[];
  assets: Asset[];
  duration: number;
  zoom: number;
  currentTime: number;
  selectedLayerIds: string[];
  selectedClipId: string | null;
  selectedKeyframeId: string | null;
  onSelectLayer: (layerId: string, additive?: boolean) => void;
  onSelectClip: (clipId: string | null) => void;
  onSelectKeyframe: (keyframeId: string | null) => void;
  onSeek: (time: number) => void;
  onMoveClip: (clipId: string, nextStart: number) => void;
  onTrimClip: (clipId: string, edge: "start" | "end", nextTime: number) => void;
  onMoveKeyframe: (keyframeId: string, nextTime: number) => void;
};

type DragState =
  | { type: "playhead" }
  | { type: "clip"; clipId: string; clipOffset: number }
  | { type: "trim"; clipId: string; edge: "start" | "end" }
  | { type: "keyframe"; keyframeId: string };

export function TimelinePanel({
  layers,
  assets,
  duration,
  zoom,
  currentTime,
  selectedLayerIds,
  selectedClipId,
  selectedKeyframeId,
  onSelectLayer,
  onSelectClip,
  onSelectKeyframe,
  onSeek,
  onMoveClip,
  onTrimClip,
  onMoveKeyframe,
}: TimelinePanelProps) {
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const [dragState, setDragState] = useState<DragState | null>(null);
  const totalWidth = Math.max(720, duration * zoom + 80);

  const ticks = useMemo(() => {
    const values: number[] = [];
    for (let time = 0; time <= duration; time += 0.5) {
      values.push(Number(time.toFixed(2)));
    }
    return values;
  }, [duration]);

  useEffect(() => {
    if (!dragState) {
      return;
    }

    const handlePointerMove = (event: PointerEvent) => {
      const timelineBounds = scrollRef.current?.getBoundingClientRect();

      if (!timelineBounds) {
        return;
      }

      const scrollLeft = scrollRef.current?.scrollLeft ?? 0;
      const left = Math.max(0, event.clientX - timelineBounds.left + scrollLeft);
      const nextTime = clampTimelineValue(left / zoom, 0, duration);

      if (dragState.type === "playhead") {
        onSeek(nextTime);
        return;
      }

      if (dragState.type === "clip") {
        onMoveClip(dragState.clipId, nextTime - dragState.clipOffset);
        return;
      }

      if (dragState.type === "keyframe") {
        onMoveKeyframe(dragState.keyframeId, nextTime);
        return;
      }

      onTrimClip(dragState.clipId, dragState.edge, nextTime);
    };

    const stopDragging = () => {
      setDragState(null);
    };

    window.addEventListener("pointermove", handlePointerMove);
    window.addEventListener("pointerup", stopDragging);

    return () => {
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerup", stopDragging);
    };
  }, [dragState, duration, onMoveClip, onMoveKeyframe, onSeek, onTrimClip, zoom]);

  return (
    <div className="overflow-hidden rounded-[26px] border border-white/8 bg-[#090b10]">
      <div className="grid grid-cols-[220px_minmax(0,1fr)] border-b border-white/8 text-xs text-slate-500">
        <div className="border-r border-white/8 px-4 py-3 uppercase tracking-[0.32em]">Layers</div>
        <div className="px-4 py-3 uppercase tracking-[0.32em]">Timeline</div>
      </div>

      <div className="grid grid-cols-[220px_minmax(0,1fr)]">
        <div className="border-r border-white/8">
          {layers.map((layer) => (
            <button
              key={layer.id}
              type="button"
              onClick={(event) => onSelectLayer(layer.id, event.shiftKey)}
              className={`flex h-[64px] w-full items-center justify-between border-b border-white/6 px-4 text-left transition hover:bg-white/4 ${selectedLayerIds.includes(layer.id) ? "bg-white/6" : ""} ${!layer.visible ? "opacity-50" : ""}`}
            >
              <div>
                <p className="text-sm font-medium text-white">{layer.name}</p>
                <p className="text-xs text-slate-500">
                  {layer.type}
                  {layer.locked ? " • locked" : ""}
                  {!layer.visible ? " • hidden" : ""}
                </p>
              </div>
              <span
                className={`h-2.5 w-2.5 rounded-full ${layer.type === "audio" ? "bg-emerald-400" : "bg-[#8792ff]"}`}
              />
            </button>
          ))}
        </div>

        <div ref={scrollRef} className="relative overflow-x-auto overflow-y-hidden">
          <div className="relative" style={{ width: totalWidth }}>
            <button
              type="button"
              onPointerDown={(event) => {
                const bounds = event.currentTarget.getBoundingClientRect();
                onSeek(clampTimelineValue((event.clientX - bounds.left) / zoom, 0, duration));
                setDragState({ type: "playhead" });
              }}
              className="relative block h-11 w-full border-b border-white/8 bg-[#0b0e14] text-left"
            >
              {ticks.map((tick) => (
                <div key={tick} className="absolute bottom-0 top-0" style={{ left: tick * zoom }}>
                  <div className="h-full w-px bg-white/8" />
                  <span className="absolute left-2 top-2 text-[11px] text-slate-500">
                    {tick.toFixed(tick % 1 === 0 ? 0 : 1)}s
                  </span>
                </div>
              ))}
            </button>

            <div
              className="pointer-events-none absolute top-0 z-20 h-full w-px bg-violet-300"
              style={{ left: currentTime * zoom }}
            >
              <div className="-ml-[6px] h-3 w-3 rounded-full border border-violet-100 bg-violet-300" />
            </div>

            {layers.map((layer) => (
              <div
                key={layer.id}
                className="relative h-[64px] border-b border-white/6 bg-[linear-gradient(180deg,_rgba(255,255,255,0.015),_transparent)]"
              >
                {ticks.map((tick) => (
                  <div
                    key={tick}
                    className="absolute bottom-0 top-0 w-px bg-white/5"
                    style={{ left: tick * zoom }}
                  />
                ))}

                {layer.clips.map((clip) => {
                  const audioAssetId =
                    layer.type === "audio" &&
                    layer.object.content &&
                    "assetId" in layer.object.content
                      ? layer.object.content.assetId
                      : null;
                  const audioAsset = audioAssetId
                    ? assets.find((asset) => asset.id === audioAssetId)
                    : null;
                  const clipLeft = clip.start * zoom;
                  const clipWidth = Math.max(34, (clip.end - clip.start) * zoom);

                  return (
                    <button
                      key={clip.id}
                      type="button"
                      onClick={(event) => {
                        onSelectLayer(layer.id, event.shiftKey);
                        onSelectClip(clip.id);
                      }}
                      onPointerDown={(event) => {
                        if (layer.locked) {
                          return;
                        }

                        const clipBounds = event.currentTarget.getBoundingClientRect();
                        const pointerOffset = event.clientX - clipBounds.left;
                        onSelectLayer(layer.id);
                        onSelectClip(clip.id);
                        setDragState({
                          type: "clip",
                          clipId: clip.id,
                          clipOffset: pointerOffset / zoom,
                        });
                      }}
                      className={`absolute top-2 h-10 rounded-[14px] border border-white/12 px-3 text-left shadow-lg transition ${layer.type === "audio" ? "bg-emerald-500/75" : "bg-[#6f7bf6]/88"} ${selectedClipId === clip.id ? "ring-2 ring-violet-200/80" : ""} ${layer.locked ? "cursor-default opacity-70" : ""} ${!layer.visible ? "opacity-40" : ""}`}
                      style={{ left: clipLeft, width: clipWidth }}
                    >
                      <span className="block truncate text-sm font-medium text-white">
                        {clip.name}
                      </span>
                      <span className="block text-[10px] text-white/75">
                        {clip.start.toFixed(2)}s - {clip.end.toFixed(2)}s
                      </span>

                      {audioAsset?.waveform ? (
                        <span className="absolute inset-x-3 bottom-1 flex h-3 items-center gap-[2px] overflow-hidden">
                          {audioAsset.waveform.slice(0, 48).map((value, index) => (
                            <span
                              key={`${audioAsset.id}-${index}`}
                              className="block w-1 rounded-full bg-white/70"
                              style={{ height: `${Math.max(10, value * 100)}%` }}
                            />
                          ))}
                        </span>
                      ) : null}

                      {clip.keyframes.map((keyframe) => (
                        <span
                          key={keyframe.id}
                          onPointerDown={(event) => {
                            if (layer.locked) {
                              return;
                            }

                            event.stopPropagation();
                            onSelectLayer(layer.id);
                            onSelectClip(clip.id);
                            onSelectKeyframe(keyframe.id);
                            setDragState({ type: "keyframe", keyframeId: keyframe.id });
                          }}
                          className={`absolute top-1/2 z-10 h-3.5 w-3.5 -translate-y-1/2 rotate-45 border ${selectedKeyframeId === keyframe.id ? "border-white bg-violet-200" : "border-white/80 bg-white/75"}`}
                          style={{
                            left: `${((keyframe.time - clip.start) / Math.max(0.001, clip.end - clip.start)) * 100}%`,
                          }}
                        />
                      ))}

                      <span
                        onPointerDown={(event) => {
                          if (layer.locked) {
                            return;
                          }

                          event.stopPropagation();
                          onSelectClip(clip.id);
                          setDragState({ type: "trim", clipId: clip.id, edge: "start" });
                        }}
                        className="absolute inset-y-1 left-1 w-2 rounded-full bg-black/15"
                      />
                      <span
                        onPointerDown={(event) => {
                          if (layer.locked) {
                            return;
                          }

                          event.stopPropagation();
                          onSelectClip(clip.id);
                          setDragState({ type: "trim", clipId: clip.id, edge: "end" });
                        }}
                        className="absolute inset-y-1 right-1 w-2 rounded-full bg-black/15"
                      />
                    </button>
                  );
                })}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
