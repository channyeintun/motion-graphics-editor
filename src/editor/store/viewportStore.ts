import { createStore } from "@xstate/store";

export type InteractionMode = "select" | "pan" | "orbit";
export type TransformMode = "translate" | "rotate" | "scale";
export type ActiveDropdown = "select" | "cube" | "shape" | null;

export const viewportStore = createStore({
  context: {
    interactionMode: "select" as InteractionMode,
    transformMode: "translate" as TransformMode,
    activeDropdown: null as ActiveDropdown,
  },
  on: {
    setInteractionMode: (context, event: { mode: InteractionMode }) => ({
      ...context,
      interactionMode: event.mode,
    }),
    setTransformMode: (context, event: { mode: TransformMode }) => ({
      ...context,
      transformMode: event.mode,
    }),
    setActiveDropdown: (context, event: { dropdown: ActiveDropdown }) => ({
      ...context,
      activeDropdown: event.dropdown,
    }),
  },
});
