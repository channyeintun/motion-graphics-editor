import { OrbitControls, Text, useTexture } from "@react-three/drei";
import { Canvas, type ThreeEvent, useThree } from "@react-three/fiber";
import { type ReactNode, useLayoutEffect, useMemo, useState } from "react";
import * as THREE from "three";
import { useSelector } from "@xstate/store-react";
import { viewportStore } from "../store/viewportStore";
import type { PreviewObject } from "../model/preview";
import type { SampledSceneState } from "../engine/sceneSampler";

const FRAME_WIDTH = 14;
const FRAME_HEIGHT = 8.4;

type PreviewViewportProps = {
  objects: PreviewObject[];
  outgoingObjects: PreviewObject[];
  sceneState: SampledSceneState;
  selectedId: string | null;
  onSelect: (id: string | null) => void;
  onMove: (id: string, nextX: number, nextY: number) => void;
  onScale: (id: string, scaleX: number, scaleY: number) => void;
  onRotate: (id: string, rotation: number) => void;
  showGuides?: boolean;
  onCanvasReady?: (canvas: HTMLCanvasElement) => void;
};

type ScaleHandle = "tl" | "tr" | "bl" | "br" | "t" | "b" | "l" | "r";

type PreviewCursor =
  | "default"
  | "grab"
  | "grabbing"
  | "ew-resize"
  | "ns-resize"
  | "nwse-resize"
  | "nesw-resize";

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
    }
  | {
      type: "scale";
      id: string;
      handle: ScaleHandle;
      startPoint: { x: number; y: number };
      startScaleX: number;
      startScaleY: number;
      objectWidth: number;
      objectHeight: number;
    }
  | {
      type: "rotate";
      id: string;
      centerX: number;
      centerY: number;
      startAngle: number;
      startRotation: number;
    };

