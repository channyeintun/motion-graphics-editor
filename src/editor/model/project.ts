export type LayerType = "text" | "shape" | "image" | "model" | "audio" | "group";

export type Easing = "linear" | "easeIn" | "easeOut" | "easeInOut";

export type AnimatableProperty =
  | "x"
  | "y"
  | "rotation"
  | "scaleX"
  | "scaleY"
  | "skewX"
  | "skewY"
  | "opacity"
  | "color"
  | "text";

export type Transform = {
  x: number;
  y: number;
  rotation: number;
  scaleX: number;
  scaleY: number;
  skewX: number;
  skewY: number;
};

export type TextContent = {
  value: string;
  fontSize: number;
  fontWeight?: number;
  letterSpacing?: number;
};

export type ShapeContent = {
  shape: "rectangle" | "circle" | "triangle" | "star" | "polygon";
  width?: number;
  height?: number;
  radius?: number;
  sides?: number;
  points?: number;
  innerRadius?: number;
};

export type ModelContent = {
  shape: "cube" | "sphere" | "cylinder" | "cone" | "torus";
  width?: number;
  height?: number;
  depth?: number;
  radius?: number;
  radialSegments?: number;
  tubularRadius?: number;
  roughness?: number;
  metalness?: number;
  emissive?: string;
  emissiveIntensity?: number;
  wireframe?: boolean;
};

export type ImageContent = {
  assetId: string;
  src: string;
  width: number;
  height: number;
};

export type AudioContent = {
  assetId: string;
};

export type ObjectStyle = {
  color: string;
};

export type SceneObject = {
  id: string;
  transform: Transform;
  opacity: number;
  style: ObjectStyle;
  content?: TextContent | ShapeContent | ImageContent | AudioContent | ModelContent;
};

export type Keyframe = {
  id: string;
  time: number;
  property: AnimatableProperty;
  value: number | string;
  easing: Easing;
};

export type Clip = {
  id: string;
  layerId: string;
  name: string;
  start: number;
  end: number;
  enabled: boolean;
  keyframes: Keyframe[];
};

export type Asset = {
  id: string;
  name: string;
  type: "audio" | "image";
  src: string;
  waveform?: number[];
  width?: number;
  height?: number;
};

export type Layer = {
  id: string;
  name: string;
  type: LayerType;
  visible: boolean;
  locked: boolean;
  object: SceneObject;
  clips: Clip[];
};

export type Timeline = {
  duration: number;
  fps: number;
};

export type Project = {
  id: string;
  name: string;
  version: number;
  width: number;
  height: number;
  fps: number;
  duration: number;
  background: string;
  layers: Layer[];
  assets: Asset[];
  timeline: Timeline;
};
