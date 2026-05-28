import type { Project, Scene } from "../model/project";

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
  };
}

function clamp(value: number, minimum: number, maximum: number) {
  return Math.min(maximum, Math.max(minimum, value));
}