export function PreviewViewport({
  objects,
  outgoingObjects,
  sceneState,
  selectedId,
  onSelect,
  onMove,
  onScale,
  onRotate,
  showGuides = true,
  onCanvasReady,
}: PreviewViewportProps) {
  const interactionMode = useSelector(viewportStore, (state) => state.context.interactionMode);
  const transformMode = useSelector(viewportStore, (state) => state.context.transformMode);
  const [dragState, setDragState] = useState<DragState | null>(null);
  const [hoverCursor, setHoverCursor] = useState<PreviewCursor>("default");
  const [viewportOffset, setViewportOffset] = useState({ x: 0, y: 0 });
  const selectedObject = objects.find((object) => object.id === selectedId) ?? null;
  const previewCursor = dragState ? getDragCursor(dragState) : hoverCursor;

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

    if (dragState.type === "scale") {
      const dx = event.point.x - dragState.startPoint.x;
      const dy = event.point.y - dragState.startPoint.y;
      const halfW = dragState.objectWidth / 2;
      const halfH = dragState.objectHeight / 2;

      let nextScaleX = dragState.startScaleX;
      let nextScaleY = dragState.startScaleY;

      const handle = dragState.handle;
      const isCorner = handle === "tl" || handle === "tr" || handle === "bl" || handle === "br";

      if (handle === "r") {
        nextScaleX = Math.max(0.05, dragState.startScaleX + dx / halfW);
      } else if (handle === "l") {
        nextScaleX = Math.max(0.05, dragState.startScaleX - dx / halfW);
      } else if (handle === "t") {
        nextScaleY = Math.max(0.05, dragState.startScaleY + dy / halfH);
      } else if (handle === "b") {
        nextScaleY = Math.max(0.05, dragState.startScaleY - dy / halfH);
      } else if (isCorner) {
        // Lock aspect ratio for corner handles — use the larger delta
        const scaleXDelta = dx / halfW;
        const scaleYDelta = dy / halfH;

        if (handle === "tr") {
          const avg = (scaleXDelta - scaleYDelta) / 2;
          nextScaleX = Math.max(0.05, dragState.startScaleX + avg);
          nextScaleY = Math.max(0.05, dragState.startScaleY + avg);
        } else if (handle === "tl") {
          const avg = (-scaleXDelta - scaleYDelta) / 2;
          nextScaleX = Math.max(0.05, dragState.startScaleX + avg);
          nextScaleY = Math.max(0.05, dragState.startScaleY + avg);
        } else if (handle === "br") {
          const avg = (scaleXDelta + scaleYDelta) / 2;
          nextScaleX = Math.max(0.05, dragState.startScaleX + avg);
          nextScaleY = Math.max(0.05, dragState.startScaleY + avg);
        } else if (handle === "bl") {
          const avg = (-scaleXDelta + scaleYDelta) / 2;
          nextScaleX = Math.max(0.05, dragState.startScaleX + avg);
          nextScaleY = Math.max(0.05, dragState.startScaleY + avg);
        }
      }

      onScale(dragState.id, nextScaleX, nextScaleY);
      return;
    }

    if (dragState.type === "rotate") {
      const newAngle = Math.atan2(
        event.point.y - dragState.centerY,
        event.point.x - dragState.centerX,
      );
      const nextRotation = dragState.startRotation + (newAngle - dragState.startAngle);
      onRotate(dragState.id, nextRotation);
      return;
    }

    const nextX = clamp(event.point.x + dragState.offsetX - viewportOffset.x, -8.5, 8.5);
    const nextY = clamp(event.point.y + dragState.offsetY - viewportOffset.y, -4.8, 4.8);
    onMove(dragState.id, snapToCenter(nextX), snapToCenter(nextY));
  };

  const stopDragging = () => {
    if (dragState) {
      setDragState(null);
    }

    setHoverCursor("default");
  };

  return (
    <div className="relative flex h-full min-h-[66vh] items-center justify-center p-3 pt-14 md:p-4 md:pt-16 lg:p-5 lg:pt-18">
      <div className="relative aspect-[16/9] w-full overflow-hidden rounded-[38px] border-[12px] border-black bg-[#f3efe3] shadow-[0_40px_100px_rgba(0,0,0,0.5)]">
        <SceneBackdrops sceneState={sceneState} />
        <div className="absolute inset-0 rounded-[26px] border border-black/10" />
        <Canvas
          camera={{ position: [0, 0, 12], fov: 50 }}
          gl={{ alpha: true, antialias: true }}
          dpr={[1, 2]}
          className="rounded-[26px]"
          style={{ cursor: previewCursor }}
          onCreated={(state) => {
            state.gl.setClearAlpha(0);
            onCanvasReady?.(state.gl.domElement);
          }}
          onPointerUp={stopDragging}
          onPointerLeave={stopDragging}
        >
          <ResponsiveCamera />
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
              <planeGeometry args={[20, 12]} />
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

            {sceneState.outgoingScene ? (
              <SceneFrame
                role="outgoing"
                preset={sceneState.transitionPreset}
                progress={sceneState.transitionProgress}
              >
                {outgoingObjects.map((object) => (
                  <PreviewNode
                    key={`outgoing-${object.id}`}
                    object={object}
                    selected={false}
                    opacityMultiplier={
                      getSceneFrameVisual(
                        "outgoing",
                        sceneState.transitionPreset,
                        sceneState.transitionProgress,
                      ).opacity
                    }
                  />
                ))}
              </SceneFrame>
            ) : null}

            <SceneFrame
              role="incoming"
              preset={sceneState.transitionPreset}
              progress={sceneState.transitionProgress}
            >
              {objects.map((object) => (
                <PreviewNode
                  key={object.id}
                  object={object}
                  selected={object.id === selectedId}
                  opacityMultiplier={
                    getSceneFrameVisual(
                      "incoming",
                      sceneState.transitionPreset,
                      sceneState.transitionProgress,
                    ).opacity
                  }
                  onPointerDown={(event) => {
                    event.stopPropagation();
                    onSelect(object.id);

                    if (interactionMode !== "select" || object.locked) {
                      return;
                    }

                    if (transformMode === "translate") {
                      setDragState({
                        type: "move",
                        id: object.id,
                        offsetX: object.x - (event.point.x - viewportOffset.x),
                        offsetY: object.y - (event.point.y - viewportOffset.y),
                      });
                    }
                  }}
                />
              ))}
            </SceneFrame>

            {selectedObject && !selectedObject.locked && interactionMode === "select" ? (
              <TransformHandles
                object={selectedObject}
                transformMode={transformMode}
                viewportOffset={viewportOffset}
                onStartScaleDrag={(
                  handle,
                  startPoint,
                  startScaleX,
                  startScaleY,
                  objectWidth,
                  objectHeight,
                ) => {
                  setDragState({
                    type: "scale",
                    id: selectedObject.id,
                    handle,
                    startPoint,
                    startScaleX,
                    startScaleY,
                    objectWidth,
                    objectHeight,
                  });
                }}
                onStartRotateDrag={(centerX, centerY, startAngle, startRotation) => {
                  setDragState({
                    type: "rotate",
                    id: selectedObject.id,
                    centerX,
                    centerY,
                    startAngle,
                    startRotation,
                  });
                }}
                onHandleHover={setHoverCursor}
                onHandleExit={() => setHoverCursor("default")}
              />
            ) : null}
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

function ResponsiveCamera() {
  const camera = useThree((state) => state.camera as THREE.PerspectiveCamera);
  const size = useThree((state) => state.size);

  useLayoutEffect(() => {
    camera.aspect = size.width / size.height;

    const verticalFov = THREE.MathUtils.degToRad(camera.fov);
    const horizontalFov = 2 * Math.atan(Math.tan(verticalFov / 2) * camera.aspect);
    const fitHeightDistance = FRAME_HEIGHT / 2 / Math.tan(verticalFov / 2);
    const fitWidthDistance = FRAME_WIDTH / 2 / Math.tan(horizontalFov / 2);

    camera.position.set(0, 0, Math.max(fitHeightDistance, fitWidthDistance) + 1.5);
    camera.lookAt(0, 0, 0);
    camera.updateProjectionMatrix();
  }, [camera, size.height, size.width]);

  return null;
}

function SceneBackdrops({ sceneState }: { sceneState: SampledSceneState }) {
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden rounded-[26px]">
      {sceneState.outgoingScene ? (
        <SceneBackdropLayer
          sceneState={sceneState}
          role="outgoing"
          localTime={sceneState.outgoingSceneLocalTime}
        />
      ) : null}
      <SceneBackdropLayer
        sceneState={sceneState}
        role="incoming"
        localTime={sceneState.currentSceneLocalTime}
      />
    </div>
  );
}

