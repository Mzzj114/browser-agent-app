import { Globe2, ImageOff, LockKeyhole, Maximize2 } from "lucide-react"
import type { ReactNode } from "react"
import type { PageState } from "../../domain/run-schema"
import { ActionButton } from "./buttons"

type BrowserFrameProps = {
  readonly pageState: PageState
  readonly onZoom: () => void
  readonly controls?: ReactNode
}

export function BrowserFrame({ pageState, onZoom, controls }: BrowserFrameProps) {
  const screenshot = pageState.screenshot
  return (
    <section className="browser-frame" aria-label="Agent 浏览器">
      <div className="browser-tabs">
        <div className="browser-tab">
          <Globe2 aria-hidden="true" />
          <span>{pageState.title}</span>
        </div>
        <span className="browser-agent-label">Agent 浏览器</span>
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
            alt={`${pageState.title}，录制页面截图`}
            decoding="async"
            fetchPriority="high"
          />
        ) : (
          <div className="missing-screenshot" role="status">
            <ImageOff aria-hidden="true" />
            <strong>此步骤没有可用截图</strong>
            <span>仍可查看上方记录的网址与页面标题。</span>
          </div>
        )}
      </div>
      <div className="browser-stage-toolbar">
        <span className="browser-stage-label">录制页面</span>
        <div className="browser-stage-actions">
          {controls}
          <ActionButton icon={<Maximize2 />} onClick={onZoom} disabled={!screenshot}>
            放大查看
          </ActionButton>
        </div>
      </div>
    </section>
  )
}
