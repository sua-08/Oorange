export const ORANGE_SIZES = [
  0.5, 1, 2, 3, 5, 10, 20, 30, 50, 75, 100, 150, 200, 300, 500, 1000,
] as const;

export type OrangeSize = (typeof ORANGE_SIZES)[number];

export type GoalAnalysis = {
  goal: string;
  orangeSizeCm: OrangeSize;
  reason: string;
  starterAction: string;
};
