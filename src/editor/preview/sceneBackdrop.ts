import type { SampledSceneState } from "../engine/sceneSampler";
import type { BackgroundAnimationPreset, Scene, TransitionPreset } from "../model/project";

export const FRAME_WIDTH = 14;
export const FRAME_HEIGHT = 8.4;

type SceneFrameRole = "incoming" | "outgoing";

export function getSceneFrameVisual(
  role: SceneFrameRole,
  preset: TransitionPreset,
  progress: number,
) {
  const safeProgress = clamp(progress, 0, 1);

  if (preset === "fade") {
    return {
      x: 0,
      y: 0,
      scale: 1,
      opacity: role === "incoming" ? safeProgress : 1 - safeProgress,
    };
  }

  if (preset === "slideFromLeft") {
    return {
      x:
        role === "incoming" ? -(1 - safeProgress) * FRAME_WIDTH : safeProgress * FRAME_WIDTH * 0.65,
      y: 0,
      scale: 1,
      opacity: 1,
    };
  }

  if (preset === "slideFromRight") {
    return {
      x:
        role === "incoming" ? (1 - safeProgress) * FRAME_WIDTH : -safeProgress * FRAME_WIDTH * 0.65,
      y: 0,
      scale: 1,
      opacity: 1,
    };
  }

  if (preset === "slideFromTop") {
    return {
      x: 0,
      y:
        role === "incoming"
          ? (1 - safeProgress) * FRAME_HEIGHT
          : -safeProgress * FRAME_HEIGHT * 0.65,
      scale: 1,
      opacity: 1,
    };
  }

  if (preset === "slideFromBottom") {
    return {
      x: 0,
      y:
        role === "incoming"
          ? -(1 - safeProgress) * FRAME_HEIGHT
          : safeProgress * FRAME_HEIGHT * 0.65,
      scale: 1,
      opacity: 1,
    };
  }

  if (preset === "zoomIn") {
    return {
      x: 0,
      y: 0,
      scale: role === "incoming" ? 1.16 - safeProgress * 0.16 : 1 + safeProgress * 0.06,
      opacity: role === "incoming" ? safeProgress : 1 - safeProgress,
    };
  }

  if (preset === "zoomOut") {
    return {
      x: 0,
      y: 0,
      scale: role === "incoming" ? 0.84 + safeProgress * 0.16 : 1.08 - safeProgress * 0.08,
      opacity: role === "incoming" ? safeProgress : 1 - safeProgress,
    };
  }

  return {
    x: 0,
    y: 0,
    scale: 1,
    opacity: role === "incoming" ? 1 : 0,
  };
}

export function getBackgroundMotion(animation: BackgroundAnimationPreset, localTime: number) {
  if (animation === "drift") {
    return {
      x: Math.sin(localTime * 0.35) * 2.5,
      y: Math.cos(localTime * 0.28) * 1.8,
      scale: 1.06,
    };
  }

  if (animation === "pulse") {
    return {
      x: 0,
      y: 0,
      scale: 1.03 + Math.sin(localTime * 1.4) * 0.03,
    };
  }

  return {
    x: 0,
    y: 0,
    scale: 1,
  };
}

export function buildSceneBackground(color: string, accent: string) {
  const mixed = mixHexColors(color, accent, 0.32);
  return [
    `radial-gradient(circle at 18% 18%, ${accent} 0%, transparent 36%)`,
    `radial-gradient(circle at 80% 24%, ${mixed} 0%, transparent 30%)`,
    `linear-gradient(145deg, ${color} 0%, ${mixed} 100%)`,
  ].join(", ");
}

export function drawSceneBackdropFrame(
  context: CanvasRenderingContext2D,
  sceneState: SampledSceneState,
) {
  context.clearRect(0, 0, context.canvas.width, context.canvas.height);

  if (sceneState.outgoingScene) {
    drawSceneBackdropLayer(
      context,
      sceneState,
      sceneState.outgoingScene,
      "outgoing",
      sceneState.outgoingSceneLocalTime,
    );
  }

  drawSceneBackdropLayer(
    context,
    sceneState,
    sceneState.currentScene,
    "incoming",
    sceneState.currentSceneLocalTime,
  );
}

