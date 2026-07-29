// Shared vertical-rhythm tokens for homepage sections, so the gap between
// sections stays consistent instead of being tuned ad hoc per component.
// `large` is for sections whose own visual (diagram, workspace panel) is
// already tall — it keeps a smaller but still deliberate minimum so the
// section doesn't grow even taller, while `default` is the standard rhythm.
export const SECTION_SPACING = {
  default: {
    mobile: { top: 68, bottom: 68 },
    tablet: { top: 88, bottom: 88 },
    desktop: { top: 110, bottom: 110 },
  },
  large: {
    mobile: { top: 68, bottom: 68 },
    tablet: { top: 88, bottom: 88 },
    desktop: { top: 90, bottom: 100 },
  },
} as const;
