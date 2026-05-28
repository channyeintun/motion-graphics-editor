import { OrbitControls, Text, useTexture } from "@react-three/drei";
import { Canvas, type ThreeEvent } from "@react-three/fiber";
import { useMemo, useState } from "react";
import * as THREE from "three";
import { useSelector } from "@xstate/store-react";
import { viewportStore } from "../store/viewportStore";
import type { PreviewObject } from "../model/preview";

type PreviewViewportProps = {
  objects: PreviewObject[];
  selectedId: string | null;
  onSelect: (id: string | null) => void;
  onMove: (id: string, nextX: number, nextY: number) => void;
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
  showGuides = true,
  onCanvasReady,
}: PreviewViewportProps) {
  const interactionMode = useSelector(viewportStore, (state) => state.context.interactionMode);
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

          {interactionMode === "orbit" ? (
            <OrbitControls makeDefault enableDamping dampingFactor={0.05} />
          ) : null}

          {interactionMode !== "orbit" ? (
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
          ) : null}

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
      position={[object.x, object.y, object.type === "model" ? 0.65 : 0.5]}
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
      {object.type === "model" ? (
        <PreviewModel object={object} onPointerDown={onPointerDown} />
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

  const starShape = useMemo(() => {
    if (object.shape !== "star") return new THREE.Shape();
    const shape = new THREE.Shape();
    const points = object.points ?? 5;
    const outerRad = object.radius ?? 0.8;
    const innerRad = object.innerRadius ?? 0.38;
    const step = Math.PI / points;

    let rot = (Math.PI / 2) * 3;

    shape.moveTo(Math.cos(rot) * outerRad, Math.sin(rot) * outerRad);
    for (let i = 0; i < points; i++) {
      const x1 = Math.cos(rot) * outerRad;
      const y1 = Math.sin(rot) * outerRad;
      shape.lineTo(x1, y1);
      rot += step;

      const x2 = Math.cos(rot) * innerRad;
      const y2 = Math.sin(rot) * innerRad;
      shape.lineTo(x2, y2);
      rot += step;
    }
    return shape;
  }, [object.shape, object.points, object.radius, object.innerRadius]);

  if (object.shape === "circle") {
    return (
      <mesh onPointerDown={onPointerDown}>
        <circleGeometry args={[object.radius ?? 0.58, 64]} />
        <meshStandardMaterial {...materialProps} />
      </mesh>
    );
  }

  if (object.shape === "triangle") {
    return (
      <mesh onPointerDown={onPointerDown}>
        <circleGeometry args={[object.radius ?? 0.8, 3]} />
        <meshStandardMaterial {...materialProps} />
      </mesh>
    );
  }

  if (object.shape === "polygon") {
    return (
      <mesh onPointerDown={onPointerDown}>
        <circleGeometry args={[object.radius ?? 0.8, object.sides ?? 6]} />
        <meshStandardMaterial {...materialProps} />
      </mesh>
    );
  }

  if (object.shape === "star") {
    return (
      <mesh onPointerDown={onPointerDown}>
        <shapeGeometry args={[starShape]} />
        <meshStandardMaterial {...materialProps} />
      </mesh>
    );
  }

  return (
    <mesh onPointerDown={onPointerDown}>
      <planeGeometry args={[object.width ?? 2.2, object.height ?? 0.8]} />
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

function PreviewModel({ object, onPointerDown }: PreviewContentProps) {
  const materialProps = {
    color: object.color,
    transparent: true,
    opacity: object.opacity,
    roughness: 0.4,
    metalness: 0.1,
  };

  if (object.shape === "cube") {
    return (
      <mesh onPointerDown={onPointerDown}>
        <boxGeometry args={[object.width ?? 1.3, object.height ?? 1.3, object.depth ?? 1.3]} />
        <meshStandardMaterial {...materialProps} />
      </mesh>
    );
  }

  if (object.shape === "sphere") {
    return (
      <mesh onPointerDown={onPointerDown}>
        <sphereGeometry args={[object.radius ?? 0.8, object.radialSegments ?? 32, 32]} />
        <meshStandardMaterial {...materialProps} />
      </mesh>
    );
  }

  if (object.shape === "cylinder") {
    return (
      <mesh onPointerDown={onPointerDown}>
        <cylinderGeometry
          args={[
            object.radius ?? 0.6,
            object.radius ?? 0.6,
            object.height ?? 1.4,
            object.radialSegments ?? 32,
          ]}
        />
        <meshStandardMaterial {...materialProps} />
      </mesh>
    );
  }

  if (object.shape === "cone") {
    return (
      <mesh onPointerDown={onPointerDown}>
        <coneGeometry
          args={[object.radius ?? 0.7, object.height ?? 1.4, object.radialSegments ?? 32]}
        />
        <meshStandardMaterial {...materialProps} />
      </mesh>
    );
  }

  if (object.shape === "torus") {
    return (
      <mesh onPointerDown={onPointerDown}>
        <torusGeometry
          args={[
            object.radius ?? 0.7,
            object.tubularRadius ?? 0.22,
            16,
            object.radialSegments ?? 32,
          ]}
        />
        <meshStandardMaterial {...materialProps} />
      </mesh>
    );
  }

  return null;
}

function SelectionFrame({ object }: { object: PreviewObject }) {
  const bounds = getObjectBounds(object);

  if (object.type === "model") {
    return (
      <mesh position={[0, 0, 0]}>
        <boxGeometry args={[bounds.width, bounds.height, bounds.depth ?? 1.3]} />
        <meshBasicMaterial color="#7c3aed" transparent opacity={0.3} wireframe />
      </mesh>
    );
  }

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
      const size = (object.radius ?? 0.58) * 2.5;
      return { width: size, height: size };
    }
    if (object.shape === "triangle") {
      const size = (object.radius ?? 0.8) * 2.2;
      return { width: size, height: size };
    }
    if (object.shape === "star") {
      const size = (object.radius ?? 0.9) * 2.2;
      return { width: size, height: size };
    }
    if (object.shape === "polygon") {
      const size = (object.radius ?? 0.8) * 2.2;
      return { width: size, height: size };
    }

    return {
      width: (object.width ?? 2.2) + 0.35,
      height: (object.height ?? 0.8) + 0.35,
    };
  }

  if (object.type === "model") {
    if (object.shape === "cube") {
      const size = (object.width ?? 1.3) + 0.15;
      return { width: size, height: size, depth: size };
    }
    if (object.shape === "sphere") {
      const size = (object.radius ?? 0.8) * 2.1;
      return { width: size, height: size, depth: size };
    }
    if (object.shape === "cylinder") {
      const w = (object.radius ?? 0.6) * 2.1;
      return { width: w, height: (object.height ?? 1.4) + 0.15, depth: w };
    }
    if (object.shape === "cone") {
      const w = (object.radius ?? 0.7) * 2.1;
      return { width: w, height: (object.height ?? 1.4) + 0.15, depth: w };
    }
    if (object.shape === "torus") {
      const w = ((object.radius ?? 0.7) + (object.tubularRadius ?? 0.22)) * 2.1;
      return { width: w, height: w, depth: (object.tubularRadius ?? 0.22) * 2.2 };
    }
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
