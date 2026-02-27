// 포인트 정책
export const POINTS = {
  SIGNUP_BONUS: 30,
  VISIT_FIRST: 10,
  VISIT_REVISIT_2: 15,
  VISIT_REVISIT_3_PLUS: 20,
  UNLOCK_COST: 5,
} as const;

export function getVisitPoints(visitNumber: number): number {
  if (visitNumber === 1) return POINTS.VISIT_FIRST;
  if (visitNumber === 2) return POINTS.VISIT_REVISIT_2;
  return POINTS.VISIT_REVISIT_3_PLUS;
}
