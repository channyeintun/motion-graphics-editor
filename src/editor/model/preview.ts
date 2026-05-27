import type { Layer } from "./project";

export type PreviewObjectType = "text" | "shape";

export type PreviewObject = {
  id: string;
  name: string;
  type: PreviewObjectType;
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
};

export function toPreviewObject(layer: Layer): PreviewObject | null {
  const { object } = layer;

  if (layer.type === "text" && object.content && "value" in object.content) {
    return {
      id: layer.id,
      name: layer.name,
      type: "text",
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

  return null;
}
