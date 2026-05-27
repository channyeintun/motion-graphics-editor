const pixelsPerSecond = 140;
const labelColumnWidth = 220;
const minClipDuration = 0.25;

export function clampTimelineValue(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

export function clampClipEdge(start: number, end: number, edge: "start" | "end", nextTime: number) {
  if (edge === "start") {
    return {
      start: clampTimelineValue(nextTime, 0, end - minClipDuration),
      end,
    };
  }

  return {
    start,
    end: clampTimelineValue(nextTime, start + minClipDuration, Number.POSITIVE_INFINITY),
  };
}

export function clampClipMove(nextStart: number, duration: number, clipDuration: number) {
  return clampTimelineValue(nextStart, 0, Math.max(0, duration - clipDuration));
}

export { labelColumnWidth, minClipDuration, pixelsPerSecond };
