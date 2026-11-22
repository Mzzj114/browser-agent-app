import { createHash } from "node:crypto"
import { readFile } from "node:fs/promises"
import {
  decisionOperations,
  type DecisionRun,
  decisionRunSchema as canonicalRunSchema,
  isTargetlessOperation,
  type Operation,
  type ScoredCandidate,
} from "../src/domain/decision-run-schema.ts"

export type Translations = {
  readonly tasks: Readonly<Record<string, string>>
  readonly actions: Readonly<Record<string, string>>
  readonly taskTitles: Readonly<
    Record<string, { readonly en: string; readonly zh: string }>
  >
  readonly roles: Readonly<Record<string, string>>
  readonly operations: Readonly<Record<Operation, string>>
}

export type SourceMeta = {
  readonly run_id: string
  readonly task_id: string
  readonly scenario: string
  readonly condition: string
  readonly seed: number | string
  readonly instruction: string
  readonly started_at: string
}

export type SourceStep = {
  readonly step: number
  readonly action: string
  readonly operation: Operation
  readonly target?: string | null
  readonly text?: string | null
  readonly url?: string
  readonly pre_frame: string
  readonly elapsed_ms: number
  readonly decision_index: number
  readonly confidence?: number
  readonly target_confidence?: number
}

type SourceCriteriaValue = {
  readonly element?: string
  readonly role?: string
  readonly current_value?: string
}

export type SourceDecision = {
  readonly operation: Operation
  readonly target?: string | null
  readonly choice?: string
  readonly operation_probabilities?: Readonly<Record<string, number>>
  readonly raw_answers?: Readonly<
    Record<
      string,
      {
        readonly choice?: string
        readonly probabilities?: Readonly<Record<string, number>>
      }
    >
  >
  readonly request?: {
    readonly questions?: Readonly<
      Record<string, { readonly criteria?: Readonly<Record<string, SourceCriteriaValue>> }>
    >
  }
}

export type SourceTrace = {
  readonly initial_frame?: string | null
  readonly final_frame?: string | null
  readonly final_page?: {
    readonly url?: string
    readonly title?: string
    readonly text?: string
  }
  readonly steps: readonly SourceStep[]
  readonly decisions: readonly SourceDecision[]
}

export type FrameSize = { readonly width: number; readonly height: number }

export type FrameSizeReader = (frame: string) => FrameSize

const cp1252Bytes = new Map<number, number>([
  [0x20ac, 0x80],
  [0x201a, 0x82],
  [0x0192, 0x83],
  [0x201e, 0x84],
  [0x2026, 0x85],
  [0x2020, 0x86],
  [0x2021, 0x87],
  [0x02c6, 0x88],
  [0x2030, 0x89],
  [0x0160, 0x8a],
  [0x2039, 0x8b],
  [0x0152, 0x8c],
  [0x017d, 0x8e],
  [0x2018, 0x91],
  [0x2019, 0x92],
  [0x201c, 0x93],
  [0x201d, 0x94],
  [0x2022, 0x95],
  [0x2013, 0x96],
  [0x2014, 0x97],
  [0x02dc, 0x98],
  [0x2122, 0x99],
  [0x0161, 0x9a],
  [0x203a, 0x9b],
  [0x0153, 0x9c],
  [0x017e, 0x9e],
  [0x0178, 0x9f],
])

export function repairMojibake(value: string): string {
  const bytes: number[] = []
  for (const character of value) {
    const code = character.codePointAt(0) ?? 0
    if (code <= 0xff) {
      bytes.push(code)
      continue
    }
    const mapped = cp1252Bytes.get(code)
    if (mapped === undefined) return value
    bytes.push(mapped)
  }

  const decoded = Buffer.from(bytes).toString("utf8")
  return decoded.includes("\uFFFD") ? value : decoded
}

function assertCompleteTranslations(
  instructions: readonly string[],
  actions: readonly string[],
  translations: Translations,
): void {
  const missingTasks = instructions.filter((task) => !translations.tasks[task])
  const missingActions = actions.filter((action) => !translations.actions[action])
  if (missingTasks.length > 0 || missingActions.length > 0) {
    const lines = [
      ...missingTasks.map((task) => `  task: ${JSON.stringify(task)}`),
      ...missingActions.map((action) => `  action: ${JSON.stringify(action)}`),
    ]
    throw new Error(`Missing Chinese translations:\n${lines.join("\n")}`)
  }
}

function roleLabel(role: string | undefined, translations: Translations): string {
  if (role === undefined || role === "") return translations.roles["link"] ?? "link"
  const translated = translations.roles[role]
  if (translated === undefined) {
    throw new Error(`Missing Chinese translation for candidate role ${JSON.stringify(role)}`)
  }
  return translated
}

function candidateContext(
  criteria: SourceCriteriaValue | undefined,
  translations: Translations,
  locale: "zh" | "en",
): string | null {
  if (!criteria) return null
  const role = criteria.role ?? "link"
  const value = criteria.current_value?.trim()
  if (!value) return locale === "zh" ? roleLabel(role, translations) : role
  return locale === "zh"
    ? `${roleLabel(role, translations)} · 当前值：${value}`
    : `${role} · current: ${value}`
}