function SceneBackdropLayer({
  sceneState,
  role,
  localTime,
}: {
  sceneState: SampledSceneState;
  role: "incoming" | "outgoing";
  localTime: number;
}) {
  const scene = role === "incoming" ? sceneState.currentScene : sceneState.outgoingScene;

  if (!scene) {
    return null;
  }

  const visual = getSceneFrameVisual(
    role,
    sceneState.transitionPreset,
    sceneState.transitionProgress,
  );
  const motion = getBackgroundMotion(scene.background.animation, localTime);

  return (
    <div
      className="absolute inset-0"
      style={{
        opacity: visual.opacity,
        transform: `translate3d(${((visual.x / FRAME_WIDTH) * 100 + motion.x).toFixed(3)}%, ${((visual.y / FRAME_HEIGHT) * 100 + motion.y).toFixed(3)}%, 0) scale(${(visual.scale * motion.scale).toFixed(3)})`,
        backgroundImage: buildSceneBackground(scene.background.color, scene.background.accent),
      }}
    />
  );
}

function SceneFrame({
  role,
  preset,
  progress,
  children,
}: {
  role: "incoming" | "outgoing";
  preset: SampledSceneState["transitionPreset"];
  progress: number;
  children: ReactNode;
}) {
  const visual = getSceneFrameVisual(role, preset, progress);

  return (
    <group position={[visual.x, visual.y, 0]} scale={[visual.scale, visual.scale, 1]}>
      {children}
    </group>
  );
}

