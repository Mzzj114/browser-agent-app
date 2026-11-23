import type * as React from "react"
import { useMessages } from "../../i18n"

type StudySubmittedNoticeProps = {
  readonly uploadStatus: "delivered" | "retrying" | "failed"
}

/**
 * The standalone screen for a case link that was already submitted in this
 * browser: a reload or the back button must never revive a blank form.
 */
export function StudySubmittedNotice({
  uploadStatus,
}: StudySubmittedNoticeProps): React.JSX.Element {
  const messages = useMessages()

  const line =
    uploadStatus === "delivered"
      ? messages.study.uploadSynced
      : uploadStatus === "retrying"
        ? messages.study.uploadRetrying
        : messages.study.uploadFailedNotice

  return (
    <main className="study-bootstrap" role="status">
      <h1>{messages.study.studySubmittedNotice}</h1>
      <p>{line}</p>
    </main>
  )
}
