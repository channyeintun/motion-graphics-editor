import { applyEasing } from "./easing";
import type { Clip, Keyframe, Layer } from "../model/project";

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

  return {
    ...layer,
    object: {
      ...layer.object,
      transform: {
        x: sampleNumericProperty(layer.object.transform.x, clip, currentTime, "x"),
        y: sampleNumericProperty(layer.object.transform.y, clip, currentTime, "y"),
        rotation: sampleNumericProperty(
          layer.object.transform.rotation,
          clip,
          currentTime,
          "rotation",
        ),
        scaleX: sampleNumericProperty(layer.object.transform.scaleX, clip, currentTime, "scaleX"),
        scaleY: sampleNumericProperty(layer.object.transform.scaleY, clip, currentTime, "scaleY"),
      },
      opacity: sampleNumericProperty(layer.object.opacity, clip, currentTime, "opacity"),
    },
  };
}

function sampleNumericProperty(
  baseValue: number,
  clip: Clip,
  currentTime: number,
  property: "x" | "y" | "rotation" | "scaleX" | "scaleY" | "opacity",
) {
  const keyframes = clip.keyframes
    .filter((keyframe) => keyframe.property === property && typeof keyframe.value === "number")
    .sort((left, right) => left.time - right.time);

  if (keyframes.length === 0) {
    return baseValue;
  }

  if (currentTime <= keyframes[0].time) {
    return keyframes[0].value as number;
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