function candidateLabel(criteria: SourceCriteriaValue | undefined, id: string): string {
  const element = criteria?.element?.trim()
  if (element) return repairMojibake(element)
  return `[${id}] ${criteria?.role ?? "element"}`
}

function requiredConfidence(
  runId: string,
  step: SourceStep,
  value: number | undefined,
  field: "confidence" | "target_confidence",
): number {
  if (typeof value !== "number" || !Number.isFinite(value) || value < 0 || value > 1) {
    throw new Error(`Run ${runId} step ${step.step} has an invalid ${field}`)
  }
  return value
}

function operationHead(
  decision: SourceDecision,
  translations: Translations,
  locale: "zh" | "en",
  reportedConfidence: number,
): {
  readonly offered: readonly ScoredCandidate[]
  readonly selectedId: string
  readonly reportedConfidence: number
} {
  const probabilities = decision.operation_probabilities ?? {}
  const offered = decisionOperations.flatMap((operation): ScoredCandidate[] => {
    const probability = probabilities[operation]
    if (probability === undefined) return []
    return [
      {
        id: operation,
        label: locale === "zh" ? translations.operations[operation] : operationLabel(operation),
        context: null,
        probability,
      },
    ]
  })

  if (offered.length === 0) {
    throw new Error("Decision has no operation probabilities")
  }

  return { offered, selectedId: decision.operation, reportedConfidence }
}

const questionByOperation = {
  CLICK: "click_target",
  TYPE_TEXT: "type_text_target",
  SELECT: "select_target",
} as const

function targetHead(
  step: SourceStep,
  decision: SourceDecision,
  translations: Translations,
  locale: "zh" | "en",
  reportedConfidence: number,
): {
  readonly operation: Operation
  readonly offered: readonly ScoredCandidate[]
  readonly selectedId: string
  readonly reportedConfidence: number
} | null {
  if (isTargetlessOperation(step.operation)) return null

  const question = questionByOperation[step.operation as keyof typeof questionByOperation]
  const answer = decision.raw_answers?.[question]
  const criteria = decision.request?.questions?.[question]?.criteria
  if (!answer || !criteria) {
    throw new Error(`Decision is missing target evidence for ${step.operation}`)
  }

  const probabilities = answer.probabilities ?? {}
  const offered = Object.keys(probabilities).map((id): ScoredCandidate => {
    const probability = probabilities[id] ?? 0
    return {
      id,
      label: candidateLabel(criteria[id], id),
      context: candidateContext(criteria[id], translations, locale),
      probability,
    }
  })

  const selectedId = answer.choice ?? step.target
  if (!selectedId || offered.every((candidate) => candidate.id !== selectedId)) {
    throw new Error(`Decision selected an unknown target for ${step.operation}`)
  }

  return { operation: step.operation, offered, selectedId, reportedConfidence }
}

function operationLabel(operation: Operation): string {
  switch (operation) {
    case "CLICK":
      return "Click"
    case "TYPE_TEXT":
      return "Type text"
    case "SELECT":
      return "Select"
    case "SCROLL_DOWN":
      return "Scroll down"
    case "SCROLL_UP":
      return "Scroll up"
    case "WAIT":
      return "Wait"
    case "DONE":
      return "Done"
    case "BLOCKED":
      return "Blocked"
  }
}

function parseTimestamp(value: string | undefined): number {
  if (!value) return 0
  const normalized = /[zZ]|[+-]\d{2}:?\d{2}$/.test(value) ? value : `${value}Z`
  const parsed = Date.parse(normalized)
  return Number.isNaN(parsed) ? 0 : parsed
}

function iso(timestamp: number): string {
  return new Date(timestamp).toISOString()
}

function pad(index: number): string {
  return index.toString().padStart(2, "0")
}

export type CanonicalRunPair = {
  readonly en: DecisionRun
  readonly zh: DecisionRun
  readonly revision: string
}