function drawSceneBackdropLayer(
  context: CanvasRenderingContext2D,
  sceneState: SampledSceneState,
  scene: Scene,
  role: SceneFrameRole,
  localTime: number,
) {
  const visual = getSceneFrameVisual(
    role,
    sceneState.transitionPreset,
    sceneState.transitionProgress,
  );
  const motion = getBackgroundMotion(scene.background.animation, localTime);
  const width = context.canvas.width;
  const height = context.canvas.height;

  context.save();
  context.globalAlpha = visual.opacity;
  context.translate(
    width / 2 + (visual.x / FRAME_WIDTH) * width + (motion.x / 100) * width,
    height / 2 + (visual.y / FRAME_HEIGHT) * height + (motion.y / 100) * height,
  );
  context.scale(visual.scale * motion.scale, visual.scale * motion.scale);
  context.translate(-width / 2, -height / 2);
  paintSceneBackground(context, scene.background.color, scene.background.accent);
  context.restore();
}

function paintSceneBackground(context: CanvasRenderingContext2D, color: string, accent: string) {
  const width = context.canvas.width;
  const height = context.canvas.height;
  const mixed = mixHexColors(color, accent, 0.32);
  const linearGradient = context.createLinearGradient(0, 0, width, height);

  linearGradient.addColorStop(0, color);
  linearGradient.addColorStop(1, mixed);
  context.fillStyle = linearGradient;
  context.fillRect(0, 0, width, height);
  drawSceneBackgroundGlow(context, 0.8, 0.24, mixed, 0.3);
  drawSceneBackgroundGlow(context, 0.18, 0.18, accent, 0.36);
}

function drawSceneBackgroundGlow(
  context: CanvasRenderingContext2D,
  x: number,
  y: number,
  color: string,
  stop: number,
) {
  const centerX = context.canvas.width * x;
  const centerY = context.canvas.height * y;
  const radius =
    getFarthestCornerDistance(centerX, centerY, context.canvas.width, context.canvas.height) * stop;
  const gradient = context.createRadialGradient(centerX, centerY, 0, centerX, centerY, radius);

  gradient.addColorStop(0, toRgba(color, 1));
  gradient.addColorStop(1, toRgba(color, 0));
  context.fillStyle = gradient;
  context.fillRect(0, 0, context.canvas.width, context.canvas.height);
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function getFarthestCornerDistance(x: number, y: number, width: number, height: number) {
  return Math.max(
    Math.hypot(x, y),
    Math.hypot(width - x, y),
    Math.hypot(x, height - y),
    Math.hypot(width - x, height - y),
  );
}

function mixHexColors(first: string, second: string, amount: number) {
  const left = parseHexColor(first);
  const right = parseHexColor(second);
  const mix = (leftValue: number, rightValue: number) =>
    Math.round(leftValue + (rightValue - leftValue) * amount)
      .toString(16)
      .padStart(2, "0");

  return `#${mix(left.r, right.r)}${mix(left.g, right.g)}${mix(left.b, right.b)}`;
}

function parseHexColor(value: string) {
  const normalized = value.replace("#", "");
  const hex =
    normalized.length === 3
      ? normalized
          .split("")
          .map((part) => `${part}${part}`)
          .join("")
      : normalized.padEnd(6, "0").slice(0, 6);

  return {
    r: Number.parseInt(hex.slice(0, 2), 16),
    g: Number.parseInt(hex.slice(2, 4), 16),
    b: Number.parseInt(hex.slice(4, 6), 16),
  };
}

function toRgba(color: string, alpha: number) {
  const { r, g, b } = parseHexColor(color);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}
