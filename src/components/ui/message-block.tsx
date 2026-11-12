import type { ReactNode } from "react"

type MessageBlockProps = {
  readonly label: string
  readonly speaker: "user" | "assistant"
  readonly children: ReactNode
}

export function MessageBlock({ label, speaker, children }: MessageBlockProps) {
  return (
    <article className="message-block" data-speaker={speaker}>
      <h2 className="message-label">{label}</h2>
      <div className="message-content">{children}</div>
    </article>
  )
}
