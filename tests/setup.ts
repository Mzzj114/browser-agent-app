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

// jsdom does not implement the dialog top layer. These methods preserve its observable open/close contract.
HTMLDialogElement.prototype.showModal = function showModal(): void {
  this.setAttribute("open", "")
}
HTMLDialogElement.prototype.close = function close(): void {
  this.removeAttribute("open")
  this.dispatchEvent(new Event("close"))
}
