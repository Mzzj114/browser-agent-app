import { Bot, User } from "lucide-react"
import type { ReactNode } from "react"

type MessageBlockProps = {
  readonly name: string
  readonly speaker: "user" | "assistant"
  readonly children: ReactNode
}

export function MessageBlock({ name, speaker, children }: MessageBlockProps) {
  const AvatarIcon = speaker === "user" ? User : Bot

  return (
    <article className="message-block" data-speaker={speaker}>
      <div className="message-header">
        <span className="message-avatar" aria-hidden="true">
          <AvatarIcon />
        </span>
        <h2 className="message-speaker">{name}</h2>
      </div>
      <div className="message-content">{children}</div>
    </article>
  )
}
