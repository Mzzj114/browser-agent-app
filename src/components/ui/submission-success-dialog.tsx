import type * as React from "react"
import { useEffect, useId, useRef } from "react"
import { useMessages } from "../../i18n"
import { ActionButton } from "./buttons"

type SubmissionSuccessDialogProps = {
  readonly open: boolean
  readonly uploadStatus: "synced" | "retrying" | "failed" | null
  readonly onClose: () => void
}

export function SubmissionSuccessDialog({
  open,
  uploadStatus,
  onClose,
}: SubmissionSuccessDialogProps): React.JSX.Element {
  const messages = useMessages()
  const dialogRef = useRef<HTMLDialogElement>(null)
  const idPrefix = useId()
  const titleId = `${idPrefix}-title`
  const descriptionId = `${idPrefix}-description`

  useEffect(() => {
    const dialog = dialogRef.current
    if (dialog === null) return

    if (open && !dialog.open) {
      if (typeof dialog.showModal === "function") {
        dialog.showModal()
      } else {
        dialog.setAttribute("open", "")
      }
      return
    }

    if (!open && dialog.open) {
      if (typeof dialog.close === "function") {
        dialog.close()
      } else {
        dialog.removeAttribute("open")
      }
    }
  }, [open])

  const uploadLine =
    uploadStatus === null
      ? null
      : uploadStatus === "synced"
        ? messages.study.uploadSynced
        : uploadStatus === "retrying"
          ? messages.study.uploadRetrying
          : messages.study.uploadFailedNotice

  return (
    <dialog
      ref={dialogRef}
      className="submission-success-dialog"
      aria-labelledby={titleId}
      aria-describedby={descriptionId}
      onCancel={(event) => {
        event.preventDefault()
        onClose()
      }}
    >
      <h2 id={titleId} className="submission-success-heading">
        {messages.study.submissionDialogTitle}
      </h2>
      <div id={descriptionId} className="submission-success-body">
        <p>{messages.study.studySubmittedNotice}</p>
        <p className="submission-success-status" role="status" aria-live="polite">
          {uploadLine ?? ""}
        </p>
      </div>
      <div className="submission-success-actions">
        <ActionButton onClick={onClose}>{messages.study.submissionDialogClose}</ActionButton>
      </div>
    </dialog>
  )
}
