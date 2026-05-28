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

const TOTAL_DURATION = 9.6;
const SCENE_ONE_END = 2.4;
const SCENE_TWO_END = 4.8;
const SCENE_THREE_END = 7.2;

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

function makeNumericKeyframes(
  baseId: string,
  property: AnimatableProperty,
  frames: ReadonlyArray<readonly [number, number, Easing?]>,
) {
  return frames.map(([time, value, easing], index) =>
    makeKeyframe(`${baseId}-${index + 1}`, time, property, value, easing ?? "easeInOut"),
  );
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
  makeTextLayer({
    id: "atrium-label",
    name: "Atrium Label",
    text: "SCENE 01 / ATRIUM",
    fontSize: 0.22,
    fontWeight: 600,
    letterSpacing: 0.18,
    color: "#f6d6a6",
    opacity: 0.96,
    transform: { x: -3.4, y: 2.45, z: 0.2 },
    effects: {
      dropShadow: {
        enabled: true,
        color: "#06070a",
        opacity: 0.34,
        offsetX: 0.08,
        offsetY: -0.06,
        blur: 0.12,
      },
      outerGlow: {
        enabled: true,
        color: "#d5a067",
        opacity: 0.16,
        size: 0.08,
      },
    },
    clip: makeClip("atrium-label", "Atrium Label", {
      start: 0.05,
      end: SCENE_ONE_END + 0.18,
      transitionIn: { preset: "slideFromLeft", duration: 0.55 },
      transitionOut: { preset: "fade", duration: 0.35 },
      keyframes: [
        ...makeNumericKeyframes("atrium-label-x", "x", [
          [0.05, -4.1, "easeOut"],
          [1.15, -3.4],
          [SCENE_ONE_END, -2.95],
        ]),
        ...makeNumericKeyframes("atrium-label-y", "y", [
          [0.05, 2.75, "easeOut"],
          [1.15, 2.45],
          [SCENE_ONE_END, 2.2],
        ]),
      ],
    }),
  }),
  makeTextLayer({
    id: "atrium-title",
    name: "Atrium Title",
    text: "AURIC",
    fontSize: 1.72,
    fontWeight: 720,
    color: "#fff2df",
    transform: { x: -1.1, y: 0.62, z: 0.25 },
    effects: {
      stroke: {
        enabled: true,
        color: "#120f16",
        size: 0.034,
        opacity: 0.62,
      },
      dropShadow: {
        enabled: true,
        color: "#050608",
        opacity: 0.36,
        offsetX: 0.16,
        offsetY: -0.14,
        blur: 0.24,
      },
      outerGlow: {
        enabled: true,
        color: "#d89d5f",
        opacity: 0.22,
        size: 0.14,
      },
    },
    clip: makeClip("atrium-title", "Atrium Title", {
      start: 0.12,
      end: SCENE_ONE_END + 0.2,
      transitionIn: { preset: "slideFromBottom", duration: 0.72 },
      transitionOut: { preset: "zoomOut", duration: 0.42 },
      keyframes: [
        ...makeNumericKeyframes("atrium-title-x", "x", [
          [0.12, -1.85, "easeOut"],
          [1.25, -1.05],
          [SCENE_ONE_END, -0.52],
        ]),
        ...makeNumericKeyframes("atrium-title-y", "y", [
          [0.12, 1.05, "easeOut"],
          [1.25, 0.62],
          [SCENE_ONE_END, 0.28],
        ]),
        ...makeNumericKeyframes("atrium-title-rotation", "rotation", [
          [0.12, -0.06, "easeOut"],
          [1.25, -0.01],
          [SCENE_ONE_END, 0.04],
        ]),
        ...makeNumericKeyframes("atrium-title-scale-x", "scaleX", [
          [0.12, 0.9, "easeOut"],
          [1.25, 1.02],
          [SCENE_ONE_END, 1.08],
        ]),
        ...makeNumericKeyframes("atrium-title-scale-y", "scaleY", [
          [0.12, 0.92, "easeOut"],
          [1.25, 1.02],
          [SCENE_ONE_END, 1.06],
        ]),
      ],
    }),
  }),
  makeTextLayer({
    id: "atrium-copy",
    name: "Atrium Copy",
    text: "Warm metal, deep lens, and a quiet editorial finish.",
    fontSize: 0.31,
    fontWeight: 520,
    color: "#d8d4d8",
    opacity: 0.84,
    transform: { x: -0.95, y: -1.28, z: 0.15 },
    effects: {
      dropShadow: {
        enabled: true,
        color: "#06070a",
        opacity: 0.22,
        offsetX: 0.1,
        offsetY: -0.08,
        blur: 0.14,
      },
    },
    clip: makeClip("atrium-copy", "Atrium Copy", {
      start: 0.46,
      end: SCENE_ONE_END + 0.15,
      transitionIn: { preset: "fade", duration: 0.55 },
      transitionOut: { preset: "fade", duration: 0.28 },
      keyframes: [
        ...makeNumericKeyframes("atrium-copy-x", "x", [
          [0.46, -1.35, "easeOut"],
          [1.4, -0.95],
          [SCENE_ONE_END, -0.55],
        ]),
        ...makeNumericKeyframes("atrium-copy-opacity", "opacity", [
          [0.46, 0.18, "easeOut"],
          [1.1, 0.84],
          [SCENE_ONE_END, 0.7],
        ]),
      ],
    }),
  }),
  makeShapeLayer({
    id: "atrium-panel",
    name: "Atrium Panel",
    color: "#f0dfc8",
    opacity: 0.11,
    transform: { x: 3.25, y: 0.12, z: -0.22, rotation: -0.18 },
    effects: {
      outerGlow: {
        enabled: true,
        color: "#d4a568",
        opacity: 0.18,
        size: 0.18,
      },
    },
    content: { shape: "rectangle", width: 2.6, height: 6.2 },
    clip: makeClip("atrium-panel", "Atrium Panel", {
      start: 0.08,
      end: SCENE_ONE_END + 0.12,
      transitionIn: { preset: "slideFromRight", duration: 0.65 },
      transitionOut: { preset: "fade", duration: 0.32 },
      keyframes: [
        ...makeNumericKeyframes("atrium-panel-x", "x", [
          [0.08, 4.5, "easeOut"],
          [1.15, 3.25],
          [SCENE_ONE_END, 2.55],
        ]),
        ...makeNumericKeyframes("atrium-panel-y", "y", [
          [0.08, 0.55, "easeOut"],
          [1.15, 0.12],
          [SCENE_ONE_END, -0.15],
        ]),
        ...makeNumericKeyframes("atrium-panel-opacity", "opacity", [
          [0.08, 0.04, "easeOut"],
          [1.15, 0.11],
          [SCENE_ONE_END, 0.08],
        ]),
      ],
    }),
  }),
  makeModelLayer({
    id: "atrium-ring",
    name: "Atrium Ring",
    color: "#efbf83",
    transform: {
      x: 2.95,
      y: 0.22,
      z: 0.92,
      rotationX: 0.95,
      rotationY: 0.2,
      rotation: 0.06,
    },
    content: {
      kind: "primitive",
      shape: "torus",
      radius: 1.22,
      tubularRadius: 0.18,
      radialSegments: 48,
      roughness: 0.14,
      metalness: 0.72,
      emissive: "#ffb763",
      emissiveIntensity: 0.18,
    },
    clip: makeClip("atrium-ring", "Atrium Ring", {
      start: 0,
      end: SCENE_ONE_END + 0.18,
      transitionIn: { preset: "zoomIn", duration: 0.72 },
      transitionOut: { preset: "fade", duration: 0.3 },
      keyframes: [
        ...makeNumericKeyframes("atrium-ring-x", "x", [
          [0, 4.05, "easeOut"],
          [1.2, 2.95],
          [SCENE_ONE_END, 1.85],
        ]),
        ...makeNumericKeyframes("atrium-ring-y", "y", [
          [0, 0.65, "easeOut"],
          [1.2, 0.22],
          [SCENE_ONE_END, -0.05],
        ]),
        ...makeNumericKeyframes("atrium-ring-z", "z", [
          [0, 0.45, "easeOut"],
          [1.2, 0.92],
          [SCENE_ONE_END, 1.28],
        ]),
        ...makeNumericKeyframes("atrium-ring-rotation-x", "rotationX", [
          [0, 0.78, "easeOut"],
          [1.2, 1.08],
          [SCENE_ONE_END, 1.36],
        ]),
        ...makeNumericKeyframes("atrium-ring-rotation-y", "rotationY", [
          [0, 0.2, "easeOut"],
          [1.2, 1.8],
          [SCENE_ONE_END, 3.55],
        ]),
      ],
    }),
  }),
  makeShapeLayer({
    id: "gallery-disc",
    name: "Gallery Disc",
    color: "#fb7185",
    opacity: 0.14,
    transform: { x: -3.0, y: 1.85, z: -0.5 },
    effects: {
      outerGlow: {
        enabled: true,
        color: "#fb7185",
        opacity: 0.46,
        size: 0.34,
      },
    },
    content: { shape: "circle", radius: 1.45 },
    clip: makeClip("gallery-disc", "Gallery Disc", {
      start: SCENE_ONE_END - 0.1,
      end: SCENE_TWO_END + 0.12,
      transitionIn: { preset: "zoomIn", duration: 0.62 },
      transitionOut: { preset: "fade", duration: 0.3 },
      keyframes: [
        ...makeNumericKeyframes("gallery-disc-x", "x", [
          [SCENE_ONE_END - 0.1, -3.55, "easeOut"],
          [3.4, -2.85],
          [SCENE_TWO_END, -1.95],
        ]),
        ...makeNumericKeyframes("gallery-disc-y", "y", [
          [SCENE_ONE_END - 0.1, 2.2, "easeOut"],
          [3.4, 1.78],
          [SCENE_TWO_END, 1.22],
        ]),
        ...makeNumericKeyframes("gallery-disc-scale-x", "scaleX", [
          [SCENE_ONE_END - 0.1, 0.82, "easeOut"],
          [3.4, 1.08],
          [SCENE_TWO_END, 1.32],
        ]),
        ...makeNumericKeyframes("gallery-disc-scale-y", "scaleY", [
          [SCENE_ONE_END - 0.1, 0.82, "easeOut"],
          [3.4, 1.08],
          [SCENE_TWO_END, 1.32],
        ]),
      ],
    }),
  }),
  makeShapeLayer({
    id: "gallery-frame",
    name: "Gallery Frame",
    color: "#ffffff",
    opacity: 0.08,
    transform: { x: 1.3, y: 0.08, z: -0.18, rotation: 0.02 },
    effects: {
      stroke: {
        enabled: true,
        color: "#fb7c59",
        size: 0.032,
        opacity: 0.18,
      },
      outerGlow: {
        enabled: true,
        color: "#fb7c59",
        opacity: 0.12,
        size: 0.1,
      },
    },
    content: { shape: "rectangle", width: 4.6, height: 3.5 },
    clip: makeClip("gallery-frame", "Gallery Frame", {
      start: SCENE_ONE_END + 0.04,
      end: SCENE_TWO_END + 0.1,
      transitionIn: { preset: "slideFromRight", duration: 0.62 },
      transitionOut: { preset: "fade", duration: 0.28 },
      keyframes: [
        ...makeNumericKeyframes("gallery-frame-x", "x", [
          [SCENE_ONE_END + 0.04, 2.45, "easeOut"],
          [3.5, 1.3],
          [SCENE_TWO_END, 0.92],
        ]),
        ...makeNumericKeyframes("gallery-frame-y", "y", [
          [SCENE_ONE_END + 0.04, 0.6, "easeOut"],
          [3.5, 0.08],
          [SCENE_TWO_END, -0.18],
        ]),
        ...makeNumericKeyframes("gallery-frame-rotation", "rotation", [
          [SCENE_ONE_END + 0.04, 0.08, "easeOut"],
          [3.5, 0.02],
          [SCENE_TWO_END, -0.05],
        ]),
      ],
    }),
  }),
  makeTextLayer({
    id: "gallery-title",
    name: "Gallery Title",
    text: "GALLERY",
    fontSize: 1.2,
    fontWeight: 720,
    color: "#171717",
    transform: { x: 1.25, y: 0.55, z: 0.22 },
    effects: {
      dropShadow: {
        enabled: true,
        color: "#ffffff",
        opacity: 0.12,
        offsetX: 0.05,
        offsetY: -0.05,
        blur: 0.1,
      },
    },
    clip: makeClip("gallery-title", "Gallery Title", {
      start: SCENE_ONE_END + 0.16,
      end: SCENE_TWO_END + 0.08,
      transitionIn: { preset: "slideFromLeft", duration: 0.6 },
      transitionOut: { preset: "fade", duration: 0.28 },
      keyframes: [
        ...makeNumericKeyframes("gallery-title-x", "x", [
          [SCENE_ONE_END + 0.16, 0.7, "easeOut"],
          [3.65, 1.25],
          [SCENE_TWO_END, 1.72],
        ]),
        ...makeNumericKeyframes("gallery-title-y", "y", [
          [SCENE_ONE_END + 0.16, 0.95, "easeOut"],
          [3.65, 0.55],
          [SCENE_TWO_END, 0.26],
        ]),
      ],
    }),
  }),
  makeTextLayer({
    id: "gallery-copy",
    name: "Gallery Copy",
    text: "Polished surfaces, pale space, and a slower camera settle.",
    fontSize: 0.31,
    fontWeight: 520,
    color: "#475569",
    opacity: 0.84,
    transform: { x: 1.18, y: -1.18, z: 0.14 },
    effects: {
      dropShadow: {
        enabled: true,
        color: "#ffffff",
        opacity: 0.14,
        offsetX: 0.05,
        offsetY: -0.04,
        blur: 0.1,
      },
    },
    clip: makeClip("gallery-copy", "Gallery Copy", {
      start: SCENE_ONE_END + 0.36,
      end: SCENE_TWO_END + 0.05,
      transitionIn: { preset: "fade", duration: 0.52 },
      transitionOut: { preset: "fade", duration: 0.26 },
      keyframes: [
        ...makeNumericKeyframes("gallery-copy-x", "x", [
          [SCENE_ONE_END + 0.36, 0.75, "easeOut"],
          [3.85, 1.18],
          [SCENE_TWO_END, 1.55],
        ]),
        ...makeNumericKeyframes("gallery-copy-opacity", "opacity", [
          [SCENE_ONE_END + 0.36, 0.18, "easeOut"],
          [3.15, 0.84],
          [SCENE_TWO_END, 0.72],
        ]),
      ],
    }),
  }),
  makeModelLayer({
    id: "gallery-orb",
    name: "Gallery Orb",
    color: "#f8fafc",
    transform: { x: -1.3, y: 0.02, z: 0.95 },
    content: {
      kind: "primitive",
      shape: "sphere",
      radius: 1.12,
      radialSegments: 48,
      roughness: 0.1,
      metalness: 0.62,
      emissive: "#fb7185",
      emissiveIntensity: 0.12,
    },
    clip: makeClip("gallery-orb", "Gallery Orb", {
      start: SCENE_ONE_END - 0.02,
      end: SCENE_TWO_END + 0.12,
      transitionIn: { preset: "zoomIn", duration: 0.65 },
      transitionOut: { preset: "fade", duration: 0.3 },
      keyframes: [
        ...makeNumericKeyframes("gallery-orb-x", "x", [
          [SCENE_ONE_END - 0.02, -2.05, "easeOut"],
          [3.45, -1.3],
          [SCENE_TWO_END, -0.7],
        ]),
        ...makeNumericKeyframes("gallery-orb-y", "y", [
          [SCENE_ONE_END - 0.02, 0.42, "easeOut"],
          [3.45, 0.02],
          [SCENE_TWO_END, -0.22],
        ]),
        ...makeNumericKeyframes("gallery-orb-z", "z", [
          [SCENE_ONE_END - 0.02, 0.55, "easeOut"],
          [3.45, 0.95],
          [SCENE_TWO_END, 0.72],
        ]),
        ...makeNumericKeyframes("gallery-orb-rotation-y", "rotationY", [
          [SCENE_ONE_END - 0.02, 0.2, "easeOut"],
          [3.45, 1.55],
          [SCENE_TWO_END, 2.9],
        ]),
      ],
    }),
  }),
  makeTextLayer({
    id: "runway-index",
    name: "Runway Index",
    text: "03 / RUNWAY",
    fontSize: 0.24,
    fontWeight: 620,
    letterSpacing: 0.16,
    color: "#99f6e4",
    opacity: 0.94,
    transform: { x: -3.15, y: 2.35, z: 0.16 },
    effects: {
      dropShadow: {
        enabled: true,
        color: "#020617",
        opacity: 0.32,
        offsetX: 0.08,
        offsetY: -0.06,
        blur: 0.1,
      },
    },
    clip: makeClip("runway-index", "Runway Index", {
      start: SCENE_TWO_END - 0.08,
      end: SCENE_THREE_END + 0.18,
      transitionIn: { preset: "slideFromLeft", duration: 0.55 },
      transitionOut: { preset: "fade", duration: 0.3 },
      keyframes: [
        ...makeNumericKeyframes("runway-index-x", "x", [
          [SCENE_TWO_END - 0.08, -3.8, "easeOut"],
          [5.8, -3.15],
          [SCENE_THREE_END, -2.7],
        ]),
        ...makeNumericKeyframes("runway-index-y", "y", [
          [SCENE_TWO_END - 0.08, 2.6, "easeOut"],
          [5.8, 2.35],
          [SCENE_THREE_END, 2.05],
        ]),
      ],
    }),
  }),
  makeShapeLayer({
    id: "runway-beam",
    name: "Runway Beam",
    color: "#67e8f9",
    opacity: 0.26,
    transform: { x: 0.2, y: 1.52, z: 0.1 },
    effects: {
      outerGlow: {
        enabled: true,
        color: "#67e8f9",
        opacity: 0.26,
        size: 0.18,
      },
    },
    content: { shape: "rectangle", width: 7.2, height: 0.14 },
    clip: makeClip("runway-beam", "Runway Beam", {
      start: SCENE_TWO_END,
      end: SCENE_THREE_END + 0.12,
      transitionIn: { preset: "slideFromTop", duration: 0.55 },
      transitionOut: { preset: "fade", duration: 0.26 },
      keyframes: [
        ...makeNumericKeyframes("runway-beam-y", "y", [
          [SCENE_TWO_END, 2.15, "easeOut"],
          [5.9, 1.52],
          [SCENE_THREE_END, 1.08],
        ]),
        ...makeNumericKeyframes("runway-beam-opacity", "opacity", [
          [SCENE_TWO_END, 0.08, "easeOut"],
          [5.35, 0.26],
          [SCENE_THREE_END, 0.18],
        ]),
      ],
    }),
  }),
  makeModelLayer({
    id: "runway-column",
    name: "Runway Column",
    color: "#dbeafe",
    transform: {
      x: 1.45,
      y: -0.78,
      z: 0.82,
      rotationY: 0.25,
    },
    content: {
      kind: "primitive",
      shape: "cylinder",
      radius: 0.5,
      height: 3.65,
      radialSegments: 48,
      roughness: 0.16,
      metalness: 0.58,
      emissive: "#38bdf8",
      emissiveIntensity: 0.16,
    },
    clip: makeClip("runway-column", "Runway Column", {
      start: SCENE_TWO_END + 0.08,
      end: SCENE_THREE_END + 0.14,
      transitionIn: { preset: "zoomIn", duration: 0.62 },
      transitionOut: { preset: "fade", duration: 0.28 },
      keyframes: [
        ...makeNumericKeyframes("runway-column-x", "x", [
          [SCENE_TWO_END + 0.08, 2.15, "easeOut"],
          [6, 1.45],
          [SCENE_THREE_END, 0.9],
        ]),
        ...makeNumericKeyframes("runway-column-y", "y", [
          [SCENE_TWO_END + 0.08, -1.25, "easeOut"],
          [6, -0.78],
          [SCENE_THREE_END, -0.38],
        ]),
        ...makeNumericKeyframes("runway-column-z", "z", [
          [SCENE_TWO_END + 0.08, 0.42, "easeOut"],
          [6, 0.82],
          [SCENE_THREE_END, 1.18],
        ]),
        ...makeNumericKeyframes("runway-column-rotation-y", "rotationY", [
          [SCENE_TWO_END + 0.08, 0.25, "easeOut"],
          [6, 1.55],
          [SCENE_THREE_END, 2.75],
        ]),
      ],
    }),
  }),
  makeModelLayer({
    id: "runway-spire",
    name: "Runway Spire",
    color: "#f8fafc",
    transform: {
      x: -1.35,
      y: -0.62,
      z: 0.94,
      rotationY: -0.15,
    },
    content: {
      kind: "primitive",
      shape: "cone",
      radius: 0.72,
      height: 2.85,
      radialSegments: 48,
      roughness: 0.1,
      metalness: 0.7,
      emissive: "#67e8f9",
      emissiveIntensity: 0.15,
    },
    clip: makeClip("runway-spire", "Runway Spire", {
      start: SCENE_TWO_END + 0.16,
      end: SCENE_THREE_END + 0.1,
      transitionIn: { preset: "slideFromBottom", duration: 0.58 },
      transitionOut: { preset: "fade", duration: 0.28 },
      keyframes: [
        ...makeNumericKeyframes("runway-spire-x", "x", [
          [SCENE_TWO_END + 0.16, -2.0, "easeOut"],
          [6.1, -1.35],
          [SCENE_THREE_END, -0.82],
        ]),
        ...makeNumericKeyframes("runway-spire-y", "y", [
          [SCENE_TWO_END + 0.16, -1.3, "easeOut"],
          [6.1, -0.62],
          [SCENE_THREE_END, -0.08],
        ]),
        ...makeNumericKeyframes("runway-spire-z", "z", [
          [SCENE_TWO_END + 0.16, 0.52, "easeOut"],
          [6.1, 0.94],
          [SCENE_THREE_END, 1.2],
        ]),
        ...makeNumericKeyframes("runway-spire-rotation-y", "rotationY", [
          [SCENE_TWO_END + 0.16, -0.15, "easeOut"],
          [6.1, -1.6],
          [SCENE_THREE_END, -3.1],
        ]),
      ],
    }),
  }),
  makeTextLayer({
    id: "runway-title",
    name: "Runway Title",
    text: "DEPTH STUDY",
    fontSize: 1.08,
    fontWeight: 720,
    color: "#f8fafc",
    transform: { x: 0.08, y: -2.05, z: 0.18 },
    effects: {
      stroke: {
        enabled: true,
        color: "#020617",
        size: 0.026,
        opacity: 0.5,
      },
      outerGlow: {
        enabled: true,
        color: "#67e8f9",
        opacity: 0.2,
        size: 0.12,
      },
    },
    clip: makeClip("runway-title", "Runway Title", {
      start: SCENE_TWO_END + 0.32,
      end: SCENE_THREE_END + 0.18,
      transitionIn: { preset: "fade", duration: 0.55 },
      transitionOut: { preset: "fade", duration: 0.3 },
      keyframes: [
        ...makeNumericKeyframes("runway-title-x", "x", [
          [SCENE_TWO_END + 0.32, -0.45, "easeOut"],
          [6.2, 0.08],
          [SCENE_THREE_END, 0.48],
        ]),
        ...makeNumericKeyframes("runway-title-y", "y", [
          [SCENE_TWO_END + 0.32, -2.55, "easeOut"],
          [6.2, -2.05],
          [SCENE_THREE_END, -1.58],
        ]),
      ],
    }),
  }),
  makeTextLayer({
    id: "coda-tag",
    name: "Coda Tag",
    text: "SCENE 04 / CODA",
    fontSize: 0.24,
    fontWeight: 620,
    letterSpacing: 0.16,
    color: "#9de7f5",
    transform: { x: -3.1, y: 2.4, z: 0.18 },
    effects: {
      dropShadow: {
        enabled: true,
        color: "#020617",
        opacity: 0.32,
        offsetX: 0.08,
        offsetY: -0.06,
        blur: 0.1,
      },
    },
    clip: makeClip("coda-tag", "Coda Tag", {
      start: SCENE_THREE_END - 0.04,
      end: TOTAL_DURATION,
      transitionIn: { preset: "slideFromLeft", duration: 0.55 },
      keyframes: [
        ...makeNumericKeyframes("coda-tag-x", "x", [
          [SCENE_THREE_END - 0.04, -3.8, "easeOut"],
          [8.2, -3.1],
          [TOTAL_DURATION, -2.6],
        ]),
        ...makeNumericKeyframes("coda-tag-y", "y", [
          [SCENE_THREE_END - 0.04, 2.7, "easeOut"],
          [8.2, 2.4],
          [TOTAL_DURATION, 2.08],
        ]),
      ],
    }),
  }),
  makeTextLayer({
    id: "coda-wordmark",
    name: "Coda Wordmark",
    text: "SIGNAL",
    fontSize: 1.76,
    fontWeight: 720,
    color: "#eef7ff",
    transform: { x: -0.3, y: 0.2, z: 0.24 },
    effects: {
      stroke: {
        enabled: true,
        color: "#071019",
        size: 0.028,
        opacity: 0.54,
      },
      dropShadow: {
        enabled: true,
        color: "#020617",
        opacity: 0.32,
        offsetX: 0.15,
        offsetY: -0.14,
        blur: 0.22,
      },
      outerGlow: {
        enabled: true,
        color: "#67e8f9",
        opacity: 0.22,
        size: 0.14,
      },
    },
    clip: makeClip("coda-wordmark", "Coda Wordmark", {
      start: SCENE_THREE_END + 0.08,
      end: TOTAL_DURATION,
      transitionIn: { preset: "zoomIn", duration: 0.7 },
      keyframes: [
        ...makeNumericKeyframes("coda-wordmark-x", "x", [
          [SCENE_THREE_END + 0.08, -0.9, "easeOut"],
          [8.3, -0.3],
          [TOTAL_DURATION, 0.18],
        ]),
        ...makeNumericKeyframes("coda-wordmark-y", "y", [
          [SCENE_THREE_END + 0.08, 0.72, "easeOut"],
          [8.3, 0.2],
          [TOTAL_DURATION, -0.08],
        ]),
        ...makeNumericKeyframes("coda-wordmark-rotation", "rotation", [
          [SCENE_THREE_END + 0.08, -0.05, "easeOut"],
          [8.3, 0],
          [TOTAL_DURATION, 0.03],
        ]),
        ...makeNumericKeyframes("coda-wordmark-scale-x", "scaleX", [
          [SCENE_THREE_END + 0.08, 0.88, "easeOut"],
          [8.3, 1.03],
          [TOTAL_DURATION, 1],
        ]),
        ...makeNumericKeyframes("coda-wordmark-scale-y", "scaleY", [
          [SCENE_THREE_END + 0.08, 0.9, "easeOut"],
          [8.3, 1.03],
          [TOTAL_DURATION, 1],
        ]),
      ],
    }),
  }),
  makeTextLayer({
    id: "coda-subline",
    name: "Coda Subline",
    text: "LENS / MATERIAL / MOTION",
    fontSize: 0.28,
    fontWeight: 600,
    letterSpacing: 0.12,
    color: "#67e8f9",
    opacity: 0.94,
    transform: { x: 0.18, y: -1.4, z: 0.14 },
    effects: {
      dropShadow: {
        enabled: true,
        color: "#020617",
        opacity: 0.26,
        offsetX: 0.08,
        offsetY: -0.06,
        blur: 0.1,
      },
    },
    clip: makeClip("coda-subline", "Coda Subline", {
      start: SCENE_THREE_END + 0.28,
      end: TOTAL_DURATION,
      transitionIn: { preset: "fade", duration: 0.55 },
      keyframes: [
        ...makeNumericKeyframes("coda-subline-x", "x", [
          [SCENE_THREE_END + 0.28, -0.15, "easeOut"],
          [8.45, 0.18],
          [TOTAL_DURATION, 0.48],
        ]),
        ...makeNumericKeyframes("coda-subline-opacity", "opacity", [
          [SCENE_THREE_END + 0.28, 0.2, "easeOut"],
          [8.1, 0.94],
          [TOTAL_DURATION, 0.84],
        ]),
      ],
    }),
  }),
  makeModelLayer({
    id: "coda-orbit",
    name: "Coda Orbit",
    color: "#7dd3fc",
    transform: {
      x: 2.2,
      y: 0,
      z: 1.16,
      rotationX: 1.15,
      rotationY: 0.2,
      rotation: 0.08,
    },
    content: {
      kind: "primitive",
      shape: "torus",
      radius: 1.04,
      tubularRadius: 0.15,
      radialSegments: 48,
      roughness: 0.12,
      metalness: 0.34,
      emissive: "#67e8f9",
      emissiveIntensity: 0.42,
    },
    clip: makeClip("coda-orbit", "Coda Orbit", {
      start: SCENE_THREE_END,
      end: TOTAL_DURATION,
      transitionIn: { preset: "zoomIn", duration: 0.65 },
      keyframes: [
        ...makeNumericKeyframes("coda-orbit-x", "x", [
          [SCENE_THREE_END, 2.9, "easeOut"],
          [8.25, 2.2],
          [TOTAL_DURATION, 1.6],
        ]),
        ...makeNumericKeyframes("coda-orbit-y", "y", [
          [SCENE_THREE_END, 0.55, "easeOut"],
          [8.25, 0],
          [TOTAL_DURATION, -0.32],
        ]),
        ...makeNumericKeyframes("coda-orbit-z", "z", [
          [SCENE_THREE_END, 0.58, "easeOut"],
          [8.25, 1.16],
          [TOTAL_DURATION, 1.48],
        ]),
        ...makeNumericKeyframes("coda-orbit-rotation-x", "rotationX", [
          [SCENE_THREE_END, 0.92, "easeOut"],
          [8.25, 1.45],
          [TOTAL_DURATION, 1.82],
        ]),
        ...makeNumericKeyframes("coda-orbit-rotation-y", "rotationY", [
          [SCENE_THREE_END, 0.2, "easeOut"],
          [8.25, 2.45],
          [TOTAL_DURATION, 4.9],
        ]),
      ],
    }),
  }),
  makeShapeLayer({
    id: "coda-star",
    name: "Coda Star",
    color: "#f8fafc",
    opacity: 0.14,
    transform: { x: 3.05, y: 1.52, z: -0.18, rotation: -0.15 },
    effects: {
      outerGlow: {
        enabled: true,
        color: "#67e8f9",
        opacity: 0.28,
        size: 0.2,
      },
      dropShadow: {
        enabled: true,
        color: "#020617",
        opacity: 0.16,
        offsetX: 0.12,
        offsetY: -0.08,
        blur: 0.12,
      },
    },
    content: { shape: "star", radius: 1.16, innerRadius: 0.5, points: 7 },
    clip: makeClip("coda-star", "Coda Star", {
      start: SCENE_THREE_END + 0.12,
      end: TOTAL_DURATION,
      transitionIn: { preset: "slideFromRight", duration: 0.62 },
      keyframes: [
        ...makeNumericKeyframes("coda-star-x", "x", [
          [SCENE_THREE_END + 0.12, 4.0, "easeOut"],
          [8.4, 3.05],
          [TOTAL_DURATION, 2.45],
        ]),
        ...makeNumericKeyframes("coda-star-y", "y", [
          [SCENE_THREE_END + 0.12, 1.95, "easeOut"],
          [8.4, 1.52],
          [TOTAL_DURATION, 1.12],
        ]),
        ...makeNumericKeyframes("coda-star-rotation", "rotation", [
          [SCENE_THREE_END + 0.12, -0.15, "easeOut"],
          [8.4, 0.65],
          [TOTAL_DURATION, 1.42],
        ]),
      ],
    }),
  }),
];

