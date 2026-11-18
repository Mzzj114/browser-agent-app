import { mkdir, mkdtemp, readFile, writeFile } from "node:fs/promises"
import { tmpdir } from "node:os"
import { dirname, join } from "node:path"
import { writeStudyFixtures } from "../../scripts/study-fixtures.ts"
import type { StudyCondition } from "../../src/domain/study-condition.ts"
import { studyManifestSchema, studyRunSchema } from "../../src/domain/study-run-schema.ts"
import { LOCALES, type Locale } from "../../src/i18n/locale.ts"

// biome-ignore lint/complexity/useLiteralKeys: process.env requires bracket access under noPropertyAccessFromIndexSignature.
const localAppData = process.env["LOCALAPPDATA"]
const temporaryRoot = join(localAppData ?? tmpdir(), "Temp", "opencode")

const minimalWebp = Buffer.from(
  "UklGRiIAAABXRUJQVlA4IBYAAAAwAQCdASoBAAEADsD+JaQAA3AAAAAA",
  "base64",
)

async function referencedScreenshots(studyDirectory: string): Promise<readonly string[]> {
  const manifest = studyManifestSchema.parse(
    JSON.parse(await readFile(join(studyDirectory, "manifest.json"), "utf8")),
  )

  const screenshots = new Set<string>()
  await Promise.all(
    LOCALES.map(async (locale: Locale) => {
      const run = studyRunSchema.parse(
        JSON.parse(await readFile(join(studyDirectory, manifest.files[locale]), "utf8")),
      )
      for (const observation of run.observations) {
        if (observation.screenshot) screenshots.add(observation.screenshot.path)
      }
    }),
  )

  return [...screenshots].sort()
}

export async function writeBuildFixture(condition: StudyCondition): Promise<string> {
  await mkdir(temporaryRoot, { recursive: true })
  const directory = await mkdtemp(join(temporaryRoot, "study-build-"))
  const studyDirectory = join(directory, "study")

  await writeStudyFixtures({ condition, outputDir: studyDirectory })

  await mkdir(join(directory, "assets"), { recursive: true })
  await Promise.all([
    writeFile(
      join(directory, "index.html"),
      '<!doctype html><html lang="en"><head><title>Study build fixture</title></head><body><div id="root"></div><script type="module" src="./assets/index.js"></script></body></html>\n',
      "utf8",
    ),
    writeFile(
      join(directory, "assets", "index.js"),
      'const root = document.querySelector("#root");\nif (root) root.textContent = "study build fixture";\n',
      "utf8",
    ),
  ])

  const screenshots = await referencedScreenshots(studyDirectory)
  await Promise.all(
    screenshots.map(async (screenshot) => {
      const outputPath = join(directory, screenshot)
      await mkdir(dirname(outputPath), { recursive: true })
      await writeFile(outputPath, minimalWebp)
    }),
  )

  return directory
}
