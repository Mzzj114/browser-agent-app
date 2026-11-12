import "@testing-library/jest-dom/vitest"
import { cleanup } from "@testing-library/react"
import { afterEach } from "vitest"

afterEach(cleanup)

// jsdom does not implement the dialog top layer. These methods preserve its observable open/close contract.
HTMLDialogElement.prototype.showModal = function showModal(): void {
  this.setAttribute("open", "")
}
HTMLDialogElement.prototype.close = function close(): void {
  this.removeAttribute("open")
  this.dispatchEvent(new Event("close"))
}
