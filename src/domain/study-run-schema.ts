import { z } from "zod"
import { LOCALES, type Locale } from "../i18n/locale.ts"
import {
  decisionOperations,
  type EpisodeCore,
  isTargetlessOperation,
  type Observation,
  type Operation,
} from "./decision-run-schema.ts"
import { studyConditions } from "./study-condition.ts"

const scoreTolerance = 1e-6

const screenshotSchema = z
  .strictObject({
    path: z.string().regex(/^screenshots\/(?:en\/)?[a-z0-9-]+\.webp$/),
    width: z.number().int().positive(),
    height: z.number().int().positive(),
    source: z.literal("synthetic-render"),
  })
  .readonly()

const observationSchema = z
  .strictObject({
    id: z.string().regex(/^obs-\d{2}$/),
    url: z.url(),
    title: z.string().min(1),
    capturedAt: z.iso.datetime(),
    screenshot: screenshotSchema.nullable(),
  })
  .readonly()

const candidateSchema = z
  .strictObject({
    id: z.string().min(1),
    label: z.string().min(1),
    context: z.string().min(1).nullable(),
  })
  .readonly()

const scoredCandidateSchema = z
  .strictObject({
    id: z.string().min(1),
    label: z.string().min(1),
    context: z.string().min(1).nullable(),
    probability: z.number().min(0).max(1),
  })
  .readonly()

const candidateHeadSchema = z
  .strictObject({
    offered: z.array(candidateSchema).min(1).readonly(),
    selectedId: z.string().min(1),
  })
  .readonly()

const candidateTargetHeadSchema = z
  .strictObject({
    operation: z.enum(decisionOperations),
    offered: z.array(candidateSchema).min(1).readonly(),
    selectedId: z.string().min(1),
  })
  .readonly()

const scoredHeadSchema = z
  .strictObject({
    offered: z.array(scoredCandidateSchema).min(1).readonly(),
    selectedId: z.string().min(1),
  })
  .readonly()

const scoredTargetHeadSchema = z
  .strictObject({
    operation: z.enum(decisionOperations),
    offered: z.array(scoredCandidateSchema).min(1).readonly(),
    selectedId: z.string().min(1),
  })
  .readonly()

const outcomeSchema = z
  .strictObject({
    kind: z.enum(["observation", "execution-error"]),
    text: z.string().min(1),
  })
  .readonly()

const coreEpisodeShape = {
  id: z.string().regex(/^episode-\d{2}$/),
  ordinal: z.number().int().positive(),
  action: z.string().min(1),
  operation: z.enum(decisionOperations),
  executedAt: z.iso.datetime(),
  beforeObservationId: z.string().regex(/^obs-\d{2}$/),
  afterObservationId: z.string().regex(/^obs-\d{2}$/),
  outcome: outcomeSchema.nullable(),
  enteredText: z.string().min(1).nullable(),
} as const

const baselineEpisodeSchema = z.strictObject(coreEpisodeShape).readonly()

const candidateEpisodeSchema = z
  .strictObject({
    ...coreEpisodeShape,
    operationHead: candidateHeadSchema,
    targetHead: candidateTargetHeadSchema.nullable(),
  })
  .readonly()

const scoredEpisodeSchema = z
  .strictObject({
    ...coreEpisodeShape,
    operationHead: scoredHeadSchema,
    targetHead: scoredTargetHeadSchema.nullable(),
  })
  .readonly()

const commonRunShape = {
  fixtureVersion: z.literal("decision-replay/1"),
  source: z.literal("synthetic"),
  runId: z.string().min(1),
  locale: z.enum(LOCALES),
  task: z.string().min(1),
  report: z.string().min(1),
  initialObservationId: z.string().regex(/^obs-\d{2}$/),
  finalObservationId: z.string().regex(/^obs-\d{2}$/),
  observations: z.array(observationSchema).min(1).readonly(),
  fixtureRevision: z.string().regex(/^[0-9a-f]{64}$/),
} as const

type CoreRun = {
  readonly observations: readonly Observation[]
  readonly episodes: readonly EpisodeCore[]
  readonly initialObservationId: string
  readonly finalObservationId: string
}

type CandidateLike = {
  readonly id: string
  readonly probability?: number
}

