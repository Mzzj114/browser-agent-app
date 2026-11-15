import { Globe2, ImageOff, LockKeyhole } from "lucide-react"
import { useState } from "react"
import type { PageState } from "../../domain/run-schema"
import { useMessages } from "../../i18n"

type BrowserFrameProps = {
  readonly pageState: PageState
  readonly stepCount: number
  readonly stateLabel: string
  readonly stateNote: string | null
  readonly actionLabel: string | null
  readonly capturedAtLabel: string
}

export function BrowserFrame({
  pageState,
  stepCount,
  stateLabel,
  stateNote,
  actionLabel,
  capturedAtLabel,
}: BrowserFrameProps) {
  const messages = useMessages()
  const screenshot = pageState.screenshot
  const [zoomedPath, setZoomedPath] = useState<string | null>(null)
  const isZoomed = screenshot !== null && zoomedPath === screenshot.path
  const toggleZoom = () => {
    if (screenshot === null) return
    setZoomedPath((current) => (current === screenshot.path ? null : screenshot.path))
  }
  return (
    <section className="browser-frame" aria-label={messages.browserLabel}>
      <div className="browser-tabs">
        <div className="browser-tab">
          <Globe2 aria-hidden="true" />
          <span>{pageState.title}</span>
        </div>
        <span className="browser-agent-label">{messages.recordedExecution(stepCount)}</span>
      </div>
      <div className="browser-address-row">
        <div className="browser-address">
          <LockKeyhole aria-hidden="true" />
          <span>{pageState.url}</span>
        </div>
      </div>
      <div className="browser-evidence-caption">
        <span className="browser-state-label" aria-live="polite">
          {stateLabel}
        </span>
        {actionLabel === null ? null : <span className="browser-state-action">{actionLabel}</span>}
        <time className="browser-state-time" dateTime={pageState.capturedAt}>
          {capturedAtLabel}
        </time>
        {stateNote === null ? null : (
          <span className="browser-state-badge">{stateNote}</span>
        )}
      </div>
      <div className="browser-viewport">
        {screenshot ? (
          <button
            type="button"
            className="screenshot-trigger"
            data-zoomed={isZoomed}
            onClick={toggleZoom}
            aria-label={isZoomed ? messages.fitScreenshot : messages.zoomScreenshot}
          >
            <img
              className="page-screenshot"
              src={screenshot.path}
              width={screenshot.width}
              height={screenshot.height}
              alt={messages.screenshotAlt(pageState.title)}
              decoding="async"
              fetchPriority="high"
            />
          </button>
        ) : (
          <div className="missing-screenshot" role="status">
            <ImageOff aria-hidden="true" />
            <strong>{messages.missingScreenshotTitle}</strong>
            <span>{messages.missingScreenshotHint}</span>
          </div>
        )}
      </div>
    </section>
  )
}
