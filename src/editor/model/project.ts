export type LayerType = "text" | "shape" | "image" | "model" | "audio" | "group";

export type Easing = "linear" | "easeIn" | "easeOut" | "easeInOut";

export type TransitionPreset =
  | "none"
  | "fade"
  | "slideFromLeft"
  | "slideFromRight"
  | "slideFromTop"
  | "slideFromBottom"
  | "zoomIn"
  | "zoomOut";

export type BackgroundAnimationPreset = "none" | "drift" | "pulse";

export type SceneTransition = {
  preset: TransitionPreset;
  duration: number;
};

export type SceneBackground = {
  color: string;
  accent: string;
  animation: BackgroundAnimationPreset;
};

export type Scene = {
  id: string;
  name: string;
  start: number;
  end: number;
  background: SceneBackground;
  transitionToNext: SceneTransition;
};

export type AnimatableProperty =
  | "x"
  | "y"
  | "z"
  | "rotationX"
  | "rotationY"
  | "rotation"
  | "scaleX"
  | "scaleY"
  | "scaleZ"
  | "skewX"
  | "skewY"
  | "opacity"
  | "color"
  | "text";

export type Transform = {
  x: number;
  y: number;
  z: number;
  rotationX: number;
  rotationY: number;
  rotation: number;
  scaleX: number;
  scaleY: number;
  scaleZ: number;
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

export const primitiveModelShapes = ["cube", "sphere", "cylinder", "cone", "torus"] as const;

export type PrimitiveModelShape = (typeof primitiveModelShapes)[number];

export type ModelAssetFormat = "glb" | "gltf";

export type ModelAnimationPlayback = "loop" | "once";

export type ModelMaterialContent = {
  roughness?: number;
  metalness?: number;
  emissive?: string;
  emissiveIntensity?: number;
  wireframe?: boolean;
};

export type PrimitiveModelContent = ModelMaterialContent & {
  kind?: "primitive";
  shape: PrimitiveModelShape;
  width?: number;
  height?: number;
  depth?: number;
  radius?: number;
  radialSegments?: number;
  tubularRadius?: number;
};

export type ImportedModelContent = ModelMaterialContent & {
  kind: "asset";
  assetId: string;
  src?: string;
  format: ModelAssetFormat;
  width: number;
  height: number;
  depth: number;
  animationNames: string[];
  activeAnimation?: string;
  animationPlayback?: ModelAnimationPlayback;
  animationSpeed?: number;
};

export type ModelContent = PrimitiveModelContent | ImportedModelContent;

export type ImageContent = {
  assetId: string;
  src?: string;
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

export type ClipTransition = {
  preset: TransitionPreset;
  duration: number;
};

export type Clip = {
  id: string;
  layerId: string;
  name: string;
  start: number;
  end: number;
  enabled: boolean;
  transitionIn: ClipTransition;
  transitionOut: ClipTransition;
  keyframes: Keyframe[];
};

export type Asset = {
  id: string;
  name: string;
  type: "audio" | "image" | "model";
  src?: string;
  fileName?: string;
  mimeType?: string;
  waveform?: number[];
  width?: number;
  height?: number;
  depth?: number;
  format?: ModelAssetFormat;
  animationNames?: string[];
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
  scenes: Scene[];
  layers: Layer[];
  assets: Asset[];
  timeline: Timeline;
};

export function isPrimitiveModelShape(value: unknown): value is PrimitiveModelShape {
  return primitiveModelShapes.some((shape) => shape === value);
}

export function isPrimitiveModelContent(
  content: SceneObject["content"],
): content is PrimitiveModelContent {
  if (!content) {
    return false;
  }

  return "shape" in content && isPrimitiveModelShape(content.shape);
}

export function isImportedModelContent(
  content: SceneObject["content"],
): content is ImportedModelContent {
  if (!content) {
    return false;
  }

  return "assetId" in content && "format" in content;
}

export function isImageContent(content: SceneObject["content"]): content is ImageContent {
  if (!content) {
    return false;
  }

  return (
    "assetId" in content && "width" in content && "height" in content && !("format" in content)
  );
}
