import { applyEasing } from "./easing";
import type { Clip, Keyframe, Layer } from "../model/project";

const TRANSITION_SLIDE_DISTANCE_X = 9;
const TRANSITION_SLIDE_DISTANCE_Y = 5.5;

export function sampleLayer(layer: Layer, currentTime: number) {
  const clip = layer.clips.find(
    (candidateClip) =>
      candidateClip.enabled &&
      currentTime >= candidateClip.start &&
      currentTime <= candidateClip.end,
  );

  if (!clip) {
    return {
      ...layer,
      object: {
        ...layer.object,
        opacity: 0,
      },
    };
  }

  const sampledLayer = {
    ...layer,
    object: {
      ...layer.object,
      transform: {
        x: sampleNumericProperty(layer.object.transform.x, clip, currentTime, "x"),
        y: sampleNumericProperty(layer.object.transform.y, clip, currentTime, "y"),
        z: sampleNumericProperty(layer.object.transform.z, clip, currentTime, "z"),
        rotationX: sampleNumericProperty(
          layer.object.transform.rotationX,
          clip,
          currentTime,
          "rotationX",
        ),
        rotationY: sampleNumericProperty(
          layer.object.transform.rotationY,
          clip,
          currentTime,
          "rotationY",
        ),
        rotation: sampleNumericProperty(
          layer.object.transform.rotation,
          clip,
          currentTime,
          "rotation",
        ),
        scaleX: sampleNumericProperty(layer.object.transform.scaleX, clip, currentTime, "scaleX"),
        scaleY: sampleNumericProperty(layer.object.transform.scaleY, clip, currentTime, "scaleY"),
        scaleZ: sampleNumericProperty(layer.object.transform.scaleZ, clip, currentTime, "scaleZ"),
        skewX: sampleNumericProperty(layer.object.transform.skewX, clip, currentTime, "skewX"),
        skewY: sampleNumericProperty(layer.object.transform.skewY, clip, currentTime, "skewY"),
      },
      opacity: sampleNumericProperty(layer.object.opacity, clip, currentTime, "opacity"),
    },
  };

  return applyClipTransitions(sampledLayer, clip, currentTime);
}

function applyClipTransitions(layer: Layer, clip: Clip, currentTime: number) {
  const nextLayer: Layer = {
    ...layer,
    object: {
      ...layer.object,
      transform: {
        ...layer.object.transform,
      },
    },
  };

  applyTransitionState(nextLayer, clip.transitionIn, clip.start, currentTime, true);
  applyTransitionState(nextLayer, clip.transitionOut, clip.end, currentTime, false);

  return nextLayer;
}

function applyTransitionState(
  layer: Layer,
  transition: Clip["transitionIn"] | undefined,
  anchorTime: number,
  currentTime: number,
  isEntry: boolean,
) {
  if (!transition || transition.preset === "none" || transition.duration <= 0) {
    return;
  }

  const duration = Math.max(0.001, transition.duration);
  const visibilityProgress = isEntry
    ? (currentTime - anchorTime) / duration
    : (anchorTime - currentTime) / duration;

  if (visibilityProgress >= 1 || visibilityProgress <= 0) {
    if (visibilityProgress <= 0) {
      layer.object.opacity = 0;
    }
    return;
  }

  const visible = clamp(visibilityProgress, 0, 1);
  const hidden = 1 - visible;

  if (transition.preset === "fade") {
    layer.object.opacity *= visible;
    return;
  }

  if (transition.preset === "slideFromLeft") {
    layer.object.transform.x -= TRANSITION_SLIDE_DISTANCE_X * hidden;
    return;
  }

  if (transition.preset === "slideFromRight") {
    layer.object.transform.x += TRANSITION_SLIDE_DISTANCE_X * hidden;
    return;
  }

  if (transition.preset === "slideFromTop") {
    layer.object.transform.y += TRANSITION_SLIDE_DISTANCE_Y * hidden;
    return;
  }

  if (transition.preset === "slideFromBottom") {
    layer.object.transform.y -= TRANSITION_SLIDE_DISTANCE_Y * hidden;
    return;
  }

  if (transition.preset === "zoomIn") {
    const scaleFactor = 0.82 + visible * 0.18;
    layer.object.transform.scaleX *= scaleFactor;
    layer.object.transform.scaleY *= scaleFactor;
    layer.object.opacity *= 0.35 + visible * 0.65;
    return;
  }

  if (transition.preset === "zoomOut") {
    const scaleFactor = 1.18 - visible * 0.18;
    layer.object.transform.scaleX *= scaleFactor;
    layer.object.transform.scaleY *= scaleFactor;
    layer.object.opacity *= 0.35 + visible * 0.65;
  }
}

function sampleNumericProperty(
  baseValue: number,
  clip: Clip,
  currentTime: number,
  property:
    | "x"
    | "y"
    | "z"
    | "rotationX"
    | "rotationY"
    | "rotation"
    | "scaleX"
    | "scaleY"
    | "scaleZ"
    | "skewX"
    | "skewY"
    | "opacity",
) {
  const keyframes = clip.keyframes
    .filter((keyframe) => keyframe.property === property && typeof keyframe.value === "number")
    .sort((left, right) => left.time - right.time);

  if (keyframes.length === 0) {
    return baseValue;
  }

  const firstKeyframe = keyframes[0];

  if (currentTime < firstKeyframe.time) {
    return baseValue;
  }

  if (currentTime === firstKeyframe.time) {
    return firstKeyframe.value as number;
  }

  const lastKeyframe = keyframes.at(-1);

  if (!lastKeyframe || currentTime >= lastKeyframe.time) {
    return (lastKeyframe?.value as number | undefined) ?? baseValue;
  }

  const previousKeyframe = keyframes.findLast((keyframe) => keyframe.time <= currentTime);
  const nextKeyframe = keyframes.find((keyframe) => keyframe.time > currentTime);

  if (!previousKeyframe || !nextKeyframe) {
    return baseValue;
  }

  return interpolate(previousKeyframe, nextKeyframe, currentTime);
}

function interpolate(previousKeyframe: Keyframe, nextKeyframe: Keyframe, currentTime: number) {
  if (typeof previousKeyframe.value !== "number" || typeof nextKeyframe.value !== "number") {
    return 0;
  }

  const progress =
    (currentTime - previousKeyframe.time) / (nextKeyframe.time - previousKeyframe.time);
  const eased = applyEasing(progress, nextKeyframe.easing);
  return previousKeyframe.value + (nextKeyframe.value - previousKeyframe.value) * eased;
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}
