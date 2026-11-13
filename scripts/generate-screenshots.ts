import { mkdir } from "node:fs/promises"
import { dirname, resolve } from "node:path"
import { chromium } from "playwright"
import { fixtureLocales, fixtureStatesFor, renderFixturePage } from "./fixture-pages.ts"

const browser = await chromium.launch({ channel: "chrome", headless: true, timeout: 15_000 })
try {
  const page = await browser.newPage({
    viewport: { width: 1200, height: 800 },
    deviceScaleFactor: 1,
  })
  await page.emulateMedia({ reducedMotion: "reduce" })

  for (const locale of fixtureLocales) {
    for (const state of fixtureStatesFor(locale)) {
      const outputPath = resolve("public", "screenshots", state.file)
      await mkdir(dirname(outputPath), { recursive: true })
      await page.setContent(renderFixturePage(state, locale), { waitUntil: "load" })
      await page.evaluate(() => document.fonts.ready.then(() => undefined))
      await page.screenshot({
        path: outputPath,
        type: "webp",
        quality: 88,
        animations: "disabled",
      })
      console.log(`generated ${state.file}`)
    }
  }
} finally {
  await browser.close()
}
