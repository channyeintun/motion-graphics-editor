import type { Project, Scene, SceneCameraVector } from "../model/project";

export type SampledSceneCamera = {
  position: SceneCameraVector;
  lookAt: SceneCameraVector;
  up: SceneCameraVector;
};

export type SampledSceneState = {
  currentScene: Scene;
  outgoingScene: Scene | null;
  transitionPreset: Scene["transitionToNext"]["preset"];
  transitionProgress: number;
  isTransitioning: boolean;
  incomingTime: number;
  outgoingTime: number;
  currentSceneLocalTime: number;
  outgoingSceneLocalTime: number;
  camera: SampledSceneCamera;
};

export function sampleSceneState(project: Project, currentTime: number): SampledSceneState {
  const scenes = project.scenes;
  const currentScene =
    scenes.find((scene) => currentTime >= scene.start && currentTime <= scene.end) ??
    scenes[scenes.length - 1];

  const currentSceneIndex = scenes.findIndex((scene) => scene.id === currentScene.id);
  const outgoingScene = currentSceneIndex > 0 ? scenes[currentSceneIndex - 1] : null;
  const transition = outgoingScene?.transitionToNext;
  const transitionDuration = Math.max(0, transition?.duration ?? 0);
  const transitionStart = currentScene.start;
  const transitionEnd = transitionStart + transitionDuration;
  const isTransitioning =
    Boolean(outgoingScene) &&
    Boolean(transition) &&
    transition?.preset !== "none" &&
    transitionDuration > 0 &&
    currentTime >= transitionStart &&
    currentTime <= transitionEnd;
  const transitionProgress = isTransitioning
    ? clamp((currentTime - transitionStart) / transitionDuration, 0, 1)
    : 1;
  const outgoingTime = outgoingScene
    ? Math.max(outgoingScene.start, outgoingScene.end - 1 / Math.max(project.fps, 1))
    : currentTime;

  return {
    currentScene,
    outgoingScene: isTransitioning ? outgoingScene : null,
    transitionPreset: isTransitioning ? (transition?.preset ?? "none") : "none",
    transitionProgress,
    isTransitioning,
    incomingTime: currentTime,
    outgoingTime,
    currentSceneLocalTime: Math.max(0, currentTime - currentScene.start),
    outgoingSceneLocalTime: outgoingScene ? Math.max(0, outgoingTime - outgoingScene.start) : 0,
    camera: sampleSceneCamera(scenes, currentSceneIndex, currentTime),
  };
}

function sampleSceneCamera(scenes: Scene[], currentSceneIndex: number, currentTime: number) {
  const currentScene = scenes[currentSceneIndex] ?? scenes[scenes.length - 1];

  if (!currentScene) {
    return {
      position: { x: 0, y: 0, z: 10.5 },
      lookAt: { x: 0, y: 0, z: 0 },
      up: { x: 0, y: 1, z: 0 },
    } satisfies SampledSceneCamera;
  }

  const nextScene = scenes[currentSceneIndex + 1];

  if (!nextScene) {
    return cloneSceneCamera(currentScene.camera);
  }

  const sceneDuration = Math.max(currentScene.end - currentScene.start, 0.0001);
  const progress = clamp((currentTime - currentScene.start) / sceneDuration, 0, 1);

  return {
    position: sampleCameraPathPosition(scenes, currentSceneIndex, progress),
    lookAt: lerpVector(currentScene.camera.lookAt, nextScene.camera.lookAt, progress),
    up: normalizeVector(lerpVector(currentScene.camera.up, nextScene.camera.up, progress)),
  };
}

function sampleCameraPathPosition(scenes: Scene[], segmentIndex: number, progress: number) {
  const lastSceneIndex = scenes.length - 1;
  const p0 = scenes[Math.max(0, segmentIndex - 1)]?.camera.position ?? scenes[0].camera.position;
  const p1 = scenes[segmentIndex]?.camera.position ?? scenes[0].camera.position;
  const p2 =
    scenes[Math.min(lastSceneIndex, segmentIndex + 1)]?.camera.position ??
    scenes[lastSceneIndex].camera.position;
  const p3 =
    scenes[Math.min(lastSceneIndex, segmentIndex + 2)]?.camera.position ??
    scenes[lastSceneIndex].camera.position;

  return {
    x: catmullRom(p0.x, p1.x, p2.x, p3.x, progress),
    y: catmullRom(p0.y, p1.y, p2.y, p3.y, progress),
    z: catmullRom(p0.z, p1.z, p2.z, p3.z, progress),
  };
}

function cloneSceneCamera(camera: Scene["camera"]): SampledSceneCamera {
  return {
    position: { ...camera.position },
    lookAt: { ...camera.lookAt },
    up: normalizeVector(camera.up),
  };
}

function lerpVector(start: SceneCameraVector, end: SceneCameraVector, progress: number) {
  return {
    x: start.x + (end.x - start.x) * progress,
    y: start.y + (end.y - start.y) * progress,
    z: start.z + (end.z - start.z) * progress,
  };
}

function normalizeVector(vector: SceneCameraVector) {
  const length = Math.hypot(vector.x, vector.y, vector.z);

  if (length <= 0.0001) {
    return { x: 0, y: 1, z: 0 };
  }

  return {
    x: vector.x / length,
    y: vector.y / length,
    z: vector.z / length,
  };
}

function catmullRom(p0: number, p1: number, p2: number, p3: number, progress: number) {
  const t2 = progress * progress;
  const t3 = t2 * progress;

  return (
    0.5 *
    (2 * p1 +
      (-p0 + p2) * progress +
      (2 * p0 - 5 * p1 + 4 * p2 - p3) * t2 +
      (-p0 + 3 * p1 - 3 * p2 + p3) * t3)
  );
}

function clamp(value: number, minimum: number, maximum: number) {
  return Math.min(maximum, Math.max(minimum, value));
}
