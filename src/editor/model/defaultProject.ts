import {
  createDefaultObjectStyle,
  createDefaultSceneCamera,
  type AnimatableProperty,
  type Clip,
  type Easing,
  type Keyframe,
  type Layer,
  type LayerEffectsPatch,
  type ModelContent,
  type Project,
  type Scene,
  type ShapeContent,
  type TextContent,
  type Transform,
} from "./project";

const TOTAL_DURATION = 8;
const SCENE_ONE_END = 2;
const SCENE_TWO_END = 3.8;
const SCENE_THREE_END = 5.9;

function makeTransform(overrides: Partial<Transform> = {}): Transform {
  return {
    x: 0,
    y: 0,
    z: 0,
    rotationX: 0,
    rotationY: 0,
    rotation: 0,
    scaleX: 1,
    scaleY: 1,
    scaleZ: 1,
    skewX: 0,
    skewY: 0,
    ...overrides,
  };
}

function makeKeyframe(
  id: string,
  time: number,
  property: AnimatableProperty,
  value: number | string,
  easing: Easing = "easeInOut",
): Keyframe {
  return {
    id,
    time,
    property,
    value,
    easing,
  };
}

function makeClip(
  layerId: string,
  name: string,
  options: {
    start?: number;
    end?: number;
    transitionIn?: Clip["transitionIn"];
    transitionOut?: Clip["transitionOut"];
    keyframes?: Keyframe[];
  } = {},
): Clip {
  return {
    id: `${layerId}-clip`,
    layerId,
    name,
    start: options.start ?? 0,
    end: options.end ?? TOTAL_DURATION,
    enabled: true,
    transitionIn: options.transitionIn ?? { preset: "none", duration: 0 },
    transitionOut: options.transitionOut ?? { preset: "none", duration: 0 },
    keyframes: options.keyframes ?? [],
  };
}

function makeStyle(color: string, patch?: LayerEffectsPatch) {
  const base = createDefaultObjectStyle(color);

  if (!patch) {
    return base;
  }

  return {
    ...base,
    effects: {
      ...base.effects,
      stroke: {
        ...base.effects.stroke,
        ...patch.stroke,
      },
      dropShadow: {
        ...base.effects.dropShadow,
        ...patch.dropShadow,
      },
      outerGlow: {
        ...base.effects.outerGlow,
        ...patch.outerGlow,
      },
    },
  };
}

function makeTextLayer({
  id,
  name,
  text,
  fontSize,
  fontWeight,
  letterSpacing,
  color,
  effects,
  transform,
  opacity = 1,
  clip,
}: {
  id: string;
  name: string;
  text: string;
  fontSize: number;
  fontWeight?: number;
  letterSpacing?: number;
  color: string;
  effects?: LayerEffectsPatch;
  transform?: Partial<Transform>;
  opacity?: number;
  clip: Clip;
}): Layer {
  const content: TextContent = {
    value: text,
    fontSize,
    fontWeight,
    letterSpacing,
  };

  return {
    id,
    name,
    type: "text",
    visible: true,
    locked: false,
    object: {
      id: `${id}-object`,
      transform: makeTransform(transform),
      opacity,
      style: makeStyle(color, effects),
      content,
    },
    clips: [clip],
  };
}

function makeShapeLayer({
  id,
  name,
  content,
  color,
  effects,
  transform,
  opacity = 1,
  clip,
}: {
  id: string;
  name: string;
  content: ShapeContent;
  color: string;
  effects?: LayerEffectsPatch;
  transform?: Partial<Transform>;
  opacity?: number;
  clip: Clip;
}): Layer {
  return {
    id,
    name,
    type: "shape",
    visible: true,
    locked: false,
    object: {
      id: `${id}-object`,
      transform: makeTransform(transform),
      opacity,
      style: makeStyle(color, effects),
      content,
    },
    clips: [clip],
  };
}

function makeModelLayer({
  id,
  name,
  content,
  color,
  transform,
  opacity = 1,
  clip,
}: {
  id: string;
  name: string;
  content: ModelContent;
  color: string;
  transform?: Partial<Transform>;
  opacity?: number;
  clip: Clip;
}): Layer {
  return {
    id,
    name,
    type: "model",
    visible: true,
    locked: false,
    object: {
      id: `${id}-object`,
      transform: makeTransform(transform),
      opacity,
      style: makeStyle(color),
      content,
    },
    clips: [clip],
  };
}

