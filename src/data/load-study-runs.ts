import type { Candidate, Observation, ScoredCandidate } from "../domain/decision-run-schema.ts"
import type { StudyCondition } from "../domain/study-condition.ts"
import {
  type StudyEpisode,
  type StudyRun,
  type StudyRunIndex,
  type StudyRuns,
  type StudyRunSummary,
  studyRunIndexSchema,
  studyRunSchema,
} from "../domain/study-run-schema.ts"

type CandidateLike = Candidate | ScoredCandidate

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

function assertRunMatchesIndex(
  run: StudyRun,
  locale: "zh" | "en",
  summary: StudyRunSummary,
  index: StudyRunIndex,
): void {
  if (run.locale !== locale) {
    throw new Error(`Study fixture locale mismatch: expected ${locale}, received ${run.locale}`)
  }
  if (run.runId !== summary.id) {
    throw new Error(
      `Study fixture run ID mismatch: expected ${summary.id}, received ${run.runId}`,
    )
  }
  if (run.condition !== index.condition) {
    throw new Error(
      `Study fixture condition mismatch: expected ${index.condition}, received ${run.condition}`,
    )
  }
  if (run.fixtureVersion !== index.fixtureVersion) {
    throw new Error(
      `Study fixture version mismatch for ${locale}: expected ${index.fixtureVersion}, received ${run.fixtureVersion}`,
    )
  }
  if (run.fixtureRevision !== index.fixtureRevision) {
    throw new Error(
      `Study fixture revision mismatch for ${locale}: expected ${index.fixtureRevision}, received ${run.fixtureRevision}`,
    )
  }
  if (run.episodes.length !== summary.steps) {
    throw new Error(
      `Study fixture step count mismatch for ${summary.id}: index lists ${summary.steps}, run has ${run.episodes.length}`,
    )
  }
}

export async function loadRunIndex(
  baseUrl: URL,
  expectedCondition: StudyCondition,
  fetcher: typeof fetch = fetch,
): Promise<StudyRunIndex> {
  const indexUrl = new URL("index.json", baseUrl)
  const indexValue = await readJson(await fetcher(indexUrl), indexUrl)
  const index = studyRunIndexSchema.parse(indexValue)

  if (index.condition !== expectedCondition) {
    throw new Error(
      `Study fixture condition mismatch: expected ${expectedCondition}, received ${index.condition}`,
    )
  }

  return index
}

export async function loadStudyRun(
  baseUrl: URL,
  index: StudyRunIndex,
  runId: string,
  fetcher: typeof fetch = fetch,
): Promise<StudyRuns> {
  const summary = index.runs.find((run) => run.id === runId)
  if (!summary) {
    throw new Error(`Unknown study run: ${runId}`)
  }

  const zhUrl = new URL(`${summary.id}/${summary.files.zh}`, baseUrl)
  const enUrl = new URL(`${summary.id}/${summary.files.en}`, baseUrl)
  const [zhResponse, enResponse] = await Promise.all([fetcher(zhUrl), fetcher(enUrl)])

  const [zhValue, enValue] = await Promise.all([
    readJson(zhResponse, zhUrl),
    readJson(enResponse, enUrl),
  ])

  const zh = studyRunSchema.parse(zhValue)
  const en = studyRunSchema.parse(enValue)

  assertRunMatchesIndex(zh, "zh", summary, index)
  assertRunMatchesIndex(en, "en", summary, index)
  assertMatchingStructure(zh, en)

  return { zh, en }
}
