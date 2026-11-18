import { compareStudyBuilds } from "./study-build.ts"

function messageOf(error: unknown): string {
  return error instanceof Error ? error.message : String(error)
}

async function main(): Promise<void> {
  const [baseline, candidates, probabilities, ...extra] = process.argv.slice(2)
  if (!baseline || !candidates || !probabilities || extra.length > 0) {
    throw new Error(
      "Usage: node scripts/compare-study-builds.ts <baseline-worktree> <candidates-worktree> <probabilities-worktree>",
    )
  }

  await compareStudyBuilds({ baseline, candidates, probabilities })
  console.log(
    "verified cross-condition study builds: fixture revision, common core, candidate order, and six geometry reports match",
  )
}

try {
  await main()
} catch (error) {
  console.error(`Study comparison failed: ${messageOf(error)}`)
  process.exitCode = 1
}
