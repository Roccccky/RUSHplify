export type ExpressionPedalMode = 0 | 1 | 2 | null;

export interface ExpressionPedalCapabilities {
  assignmentLimit: 1 | 2 | 4;
  supportsBankSwitching: boolean;
  supportsAutoEngage: boolean;
  description: string;
}

/**
 * Mirrors the controls exposed by Flex Prime for each expression-pedal mode.
 * Hidden assignments are intentionally preserved when moving to a narrower mode.
 */
export function expressionPedalCapabilities(pedal: 1 | 2, mode: ExpressionPedalMode): ExpressionPedalCapabilities {
  if (pedal === 2) return {
    assignmentLimit: 4,
    supportsBankSwitching: false,
    supportsAutoEngage: true,
    description: "Four independent assignments with movement-based engage controls.",
  };
  if (mode === 1) return {
    assignmentLimit: 4,
    supportsBankSwitching: true,
    supportsAutoEngage: false,
    description: "Four assignments for each toe-switch A/B bank.",
  };
  // HeadRush shows two targets and keeps the A/B banks in Auto-Engage.
  if (mode === 2) return {
    assignmentLimit: 2,
    supportsBankSwitching: true,
    supportsAutoEngage: true,
    description: "Two targets that engage automatically when the pedal moves.",
  };
  return {
    assignmentLimit: 1,
    supportsBankSwitching: true,
    supportsAutoEngage: false,
    description: "One assignment for each toe-switch A/B bank.",
  };
}
