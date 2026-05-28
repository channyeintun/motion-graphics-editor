import { isImportedModelContent, isPrimitiveModelContent } from "./project";
import type { Layer, ModelAnimationPlayback, ModelAssetFormat } from "./project";

export type PreviewObjectType = "text" | "shape" | "image" | "model";

export type PreviewObject = {
  id: string;
  name: string;
  type: PreviewObjectType;
  locked: boolean;
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
  opacity: number;
  color: string;
  clipStart?: number;
  clipEnd?: number;
  text?: string;
  fontSize?: number;
  fontWeight?: number;
  letterSpacing?: number;
  shape?:
    | "rectangle"
    | "circle"
    | "triangle"
    | "star"
    | "polygon"
    | "cube"
    | "sphere"
    | "cylinder"
    | "cone"
    | "torus";
  width?: number;
  height?: number;
  depth?: number;
  radius?: number;
  sides?: number;
  points?: number;
  innerRadius?: number;
  radialSegments?: number;
  tubularRadius?: number;
  roughness?: number;
  metalness?: number;
  emissive?: string;
  emissiveIntensity?: number;
  wireframe?: boolean;
  src?: string;
  modelFormat?: ModelAssetFormat;
  animationNames?: string[];
  activeAnimation?: string;
  animationPlayback?: ModelAnimationPlayback;
  animationSpeed?: number;
};

export function toPreviewObject(
  layer: Layer,
  includeHidden = false,
  currentTime?: number,
): PreviewObject | null {
  if (!includeHidden && !layer.visible) {
    return null;
  }

  const { object } = layer;
  const activeClip = getActiveClip(layer, currentTime);

  if (layer.type === "text" && object.content && "value" in object.content) {
    return {
      id: layer.id,
      name: layer.name,
      type: "text",
      locked: layer.locked,
      x: object.transform.x,
      y: object.transform.y,
      z: object.transform.z,
      rotationX: object.transform.rotationX,
      rotationY: object.transform.rotationY,
      rotation: object.transform.rotation,
      scaleX: object.transform.scaleX,
      scaleY: object.transform.scaleY,
      scaleZ: object.transform.scaleZ,
      skewX: object.transform.skewX,
      skewY: object.transform.skewY,
      opacity: object.opacity,
      color: object.style.color,
      text: object.content.value,
      fontSize: object.content.fontSize,
      fontWeight: object.content.fontWeight,
      letterSpacing: object.content.letterSpacing,
    };
  }

  if (layer.type === "shape" && object.content && "shape" in object.content) {
    return {
      id: layer.id,
      name: layer.name,
      type: "shape",
      locked: layer.locked,
      x: object.transform.x,
      y: object.transform.y,
      z: object.transform.z,
      rotationX: object.transform.rotationX,
      rotationY: object.transform.rotationY,
      rotation: object.transform.rotation,
      scaleX: object.transform.scaleX,
      scaleY: object.transform.scaleY,
      scaleZ: object.transform.scaleZ,
      skewX: object.transform.skewX,
      skewY: object.transform.skewY,
      opacity: object.opacity,
      color: object.style.color,
      clipStart: activeClip?.start,
      clipEnd: activeClip?.end,
      shape: object.content.shape,
      width: "width" in object.content ? object.content.width : undefined,
      height: "height" in object.content ? object.content.height : undefined,
      radius: "radius" in object.content ? object.content.radius : undefined,
      sides: "sides" in object.content ? object.content.sides : undefined,
      points: "points" in object.content ? object.content.points : undefined,
      innerRadius: "innerRadius" in object.content ? object.content.innerRadius : undefined,
    };
  }

  if (layer.type === "model" && isPrimitiveModelContent(object.content)) {
    return {
      id: layer.id,
      name: layer.name,
      type: "model",
      locked: layer.locked,
      x: object.transform.x,
      y: object.transform.y,
      z: object.transform.z,
      rotationX: object.transform.rotationX,
      rotationY: object.transform.rotationY,
      rotation: object.transform.rotation,
      scaleX: object.transform.scaleX,
      scaleY: object.transform.scaleY,
      scaleZ: object.transform.scaleZ,
      skewX: object.transform.skewX,
      skewY: object.transform.skewY,
      opacity: object.opacity,
      color: object.style.color,
      shape: object.content.shape,
      width: "width" in object.content ? object.content.width : undefined,
      height: "height" in object.content ? object.content.height : undefined,
      depth: "depth" in object.content ? object.content.depth : undefined,
      radius: "radius" in object.content ? object.content.radius : undefined,
      radialSegments:
        "radialSegments" in object.content ? object.content.radialSegments : undefined,
      tubularRadius: "tubularRadius" in object.content ? object.content.tubularRadius : undefined,
      roughness: "roughness" in object.content ? object.content.roughness : undefined,
      metalness: "metalness" in object.content ? object.content.metalness : undefined,
      emissive: "emissive" in object.content ? object.content.emissive : undefined,
      emissiveIntensity:
        "emissiveIntensity" in object.content ? object.content.emissiveIntensity : undefined,
      wireframe: "wireframe" in object.content ? object.content.wireframe : undefined,
    };
  }

  if (layer.type === "model" && isImportedModelContent(object.content)) {
    return {
      id: layer.id,
      name: layer.name,
      type: "model",
      locked: layer.locked,
      x: object.transform.x,
      y: object.transform.y,
      z: object.transform.z,
      rotationX: object.transform.rotationX,
      rotationY: object.transform.rotationY,
      rotation: object.transform.rotation,
      scaleX: object.transform.scaleX,
      scaleY: object.transform.scaleY,
      scaleZ: object.transform.scaleZ,
      skewX: object.transform.skewX,
      skewY: object.transform.skewY,
      opacity: object.opacity,
      color: object.style.color,
      clipStart: activeClip?.start,
      clipEnd: activeClip?.end,
      width: object.content.width,
      height: object.content.height,
      depth: object.content.depth,
      roughness: object.content.roughness,
      metalness: object.content.metalness,
      emissive: object.content.emissive,
      emissiveIntensity: object.content.emissiveIntensity,
      wireframe: object.content.wireframe,
      src: object.content.src,
      modelFormat: object.content.format,
      animationNames: object.content.animationNames,
      activeAnimation: object.content.activeAnimation,
      animationPlayback: object.content.animationPlayback,
      animationSpeed: object.content.animationSpeed,
    };
  }

  if (
    layer.type === "image" &&
    object.content &&
    "assetId" in object.content &&
    "src" in object.content
  ) {
    return {
      id: layer.id,
      name: layer.name,
      type: "image",
      locked: layer.locked,
      x: object.transform.x,
      y: object.transform.y,
      z: object.transform.z,
      rotationX: object.transform.rotationX,
      rotationY: object.transform.rotationY,
      rotation: object.transform.rotation,
      scaleX: object.transform.scaleX,
      scaleY: object.transform.scaleY,
      scaleZ: object.transform.scaleZ,
      skewX: object.transform.skewX,
      skewY: object.transform.skewY,
      opacity: object.opacity,
      color: object.style.color,
      width: object.content.width,
      height: object.content.height,
      src: object.content.src,
    };
  }

  return null;
}

function getActiveClip(layer: Layer, currentTime: number | undefined) {
  if (typeof currentTime !== "number") {
    return layer.clips[0] ?? null;
  }

  return (
    layer.clips.find(
      (clip) => clip.enabled && currentTime >= clip.start && currentTime <= clip.end,
    ) ??
    layer.clips[0] ??
    null
  );
}
