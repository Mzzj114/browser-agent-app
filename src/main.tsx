import "@fontsource-variable/inter"
import { StrictMode } from "react"
import { createRoot } from "react-dom/client"
import { App } from "./App"
import "./styles/index.css"

class MissingRootElementError extends Error {
  public constructor() {
    super("Application root element is missing")
    this.name = "MissingRootElementError"
  }
}

const rootElement = document.querySelector("#root")
if (!(rootElement instanceof HTMLElement)) {
  throw new MissingRootElementError()
}

createRoot(rootElement).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
