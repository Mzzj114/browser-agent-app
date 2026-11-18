import { resolve } from "node:path"
import { studyConditionSchema } from "../src/domain/study-condition.ts"
import { studyCondition } from "../src/study-condition.ts"
import { verifyStudyBuild } from "./study-build.ts"

async function main(): Promise<void> {
  const directory = resolve(process.argv[2] ?? "dist")
  const conditionArgument = process.argv[3]
  const expectedCondition =
    conditionArgument === undefined ? studyCondition : studyConditionSchema.parse(conditionArgument)

  const report = await verifyStudyBuild(directory, expectedCondition)
  console.log(
    `verified ${report.condition} study build in ${directory} (${report.fixtureRevision})`,
  )
}

main().catch((error: unknown) => {
  console.error("Failed to verify study build", error instanceof Error ? error.message : error)
  process.exitCode = 1
})
