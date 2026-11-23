import { spawn } from "node:child_process"
import { copyFile, rm, writeFile } from "node:fs/promises"
import { resolve } from "node:path"
import { type StudyCondition, studyConditions } from "../src/domain/study-condition.ts"
import { writeRunLibrary } from "./run-library.ts"
import { verifyStudyBuild } from "./study-build.ts"
import { studyConditionRoutes } from "./study-condition.ts"

const distRoot = resolve("dist")
const fixturesDirectory = resolve("public", "runs")
const indexTemplate = resolve("scripts", "study-sites-index.html")
const viteBin = resolve("node_modules", "vite", "bin", "vite.js")

function run(command: string, args: readonly string[], environment: NodeJS.ProcessEnv) {
  return new Promise<void>((settle, fail) => {
    const child = spawn(command, [...args], { env: environment, stdio: "inherit" })
    child.on("error", fail)
    child.on("exit", (code) => {
      if (code === 0) {
        settle()
      } else {
        fail(new Error(`${command} ${args.join(" ")} exited with code ${String(code)}`))
      }
    })
  })
}

async function buildCondition(condition: StudyCondition): Promise<void> {
  await writeRunLibrary({
    condition,
    sourceDir: resolve("fixtures", "agent-runs"),
    outputDir: fixturesDirectory,
  })

  const route = studyConditionRoutes[condition]
  const outputDirectory = resolve(distRoot, route)
  await run(process.execPath, [viteBin, "build", "--outDir", outputDirectory, "--emptyOutDir"], {
    ...process.env,
    VITE_STUDY_CONDITION: condition,
  })

  const report = await verifyStudyBuild(outputDirectory, condition)
  console.log(`built ${report.condition} in dist/${route} (${report.fixtureRevision})`)
}

async function main(): Promise<void> {
  await rm(distRoot, { recursive: true, force: true })

  for (const condition of studyConditions) {
    await buildCondition(condition)
  }

  await copyFile(indexTemplate, resolve(distRoot, "index.html"))
  await writeFile(resolve(distRoot, "robots.txt"), "User-agent: *\nDisallow: /\n")
  console.log(`assembled participant sites in ${distRoot}`)
}

main().catch((error: unknown) => {
  console.error("Failed to build study sites", error instanceof Error ? error.message : error)
  process.exitCode = 1
})
