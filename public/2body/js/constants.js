// Centralized configuration to avoid magic numbers
export const RENDER = {
  gridSpacing: 50,
  arrowHeadSize: 6,
  graphsMaxPanelHeight: 180,
};

export const COLLISION = {
  maxIterations: 3,
  separationEpsilon: 1e-6,
};

export const ADAPTIVE = {
  // Max internal RK45 steps per outer dt before relaxing tolerances
  maxInternalSteps: 1500,
  // Never let embedded step size fall below this fraction of dt
  minRelativeStep: 1e-4,
  // When budget is exceeded, relax tolerances multiplicatively to make progress
  toleranceGrowthFactorOnBudget: 5,
};

