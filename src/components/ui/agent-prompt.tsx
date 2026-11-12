import { ArrowUp, Cpu } from "lucide-react"
import { IconButton } from "./buttons"

type AgentPromptProps = {
  readonly model: string
}

export function AgentPrompt({ model }: AgentPromptProps) {
  return (
    <fieldset className="agent-prompt" aria-label="Agent 指令输入">
      <div className="agent-prompt-field">
        <textarea
          className="agent-prompt-input"
          aria-label="Agent 指令（回放模式下不可用）"
          placeholder="继续向 Agent 提问"
          rows={2}
          disabled
        />
        <div className="agent-prompt-footer">
          <span className="agent-prompt-model">
            <Cpu aria-hidden="true" />
            {model}
          </span>
          <span className="agent-prompt-note">回放中 · 输入已禁用</span>
          <IconButton className="agent-prompt-send" label="发送指令" disabled>
            <ArrowUp />
          </IconButton>
        </div>
      </div>
    </fieldset>
  )
}