const defaultScenes: Scene[] = [
  {
    id: "scene-atrium",
    name: "Atrium",
    start: 0,
    end: SCENE_ONE_END,
    background: {
      color: "#100d15",
      accent: "#c98b52",
      animation: "drift",
    },
    camera: {
      ...createDefaultSceneCamera(),
      position: { x: -2.7, y: 0.8, z: 13.1 },
      lookAt: { x: 0.9, y: 0.18, z: 0.45 },
      up: { x: -0.06, y: 1, z: 0.02 },
    },
    transitionToNext: {
      preset: "zoomIn",
      duration: 0.72,
    },
  },
  {
    id: "scene-gallery",
    name: "Gallery",
    start: SCENE_ONE_END,
    end: SCENE_TWO_END,
    background: {
      color: "#efe5d8",
      accent: "#fb7c59",
      animation: "pulse",
    },
    camera: {
      ...createDefaultSceneCamera(),
      position: { x: 1.55, y: 0.18, z: 9.6 },
      lookAt: { x: 0.05, y: 0, z: 0.55 },
      up: { x: 0.02, y: 1, z: 0 },
    },
    transitionToNext: {
      preset: "slideFromLeft",
      duration: 0.68,
    },
  },
  {
    id: "scene-runway",
    name: "Runway",
    start: SCENE_TWO_END,
    end: SCENE_THREE_END,
    background: {
      color: "#08131a",
      accent: "#58d7ef",
      animation: "drift",
    },
    camera: {
      ...createDefaultSceneCamera(),
      position: { x: -2.4, y: 0.55, z: 8.7 },
      lookAt: { x: 0.6, y: -0.18, z: 0.7 },
      up: { x: 0.04, y: 1, z: -0.03 },
    },
    transitionToNext: {
      preset: "slideFromTop",
      duration: 0.74,
    },
  },
  {
    id: "scene-coda",
    name: "Coda",
    start: SCENE_THREE_END,
    end: TOTAL_DURATION,
    background: {
      color: "#08131a",
      accent: "#67e8f9",
      animation: "pulse",
    },
    camera: {
      ...createDefaultSceneCamera(),
      position: { x: 0.42, y: 0.12, z: 7.4 },
      lookAt: { x: 0.65, y: -0.06, z: 0.8 },
      up: { x: 0.02, y: 1, z: 0.05 },
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
    name: "Aurum Motion Suite",
    version: 5,
    width: 1080,
    height: 1080,
    fps: 30,
    duration: TOTAL_DURATION,
    background: "#100d15",
    scenes: structuredClone(defaultScenes),
    layers: structuredClone(defaultLayers),
    assets: [],
    timeline: {
      duration: TOTAL_DURATION,
      fps: 30,
    },
  };
}
