import type { Layer } from "./project";

export type PreviewObjectType = "text" | "shape" | "image";

export type PreviewObject = {
  id: string;
  name: string;
  type: PreviewObjectType;
  locked: boolean;
  x: number;
  y: number;
  rotation: number;
  scaleX: number;
  scaleY: number;
  opacity: number;
  color: string;
  text?: string;
  fontSize?: number;
  shape?: "rectangle" | "circle";
  width?: number;
  height?: number;
  radius?: number;
  src?: string;
};

export function toPreviewObject(layer: Layer, includeHidden = false): PreviewObject | null {
  if (!includeHidden && !layer.visible) {
    return null;
  }

  const { object } = layer;

  if (layer.type === "text" && object.content && "value" in object.content) {
    return {
      id: layer.id,
      name: layer.name,
      type: "text",
      locked: layer.locked,
      x: object.transform.x,
      y: object.transform.y,
      rotation: object.transform.rotation,
      scaleX: object.transform.scaleX,
      scaleY: object.transform.scaleY,
      opacity: object.opacity,
      color: object.style.color,
      text: object.content.value,
      fontSize: object.content.fontSize,
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
      rotation: object.transform.rotation,
      scaleX: object.transform.scaleX,
      scaleY: object.transform.scaleY,
      opacity: object.opacity,
      color: object.style.color,
      shape: object.content.shape,
      width: object.content.width,
      height: object.content.height,
      radius: object.content.radius,
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
      rotation: object.transform.rotation,
      scaleX: object.transform.scaleX,
      scaleY: object.transform.scaleY,
      opacity: object.opacity,
      color: object.style.color,
      width: object.content.width,
      height: object.content.height,
      src: object.content.src,
    };
  }

  return null;
}
