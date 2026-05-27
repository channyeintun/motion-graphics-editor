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

export const previewObjects: PreviewObject[] = [
  {
    id: "headline",
    name: "Headline",
    type: "text",
    x: 0,
    y: 1.8,
    rotation: 0,
    scaleX: 1,
    scaleY: 1,
    opacity: 1,
    color: "#18181b",
    text: "Motion",
    fontSize: 1.1,
  },
  {
    id: "subhead",
    name: "Subhead",
    type: "text",
    x: 0,
    y: 0.75,
    rotation: 0,
    scaleX: 1,
    scaleY: 1,
    opacity: 0.78,
    color: "#475569",
    text: "Three.js preview stage",
    fontSize: 0.38,
  },
  {
    id: "bar",
    name: "Accent Bar",
    type: "shape",
    x: 0,
    y: -1.45,
    rotation: 0,
    scaleX: 1,
    scaleY: 1,
    opacity: 1,
    color: "#7c3aed",
    shape: "rectangle",
    width: 4.2,
    height: 0.48,
  },
  {
    id: "orb",
    name: "Orb",
    type: "shape",
    x: 2.1,
    y: 2.35,
    rotation: 0,
    scaleX: 1,
    scaleY: 1,
    opacity: 0.95,
    color: "#06b6d4",
    shape: "circle",
    radius: 0.44,
  },
];
