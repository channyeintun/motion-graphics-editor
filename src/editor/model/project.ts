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

export type SceneCameraVector = {
  x: number;
  y: number;
  z: number;
};

export type SceneCamera = {
  position: SceneCameraVector;
  lookAt: SceneCameraVector;
  up: SceneCameraVector;
};

export type SceneCameraPatch = {
  position?: Partial<SceneCameraVector>;
  lookAt?: Partial<SceneCameraVector>;
  up?: Partial<SceneCameraVector>;
};

export type Scene = {
  id: string;
  name: string;
  start: number;
  end: number;
  background: SceneBackground;
  camera: SceneCamera;
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

export type LayerEffectStroke = {
  enabled: boolean;
  color: string;
  size: number;
  opacity: number;
};

export type LayerEffectDropShadow = {
  enabled: boolean;
  color: string;
  opacity: number;
  offsetX: number;
  offsetY: number;
  blur: number;
};

export type LayerEffectOuterGlow = {
  enabled: boolean;
  color: string;
  opacity: number;
  size: number;
};

export type LayerEffects = {
  stroke: LayerEffectStroke;
  dropShadow: LayerEffectDropShadow;
  outerGlow: LayerEffectOuterGlow;
};

export type LayerEffectsPatch = {
  stroke?: Partial<LayerEffectStroke>;
  dropShadow?: Partial<LayerEffectDropShadow>;
  outerGlow?: Partial<LayerEffectOuterGlow>;
};

export type ObjectStyle = {
  color: string;
  effects: LayerEffects;
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

export function createDefaultLayerEffects(): LayerEffects {
  return {
    stroke: {
      enabled: false,
      color: "#ffffff",
      size: 0.06,
      opacity: 0.45,
    },
    dropShadow: {
      enabled: false,
      color: "#0f172a",
      opacity: 0.24,
      offsetX: 0.16,
      offsetY: -0.16,
      blur: 0.18,
    },
    outerGlow: {
      enabled: false,
      color: "#ffffff",
      opacity: 0.18,
      size: 0.16,
    },
  };
}

export function createSceneCameraVector(x = 0, y = 0, z = 10.5): SceneCameraVector {
  return { x, y, z };
}

export function createDefaultSceneCamera(): SceneCamera {
  return {
    position: createSceneCameraVector(0, 0, 10.5),
    lookAt: createSceneCameraVector(0, 0, 0),
    up: createSceneCameraVector(0, 1, 0),
  };
}

export function createDefaultObjectStyle(color = "#ffffff"): ObjectStyle {
  return {
    color,
    effects: createDefaultLayerEffects(),
  };
}

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
