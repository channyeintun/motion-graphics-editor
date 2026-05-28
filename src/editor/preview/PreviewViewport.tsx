import { Text, useTexture } from "@react-three/drei";
import { Canvas, type ThreeEvent } from "@react-three/fiber";
import { useMemo, useState } from "react";
import type { PreviewObject } from "../model/preview";

type PreviewViewportProps = {
  objects: PreviewObject[];
  selectedId: string | null;
  onSelect: (id: string | null) => void;
  onMove: (id: string, nextX: number, nextY: number) => void;
  interactionMode?: "select" | "pan";
  showGuides?: boolean;
  onCanvasReady?: (canvas: HTMLCanvasElement) => void;
};

type DragState =
  | {
      type: "move";
      id: string;
      offsetX: number;
      offsetY: number;
    }
  | {
      type: "pan";
      startX: number;
      startY: number;
      originX: number;
      originY: number;
    };

export function PreviewViewport({
  objects,
  selectedId,
  onSelect,
  onMove,
  interactionMode = "select",
  showGuides = true,
  onCanvasReady,
}: PreviewViewportProps) {
  const [dragState, setDragState] = useState<DragState | null>(null);
  const [viewportOffset, setViewportOffset] = useState({ x: 0, y: 0 });
  const selectedObject = objects.find((object) => object.id === selectedId) ?? null;

  const guideLines = useMemo(
    () => [
      { position: [0, 0, 0.1] as const, scale: [8.5, 0.02, 1] as const },
      { position: [0, 0, 0.1] as const, scale: [0.02, 8.5, 1] as const },
    ],
    [],
  );

  const handlePointerMove = (event: ThreeEvent<PointerEvent>) => {
    if (!dragState) {
      return;
    }

    if (dragState.type === "pan") {
      setViewportOffset({
        x: clamp(dragState.originX + (event.point.x - dragState.startX), -2.4, 2.4),
        y: clamp(dragState.originY + (event.point.y - dragState.startY), -2.2, 2.2),
      });
      return;
    }

    const nextX = clamp(event.point.x + dragState.offsetX - viewportOffset.x, -4.25, 4.25);
    const nextY = clamp(event.point.y + dragState.offsetY - viewportOffset.y, -4.25, 4.25);
    onMove(dragState.id, snapToCenter(nextX), snapToCenter(nextY));
  };

  const stopDragging = () => {
    if (dragState) {
      setDragState(null);
    }
  };

  return (
    <div className="relative flex h-full min-h-[66vh] items-center justify-center p-8 pt-14 md:p-10 md:pt-16 lg:p-12 lg:pt-18">
      <div className="relative aspect-[16/9] w-full max-w-[1320px] rounded-[38px] border-[12px] border-black bg-[#f3efe3] shadow-[0_40px_100px_rgba(0,0,0,0.5)]">
        <div className="absolute inset-0 rounded-[26px] border border-black/10" />
        <Canvas
          orthographic
          camera={{ position: [0, 0, 20], zoom: 72 }}
          dpr={[1, 2]}
          className="rounded-[26px]"
          onCreated={(state) => {
            onCanvasReady?.(state.gl.domElement);
          }}
          onPointerUp={stopDragging}
          onPointerLeave={stopDragging}
        >
          <color attach="background" args={["#f3efe3"]} />
          <ambientLight intensity={1.4} />
          <directionalLight position={[2, 4, 10]} intensity={0.65} />

          <mesh
            position={[0, 0, -0.1]}
            onPointerDown={(event) => {
              if (interactionMode === "pan") {
                setDragState({
                  type: "pan",
                  startX: event.point.x,
                  startY: event.point.y,
                  originX: viewportOffset.x,
                  originY: viewportOffset.y,
                });
                return;
              }

              onSelect(null);
            }}
            onPointerMove={handlePointerMove}
          >
            <planeGeometry args={[9.2, 9.2]} />
            <meshBasicMaterial transparent opacity={0} />
          </mesh>

          <group position={[viewportOffset.x, viewportOffset.y, 0]}>
            {showGuides
              ? guideLines.map((guideLine, index) => (
                  <mesh key={index} position={guideLine.position} scale={guideLine.scale}>
                    <planeGeometry args={[1, 1]} />
                    <meshBasicMaterial color="#1f2937" transparent opacity={0.08} />
                  </mesh>
                ))
              : null}

            {objects.map((object) => (
              <PreviewNode
                key={object.id}
                object={object}
                selected={object.id === selectedId}
                onPointerDown={(event) => {
                  event.stopPropagation();
                  onSelect(object.id);

                  if (interactionMode !== "select" || object.locked) {
                    return;
                  }

                  setDragState({
                    type: "move",
                    id: object.id,
                    offsetX: object.x - (event.point.x - viewportOffset.x),
                    offsetY: object.y - (event.point.y - viewportOffset.y),
                  });
                }}
              />
            ))}
          </group>
        </Canvas>

        {selectedObject ? (
          <div className="pointer-events-none absolute bottom-4 left-4 rounded-2xl border border-black/10 bg-white/80 px-3 py-2 text-xs text-slate-700 backdrop-blur">
            <span className="font-semibold text-slate-900">{selectedObject.name}</span>
            <span className="ml-2">
              X {selectedObject.x.toFixed(2)} Y {selectedObject.y.toFixed(2)}
            </span>
            {selectedObject.locked ? <span className="ml-2 text-slate-500">Locked</span> : null}
          </div>
        ) : null}
      </div>
    </div>
  );
}

