import {
  createDefaultObjectStyle,
  createDefaultSceneCamera,
  type Clip,
  type Layer,
  type LayerEffectsPatch,
  type Project,
  type Scene,
} from "./project";

function makeClip(layerId: string, name: string): Clip {
  return {
    id: `${layerId}-clip`,
    layerId,
    name,
    start: 0,
    end: 5,
    enabled: true,
    transitionIn: { preset: "none", duration: 0.6 },
    transitionOut: { preset: "none", duration: 0.6 },
    keyframes: [],
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

const defaultLayers: Layer[] = [
  {
    id: "headline",
    name: "Headline",
    type: "text",
    visible: true,
    locked: false,
    object: {
      id: "headline-object",
      transform: {
        x: 0,
        y: 1.8,
        z: 0,
        rotationX: 0,
        rotationY: 0,
        rotation: 0,
        scaleX: 1,
        scaleY: 1,
        scaleZ: 1,
        skewX: 0,
        skewY: 0,
      },
      opacity: 1,
      style: makeStyle("#18181b", {
        stroke: {
          enabled: true,
          color: "#fff7ed",
          size: 0.022,
          opacity: 0.58,
        },
        dropShadow: {
          enabled: true,
          color: "#334155",
          opacity: 0.18,
          offsetX: 0.12,
          offsetY: -0.1,
          blur: 0.18,
        },
        outerGlow: {
          enabled: true,
          color: "#f8fafc",
          opacity: 0.12,
          size: 0.08,
        },
      }),
      content: { value: "Motion", fontSize: 1.1, fontWeight: 600, letterSpacing: 0 },
    },
    clips: [makeClip("headline", "Headline In")],
  },
  {
    id: "subhead",
    name: "Subhead",
    type: "text",
    visible: true,
    locked: false,
    object: {
      id: "subhead-object",
      transform: {
        x: 0,
        y: 0.75,
        z: 0,
        rotationX: 0,
        rotationY: 0,
        rotation: 0,
        scaleX: 1,
        scaleY: 1,
        scaleZ: 1,
        skewX: 0,
        skewY: 0,
      },
      opacity: 0.78,
      style: makeStyle("#475569", {
        dropShadow: {
          enabled: true,
          color: "#e2e8f0",
          opacity: 0.12,
          offsetX: 0.08,
          offsetY: -0.08,
          blur: 0.14,
        },
      }),
      content: {
        value: "Three.js preview stage",
        fontSize: 0.38,
        fontWeight: 400,
        letterSpacing: 0,
      },
    },
    clips: [makeClip("subhead", "Subhead Hold")],
  },
  {
    id: "bar",
    name: "Accent Bar",
    type: "shape",
    visible: true,
    locked: false,
    object: {
      id: "bar-object",
      transform: {
        x: 0,
        y: -1.45,
        z: 0,
        rotationX: 0,
        rotationY: 0,
        rotation: 0,
        scaleX: 1,
        scaleY: 1,
        scaleZ: 1,
        skewX: 0,
        skewY: 0,
      },
      opacity: 1,
      style: makeStyle("#7c3aed", {
        dropShadow: {
          enabled: true,
          color: "#312e81",
          opacity: 0.2,
          offsetX: 0.12,
          offsetY: -0.1,
          blur: 0.16,
        },
        outerGlow: {
          enabled: true,
          color: "#a78bfa",
          opacity: 0.32,
          size: 0.22,
        },
      }),
      content: { shape: "rectangle", width: 4.2, height: 0.48 },
    },
    clips: [makeClip("bar", "Bar Grow")],
  },
];

const defaultScenes: Scene[] = [
  {
    id: "scene-intro",
    name: "Intro",
    start: 0,
    end: 2.5,
    background: {
      color: "#f3efe3",
      accent: "#d8c7a7",
      animation: "drift",
    },
    camera: {
      ...createDefaultSceneCamera(),
      position: { x: -0.9, y: 0.65, z: 11.4 },
      lookAt: { x: 0, y: 0.4, z: 0 },
      up: { x: -0.05, y: 1, z: 0.02 },
    },
    transitionToNext: {
      preset: "slideFromRight",
      duration: 0.8,
    },
  },
  {
    id: "scene-reveal",
    name: "Reveal",
    start: 2.5,
    end: 5,
    background: {
      color: "#dbeafe",
      accent: "#8b5cf6",
      animation: "pulse",
    },
    camera: {
      ...createDefaultSceneCamera(),
      position: { x: 1.35, y: -0.2, z: 9.8 },
      lookAt: { x: 0, y: -0.1, z: 0 },
      up: { x: 0.04, y: 1, z: 0 },
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
    name: "Motion Graphics Editor",
    version: 5,
    width: 1080,
    height: 1080,
    fps: 30,
    duration: 5,
    background: "#f3efe3",
    scenes: structuredClone(defaultScenes),
    layers: structuredClone(defaultLayers),
    assets: [],
    timeline: {
      duration: 5,
      fps: 30,
    },
  };
}
