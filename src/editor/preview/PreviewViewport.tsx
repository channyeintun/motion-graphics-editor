import { Text } from "@react-three/drei";
import { Canvas, type ThreeEvent } from "@react-three/fiber";
import { useMemo, useState } from "react";
import type { PreviewObject } from "../model/preview";

type PreviewViewportProps = {
  objects: PreviewObject[];
  selectedId: string | null;
  onSelect: (id: string | null) => void;
  onMove: (id: string, nextX: number, nextY: number) => void;
  onCanvasReady?: (canvas: HTMLCanvasElement) => void;
};

type DragState = {
  id: string;
  offsetX: number;
  offsetY: number;
};

export function PreviewViewport({
  objects,
  selectedId,
  onSelect,
  onMove,
  onCanvasReady,
}: PreviewViewportProps) {
  const [dragState, setDragState] = useState<DragState | null>(null);
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

    const nextX = clamp(event.point.x + dragState.offsetX, -4.25, 4.25);
    const nextY = clamp(event.point.y + dragState.offsetY, -4.25, 4.25);
    onMove(dragState.id, snapToCenter(nextX), snapToCenter(nextY));
  };

  const stopDragging = () => {
    if (dragState) {
      setDragState(null);
    }
  };

  return (
    <div className="relative flex h-full items-center justify-center bg-[radial-gradient(circle_at_top,_rgba(124,58,237,0.25),_transparent_35%),linear-gradient(180deg,_#141824,_#0b0e15)] p-6">
      <div className="relative aspect-square w-full max-w-[720px] rounded-[36px] border-[14px] border-black bg-[#f3efe3] shadow-[0_40px_80px_rgba(0,0,0,0.55)]">
        <div className="absolute inset-0 rounded-[22px] border border-black/10" />
        <Canvas
          orthographic
          camera={{ position: [0, 0, 20], zoom: 72 }}
          dpr={[1, 2]}
          className="rounded-[22px]"
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
            onPointerDown={() => onSelect(null)}
            onPointerMove={handlePointerMove}
          >
            <planeGeometry args={[9.2, 9.2]} />
            <meshBasicMaterial transparent opacity={0} />
          </mesh>

          {guideLines.map((guideLine, index) => (
            <mesh key={index} position={guideLine.position} scale={guideLine.scale}>
              <planeGeometry args={[1, 1]} />
              <meshBasicMaterial color="#1f2937" transparent opacity={0.08} />
            </mesh>
          ))}

          {objects.map((object) => (
            <PreviewNode
              key={object.id}
              object={object}
              selected={object.id === selectedId}
              onPointerDown={(event) => {
                event.stopPropagation();
                onSelect(object.id);
                setDragState({
                  id: object.id,
                  offsetX: object.x - event.point.x,
                  offsetY: object.y - event.point.y,
                });
              }}
            />
          ))}
        </Canvas>

        {selectedObject ? (
          <div className="pointer-events-none absolute bottom-4 left-4 rounded-2xl border border-black/10 bg-white/75 px-3 py-2 text-xs text-slate-700 backdrop-blur">
            <span className="font-semibold text-slate-900">{selectedObject.name}</span>
            <span className="ml-2">
              X {selectedObject.x.toFixed(2)} Y {selectedObject.y.toFixed(2)}
            </span>
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
