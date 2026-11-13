import { X, ZoomIn, ZoomOut } from "lucide-react"
import { useEffect, useRef, useState } from "react"
import type { PageState } from "../../domain/run-schema"
import { useMessages } from "../../i18n"
import { ActionButton, IconButton } from "./buttons"

type ScreenshotPageState = PageState & {
  readonly screenshot: NonNullable<PageState["screenshot"]>
}

type ScreenshotDialogProps = {
  readonly pageState: ScreenshotPageState
  readonly onClose: () => void
}

export function ScreenshotDialog({ pageState, onClose }: ScreenshotDialogProps) {
  const messages = useMessages()
  const dialogRef = useRef<HTMLDialogElement>(null)
  const returnFocusRef = useRef<HTMLElement | null>(null)
  const capturedReturnFocusRef = useRef(false)
  const [zoom, setZoom] = useState<number | "fit">(100)
  const screenshot = pageState.screenshot
  const imageWidth = zoom === "fit" ? "100%" : `${(screenshot.width * zoom) / 100}px`

  useEffect(() => {
    const dialog = dialogRef.current
    if (dialog === null) return
    if (!capturedReturnFocusRef.current) {
      returnFocusRef.current =
        document.activeElement instanceof HTMLElement ? document.activeElement : null
      capturedReturnFocusRef.current = true
    }
    dialog.showModal()
    return () => dialog.removeAttribute("open")
  }, [])

  const closeAndReturnFocus = () => {
    const returnTarget = returnFocusRef.current
    onClose()
    requestAnimationFrame(() => {
      if (returnTarget?.isConnected === true) {
        returnTarget.focus()
      }
    })
  }

  return (
    <dialog
      ref={dialogRef}
      className="screenshot-dialog"
      aria-labelledby="screenshot-dialog-title"
      onClose={closeAndReturnFocus}
    >
      <div className="dialog-toolbar">
        <div>
          <h2 id="screenshot-dialog-title">{messages.dialogTitle}</h2>
          <p>{pageState.title}</p>
        </div>
        <div className="dialog-actions">
          <IconButton
            label={messages.zoomOut}
            variant="dialog"
            disabled={zoom === 50}
            onClick={() => setZoom(zoom === "fit" ? 100 : Math.max(50, zoom - 25))}
          >
            <ZoomOut />
          </IconButton>
          <span className="zoom-value">{zoom === "fit" ? messages.fitValue : `${zoom}%`}</span>
          <IconButton
            label={messages.zoomIn}
            variant="dialog"
            disabled={zoom === 200}
            onClick={() => setZoom(zoom === "fit" ? 125 : Math.min(200, zoom + 25))}
          >
            <ZoomIn />
          </IconButton>
          <ActionButton onClick={() => setZoom("fit")}>{messages.fitWindow}</ActionButton>
          <IconButton
            label={messages.closeScreenshot}
            variant="dialog"
            onClick={() => dialogRef.current?.close()}
          >
            <X />
          </IconButton>
        </div>
      </div>
      <div className="dialog-scroll">
        <img
          src={screenshot.path}
          width={screenshot.width}
          height={screenshot.height}
          style={{ width: imageWidth }}
          alt={messages.dialogAlt(pageState.title)}
        />
      </div>
    </dialog>
  )
}