const defaultLayers: Layer[] = [
  makeShapeLayer({
    id: "pulse-halo",
    name: "Pulse Halo",
    color: "#fb923c",
    opacity: 0.16,
    transform: {
      x: -1.8,
      y: 0.25,
      z: -0.5,
    },
    effects: {
      outerGlow: {
        enabled: true,
        color: "#fdba74",
        opacity: 0.54,
        size: 0.48,
      },
    },
    content: { shape: "circle", radius: 2.65 },
    clip: makeClip("pulse-halo", "Halo Sweep", {
      transitionIn: { preset: "zoomIn", duration: 0.9 },
      keyframes: [
        makeKeyframe("pulse-halo-x-1", 0, "x", -2.4, "easeOut"),
        makeKeyframe("pulse-halo-x-2", SCENE_ONE_END, "x", -1.2),
        makeKeyframe("pulse-halo-x-3", SCENE_TWO_END, "x", 0.35),
        makeKeyframe("pulse-halo-x-4", SCENE_THREE_END, "x", 1.3),
        makeKeyframe("pulse-halo-x-5", TOTAL_DURATION, "x", -0.15),
        makeKeyframe("pulse-halo-y-1", 0, "y", 0.9, "easeOut"),
        makeKeyframe("pulse-halo-y-2", SCENE_ONE_END, "y", 0.2),
        makeKeyframe("pulse-halo-y-3", SCENE_TWO_END, "y", -0.55),
        makeKeyframe("pulse-halo-y-4", SCENE_THREE_END, "y", 0.35),
        makeKeyframe("pulse-halo-y-5", TOTAL_DURATION, "y", 0.05),
        makeKeyframe("pulse-halo-scale-x-1", 0, "scaleX", 0.82, "easeOut"),
        makeKeyframe("pulse-halo-scale-x-2", SCENE_ONE_END, "scaleX", 1.36),
        makeKeyframe("pulse-halo-scale-x-3", SCENE_TWO_END, "scaleX", 0.94),
        makeKeyframe("pulse-halo-scale-x-4", SCENE_THREE_END, "scaleX", 1.44),
        makeKeyframe("pulse-halo-scale-x-5", TOTAL_DURATION, "scaleX", 1.08),
        makeKeyframe("pulse-halo-scale-y-1", 0, "scaleY", 0.82, "easeOut"),
        makeKeyframe("pulse-halo-scale-y-2", SCENE_ONE_END, "scaleY", 1.36),
        makeKeyframe("pulse-halo-scale-y-3", SCENE_TWO_END, "scaleY", 0.94),
        makeKeyframe("pulse-halo-scale-y-4", SCENE_THREE_END, "scaleY", 1.44),
        makeKeyframe("pulse-halo-scale-y-5", TOTAL_DURATION, "scaleY", 1.08),
        makeKeyframe("pulse-halo-opacity-1", 0, "opacity", 0.12, "easeOut"),
        makeKeyframe("pulse-halo-opacity-2", SCENE_ONE_END, "opacity", 0.19),
        makeKeyframe("pulse-halo-opacity-3", SCENE_TWO_END, "opacity", 0.13),
        makeKeyframe("pulse-halo-opacity-4", SCENE_THREE_END, "opacity", 0.2),
        makeKeyframe("pulse-halo-opacity-5", TOTAL_DURATION, "opacity", 0.14),
      ],
    }),
  }),
  makeShapeLayer({
    id: "starburst",
    name: "Starburst",
    color: "#22d3ee",
    opacity: 0.3,
    transform: {
      x: 3.25,
      y: 1.55,
      z: -0.2,
      rotation: -0.3,
    },
    effects: {
      dropShadow: {
        enabled: true,
        color: "#0f172a",
        opacity: 0.2,
        offsetX: 0.14,
        offsetY: -0.08,
        blur: 0.14,
      },
      outerGlow: {
        enabled: true,
        color: "#67e8f9",
        opacity: 0.38,
        size: 0.22,
      },
    },
    content: { shape: "star", radius: 1.15, innerRadius: 0.42, points: 6 },
    clip: makeClip("starburst", "Starburst Orbit", {
      start: 0.4,
      transitionIn: { preset: "slideFromRight", duration: 0.7 },
      keyframes: [
        makeKeyframe("starburst-x-1", 0.4, "x", 3.7, "easeOut"),
        makeKeyframe("starburst-x-2", SCENE_ONE_END, "x", 3),
        makeKeyframe("starburst-x-3", SCENE_TWO_END, "x", 2.35),
        makeKeyframe("starburst-x-4", SCENE_THREE_END, "x", 3.35),
        makeKeyframe("starburst-x-5", TOTAL_DURATION, "x", 2.75),
        makeKeyframe("starburst-y-1", 0.4, "y", 1.9, "easeOut"),
        makeKeyframe("starburst-y-2", SCENE_ONE_END, "y", 1.3),
        makeKeyframe("starburst-y-3", SCENE_TWO_END, "y", 0.95),
        makeKeyframe("starburst-y-4", SCENE_THREE_END, "y", 1.65),
        makeKeyframe("starburst-y-5", TOTAL_DURATION, "y", 1.05),
        makeKeyframe("starburst-rotation-1", 0.4, "rotation", -0.3, "easeOut"),
        makeKeyframe("starburst-rotation-2", SCENE_ONE_END, "rotation", 0.75),
        makeKeyframe("starburst-rotation-3", SCENE_TWO_END, "rotation", 1.55),
        makeKeyframe("starburst-rotation-4", SCENE_THREE_END, "rotation", 2.7),
        makeKeyframe("starburst-rotation-5", TOTAL_DURATION, "rotation", 3.45),
        makeKeyframe("starburst-scale-x-1", 0.4, "scaleX", 0.7, "easeOut"),
        makeKeyframe("starburst-scale-x-2", SCENE_ONE_END, "scaleX", 1.02),
        makeKeyframe("starburst-scale-x-3", SCENE_TWO_END, "scaleX", 0.84),
        makeKeyframe("starburst-scale-x-4", SCENE_THREE_END, "scaleX", 1.26),
        makeKeyframe("starburst-scale-x-5", TOTAL_DURATION, "scaleX", 0.98),
        makeKeyframe("starburst-scale-y-1", 0.4, "scaleY", 0.7, "easeOut"),
        makeKeyframe("starburst-scale-y-2", SCENE_ONE_END, "scaleY", 1.02),
        makeKeyframe("starburst-scale-y-3", SCENE_TWO_END, "scaleY", 0.84),
        makeKeyframe("starburst-scale-y-4", SCENE_THREE_END, "scaleY", 1.26),
        makeKeyframe("starburst-scale-y-5", TOTAL_DURATION, "scaleY", 0.98),
      ],
    }),
  }),
  makeTextLayer({
    id: "eyebrow",
    name: "Eyebrow",
    text: "CAMERA RAIL / LAYER FX / PRIMITIVES",
    fontSize: 0.24,
    fontWeight: 600,
    letterSpacing: 0.14,
    color: "#fde68a",
    opacity: 0.94,
    transform: {
      x: -3.15,
      y: 2.55,
      z: 0.2,
    },
    effects: {
      dropShadow: {
        enabled: true,
        color: "#0f172a",
        opacity: 0.28,
        offsetX: 0.1,
        offsetY: -0.08,
        blur: 0.12,
      },
      outerGlow: {
        enabled: true,
        color: "#f97316",
        opacity: 0.18,
        size: 0.08,
      },
    },
    clip: makeClip("eyebrow", "Eyebrow Drift", {
      start: 0.1,
      transitionIn: { preset: "slideFromLeft", duration: 0.6 },
      keyframes: [
        makeKeyframe("eyebrow-x-1", 0.1, "x", -3.8, "easeOut"),
        makeKeyframe("eyebrow-x-2", SCENE_ONE_END, "x", -2.85),
        makeKeyframe("eyebrow-x-3", SCENE_TWO_END, "x", -3.3),
        makeKeyframe("eyebrow-x-4", SCENE_THREE_END, "x", -2.55),
        makeKeyframe("eyebrow-x-5", TOTAL_DURATION, "x", -2.9),
        makeKeyframe("eyebrow-y-1", 0.1, "y", 2.75, "easeOut"),
        makeKeyframe("eyebrow-y-2", SCENE_ONE_END, "y", 2.5),
        makeKeyframe("eyebrow-y-3", SCENE_TWO_END, "y", 2.2),
        makeKeyframe("eyebrow-y-4", SCENE_THREE_END, "y", 2.45),
        makeKeyframe("eyebrow-y-5", TOTAL_DURATION, "y", 2.25),
        makeKeyframe("eyebrow-rotation-1", 0.1, "rotation", -0.06, "easeOut"),
        makeKeyframe("eyebrow-rotation-2", SCENE_ONE_END, "rotation", -0.01),
        makeKeyframe("eyebrow-rotation-3", SCENE_TWO_END, "rotation", 0.03),
        makeKeyframe("eyebrow-rotation-4", SCENE_THREE_END, "rotation", -0.02),
        makeKeyframe("eyebrow-rotation-5", TOTAL_DURATION, "rotation", 0.04),
      ],
    }),
  }),
  makeTextLayer({
    id: "headline-top",
    name: "Headline Top",
    text: "KINETIC",
    fontSize: 1.46,
    fontWeight: 700,
    color: "#fff8ee",
    transform: {
      x: -0.45,
      y: 0.95,
      z: 0.15,
    },
    effects: {
      stroke: {
        enabled: true,
        color: "#0f172a",
        size: 0.03,
        opacity: 0.62,
      },
      dropShadow: {
        enabled: true,
        color: "#111827",
        opacity: 0.34,
        offsetX: 0.15,
        offsetY: -0.14,
        blur: 0.22,
      },
      outerGlow: {
        enabled: true,
        color: "#fb923c",
        opacity: 0.22,
        size: 0.14,
      },
    },
    clip: makeClip("headline-top", "Headline Top Motion", {
      start: 0.15,
      transitionIn: { preset: "slideFromBottom", duration: 0.8 },
      keyframes: [
        makeKeyframe("headline-top-x-1", 0.15, "x", -0.95, "easeOut"),
        makeKeyframe("headline-top-x-2", SCENE_ONE_END, "x", -0.18),
        makeKeyframe("headline-top-x-3", SCENE_TWO_END, "x", -0.58),
        makeKeyframe("headline-top-x-4", SCENE_THREE_END, "x", 0.08),
        makeKeyframe("headline-top-x-5", TOTAL_DURATION, "x", -0.22),
        makeKeyframe("headline-top-y-1", 0.15, "y", 1.4, "easeOut"),
        makeKeyframe("headline-top-y-2", SCENE_ONE_END, "y", 0.92),
        makeKeyframe("headline-top-y-3", SCENE_TWO_END, "y", 0.55),
        makeKeyframe("headline-top-y-4", SCENE_THREE_END, "y", 1.12),
        makeKeyframe("headline-top-y-5", TOTAL_DURATION, "y", 0.78),
        makeKeyframe("headline-top-rotation-1", 0.15, "rotation", -0.08, "easeOut"),
        makeKeyframe("headline-top-rotation-2", SCENE_ONE_END, "rotation", -0.01),
        makeKeyframe("headline-top-rotation-3", SCENE_TWO_END, "rotation", 0.04),
        makeKeyframe("headline-top-rotation-4", SCENE_THREE_END, "rotation", -0.03),
        makeKeyframe("headline-top-rotation-5", TOTAL_DURATION, "rotation", 0.02),
        makeKeyframe("headline-top-scale-x-1", 0.15, "scaleX", 0.9, "easeOut"),
        makeKeyframe("headline-top-scale-x-2", SCENE_ONE_END, "scaleX", 1.03),
        makeKeyframe("headline-top-scale-x-3", SCENE_TWO_END, "scaleX", 0.95),
        makeKeyframe("headline-top-scale-x-4", SCENE_THREE_END, "scaleX", 1.07),
        makeKeyframe("headline-top-scale-x-5", TOTAL_DURATION, "scaleX", 1),
        makeKeyframe("headline-top-scale-y-1", 0.15, "scaleY", 0.92, "easeOut"),
        makeKeyframe("headline-top-scale-y-2", SCENE_ONE_END, "scaleY", 1.02),
        makeKeyframe("headline-top-scale-y-3", SCENE_TWO_END, "scaleY", 0.96),
        makeKeyframe("headline-top-scale-y-4", SCENE_THREE_END, "scaleY", 1.05),
        makeKeyframe("headline-top-scale-y-5", TOTAL_DURATION, "scaleY", 1),
      ],
    }),
  }),
  makeTextLayer({
    id: "headline-bottom",
    name: "Headline Bottom",
    text: "POSTER",
    fontSize: 1.58,
    fontWeight: 700,
    color: "#f8fafc",
    transform: {
      x: 0.6,
      y: -0.28,
      z: 0.18,
    },
    effects: {
      stroke: {
        enabled: true,
        color: "#0f172a",
        size: 0.03,
        opacity: 0.58,
      },
      dropShadow: {
        enabled: true,
        color: "#082f49",
        opacity: 0.28,
        offsetX: 0.15,
        offsetY: -0.12,
        blur: 0.2,
      },
      outerGlow: {
        enabled: true,
        color: "#67e8f9",
        opacity: 0.24,
        size: 0.14,
      },
    },
    clip: makeClip("headline-bottom", "Headline Bottom Motion", {
      start: 0.35,
      transitionIn: { preset: "zoomIn", duration: 0.8 },
      keyframes: [
        makeKeyframe("headline-bottom-x-1", 0.35, "x", 1.15, "easeOut"),
        makeKeyframe("headline-bottom-x-2", SCENE_ONE_END, "x", 0.58),
        makeKeyframe("headline-bottom-x-3", SCENE_TWO_END, "x", 0.98),
        makeKeyframe("headline-bottom-x-4", SCENE_THREE_END, "x", 0.12),
        makeKeyframe("headline-bottom-x-5", TOTAL_DURATION, "x", 0.5),
        makeKeyframe("headline-bottom-y-1", 0.35, "y", -0.55, "easeOut"),
        makeKeyframe("headline-bottom-y-2", SCENE_ONE_END, "y", -0.22),
        makeKeyframe("headline-bottom-y-3", SCENE_TWO_END, "y", -0.65),
        makeKeyframe("headline-bottom-y-4", SCENE_THREE_END, "y", -0.02),
        makeKeyframe("headline-bottom-y-5", TOTAL_DURATION, "y", -0.36),
        makeKeyframe("headline-bottom-rotation-1", 0.35, "rotation", 0.08, "easeOut"),
        makeKeyframe("headline-bottom-rotation-2", SCENE_ONE_END, "rotation", 0.01),
        makeKeyframe("headline-bottom-rotation-3", SCENE_TWO_END, "rotation", -0.05),
        makeKeyframe("headline-bottom-rotation-4", SCENE_THREE_END, "rotation", 0.04),
        makeKeyframe("headline-bottom-rotation-5", TOTAL_DURATION, "rotation", -0.02),
        makeKeyframe("headline-bottom-scale-x-1", 0.35, "scaleX", 0.88, "easeOut"),
        makeKeyframe("headline-bottom-scale-x-2", SCENE_ONE_END, "scaleX", 1.04),
        makeKeyframe("headline-bottom-scale-x-3", SCENE_TWO_END, "scaleX", 0.95),
        makeKeyframe("headline-bottom-scale-x-4", SCENE_THREE_END, "scaleX", 1.08),
        makeKeyframe("headline-bottom-scale-x-5", TOTAL_DURATION, "scaleX", 1),
        makeKeyframe("headline-bottom-scale-y-1", 0.35, "scaleY", 0.9, "easeOut"),
        makeKeyframe("headline-bottom-scale-y-2", SCENE_ONE_END, "scaleY", 1.03),
        makeKeyframe("headline-bottom-scale-y-3", SCENE_TWO_END, "scaleY", 0.94),
        makeKeyframe("headline-bottom-scale-y-4", SCENE_THREE_END, "scaleY", 1.07),
        makeKeyframe("headline-bottom-scale-y-5", TOTAL_DURATION, "scaleY", 1),
      ],
    }),
  }),
  makeShapeLayer({
    id: "track",
    name: "Light Track",
    color: "#e0f2fe",
    opacity: 0.72,
    transform: {
      x: 0,
      y: -2.55,
      z: -0.1,
    },
    effects: {
      outerGlow: {
        enabled: true,
        color: "#38bdf8",
        opacity: 0.26,
        size: 0.18,
      },
    },
    content: { shape: "rectangle", width: 8.4, height: 0.16 },
    clip: makeClip("track", "Track Sweep", {
      start: 0.3,
      transitionIn: { preset: "slideFromLeft", duration: 0.75 },
      keyframes: [
        makeKeyframe("track-scale-x-1", 0.3, "scaleX", 0.42, "easeOut"),
        makeKeyframe("track-scale-x-2", SCENE_ONE_END, "scaleX", 1.08),
        makeKeyframe("track-scale-x-3", SCENE_TWO_END, "scaleX", 0.92),
        makeKeyframe("track-scale-x-4", SCENE_THREE_END, "scaleX", 1.16),
        makeKeyframe("track-scale-x-5", TOTAL_DURATION, "scaleX", 0.9),
        makeKeyframe("track-y-1", 0.3, "y", -2.85, "easeOut"),
        makeKeyframe("track-y-2", SCENE_ONE_END, "y", -2.45),
        makeKeyframe("track-y-3", SCENE_TWO_END, "y", -2.65),
        makeKeyframe("track-y-4", SCENE_THREE_END, "y", -2.2),
        makeKeyframe("track-y-5", TOTAL_DURATION, "y", -2.5),
        makeKeyframe("track-opacity-1", 0.3, "opacity", 0.42, "easeOut"),
        makeKeyframe("track-opacity-2", SCENE_ONE_END, "opacity", 0.72),
        makeKeyframe("track-opacity-3", SCENE_TWO_END, "opacity", 0.5),
        makeKeyframe("track-opacity-4", SCENE_THREE_END, "opacity", 0.78),
        makeKeyframe("track-opacity-5", TOTAL_DURATION, "opacity", 0.56),
      ],
    }),
  }),
  makeTextLayer({
    id: "subhead",
    name: "Subhead",
    text: "Animated text, primitives, layer effects, and a moving camera path.",
    fontSize: 0.33,
    fontWeight: 500,
    color: "#e2e8f0",
    opacity: 0.82,
    transform: {
      x: 0,
      y: -1.7,
      z: 0.2,
    },
    effects: {
      dropShadow: {
        enabled: true,
        color: "#0f172a",
        opacity: 0.24,
        offsetX: 0.1,
        offsetY: -0.08,
        blur: 0.14,
      },
      outerGlow: {
        enabled: true,
        color: "#38bdf8",
        opacity: 0.1,
        size: 0.08,
      },
    },
    clip: makeClip("subhead", "Subhead Hold", {
      start: 0.85,
      transitionIn: { preset: "fade", duration: 0.6 },
      keyframes: [
        makeKeyframe("subhead-x-1", 0.85, "x", -0.35, "easeOut"),
        makeKeyframe("subhead-x-2", SCENE_ONE_END, "x", 0.12),
        makeKeyframe("subhead-x-3", SCENE_TWO_END, "x", -0.18),
        makeKeyframe("subhead-x-4", SCENE_THREE_END, "x", 0.2),
        makeKeyframe("subhead-x-5", TOTAL_DURATION, "x", -0.08),
        makeKeyframe("subhead-opacity-1", 0.85, "opacity", 0.28, "easeOut"),
        makeKeyframe("subhead-opacity-2", 1.3, "opacity", 0.86),
        makeKeyframe("subhead-opacity-3", SCENE_TWO_END, "opacity", 0.68),
        makeKeyframe("subhead-opacity-4", SCENE_THREE_END, "opacity", 0.88),
        makeKeyframe("subhead-opacity-5", TOTAL_DURATION, "opacity", 0.72),
      ],
    }),
  }),
  makeShapeLayer({
    id: "status-plate",
    name: "Status Plate",
    color: "#f8fafc",
    opacity: 0.16,
    transform: {
      x: 2.75,
      y: -2.05,
      z: 0.1,
    },
    effects: {
      stroke: {
        enabled: true,
        color: "#38bdf8",
        size: 0.04,
        opacity: 0.32,
      },
      outerGlow: {
        enabled: true,
        color: "#38bdf8",
        opacity: 0.18,
        size: 0.12,
      },
    },
    content: { shape: "rectangle", width: 2.6, height: 0.62 },
    clip: makeClip("status-plate", "Status Plate In", {
      start: 1,
      transitionIn: { preset: "zoomIn", duration: 0.6 },
      keyframes: [
        makeKeyframe("status-plate-x-1", 1, "x", 3.3, "easeOut"),
        makeKeyframe("status-plate-x-2", SCENE_ONE_END, "x", 2.7),
        makeKeyframe("status-plate-x-3", SCENE_TWO_END, "x", 2.25),
        makeKeyframe("status-plate-x-4", SCENE_THREE_END, "x", 3.05),
        makeKeyframe("status-plate-x-5", TOTAL_DURATION, "x", 2.55),
        makeKeyframe("status-plate-opacity-1", 1, "opacity", 0.06, "easeOut"),
        makeKeyframe("status-plate-opacity-2", 1.4, "opacity", 0.18),
        makeKeyframe("status-plate-opacity-3", SCENE_TWO_END, "opacity", 0.12),
        makeKeyframe("status-plate-opacity-4", SCENE_THREE_END, "opacity", 0.2),
        makeKeyframe("status-plate-opacity-5", TOTAL_DURATION, "opacity", 0.14),
      ],
    }),
  }),
  makeTextLayer({
    id: "status-copy",
    name: "Status Copy",
    text: "4 SCENES / 3D PREVIEW",
    fontSize: 0.23,
    fontWeight: 700,
    letterSpacing: 0.08,
    color: "#f8fafc",
    opacity: 0.88,
    transform: {
      x: 2.75,
      y: -2.05,
      z: 0.2,
    },
    effects: {
      dropShadow: {
        enabled: true,
        color: "#0f172a",
        opacity: 0.24,
        offsetX: 0.08,
        offsetY: -0.06,
        blur: 0.12,
      },
      outerGlow: {
        enabled: true,
        color: "#38bdf8",
        opacity: 0.18,
        size: 0.08,
      },
    },
    clip: makeClip("status-copy", "Status Copy In", {
      start: 1.1,
      transitionIn: { preset: "fade", duration: 0.55 },
      keyframes: [
        makeKeyframe("status-copy-x-1", 1.1, "x", 3.15, "easeOut"),
        makeKeyframe("status-copy-x-2", SCENE_ONE_END, "x", 2.68),
        makeKeyframe("status-copy-x-3", SCENE_TWO_END, "x", 2.22),
        makeKeyframe("status-copy-x-4", SCENE_THREE_END, "x", 3.02),
        makeKeyframe("status-copy-x-5", TOTAL_DURATION, "x", 2.52),
        makeKeyframe("status-copy-opacity-1", 1.1, "opacity", 0.1, "easeOut"),
        makeKeyframe("status-copy-opacity-2", 1.5, "opacity", 0.88),
        makeKeyframe("status-copy-opacity-3", SCENE_TWO_END, "opacity", 0.74),
        makeKeyframe("status-copy-opacity-4", SCENE_THREE_END, "opacity", 0.9),
        makeKeyframe("status-copy-opacity-5", TOTAL_DURATION, "opacity", 0.76),
      ],
    }),
  }),
  makeModelLayer({
    id: "orbital-ring",
    name: "Orbital Ring",
    color: "#fdba74",
    transform: {
      x: 3.05,
      y: 0.05,
      z: 0.7,
      rotationX: 0.95,
      rotationY: 0.35,
      rotation: 0.05,
    },
    content: {
      kind: "primitive",
      shape: "torus",
      radius: 1.28,
      tubularRadius: 0.18,
      radialSegments: 48,
      roughness: 0.18,
      metalness: 0.4,
      emissive: "#22d3ee",
      emissiveIntensity: 0.45,
    },
    clip: makeClip("orbital-ring", "Orbital Ring Move", {
      start: 0.7,
      transitionIn: { preset: "zoomIn", duration: 0.9 },
      keyframes: [
        makeKeyframe("orbital-ring-x-1", 0.7, "x", 3.7, "easeOut"),
        makeKeyframe("orbital-ring-x-2", SCENE_ONE_END, "x", 2.95),
        makeKeyframe("orbital-ring-x-3", SCENE_TWO_END, "x", 2.15),
        makeKeyframe("orbital-ring-x-4", SCENE_THREE_END, "x", 1.15),
        makeKeyframe("orbital-ring-x-5", TOTAL_DURATION, "x", 2),
        makeKeyframe("orbital-ring-y-1", 0.7, "y", 0.72, "easeOut"),
        makeKeyframe("orbital-ring-y-2", SCENE_ONE_END, "y", 0.16),
        makeKeyframe("orbital-ring-y-3", SCENE_TWO_END, "y", -0.48),
        makeKeyframe("orbital-ring-y-4", SCENE_THREE_END, "y", 0.62),
        makeKeyframe("orbital-ring-y-5", TOTAL_DURATION, "y", 0.1),
        makeKeyframe("orbital-ring-z-1", 0.7, "z", 0.55, "easeOut"),
        makeKeyframe("orbital-ring-z-2", SCENE_ONE_END, "z", 1.05),
        makeKeyframe("orbital-ring-z-3", SCENE_TWO_END, "z", 0.38),
        makeKeyframe("orbital-ring-z-4", SCENE_THREE_END, "z", 0.92),
        makeKeyframe("orbital-ring-z-5", TOTAL_DURATION, "z", 0.26),
        makeKeyframe("orbital-ring-rotation-x-1", 0.7, "rotationX", 0.7, "easeOut"),
        makeKeyframe("orbital-ring-rotation-x-2", SCENE_ONE_END, "rotationX", 1.4),
        makeKeyframe("orbital-ring-rotation-x-3", SCENE_TWO_END, "rotationX", 1.05),
        makeKeyframe("orbital-ring-rotation-x-4", SCENE_THREE_END, "rotationX", 1.75),
        makeKeyframe("orbital-ring-rotation-x-5", TOTAL_DURATION, "rotationX", 1.28),
        makeKeyframe("orbital-ring-rotation-y-1", 0.7, "rotationY", 0.2, "easeOut"),
        makeKeyframe("orbital-ring-rotation-y-2", SCENE_ONE_END, "rotationY", 1.5),
        makeKeyframe("orbital-ring-rotation-y-3", SCENE_TWO_END, "rotationY", 2.45),
        makeKeyframe("orbital-ring-rotation-y-4", SCENE_THREE_END, "rotationY", 3.3),
        makeKeyframe("orbital-ring-rotation-y-5", TOTAL_DURATION, "rotationY", 4.45),
        makeKeyframe("orbital-ring-rotation-z-1", 0.7, "rotation", 0.05, "easeOut"),
        makeKeyframe("orbital-ring-rotation-z-2", SCENE_ONE_END, "rotation", 0.35),
        makeKeyframe("orbital-ring-rotation-z-3", SCENE_TWO_END, "rotation", 0.88),
        makeKeyframe("orbital-ring-rotation-z-4", SCENE_THREE_END, "rotation", 1.3),
        makeKeyframe("orbital-ring-rotation-z-5", TOTAL_DURATION, "rotation", 1.75),
        makeKeyframe("orbital-ring-scale-x-1", 0.7, "scaleX", 0.74, "easeOut"),
        makeKeyframe("orbital-ring-scale-x-2", SCENE_ONE_END, "scaleX", 1.06),
        makeKeyframe("orbital-ring-scale-x-3", SCENE_TWO_END, "scaleX", 0.92),
        makeKeyframe("orbital-ring-scale-x-4", SCENE_THREE_END, "scaleX", 1.18),
        makeKeyframe("orbital-ring-scale-x-5", TOTAL_DURATION, "scaleX", 0.98),
        makeKeyframe("orbital-ring-scale-y-1", 0.7, "scaleY", 0.74, "easeOut"),
        makeKeyframe("orbital-ring-scale-y-2", SCENE_ONE_END, "scaleY", 1.06),
        makeKeyframe("orbital-ring-scale-y-3", SCENE_TWO_END, "scaleY", 0.92),
        makeKeyframe("orbital-ring-scale-y-4", SCENE_THREE_END, "scaleY", 1.18),
        makeKeyframe("orbital-ring-scale-y-5", TOTAL_DURATION, "scaleY", 0.98),
        makeKeyframe("orbital-ring-scale-z-1", 0.7, "scaleZ", 0.74, "easeOut"),
        makeKeyframe("orbital-ring-scale-z-2", SCENE_ONE_END, "scaleZ", 1.06),
        makeKeyframe("orbital-ring-scale-z-3", SCENE_TWO_END, "scaleZ", 0.92),
        makeKeyframe("orbital-ring-scale-z-4", SCENE_THREE_END, "scaleZ", 1.18),
        makeKeyframe("orbital-ring-scale-z-5", TOTAL_DURATION, "scaleZ", 0.98),
      ],
    }),
  }),
];

