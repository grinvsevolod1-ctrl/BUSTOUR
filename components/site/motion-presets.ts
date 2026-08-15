/** Shared Motion style/transition tokens (public site). Avoid inline object churn. */
export const motionWillChangeOpacityTransform = {
  willChange: "opacity, transform",
} as const

export const motionWillChangeOpacity = {
  willChange: "opacity",
} as const

export const modalBackdropTransition = { duration: 0.2 }
/** Tween (not spring): spring leaves translateY mid-flight and clips bottom on short phones. */
export const modalPanelTransition = { duration: 0.25, ease: [0.32, 0.72, 0, 1] as const }
export const menuTransition = { type: "spring" as const, stiffness: 500, damping: 36 }
export const heroFadeTransition = { duration: 0.65, ease: [0.4, 0, 0.2, 1] as const }