type HeadLike = {
  readonly offered: readonly CandidateLike[]
  readonly selectedId: string
}

type ExperimentEpisode = EpisodeCore & {
  readonly operationHead: HeadLike
  readonly targetHead: (HeadLike & { readonly operation: Operation }) | null
}

type ExperimentRun = {
  readonly observations: readonly Observation[]
  readonly episodes: readonly ExperimentEpisode[]
  readonly initialObservationId: string
  readonly finalObservationId: string
}

function addIssue(
  context: z.RefinementCtx,
  path: readonly (string | number)[],
  message: string,
): void {
  context.addIssue({
    code: "custom",
    path: [...path],
    message,
  })
}

function validateCommonRun(run: CoreRun, context: z.RefinementCtx): void {
  const observationIds = new Set<string>()
  const observationById = new Map<string, Observation>()
  let previousCapturedAt = Number.NEGATIVE_INFINITY

  for (const [index, observation] of run.observations.entries()) {
    if (observationIds.has(observation.id)) {
      addIssue(context, ["observations", index, "id"], "Observation IDs must be unique")
    }
    observationIds.add(observation.id)
    observationById.set(observation.id, observation)

    const capturedAt = Date.parse(observation.capturedAt)
    if (capturedAt < previousCapturedAt) {
      addIssue(
        context,
        ["observations", index, "capturedAt"],
        "Observations must be stored in capture order",
      )
    }
    previousCapturedAt = capturedAt
  }

  if (!observationById.has(run.initialObservationId)) {
    addIssue(context, ["initialObservationId"], "Initial observation must exist")
  }
  if (!observationById.has(run.finalObservationId)) {
    addIssue(context, ["finalObservationId"], "Final observation must exist")
  }

  const firstEpisode = run.episodes[0]
  const lastEpisode = run.episodes.at(-1)
  if (firstEpisode && firstEpisode.beforeObservationId !== run.initialObservationId) {
    addIssue(
      context,
      ["initialObservationId"],
      "Initial observation must be the first before observation",
    )
  }
  if (lastEpisode && lastEpisode.afterObservationId !== run.finalObservationId) {
    addIssue(
      context,
      ["finalObservationId"],
      "Final observation must be the last after observation",
    )
  }

  const episodeIds = new Set<string>()
  for (const [index, episode] of run.episodes.entries()) {
    if (episodeIds.has(episode.id)) {
      addIssue(context, ["episodes", index, "id"], "Episode IDs must be unique")
    }
    episodeIds.add(episode.id)

    if (episode.ordinal !== index + 1) {
      addIssue(
        context,
        ["episodes", index, "ordinal"],
        "Episode ordinals must be chronological and one-based",
      )
    }

    const before = observationById.get(episode.beforeObservationId)
    if (!before) {
      addIssue(context, ["episodes", index, "beforeObservationId"], "Before observation must exist")
    }

    const after = observationById.get(episode.afterObservationId)
    if (!after) {
      addIssue(context, ["episodes", index, "afterObservationId"], "After observation must exist")
    }

    if (before && after) {
      const beforeTime = Date.parse(before.capturedAt)
      const executedTime = Date.parse(episode.executedAt)
      const afterTime = Date.parse(after.capturedAt)
      if (beforeTime > executedTime || executedTime > afterTime) {
        addIssue(
          context,
          ["episodes", index, "executedAt"],
          "Action time must fall between its before and after observations",
        )
      }
    }

    const previousEpisode = run.episodes[index - 1]
    if (previousEpisode && episode.beforeObservationId !== previousEpisode.afterObservationId) {
      addIssue(
        context,
        ["episodes", index, "beforeObservationId"],
        "Each before observation must match the preceding after observation",
      )
    }
  }
}

