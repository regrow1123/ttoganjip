export type Grade = "none" | "ttoganjip" | "dangol" | "jjin";

export function getGrade(totalVisits: number): Grade {
  if (totalVisits >= 10) return "jjin";
  if (totalVisits >= 5) return "dangol";
  if (totalVisits >= 2) return "ttoganjip";
  return "none";
}

export const GRADE_LABEL: Record<Grade, string> = {
  none: "",
  ttoganjip: "또간집",
  dangol: "단골집",
  jjin: "찐맛집",
};

export const GRADE_COLOR: Record<Grade, string> = {
  none: "",
  ttoganjip: "text-tn-cyan",
  dangol: "text-tn-blue",
  jjin: "text-tn-magenta",
};

export const GRADE_MEDAL: Record<Grade, string> = {
  none: "",
  ttoganjip: "🥉",
  dangol: "🥈",
  jjin: "🥇",
};

export const GRADE_BG: Record<Grade, string> = {
  none: "",
  ttoganjip: "bg-tn-cyan/10",
  dangol: "bg-tn-blue/10",
  jjin: "bg-tn-magenta/10",
};
