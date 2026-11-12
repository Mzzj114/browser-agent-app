import { z } from "zod"

const screenshotSchema = z
  .strictObject({
    path: z.string().regex(/^screenshots\/.+\.webp$/),
    width: z.number().int().positive(),
    height: z.number().int().positive(),
    source: z.literal("instrumented"),
  })
  .readonly()

const pageStateSchema = z
  .strictObject({
    url: z.url(),
    title: z.string().min(1),
    capturedAt: z.iso.datetime(),
    screenshot: screenshotSchema.nullable(),
  })
  .readonly()

const cellResultSchema = z
  .strictObject({
    content: z.string(),
    isError: z.boolean(),
  })
  .readonly()

const pythonCellSchema = z
  .strictObject({
    tool: z.literal("python"),
    code: z.string().min(1),
    result: cellResultSchema.nullable(),
  })
  .readonly()

const stepSchema = z
  .strictObject({
    id: z
      .string()
      .regex(/^step-\d{2}$/)
      .brand("StepId"),
    ordinal: z.number().int().positive(),
    timestamp: z.iso.datetime(),
    thinking: z.string().min(1).optional(),
    cells: z.array(pythonCellSchema).min(1).readonly(),
    pageState: pageStateSchema,
  })
  .readonly()

const finalResultSchema = z
  .strictObject({
    status: z.union([
      z.literal("completed"),
      z.literal("max_steps"),
      z.literal("timeout"),
      z.literal("error"),
    ]),
    text: z.string().min(1),
    steps: z.number().int().nonnegative(),
    duration_s: z.number().positive(),
    usage: z
      .strictObject({
        input: z.number().int().nonnegative(),
        output: z.number().int().nonnegative(),
        cache_read: z.number().int().nonnegative(),
        cache_write: z.number().int().nonnegative(),
        requests: z.number().int().nonnegative(),
      })
      .readonly(),
    cost_usd: z.number().nonnegative().nullable(),
    partial: z.null(),
    error: z.string().nullable(),
    success: z.boolean().nullable(),
  })
  .readonly()

export const agentRunSchema = z
  .strictObject({
    fixture_version: z.literal("bu-replay/1"),
    source: z.literal("synthetic"),
    engine: z
      .strictObject({
        library: z.literal("browser-use"),
        version: z.literal("1.0.2"),
        model: z.string().min(1),
        vision: z.boolean(),
      })
      .readonly(),
    task: z.string().min(1),
    final: finalResultSchema,
    steps: z.array(stepSchema).readonly(),
    delivery: z
      .strictObject({
        tool: z.union([z.literal("finish"), z.literal("finish_from_repl")]),
        success_arg: z.boolean(),
      })
      .readonly(),
  })
  .readonly()
  .superRefine((run, context) => {
    if (run.final.steps !== run.steps.length) {
      context.addIssue({
        code: "custom",
        path: ["final", "steps"],
        message: "Final step count must match the number of model-response steps",
      })
    }
    for (const [index, step] of run.steps.entries()) {
      if (step.ordinal !== index + 1) {
        context.addIssue({
          code: "custom",
          path: ["steps", index, "ordinal"],
          message: "Step ordinals must be chronological and one-based",
        })
      }
    }
  })

export type AgentRun = z.infer<typeof agentRunSchema>
export type AgentStep = AgentRun["steps"][number]
export type PageState = AgentStep["pageState"]
export type PythonCell = AgentStep["cells"][number]