export function buildCanonicalRuns(input: {
  readonly runId: string
  readonly meta: SourceMeta
  readonly trace: SourceTrace
  readonly translations: Translations
  readonly frameSize: FrameSizeReader
  readonly finishedAt?: string | undefined
}): CanonicalRunPair {
  const { runId, meta, trace, translations, frameSize } = input
  const steps = trace.steps
  if (steps.length === 0) throw new Error(`Run ${runId} has no steps`)

  const title = repairMojibake(trace.final_page?.title ?? "Recorded page")
  const finalUrl = trace.final_page?.url ?? steps.at(-1)?.url ?? meta.instruction
  const startedAt = parseTimestamp(meta.started_at)
  const finishedAt = input.finishedAt ? parseTimestamp(input.finishedAt) : 0
  const lastElapsed = steps.at(-1)?.elapsed_ms ?? 0
  const finalTime = Math.max(finishedAt, startedAt + lastElapsed + 1000)

  const observations = Array.from({ length: steps.length + 1 }, (_, index) => {
    const isFinal = index === steps.length
    const step = steps[index]
    const frame = isFinal
      ? (trace.final_frame ?? steps.at(-1)?.pre_frame)
      : (step?.pre_frame ?? trace.initial_frame)
    if (!frame) throw new Error(`Run ${runId} is missing a frame at observation ${index}`)
    if (!/^[A-Za-z0-9_.-]+$/.test(frame)) {
      throw new Error(`Run ${runId} has an invalid frame name: ${frame}`)
    }

    const size = frameSize(frame)
    const capturedAt = isFinal
      ? finalTime
      : index === 0
        ? startedAt
        : startedAt + (step?.elapsed_ms ?? lastElapsed)

    return {
      id: `obs-${pad(index)}`,
      url: isFinal ? finalUrl : (step?.url ?? finalUrl),
      title,
      capturedAt: iso(capturedAt),
      screenshot: {
        path: `frames/${frame}`,
        width: size.width,
        height: size.height,
        source: "recorded" as const,
      },
    }
  })

  const repairedTasks = repairMojibake(meta.instruction)
  const repairedActions = steps.map((step) => repairMojibake(step.action))
  assertCompleteTranslations([repairedTasks], repairedActions, translations)

  const observationTime = (index: number): number => Date.parse(observations[index]?.capturedAt ?? "")
  const episodePairs = steps.map((step, index) => {
    const decision = trace.decisions[step.decision_index]
    if (!decision) {
      throw new Error(`Run ${runId} step ${step.step} has no decision`)
    }

    const before = observationTime(index)
    const after = observationTime(index + 1)
    const executedAt = before + Math.floor(Math.max(0, after - before) / 2)
    const action = repairedActions[index] ?? step.action
    const translatedAction = translations.actions[action]
    if (translatedAction === undefined) {
      throw new Error(`Run ${runId} action has no translation: ${JSON.stringify(action)}`)
    }

    const reportedConfidence = requiredConfidence(runId, step, step.confidence, "confidence")
    const targetReportedConfidence = isTargetlessOperation(step.operation)
      ? null
      : requiredConfidence(runId, step, step.target_confidence, "target_confidence")

    const core = {
      id: `episode-${pad(index + 1)}`,
      ordinal: index + 1,
      operation: step.operation,
      executedAt: iso(executedAt),
      beforeObservationId: `obs-${pad(index)}`,
      afterObservationId: `obs-${pad(index + 1)}`,
      outcome: null,
      enteredText: step.text && step.text.trim() !== "" ? step.text : null,
    }

    return {
      en: {
        ...core,
        action,
        operationHead: operationHead(decision, translations, "en", reportedConfidence),
        targetHead: targetHead(step, decision, translations, "en", targetReportedConfidence ?? 0),
      },
      zh: {
        ...core,
        action: translatedAction,
        operationHead: operationHead(decision, translations, "zh", reportedConfidence),
        targetHead: targetHead(step, decision, translations, "zh", targetReportedConfidence ?? 0),
      },
    }
  })

  const en = canonicalRunSchema.parse({
    fixtureVersion: "decision-replay/2",
    source: "recorded",
    runId,
    locale: "en",
    task: repairedTasks,
    initialObservationId: "obs-00",
    finalObservationId: `obs-${pad(steps.length)}`,
    observations,
    episodes: episodePairs.map((pair) => pair.en),
  })
  const zh = canonicalRunSchema.parse({
    ...en,
    locale: "zh",
    task: translations.tasks[repairedTasks],
    episodes: episodePairs.map((pair) => pair.zh),
  })

  const revision = createHash("sha256")
    .update(JSON.stringify(en))
    .update(JSON.stringify(zh))
    .update(
      JSON.stringify(
        [...new Set(observations.map((observation) => observation.screenshot.path))].sort(),
      ),
    )
    .digest("hex")

  return { en, zh, revision }
}

export function combinationRevision(revisions: readonly string[]): string {
  return createHash("sha256").update([...revisions].sort().join("\n")).digest("hex")
}

export async function readJpegSize(path: string): Promise<FrameSize> {
  const buffer = await readFile(path)
  if (buffer[0] !== 0xff || buffer[1] !== 0xd8) {
    throw new Error(`Not a JPEG: ${path}`)
  }

  let offset = 2
  while (offset < buffer.length) {
    if (buffer[offset] !== 0xff) {
      offset += 1
      continue
    }
    const marker = buffer[offset + 1]
    if (marker === undefined) break
    if (marker === 0xd8 || marker === 0xd9) {
      offset += 2
      continue
    }
    const length = buffer.readUInt16BE(offset + 2)
    const isStartOfFrame =
      marker >= 0xc0 && marker <= 0xcf && marker !== 0xc4 && marker !== 0xc8 && marker !== 0xcc
    if (isStartOfFrame) {
      return {
        height: buffer.readUInt16BE(offset + 5),
        width: buffer.readUInt16BE(offset + 7),
      }
    }
    offset += 2 + length
  }

  throw new Error(`Could not read JPEG dimensions: ${path}`)
}