type TransformHandlesProps = {
  object: PreviewObject;
  transformMode: "translate" | "rotate" | "scale";
  viewportOffset: { x: number; y: number };
  onStartScaleDrag: (
    handle: ScaleHandle,
    startPoint: { x: number; y: number },
    startScaleX: number,
    startScaleY: number,
    objectWidth: number,
    objectHeight: number,
  ) => void;
  onStartRotateDrag: (
    centerX: number,
    centerY: number,
    startAngle: number,
    startRotation: number,
  ) => void;
  onHandleHover: (cursor: PreviewCursor) => void;
  onHandleExit: () => void;
};

function TransformHandles({
  object,
  transformMode,
  viewportOffset,
  onStartScaleDrag,
  onStartRotateDrag,
  onHandleHover,
  onHandleExit,
}: TransformHandlesProps) {
  const bounds = getObjectBounds(object);
  const effectiveWidth = bounds.width * object.scaleX;
  const effectiveHeight = bounds.height * object.scaleY;
  const hw = effectiveWidth / 2;
  const hh = effectiveHeight / 2;
  const px = object.x + viewportOffset.x;
  const py = object.y + viewportOffset.y;

  if (transformMode === "scale") {
    const scaleHandles: { id: ScaleHandle; dx: number; dy: number }[] = [
      { id: "tl", dx: -hw, dy: hh },
      { id: "tr", dx: hw, dy: hh },
      { id: "bl", dx: -hw, dy: -hh },
      { id: "br", dx: hw, dy: -hh },
      { id: "t", dx: 0, dy: hh },
      { id: "b", dx: 0, dy: -hh },
      { id: "l", dx: -hw, dy: 0 },
      { id: "r", dx: hw, dy: 0 },
    ];

    const handleScalePointerDown = (handle: ScaleHandle, event: ThreeEvent<PointerEvent>) => {
      event.stopPropagation();
      onStartScaleDrag(
        handle,
        { x: event.point.x, y: event.point.y },
        object.scaleX,
        object.scaleY,
        bounds.width,
        bounds.height,
      );
    };

    const handleScalePointerOver = (handle: ScaleHandle, event: ThreeEvent<PointerEvent>) => {
      event.stopPropagation();
      onHandleHover(getScaleHandleCursor(handle));
    };

    const handleScalePointerOut = (event: ThreeEvent<PointerEvent>) => {
      event.stopPropagation();
      onHandleExit();
    };

    return (
      <group position={[px, py, 0.9]}>
        {scaleHandles.map(({ id, dx, dy }) => (
          <mesh
            key={id}
            position={[dx, dy, 0]}
            onPointerDown={(event) => handleScalePointerDown(id, event)}
            onPointerOver={(event) => handleScalePointerOver(id, event)}
            onPointerOut={handleScalePointerOut}
          >
            <planeGeometry args={[0.12, 0.12]} />
            <meshBasicMaterial color="#7c3aed" />
          </mesh>
        ))}
        {/* Inner white dot for each handle */}
        {scaleHandles.map(({ id, dx, dy }) => (
          <mesh
            key={`dot-${id}`}
            position={[dx, dy, 0.01]}
            onPointerDown={(event) => handleScalePointerDown(id, event)}
            onPointerOver={(event) => handleScalePointerOver(id, event)}
            onPointerOut={handleScalePointerOut}
          >
            <planeGeometry args={[0.06, 0.06]} />
            <meshBasicMaterial color="white" />
          </mesh>
        ))}
      </group>
    );
  }

  if (transformMode === "rotate") {
    const offset = 0.18;
    const rotateHandles: { id: string; dx: number; dy: number }[] = [
      { id: "tl", dx: -(hw + offset), dy: hh + offset },
      { id: "tr", dx: hw + offset, dy: hh + offset },
      { id: "bl", dx: -(hw + offset), dy: -(hh + offset) },
      { id: "br", dx: hw + offset, dy: -(hh + offset) },
    ];

    const rOuter = Math.max(hw, hh) * 1.05 + offset;

    const centerX = px;
    const centerY = py;

    const handleRotatePointerDown = (event: ThreeEvent<PointerEvent>) => {
      event.stopPropagation();
      const startAngle = Math.atan2(event.point.y - centerY, event.point.x - centerX);
      onStartRotateDrag(centerX, centerY, startAngle, object.rotation);
    };

    const handleRotatePointerOver = (event: ThreeEvent<PointerEvent>) => {
      event.stopPropagation();
      onHandleHover("grab");
    };

    const handleRotatePointerOut = (event: ThreeEvent<PointerEvent>) => {
      event.stopPropagation();
      onHandleExit();
    };

    return (
      <group position={[px, py, 0.9]}>
        {/* Rotation orbit ring */}
        <mesh
          position={[0, 0, -0.01]}
          onPointerDown={handleRotatePointerDown}
          onPointerOver={handleRotatePointerOver}
          onPointerOut={handleRotatePointerOut}
        >
          <ringGeometry args={[rOuter - 0.02, rOuter, 64]} />
          <meshBasicMaterial color="#7c3aed" transparent opacity={0.35} side={THREE.DoubleSide} />
        </mesh>

        {/* Corner rotate handles */}
        {rotateHandles.map(({ id, dx, dy }) => (
          <group key={id} position={[dx, dy, 0]}>
            <mesh
              onPointerDown={handleRotatePointerDown}
              onPointerOver={handleRotatePointerOver}
              onPointerOut={handleRotatePointerOut}
            >
              <circleGeometry args={[0.18, 32]} />
              <meshBasicMaterial transparent opacity={0} depthWrite={false} />
            </mesh>
            <mesh
              position={[0, 0, 0.01]}
              onPointerDown={handleRotatePointerDown}
              onPointerOver={handleRotatePointerOver}
              onPointerOut={handleRotatePointerOut}
            >
              <circleGeometry args={[0.09, 32]} />
              <meshBasicMaterial color="#7c3aed" />
            </mesh>
          </group>
        ))}
      </group>
    );
  }

  return null;
}

