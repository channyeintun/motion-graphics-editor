import type { Layer, Project } from "./project";

function makeClip(layerId: string, name: string) {
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
      style: { color: "#18181b" },
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
      style: { color: "#475569" },
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
      style: { color: "#7c3aed" },
      content: { shape: "rectangle", width: 4.2, height: 0.48 },
    },
    clips: [makeClip("bar", "Bar Grow")],
  },
];

export function createDefaultProject(): Project {
  return {
    id: "motion-editor-project",
    name: "Motion Graphics Editor",
    version: 1,
    width: 1080,
    height: 1080,
    fps: 30,
    duration: 5,
    background: "#f3efe3",
    layers: structuredClone(defaultLayers),
    assets: [],
    timeline: {
      duration: 5,
      fps: 30,
    },
  };
}
