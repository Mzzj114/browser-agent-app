import { resolve } from "node:path"
import { writeRunLibrary } from "./run-library.ts"
import { studyConditionFromEnvironment } from "./study-condition.ts"

async function main(): Promise<void> {
  const index = await writeRunLibrary({
    condition: studyConditionFromEnvironment(),
    sourceDir: resolve("fixtures", "agent-runs"),
    outputDir: resolve("public", "runs"),
  })
  console.log(
    `prepared ${index.runs.length} ${index.condition} runs (${index.fixtureRevision}) in public/runs`,
  )
}

main().catch((error: unknown) => {
  console.error("Failed to prepare agent runs", error instanceof Error ? error.message : error)
  process.exitCode = 1
})