type PreviewNodeProps = {
  object: PreviewObject;
  selected: boolean;
  opacityMultiplier?: number;
  onPointerDown?: (event: ThreeEvent<PointerEvent>) => void;
};

type PreviewContentProps = {
  object: PreviewObject;
  opacityMultiplier: number;
  onPointerDown?: (event: ThreeEvent<PointerEvent>) => void;
};

function PreviewNode({ object, selected, opacityMultiplier = 1, onPointerDown }: PreviewNodeProps) {
  const transformMatrix = useMemo(() => {
    const rotationXMatrix = new THREE.Matrix4().makeRotationX(object.rotationX);
    const rotationYMatrix = new THREE.Matrix4().makeRotationY(object.rotationY);
    const rotationZMatrix = new THREE.Matrix4().makeRotationZ(object.rotation);
    const skewMatrix = new THREE.Matrix4().set(
      1,
      Math.tan(object.skewY),
      0,
      0,
      Math.tan(object.skewX),
      1,
      0,
      0,
      0,
      0,
      1,
      0,
      0,
      0,
      0,
      1,
    );
    const scaleMatrix = new THREE.Matrix4().makeScale(object.scaleX, object.scaleY, object.scaleZ);

    return rotationZMatrix
      .multiply(rotationYMatrix)
      .multiply(rotationXMatrix)
      .multiply(skewMatrix)
      .multiply(scaleMatrix);
  }, [
    object.rotation,
    object.rotationX,
    object.rotationY,
    object.scaleX,
    object.scaleY,
    object.scaleZ,
    object.skewX,
    object.skewY,
  ]);

  return (
    <group position={[object.x, object.y, object.z + (object.type === "model" ? 0.65 : 0.5)]}>
      <group matrixAutoUpdate={false} matrix={transformMatrix}>
        {selected ? <SelectionFrame object={object} opacityMultiplier={opacityMultiplier} /> : null}
        {object.type === "text" ? (
          <PreviewText
            object={object}
            opacityMultiplier={opacityMultiplier}
            onPointerDown={onPointerDown}
          />
        ) : null}
        {object.type === "shape" ? (
          <PreviewShape
            object={object}
            opacityMultiplier={opacityMultiplier}
            onPointerDown={onPointerDown}
          />
        ) : null}
        {object.type === "image" ? (
          <PreviewImage
            object={object}
            opacityMultiplier={opacityMultiplier}
            onPointerDown={onPointerDown}
          />
        ) : null}
        {object.type === "model" ? (
          <PreviewModel
            object={object}
            opacityMultiplier={opacityMultiplier}
            onPointerDown={onPointerDown}
          />
        ) : null}
      </group>
    </group>
  );
}

