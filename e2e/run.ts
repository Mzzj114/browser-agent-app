import type { Locale } from "../src/i18n/locale.ts"

export const representativeRunId = "F1_add_single_item_clean"

export const runFrame = {
  final: `runs/${representativeRunId}/frames/final.jpg`,
  step1: `runs/${representativeRunId}/frames/pre_0000.jpg`,
  step2: `runs/${representativeRunId}/frames/pre_0001.jpg`,
  step3: `runs/${representativeRunId}/frames/pre_0002.jpg`,
  step4: `runs/${representativeRunId}/frames/pre_0003.jpg`,
} as const

export const runScreenshotSize = { width: 1120, height: 780 } as const

export function runUrl(locale: Locale): string {
  return `/?lang=${locale}&run=${representativeRunId}`
}
