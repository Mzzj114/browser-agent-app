import "@testing-library/jest-dom/vitest"
import { cleanup } from "@testing-library/react"
import { afterEach, beforeEach } from "vitest"
import { LOCALE_STORAGE_KEY } from "../src/i18n/locale"

// Pin the interface language so component assertions stay deterministic in jsdom.
beforeEach(() => {
  window.history.replaceState(null, "", "/")
  window.localStorage.clear()
  window.localStorage.setItem(LOCALE_STORAGE_KEY, "zh")
})

afterEach(cleanup)