type PreviewNodeProps = {
  object: PreviewObject;
  selected: boolean;
  onPointerDown: (event: ThreeEvent<PointerEvent>) => void;
};

type PreviewContentProps = {
  object: PreviewObject;
  onPointerDown: (event: ThreeEvent<PointerEvent>) => void;
};

function PreviewNode({ object, selected, onPointerDown }: PreviewNodeProps) {
  return (
    <group
      position={[object.x, object.y, 0.5]}
      rotation={[0, 0, object.rotation]}
      scale={[object.scaleX, object.scaleY, 1]}
    >
      {selected ? <SelectionFrame object={object} /> : null}
      {object.type === "text" ? (
        <PreviewText object={object} onPointerDown={onPointerDown} />
      ) : null}
      {object.type === "shape" ? (
        <PreviewShape object={object} onPointerDown={onPointerDown} />
      ) : null}
      {object.type === "image" ? (
        <PreviewImage object={object} onPointerDown={onPointerDown} />
      ) : null}
    </group>
  );
}

function PreviewText({ object, onPointerDown }: PreviewContentProps) {
  return (
    <Text
      position={[0, 0, 0.3]}
      fontSize={object.fontSize ?? 0.9}
      color={object.color}
      anchorX="center"
      anchorY="middle"
      fillOpacity={object.opacity}
      outlineBlur={0.008}
      outlineWidth={0.012}
      outlineColor="rgba(255,255,255,0.4)"
      onPointerDown={onPointerDown}
    >
      {object.text}
    </Text>
  );
}

function PreviewShape({ object, onPointerDown }: PreviewContentProps) {
  const materialProps = {
    color: object.color,
    transparent: true,
    opacity: object.opacity,
  };

  if (object.shape === "circle") {
    return (
      <mesh onPointerDown={onPointerDown}>
        <circleGeometry args={[object.radius ?? 0.48, 64]} />
        <meshStandardMaterial {...materialProps} />
      </mesh>
    );
  }

  return (
    <mesh onPointerDown={onPointerDown}>
      <planeGeometry args={[object.width ?? 2.8, object.height ?? 1.1]} />
      <meshStandardMaterial {...materialProps} />
    </mesh>
  );
}

function PreviewImage({ object, onPointerDown }: PreviewContentProps) {
  const texture = useTexture(object.src ?? "");

  return (
    <mesh onPointerDown={onPointerDown}>
      <planeGeometry args={[object.width ?? 2.4, object.height ?? 1.35]} />
      <meshBasicMaterial
        map={texture}
        color={object.color}
        transparent
        opacity={object.opacity}
        toneMapped={false}
      />
    </mesh>
  );
}

function SelectionFrame({ object }: { object: PreviewObject }) {
  const bounds = getObjectBounds(object);

  return (
    <mesh position={[0, 0, 0.1]}>
      <planeGeometry args={[bounds.width, bounds.height]} />
      <meshBasicMaterial color="#7c3aed" transparent opacity={0.12} wireframe />
    </mesh>
  );
}

function getObjectBounds(object: PreviewObject) {
  if (object.type === "shape") {
    if (object.shape === "circle") {
      const size = (object.radius ?? 0.48) * 2.5;
      return { width: size, height: size };
    }

    return {
      width: (object.width ?? 2.8) + 0.35,
      height: (object.height ?? 1.1) + 0.35,
    };
  }

  if (object.type === "image") {
    return {
      width: (object.width ?? 2.4) + 0.2,
      height: (object.height ?? 1.35) + 0.2,
    };
  }

  const fontSize = object.fontSize ?? 0.9;
  const charCount = object.text?.length ?? 8;
  return {
    width: Math.max(1.8, charCount * fontSize * 0.42),
    height: fontSize + 0.3,
  };
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function snapToCenter(value: number) {
  return Math.abs(value) < 0.12 ? 0 : value;
}
