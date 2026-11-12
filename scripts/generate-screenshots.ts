import { mkdir } from "node:fs/promises"
import { resolve } from "node:path"
import { chromium } from "playwright"
import { fixtureStates, renderFixturePage } from "./fixture-pages.ts"

const outputDirectory = resolve("public", "screenshots")
await mkdir(outputDirectory, { recursive: true })

const browser = await chromium.launch({ channel: "chrome", headless: true, timeout: 15_000 })
try {
  const page = await browser.newPage({
    viewport: { width: 1200, height: 800 },
    deviceScaleFactor: 1,
  })
  await page.emulateMedia({ reducedMotion: "reduce" })

  for (const state of fixtureStates) {
    await page.setContent(renderFixturePage(state), { waitUntil: "load" })
    await page.evaluate(() => document.fonts.ready.then(() => undefined))
    await page.screenshot({
      path: resolve(outputDirectory, state.file),
      type: "webp",
      quality: 88,
      animations: "disabled",
    })
    console.log(`generated ${state.file}`)
  }
} finally {
  await browser.close()
}
