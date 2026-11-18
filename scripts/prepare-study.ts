import { resolve } from "node:path"
import { studyCondition } from "../src/study-condition.ts"
import { writeStudyFixtures } from "./study-fixtures.ts"

async function main(): Promise<void> {
  const manifest = await writeStudyFixtures({
    condition: studyCondition,
    outputDir: resolve("public", "study"),
  })
  console.log(
    `prepared ${manifest.condition} study fixtures (${manifest.fixtureRevision}) in public/study`,
  )
}

main().catch((error: unknown) => {
  console.error("Failed to prepare study fixtures", error)
  process.exitCode = 1
})
