import { Globe2, ImageOff, LockKeyhole } from "lucide-react"
import { useState } from "react"
import { useMessages } from "../../i18n"

export type BrowserFramePageState = {
  readonly url: string
  readonly title: string
  readonly capturedAt: string
  readonly screenshot: {
    readonly path: string
    readonly width: number
    readonly height: number
  } | null
}

type BrowserFrameProps = {
  readonly pageState: BrowserFramePageState
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
  const [failedPath, setFailedPath] = useState<string | null>(null)
  const hasScreenshot = screenshot !== null && failedPath !== screenshot.path
  const isZoomed = hasScreenshot && zoomedPath === screenshot.path
  const toggleZoom = () => {
    if (!hasScreenshot) return
    setZoomedPath((current) => (current === screenshot.path ? null : screenshot.path))
  }
  const markMissing = () => {
    if (screenshot === null) return
    setFailedPath(screenshot.path)
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
        {stateNote === null ? null : <span className="browser-state-badge">{stateNote}</span>}
      </div>
      <div className="browser-viewport">
        {hasScreenshot ? (
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
              onError={markMissing}
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