function PreviewText({ object, opacityMultiplier, onPointerDown }: PreviewContentProps) {
  return (
    <Text
      position={[0, 0, 0.3]}
      fontSize={object.fontSize ?? 0.9}
      fontWeight={object.fontWeight ?? 400}
      letterSpacing={object.letterSpacing ?? 0}
      color={object.color}
      anchorX="center"
      anchorY="middle"
      fillOpacity={object.opacity * opacityMultiplier}
      outlineBlur={0.008}
      outlineWidth={0.012}
      outlineColor="rgba(255,255,255,0.4)"
      onPointerDown={onPointerDown}
    >
      {object.text}
    </Text>
  );
}

function PreviewShape({ object, opacityMultiplier, onPointerDown }: PreviewContentProps) {
  const materialProps = {
    color: object.color,
    transparent: true,
    opacity: object.opacity * opacityMultiplier,
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

function PreviewImage({ object, opacityMultiplier, onPointerDown }: PreviewContentProps) {
  const texture = useTexture(object.src ?? "");

  return (
    <mesh onPointerDown={onPointerDown}>
      <planeGeometry args={[object.width ?? 2.4, object.height ?? 1.35]} />
      <meshBasicMaterial
        map={texture}
        color={object.color}
        transparent
        opacity={object.opacity * opacityMultiplier}
        toneMapped={false}
      />
    </mesh>
  );
}

function PreviewModel({ object, opacityMultiplier, onPointerDown }: PreviewContentProps) {
  const materialProps = {
    color: object.color,
    transparent: true,
    opacity: object.opacity * opacityMultiplier,
    roughness: object.roughness ?? 0.4,
    metalness: object.metalness ?? 0.1,
    emissive: object.emissive ?? "#000000",
    emissiveIntensity: object.emissiveIntensity ?? 0,
    wireframe: object.wireframe ?? false,
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

function SelectionFrame({
  object,
  opacityMultiplier,
}: {
  object: PreviewObject;
  opacityMultiplier: number;
}) {
  const bounds = getObjectBounds(object);

  if (object.type === "model") {
    return (
      <mesh position={[0, 0, 0]}>
        <boxGeometry args={[bounds.width, bounds.height, bounds.depth ?? 1.3]} />
        <meshBasicMaterial
          color="#7c3aed"
          transparent
          opacity={0.3 * opacityMultiplier}
          wireframe
        />
      </mesh>
    );
  }

  return (
    <mesh position={[0, 0, 0.1]}>
      <planeGeometry args={[bounds.width, bounds.height]} />
      <meshBasicMaterial color="#7c3aed" transparent opacity={0.12 * opacityMultiplier} wireframe />
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

function getSceneFrameVisual(
  role: "incoming" | "outgoing",
  preset: SampledSceneState["transitionPreset"],
  progress: number,
) {
  const safeProgress = clamp(progress, 0, 1);

  if (preset === "fade") {
    return {
      x: 0,
      y: 0,
      scale: 1,
      opacity: role === "incoming" ? safeProgress : 1 - safeProgress,
    };
  }

  if (preset === "slideFromLeft") {
    return {
      x:
        role === "incoming" ? -(1 - safeProgress) * FRAME_WIDTH : safeProgress * FRAME_WIDTH * 0.65,
      y: 0,
      scale: 1,
      opacity: 1,
    };
  }

  if (preset === "slideFromRight") {
    return {
      x:
        role === "incoming" ? (1 - safeProgress) * FRAME_WIDTH : -safeProgress * FRAME_WIDTH * 0.65,
      y: 0,
      scale: 1,
      opacity: 1,
    };
  }

  if (preset === "slideFromTop") {
    return {
      x: 0,
      y:
        role === "incoming"
          ? (1 - safeProgress) * FRAME_HEIGHT
          : -safeProgress * FRAME_HEIGHT * 0.65,
      scale: 1,
      opacity: 1,
    };
  }

  if (preset === "slideFromBottom") {
    return {
      x: 0,
      y:
        role === "incoming"
          ? -(1 - safeProgress) * FRAME_HEIGHT
          : safeProgress * FRAME_HEIGHT * 0.65,
      scale: 1,
      opacity: 1,
    };
  }

  if (preset === "zoomIn") {
    return {
      x: 0,
      y: 0,
      scale: role === "incoming" ? 1.16 - safeProgress * 0.16 : 1 + safeProgress * 0.06,
      opacity: role === "incoming" ? safeProgress : 1 - safeProgress,
    };
  }

  if (preset === "zoomOut") {
    return {
      x: 0,
      y: 0,
      scale: role === "incoming" ? 0.84 + safeProgress * 0.16 : 1.08 - safeProgress * 0.08,
      opacity: role === "incoming" ? safeProgress : 1 - safeProgress,
    };
  }

  return {
    x: 0,
    y: 0,
    scale: 1,
    opacity: role === "incoming" ? 1 : 0,
  };
}

function getBackgroundMotion(animation: "none" | "drift" | "pulse", localTime: number) {
  if (animation === "drift") {
    return {
      x: Math.sin(localTime * 0.35) * 2.5,
      y: Math.cos(localTime * 0.28) * 1.8,
      scale: 1.06,
    };
  }

  if (animation === "pulse") {
    return {
      x: 0,
      y: 0,
      scale: 1.03 + Math.sin(localTime * 1.4) * 0.03,
    };
  }

  return {
    x: 0,
    y: 0,
    scale: 1,
  };
}

function buildSceneBackground(color: string, accent: string) {
  const mixed = mixHexColors(color, accent, 0.32);
  return [
    `radial-gradient(circle at 18% 18%, ${accent} 0%, transparent 36%)`,
    `radial-gradient(circle at 80% 24%, ${mixed} 0%, transparent 30%)`,
    `linear-gradient(145deg, ${color} 0%, ${mixed} 100%)`,
  ].join(", ");
}

function mixHexColors(first: string, second: string, amount: number) {
  const left = parseHexColor(first);
  const right = parseHexColor(second);
  const mix = (leftValue: number, rightValue: number) =>
    Math.round(leftValue + (rightValue - leftValue) * amount)
      .toString(16)
      .padStart(2, "0");

  return `#${mix(left.r, right.r)}${mix(left.g, right.g)}${mix(left.b, right.b)}`;
}

function parseHexColor(value: string) {
  const normalized = value.replace("#", "");
  const hex =
    normalized.length === 3
      ? normalized
          .split("")
          .map((part) => `${part}${part}`)
          .join("")
      : normalized.padEnd(6, "0").slice(0, 6);

  return {
    r: Number.parseInt(hex.slice(0, 2), 16),
    g: Number.parseInt(hex.slice(2, 4), 16),
    b: Number.parseInt(hex.slice(4, 6), 16),
  };
}

function getScaleHandleCursor(handle: ScaleHandle): PreviewCursor {
  if (handle === "t" || handle === "b") {
    return "ns-resize";
  }

  if (handle === "l" || handle === "r") {
    return "ew-resize";
  }

  if (handle === "tl" || handle === "br") {
    return "nwse-resize";
  }

  return "nesw-resize";
}

function getDragCursor(dragState: DragState): PreviewCursor {
  if (dragState.type === "scale") {
    return getScaleHandleCursor(dragState.handle);
  }

  if (dragState.type === "rotate") {
    return "grabbing";
  }

  return "default";
}

function snapToCenter(value: number) {
  return Math.abs(value) < 0.12 ? 0 : value;
}
