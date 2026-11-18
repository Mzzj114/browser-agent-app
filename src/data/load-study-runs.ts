import type { Candidate, Observation, ScoredCandidate } from "../domain/decision-run-schema.ts"
import type { StudyCondition } from "../domain/study-condition.ts"
import {
  type StudyEpisode,
  type StudyManifest,
  type StudyRun,
  type StudyRuns,
  studyManifestSchema,
  studyRunSchema,
} from "../domain/study-run-schema.ts"

type CandidateLike = Candidate | ScoredCandidate

function fixtureUrl(baseUrl: URL, file: string): URL {
  return new URL(file, baseUrl)
}

async function readJson(response: Response, url: URL): Promise<unknown> {
  if (!response.ok) {
    throw new Error(`Failed to load study fixture ${url.href}: HTTP ${response.status}`)
  }
  try {
    return (await response.json()) as unknown
  } catch (error) {
    throw new Error(`Study fixture ${url.href} is not valid JSON`, { cause: error })
  }
}

function candidateStructure(candidate: CandidateLike) {
  return {
    id: candidate.id,
    probability: "probability" in candidate ? (candidate.probability ?? null) : null,
  }
}

function headStructure(head: {
  readonly offered: readonly CandidateLike[]
  readonly selectedId: string
}) {
  return {
    selectedId: head.selectedId,
    offered: head.offered.map(candidateStructure),
  }
}

function screenshotStructure(screenshot: Observation["screenshot"]) {
  if (!screenshot) return null

  return {
    basename: screenshot.path.split("/").at(-1) ?? null,
    width: screenshot.width,
    height: screenshot.height,
  }
}

function episodeStructure(episode: StudyEpisode) {
  const operationHead = "operationHead" in episode ? episode.operationHead : null
  const targetHead = "targetHead" in episode ? episode.targetHead : null

  return {
    id: episode.id,
    ordinal: episode.ordinal,
    operation: episode.operation,
    beforeObservationId: episode.beforeObservationId,
    afterObservationId: episode.afterObservationId,
    outcomeKind: episode.outcome?.kind ?? null,
    hasEnteredText: episode.enteredText !== null,
    operationHead: operationHead ? headStructure(operationHead) : null,
    targetHead: targetHead
      ? {
          operation: targetHead.operation,
          ...headStructure(targetHead),
        }
      : null,
  }
}

function runStructure(run: StudyRun) {
  return {
    initialObservationId: run.initialObservationId,
    finalObservationId: run.finalObservationId,
    observations: run.observations.map((observation) => ({
      id: observation.id,
      screenshot: screenshotStructure(observation.screenshot),
    })),
    episodes: run.episodes.map(episodeStructure),
  }
}

function assertMatchingStructure(zh: StudyRun, en: StudyRun): void {
  if (JSON.stringify(runStructure(zh)) !== JSON.stringify(runStructure(en))) {
    throw new Error("Study fixture structure mismatch between zh and en")
  }
}

function assertLocaleScreenshotDirectories(run: StudyRun): void {
  for (const observation of run.observations) {
    const screenshot = observation.screenshot
    if (!screenshot) continue

    const inEnglishDirectory = screenshot.path.startsWith("screenshots/en/")
    const matchesLocale = run.locale === "en" ? inEnglishDirectory : !inEnglishDirectory
    if (!matchesLocale) {
      throw new Error(
        `Study fixture screenshot locale mismatch for ${run.locale}: ${screenshot.path}`,
      )
    }
  }
}

function assertRunMatchesManifest(
  run: StudyRun,
  locale: "zh" | "en",
  expectedCondition: StudyCondition,
  manifest: StudyManifest,
): void {
  if (run.locale !== locale) {
    throw new Error(`Study fixture locale mismatch: expected ${locale}, received ${run.locale}`)
  }
  if (run.condition !== expectedCondition) {
    throw new Error(
      `Study fixture condition mismatch: expected ${expectedCondition}, received ${run.condition}`,
    )
  }
  if (run.fixtureVersion !== manifest.fixtureVersion) {
    throw new Error(
      `Study fixture version mismatch for ${locale}: expected ${manifest.fixtureVersion}, received ${run.fixtureVersion}`,
    )
  }
  if (run.fixtureRevision !== manifest.fixtureRevision) {
    throw new Error(
      `Study fixture revision mismatch for ${locale}: expected ${manifest.fixtureRevision}, received ${run.fixtureRevision}`,
    )
  }
}

export async function loadStudyRuns(
  baseUrl: URL,
  expectedCondition: StudyCondition,
  fetcher: typeof fetch = fetch,
): Promise<StudyRuns> {
  const manifestUrl = fixtureUrl(baseUrl, "manifest.json")
  const zhUrl = fixtureUrl(baseUrl, "run.zh.json")
  const enUrl = fixtureUrl(baseUrl, "run.en.json")

  const [manifestResponse, zhResponse, enResponse] = await Promise.all([
    fetcher(manifestUrl),
    fetcher(zhUrl),
    fetcher(enUrl),
  ])

  const [manifestValue, zhValue, enValue] = await Promise.all([
    readJson(manifestResponse, manifestUrl),
    readJson(zhResponse, zhUrl),
    readJson(enResponse, enUrl),
  ])

  const manifest = studyManifestSchema.parse(manifestValue)
  if (manifest.condition !== expectedCondition) {
    throw new Error(
      `Study fixture condition mismatch: expected ${expectedCondition}, received ${manifest.condition}`,
    )
  }

  const zh = studyRunSchema.parse(zhValue)
  const en = studyRunSchema.parse(enValue)

  assertRunMatchesManifest(zh, "zh", expectedCondition, manifest)
  assertRunMatchesManifest(en, "en", expectedCondition, manifest)
  assertLocaleScreenshotDirectories(zh)
  assertLocaleScreenshotDirectories(en)
  assertMatchingStructure(zh, en)

  return { zh, en }
}
