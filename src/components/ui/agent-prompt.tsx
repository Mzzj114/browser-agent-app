import { ArrowUp, Cpu } from "lucide-react"
import { useMessages } from "../../i18n"
import { IconButton } from "./buttons"

type AgentPromptProps = {
  readonly model: string
}

export function AgentPrompt({ model }: AgentPromptProps) {
  const messages = useMessages()
  return (
    <fieldset className="agent-prompt" aria-label={messages.promptLabel}>
      <div className="agent-prompt-field">
        <textarea
          className="agent-prompt-input"
          aria-label={messages.promptInputLabel}
          placeholder={messages.promptPlaceholder}
          rows={2}
          disabled
        />
        <div className="agent-prompt-footer">
          <span className="agent-prompt-model">
            <Cpu aria-hidden="true" />
            {model}
          </span>
          <span className="agent-prompt-note">{messages.promptNote}</span>
          <IconButton className="agent-prompt-send" label={messages.sendPrompt} disabled>
            <ArrowUp />
          </IconButton>
        </div>
      </div>
    </fieldset>
  )
}
