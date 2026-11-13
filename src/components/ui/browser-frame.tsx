import { Globe2, ImageOff, LockKeyhole, Maximize2 } from "lucide-react"
import type { ReactNode } from "react"
import type { PageState } from "../../domain/run-schema"
import { useMessages } from "../../i18n"
import { ActionButton } from "./buttons"

type BrowserFrameProps = {
  readonly pageState: PageState
  readonly onZoom: () => void
  readonly controls?: ReactNode
}

export function BrowserFrame({ pageState, onZoom, controls }: BrowserFrameProps) {
  const messages = useMessages()
  const screenshot = pageState.screenshot
  return (
    <section className="browser-frame" aria-label={messages.browserLabel}>
      <div className="browser-tabs">
        <div className="browser-tab">
          <Globe2 aria-hidden="true" />
          <span>{pageState.title}</span>
        </div>
        <span className="browser-agent-label">{messages.browserLabel}</span>
      </div>
      <div className="browser-address-row">
        <div className="browser-address">
          <LockKeyhole aria-hidden="true" />
          <span>{pageState.url}</span>
        </div>
      </div>
      <div className="browser-viewport">
        {screenshot ? (
          <img
            className="page-screenshot"
            src={screenshot.path}
            width={screenshot.width}
            height={screenshot.height}
            alt={messages.screenshotAlt(pageState.title)}
            decoding="async"
            fetchPriority="high"
          />
        ) : (
          <div className="missing-screenshot" role="status">
            <ImageOff aria-hidden="true" />
            <strong>{messages.missingScreenshotTitle}</strong>
            <span>{messages.missingScreenshotHint}</span>
          </div>
        )}
      </div>
      <div className="browser-stage-toolbar">
        <span className="browser-stage-label">{messages.recordedPage}</span>
        <div className="browser-stage-actions">
          {controls}
          <ActionButton icon={<Maximize2 />} onClick={onZoom} disabled={!screenshot}>
            {messages.zoomScreenshot}
          </ActionButton>
        </div>
      </div>
    </section>
  )
}
