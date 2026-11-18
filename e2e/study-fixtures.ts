import type { Page } from "@playwright/test"
import type { DecisionRun, ScoredCandidate } from "../src/domain/decision-run-schema.ts"
import { projectRun } from "../src/domain/project-run.ts"
import type { StudyCondition } from "../src/domain/study-condition.ts"
import type { StudyRuns } from "../src/domain/study-run-schema.ts"
import type { Locale } from "../src/i18n/locale.ts"
import { canonicalRun } from "../tests/fixtures/decision-runs.ts"

export const injectedFixtureRevision = "a".repeat(64)
const injectedFileCount = 250

const longCjk =
  "这是一个用于检验较长中文任务说明、候选列表、说明文本与独立滚动区域布局的合成示例。".repeat(6)
const longEnglish =
  " This longer synthetic sentence exercises wrapping, bounded scrolling, and keyboard reachability without changing the recorded action order."

const labelSuffix: Record<Locale, string> = {
  zh: "长候选标签示例",
  en: "Illustrative candidate label",
}

function candidate(
  id: string,
  label: string,
  context: string,
  probability: number,
): ScoredCandidate {
  return { id, label, context, probability }
}

function heavyHeads(run: DecisionRun, locale: Locale): DecisionRun {
  const suffix = labelSuffix[locale]
  return {
    ...run,
    episodes: run.episodes.map((episode) => {
      if (episode.id !== "episode-04") return episode

      const operations = Array.from({ length: injectedFileCount }, (_, index) => {
        const selected = index === 0
        return candidate(
          selected ? "CLICK" : `op-illustrative-${index.toString().padStart(3, "0")}`,
          selected ? (episode.operationHead.offered[0]?.label ?? suffix) : `${suffix} ${index}`,
          selected ? `${suffix} selected` : `${suffix} context ${index}`,
          selected ? 0.6 : 0.4 / (injectedFileCount - 1),
        )
      })

      const targets = Array.from({ length: injectedFileCount }, (_, index) => {
        const selected = index === 0
        return candidate(
          selected
            ? "target-cloud-walk"
            : `target-illustrative-${index.toString().padStart(3, "0")}`,
          selected ? (episode.targetHead?.offered[0]?.label ?? suffix) : `${suffix} ${index}`,
          selected ? `${suffix} selected` : `${suffix} context ${index}`,
          selected ? 0.6 : 0.4 / (injectedFileCount - 1),
        )
      })

      return {
        ...episode,
        operationHead: { offered: operations, selectedId: "CLICK" },
        targetHead: {
          operation: "CLICK",
          offered: targets,
          selectedId: "target-cloud-walk",
        },
      }
    }),
  }
}

export function injectedStudyRuns(condition: StudyCondition): StudyRuns {
  const runs = {} as Record<Locale, ReturnType<typeof projectRun>>
  for (const locale of ["zh", "en"] as const) {
    const base = canonicalRun(locale)
    const longText = locale === "zh" ? longCjk : longEnglish
    const withLongContext: DecisionRun = {
      ...base,
      task: `${base.task}${longText}`,
      report: `${base.report}${longText}${longText}`,
    }
    const decisionRun =
      condition === "baseline" ? withLongContext : heavyHeads(withLongContext, locale)
    runs[locale] = projectRun(decisionRun, condition, injectedFixtureRevision)
  }
  return runs
}

export async function serveInjectedStudyRuns(
  page: Page,
  condition: StudyCondition,
): Promise<StudyRuns> {
  const runs = injectedStudyRuns(condition)
  const manifest = {
    fixtureVersion: "decision-replay/1",
    condition,
    fixtureRevision: injectedFixtureRevision,
    files: { zh: "run.zh.json", en: "run.en.json" },
  } as const

  await page.route("**/study/manifest.json", async (route) => {
    await route.fulfill({ json: manifest })
  })
  await page.route("**/study/run.zh.json", async (route) => {
    await route.fulfill({ json: runs.zh })
  })
  await page.route("**/study/run.en.json", async (route) => {
    await route.fulfill({ json: runs.en })
  })

  return runs
}
