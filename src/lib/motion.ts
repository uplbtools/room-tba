import { cubicIn, cubicOut } from "svelte/easing";
import type { FadeParams, FlyParams, SlideParams } from "svelte/transition";

/** Shared motion durations (ms). */
export const MOTION_DURATION = {
  fast: 150,
  micro: 200,
  panel: 280,
  modal: 240,
  shelf: 260,
} as const;

export function motionDuration(base: number, reducedMotion: boolean): number {
  return reducedMotion ? 0 : base;
}

export function panelFadeIn(reducedMotion: boolean): FadeParams {
  return {
    duration: motionDuration(MOTION_DURATION.panel, reducedMotion),
  };
}

export function panelFadeOut(reducedMotion: boolean): FadeParams {
  return {
    duration: motionDuration(MOTION_DURATION.fast, reducedMotion),
  };
}

export function dropdownFadeIn(reducedMotion: boolean): FadeParams {
  return {
    duration: motionDuration(MOTION_DURATION.micro, reducedMotion),
  };
}

export function dropdownFadeOut(reducedMotion: boolean): FadeParams {
  return {
    duration: motionDuration(MOTION_DURATION.fast, reducedMotion),
  };
}

export function shelfReveal(reducedMotion: boolean): FlyParams {
  return {
    y: -8,
    duration: motionDuration(MOTION_DURATION.shelf, reducedMotion),
    easing: cubicOut,
  };
}

export function shelfDismiss(reducedMotion: boolean): FlyParams {
  return {
    y: -4,
    duration: motionDuration(MOTION_DURATION.fast, reducedMotion),
    easing: cubicIn,
  };
}

export function dropdownReveal(reducedMotion: boolean): FlyParams {
  return {
    y: -6,
    duration: motionDuration(MOTION_DURATION.micro, reducedMotion),
    easing: cubicOut,
  };
}

export function dropdownDismiss(reducedMotion: boolean): FlyParams {
  return {
    y: -4,
    duration: motionDuration(MOTION_DURATION.fast, reducedMotion),
    easing: cubicIn,
  };
}

export function panelReveal(reducedMotion: boolean, y = 10): FlyParams {
  return {
    y,
    duration: motionDuration(MOTION_DURATION.panel, reducedMotion),
    easing: cubicOut,
  };
}

export function panelDismiss(reducedMotion: boolean, y = 6): FlyParams {
  return {
    y,
    duration: motionDuration(MOTION_DURATION.fast, reducedMotion),
    easing: cubicIn,
  };
}

export function overlayFade(reducedMotion: boolean): FadeParams {
  return {
    duration: motionDuration(MOTION_DURATION.micro, reducedMotion),
  };
}

export function modalContentReveal(reducedMotion: boolean): FlyParams {
  return {
    y: 14,
    duration: motionDuration(MOTION_DURATION.modal, reducedMotion),
    delay: reducedMotion ? 0 : 40,
    easing: cubicOut,
  };
}

export function modalContentDismiss(reducedMotion: boolean): FlyParams {
  return {
    y: 8,
    duration: motionDuration(MOTION_DURATION.fast, reducedMotion),
    easing: cubicIn,
  };
}

export function slideReveal(reducedMotion: boolean): SlideParams {
  return {
    duration: motionDuration(MOTION_DURATION.shelf, reducedMotion),
    easing: cubicOut,
  };
}

export function slideDismiss(reducedMotion: boolean): SlideParams {
  return {
    duration: motionDuration(MOTION_DURATION.fast, reducedMotion),
    easing: cubicIn,
  };
}

export function fullScreenReveal(reducedMotion: boolean): FlyParams {
  return {
    x: 24,
    duration: motionDuration(MOTION_DURATION.panel, reducedMotion),
    easing: cubicOut,
  };
}

export function fullScreenDismiss(reducedMotion: boolean): FlyParams {
  return {
    x: 16,
    duration: motionDuration(MOTION_DURATION.fast, reducedMotion),
    easing: cubicIn,
  };
}
