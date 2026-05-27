import type { Easing } from "../model/project";

export function applyEasing(value: number, easing: Easing) {
  switch (easing) {
    case "easeIn":
      return value * value;
    case "easeOut":
      return 1 - (1 - value) * (1 - value);
    case "easeInOut":
      return value < 0.5 ? 2 * value * value : 1 - Math.pow(-2 * value + 2, 2) / 2;
    default:
      return value;
  }
}
