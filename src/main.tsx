import "@fontsource-variable/inter"
import { mountStudyApp } from "./bootstrap"
import { studyCondition } from "./study-condition"
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

void mountStudyApp(rootElement, new URL(import.meta.env.BASE_URL, document.baseURI), studyCondition)
