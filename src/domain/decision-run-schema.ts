import { z } from "zod"

export const decisionOperations = [
  "CLICK",
  "TYPE_TEXT",
  "SELECT",
  "SCROLL_DOWN",
  "SCROLL_UP",
  "WAIT",
  "DONE",
  "BLOCKED",
] as const

export type Operation = (typeof decisionOperations)[number]

const scoreTolerance = 1e-6

const targetlessOperations = new Set<Operation>([
  "SCROLL_DOWN",
  "SCROLL_UP",
  "WAIT",
  "DONE",
  "BLOCKED",
])

export function isTargetlessOperation(operation: Operation): boolean {
  return targetlessOperations.has(operation)
}

const screenshotSchema = z
  .strictObject({
    path: z
      .string()
      .regex(
        /^(?:runs\/[A-Za-z0-9][A-Za-z0-9_-]*\/)?(?:frames\/|screenshots\/(?:en\/)?)[A-Za-z0-9_.-]+\.(?:jpe?g|png|webp)$/,
      ),
    width: z.number().int().positive(),
    height: z.number().int().positive(),
    source: z.enum(["recorded", "synthetic-render"]),
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

const reportedConfidenceSchema = z.number().min(0).max(1).nullable()

const operationHeadSchema = z
  .strictObject({
    offered: z.array(scoredCandidateSchema).min(1).readonly(),
    selectedId: z.string().min(1),
    reportedConfidence: reportedConfidenceSchema.optional(),
  })
  .readonly()

const targetHeadSchema = z
  .strictObject({
    operation: z.enum(decisionOperations),
    offered: z.array(scoredCandidateSchema).min(1).readonly(),
    selectedId: z.string().min(1),
    reportedConfidence: reportedConfidenceSchema.optional(),
  })
  .readonly()

const outcomeSchema = z
  .strictObject({
    kind: z.enum(["observation", "execution-error"]),
    text: z.string().min(1),
  })
  .readonly()

const episodeSchema = z
  .strictObject({
    id: z.string().regex(/^episode-\d{2}$/),
    ordinal: z.number().int().positive(),
    action: z.string().min(1),
    operation: z.enum(decisionOperations),
    executedAt: z.iso.datetime(),
    beforeObservationId: z.string().regex(/^obs-\d{2}$/),
    afterObservationId: z.string().regex(/^obs-\d{2}$/),
    outcome: outcomeSchema.nullable(),
    enteredText: z.string().min(1).nullable(),
    operationHead: operationHeadSchema,
    targetHead: targetHeadSchema.nullable(),
  })
  .readonly()

export type Observation = z.infer<typeof observationSchema>
export type Candidate = z.infer<typeof candidateSchema>
export type ScoredCandidate = z.infer<typeof scoredCandidateSchema>

export type DecisionHead<T> = {
  readonly offered: readonly T[]
  readonly selectedId: string
  readonly reportedConfidence?: number | null
}

/** Parsed Zod heads expose optional fields with an explicit `undefined` under exactOptionalPropertyTypes. */
export type DecisionHeadInput<T> = {
  readonly offered: readonly T[]
  readonly selectedId: string
  readonly reportedConfidence?: number | null | undefined
}

export type TargetDecisionHead = DecisionHead<ScoredCandidate> & {
  readonly operation: Operation
}

export type TargetDecisionHeadInput = DecisionHeadInput<ScoredCandidate> & {
  readonly operation: Operation
}

export type EpisodeCore = {
  readonly id: string
  readonly ordinal: number
  readonly action: string
  readonly operation: Operation
  readonly executedAt: string
  readonly beforeObservationId: string
  readonly afterObservationId: string
  readonly outcome: {
    readonly kind: "observation" | "execution-error"
    readonly text: string
  } | null
  readonly enteredText: string | null
}

type CanonicalEpisode = EpisodeCore & {
  readonly operationHead: DecisionHead<ScoredCandidate>
  readonly targetHead: TargetDecisionHead | null
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

function validateScoredHead(
  head: { readonly offered: readonly ScoredCandidate[]; readonly selectedId: string },
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
    total += candidate.probability
    maximum = Math.max(maximum, candidate.probability)
  }

  if (Math.abs(total - 1) > scoreTolerance) {
    addIssue(context, [...path, "offered"], "Head probabilities must sum to one")
  }

  const selected = head.offered.find((candidate) => candidate.id === head.selectedId)
  if (!selected) {
    addIssue(context, [...path, "selectedId"], "Selected ID must reference an offered candidate")
    return
  }

  if (maximum - selected.probability > scoreTolerance) {
    addIssue(context, [...path, "selectedId"], "Selected candidate must be an argmax")
  }
}

function validateRecordedConfidence(
  head: DecisionHeadInput<ScoredCandidate>,
  path: readonly (string | number)[],
  context: z.RefinementCtx,
): void {
  if (typeof head.reportedConfidence !== "number" || !Number.isFinite(head.reportedConfidence)) {
    addIssue(
      context,
      [...path, "reportedConfidence"],
      "Recorded heads must report a finite confidence",
    )
  }
}

export const decisionRunSchema = z
  .strictObject({
    fixtureVersion: z.literal("decision-replay/2"),
    source: z.enum(["recorded", "synthetic-render"]),
    runId: z.string().min(1),
    locale: z.enum(["zh", "en"]),
    task: z.string().min(1),
    initialObservationId: z.string().regex(/^obs-\d{2}$/),
    finalObservationId: z.string().regex(/^obs-\d{2}$/),
    observations: z.array(observationSchema).min(1).readonly(),
    episodes: z.array(episodeSchema).min(1).readonly(),
  })
  .readonly()
  .superRefine((run, context) => {
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
        addIssue(
          context,
          ["episodes", index, "beforeObservationId"],
          "Before observation must exist",
        )
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

      if (episode.operationHead.selectedId !== episode.operation) {
        addIssue(
          context,
          ["episodes", index, "operationHead", "selectedId"],
          "Selected operation must match the actual operation",
        )
      }
      validateScoredHead(episode.operationHead, ["episodes", index, "operationHead"], context)
      if (run.source === "recorded") {
        validateRecordedConfidence(
          episode.operationHead,
          ["episodes", index, "operationHead"],
          context,
        )
      }

      if (isTargetlessOperation(episode.operation)) {
        if (episode.targetHead !== null) {
          addIssue(
            context,
            ["episodes", index, "targetHead"],
            `${episode.operation} requires no target head`,
          )
        }
      } else if (episode.targetHead === null) {
        addIssue(
          context,
          ["episodes", index, "targetHead"],
          `${episode.operation} requires a target head`,
        )
      }

      if (episode.targetHead) {
        const targetHead = episode.targetHead
        if (targetHead.operation !== episode.operation) {
          addIssue(
            context,
            ["episodes", index, "targetHead", "operation"],
            "Target head operation must match the episode operation",
          )
        }
        validateScoredHead(targetHead, ["episodes", index, "targetHead"], context)
        if (run.source === "recorded") {
          validateRecordedConfidence(targetHead, ["episodes", index, "targetHead"], context)
        }
      }
    }
  })

export type DecisionRun = z.infer<typeof decisionRunSchema>
export type DecisionEpisode = CanonicalEpisode