function validateHead(
  head: HeadLike,
  scored: boolean,
  path: readonly (string | number)[],
  context: z.RefinementCtx,
): void {
  const seenIds = new Set<string>()
  let total = 0
  let maximum = Number.NEGATIVE_INFINITY

  for (const [index, candidate] of head.offered.entries()) {
    if (seenIds.has(candidate.id)) {
      addIssue(context, [...path, "offered", index, "id"], "Candidate IDs must be unique")
    }
    seenIds.add(candidate.id)

    if (scored) {
      const probability = candidate.probability
      if (probability === undefined) {
        addIssue(context, [...path, "offered", index, "probability"], "Probability is required")
        continue
      }
      total += probability
      maximum = Math.max(maximum, probability)
    }
  }

  if (scored && Math.abs(total - 1) > scoreTolerance) {
    addIssue(context, [...path, "offered"], "Head probabilities must sum to one")
  }

  const selected = head.offered.find((candidate) => candidate.id === head.selectedId)
  if (!selected) {
    addIssue(context, [...path, "selectedId"], "Selected ID must reference an offered candidate")
    return
  }

  if (
    scored &&
    selected.probability !== undefined &&
    maximum - selected.probability > scoreTolerance
  ) {
    addIssue(context, [...path, "selectedId"], "Selected candidate must be an argmax")
  }
}

function validateExperimentRun(
  run: ExperimentRun,
  scored: boolean,
  context: z.RefinementCtx,
): void {
  validateCommonRun(run, context)

  run.episodes.forEach((episode, index) => {
    const path = ["episodes", index] as const

    if (episode.operationHead.selectedId !== episode.operation) {
      addIssue(
        context,
        [...path, "operationHead", "selectedId"],
        "Selected operation must match the actual operation",
      )
    }
    validateHead(episode.operationHead, scored, [...path, "operationHead"], context)

    if (isTargetlessOperation(episode.operation)) {
      if (episode.targetHead !== null) {
        addIssue(context, [...path, "targetHead"], `${episode.operation} requires no target head`)
      }
    } else if (episode.targetHead === null) {
      addIssue(context, [...path, "targetHead"], `${episode.operation} requires a target head`)
    }

    if (episode.targetHead) {
      const targetHead = episode.targetHead
      if (targetHead.operation !== episode.operation) {
        addIssue(
          context,
          [...path, "targetHead", "operation"],
          "Target head operation must match the episode operation",
        )
      }
      validateHead(targetHead, scored, [...path, "targetHead"], context)
    }
  })
}

const baselineRunSchema = z
  .strictObject({
    ...commonRunShape,
    condition: z.literal("baseline"),
    episodes: z.array(baselineEpisodeSchema).min(1).readonly(),
  })
  .readonly()
  .superRefine((run, context) => {
    validateCommonRun(run, context)
  })

const candidatesRunSchema = z
  .strictObject({
    ...commonRunShape,
    condition: z.literal("candidates"),
    episodes: z.array(candidateEpisodeSchema).min(1).readonly(),
  })
  .readonly()
  .superRefine((run, context) => {
    validateExperimentRun(run, false, context)
  })

const probabilitiesRunSchema = z
  .strictObject({
    ...commonRunShape,
    condition: z.literal("probabilities"),
    episodes: z.array(scoredEpisodeSchema).min(1).readonly(),
  })
  .readonly()
  .superRefine((run, context) => {
    validateExperimentRun(run, true, context)
  })

export const studyRunSchema = z.discriminatedUnion("condition", [
  baselineRunSchema,
  candidatesRunSchema,
  probabilitiesRunSchema,
])

export type StudyRun = z.infer<typeof studyRunSchema>
export type StudyEpisode = StudyRun["episodes"][number]

export type StudyRunCore = {
  readonly fixtureVersion: "decision-replay/1"
  readonly source: "synthetic"
  readonly runId: string
  readonly locale: Locale
  readonly task: string
  readonly report: string
  readonly initialObservationId: string
  readonly finalObservationId: string
  readonly observations: readonly Observation[]
  readonly episodes: readonly EpisodeCore[]
}

export type StudyRuns = Readonly<Record<Locale, StudyRun>>

export const studyManifestSchema = z
  .strictObject({
    fixtureVersion: z.literal("decision-replay/1"),
    condition: z.enum(studyConditions),
    fixtureRevision: z.string().regex(/^[0-9a-f]{64}$/),
    files: z
      .strictObject({
        zh: z.literal("run.zh.json"),
        en: z.literal("run.en.json"),
      })
      .readonly(),
  })
  .readonly()

export type StudyManifest = z.infer<typeof studyManifestSchema>
