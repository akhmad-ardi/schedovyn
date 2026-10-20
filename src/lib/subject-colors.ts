import type { SubjectColorKey } from "@/domain/types/entities"

export interface SubjectColorStyle {
  blockClassName: string
  swatchClassName: string
}

export const SUBJECT_COLOR_STYLES: Record<SubjectColorKey, SubjectColorStyle> =
  {
    blue: {
      blockClassName:
        "bg-blue-500/10 border-blue-500/30 text-blue-950 dark:bg-blue-500/15 dark:border-blue-400/30 dark:text-blue-100",
      swatchClassName: "bg-blue-600 dark:bg-blue-400",
    },
    emerald: {
      blockClassName:
        "bg-emerald-500/10 border-emerald-500/30 text-emerald-950 dark:bg-emerald-500/15 dark:border-emerald-400/30 dark:text-emerald-100",
      swatchClassName: "bg-emerald-600 dark:bg-emerald-400",
    },
    amber: {
      blockClassName:
        "bg-amber-500/10 border-amber-500/30 text-amber-950 dark:bg-amber-500/15 dark:border-amber-400/30 dark:text-amber-100",
      swatchClassName: "bg-amber-600 dark:bg-amber-400",
    },
    rose: {
      blockClassName:
        "bg-rose-500/10 border-rose-500/30 text-rose-950 dark:bg-rose-500/15 dark:border-rose-400/30 dark:text-rose-100",
      swatchClassName: "bg-rose-600 dark:bg-rose-400",
    },
    violet: {
      blockClassName:
        "bg-violet-500/10 border-violet-500/30 text-violet-950 dark:bg-violet-500/15 dark:border-violet-400/30 dark:text-violet-100",
      swatchClassName: "bg-violet-600 dark:bg-violet-400",
    },
    cyan: {
      blockClassName:
        "bg-cyan-500/10 border-cyan-500/30 text-cyan-950 dark:bg-cyan-500/15 dark:border-cyan-400/30 dark:text-cyan-100",
      swatchClassName: "bg-cyan-600 dark:bg-cyan-400",
    },
    orange: {
      blockClassName:
        "bg-orange-500/10 border-orange-500/30 text-orange-950 dark:bg-orange-500/15 dark:border-orange-400/30 dark:text-orange-100",
      swatchClassName: "bg-orange-600 dark:bg-orange-400",
    },
    teal: {
      blockClassName:
        "bg-teal-500/10 border-teal-500/30 text-teal-950 dark:bg-teal-500/15 dark:border-teal-400/30 dark:text-teal-100",
      swatchClassName: "bg-teal-600 dark:bg-teal-400",
    },
    indigo: {
      blockClassName:
        "bg-indigo-500/10 border-indigo-500/30 text-indigo-950 dark:bg-indigo-500/15 dark:border-indigo-400/30 dark:text-indigo-100",
      swatchClassName: "bg-indigo-600 dark:bg-indigo-400",
    },
    slate: {
      blockClassName:
        "bg-slate-500/10 border-slate-500/30 text-slate-950 dark:bg-slate-500/15 dark:border-slate-400/30 dark:text-slate-100",
      swatchClassName: "bg-slate-600 dark:bg-slate-400",
    },
  }

export function getSubjectColorStyle(
  colorKey: SubjectColorKey
): SubjectColorStyle {
  return SUBJECT_COLOR_STYLES[colorKey] ?? SUBJECT_COLOR_STYLES.blue
}