const defaultScenes: Scene[] = [
  {
    id: "scene-ignition",
    name: "Ignition",
    start: 0,
    end: SCENE_ONE_END,
    background: {
      color: "#1b1235",
      accent: "#f97316",
      animation: "drift",
    },
    camera: {
      ...createDefaultSceneCamera(),
      position: { x: -2.15, y: 0.85, z: 12.8 },
      lookAt: { x: 0.2, y: 0.3, z: 0 },
      up: { x: -0.08, y: 1, z: 0.01 },
    },
    transitionToNext: {
      preset: "zoomIn",
      duration: 0.75,
    },
  },
  {
    id: "scene-breakout",
    name: "Breakout",
    start: SCENE_ONE_END,
    end: SCENE_TWO_END,
    background: {
      color: "#f7efe2",
      accent: "#ef4444",
      animation: "pulse",
    },
    camera: {
      ...createDefaultSceneCamera(),
      position: { x: 0.45, y: -0.05, z: 10.4 },
      lookAt: { x: 0.1, y: -0.05, z: 0 },
      up: { x: 0.02, y: 1, z: 0 },
    },
    transitionToNext: {
      preset: "slideFromLeft",
      duration: 0.7,
    },
  },
  {
    id: "scene-orbit",
    name: "Orbit",
    start: SCENE_TWO_END,
    end: SCENE_THREE_END,
    background: {
      color: "#dbf4ff",
      accent: "#0ea5e9",
      animation: "drift",
    },
    camera: {
      ...createDefaultSceneCamera(),
      position: { x: 2.2, y: 0.95, z: 9.2 },
      lookAt: { x: -0.35, y: 0.2, z: 0 },
      up: { x: 0.05, y: 1, z: -0.03 },
    },
    transitionToNext: {
      preset: "slideFromRight",
      duration: 0.8,
    },
  },
  {
    id: "scene-afterglow",
    name: "Afterglow",
    start: SCENE_THREE_END,
    end: TOTAL_DURATION,
    background: {
      color: "#09101d",
      accent: "#22d3ee",
      animation: "pulse",
    },
    camera: {
      ...createDefaultSceneCamera(),
      position: { x: -0.25, y: -0.55, z: 8.7 },
      lookAt: { x: 0.15, y: 0.1, z: 0 },
      up: { x: 0.03, y: 1, z: 0.05 },
    },
    transitionToNext: {
      preset: "none",
      duration: 0,
    },
  },
];

export function createDefaultProject(): Project {
  return {
    id: "motion-editor-project",
    name: "Kinetic Poster Demo",
    version: 5,
    width: 1080,
    height: 1080,
    fps: 30,
    duration: TOTAL_DURATION,
    background: "#1b1235",
    scenes: structuredClone(defaultScenes),
    layers: structuredClone(defaultLayers),
    assets: [],
    timeline: {
      duration: TOTAL_DURATION,
      fps: 30,
    },
  };
}
