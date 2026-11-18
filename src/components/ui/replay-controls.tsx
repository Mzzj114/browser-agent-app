import { ChevronLeft, ChevronRight, RotateCcw } from "lucide-react"
import { useMessages } from "../../i18n"
import { ActionButton, IconButton } from "./buttons"

export type ReplayStep = {
  readonly id: string
  readonly ordinal: number
  readonly action: string
}

type ReplayControlsProps = {
  readonly currentStep: number | null
  readonly steps: readonly ReplayStep[]
  readonly onPrevious: () => void
  readonly onNext: () => void
  readonly onFinal: () => void
  readonly onJump: (stepIndex: number) => void
}

export function ReplayControls({
  currentStep,
  steps,
  onPrevious,
  onNext,
  onFinal,
  onJump,
}: ReplayControlsProps) {
  const messages = useMessages()
  const stepCount = steps.length
  const position =
    currentStep === null
      ? messages.lastRecordedState
      : messages.replayPosition(currentStep + 1, stepCount)
  return (
    <fieldset className="replay-controls" aria-label={messages.replayControlsLabel}>
      <div className="replay-navigation">
        <IconButton
          label={messages.previousStep}
          variant="outlined"
          disabled={currentStep === 0 || stepCount === 0}
          onClick={onPrevious}
        >
          <ChevronLeft />
        </IconButton>
        <span className="replay-position" aria-live="polite">
          {position}
        </span>
        <IconButton
          label={messages.nextStep}
          variant="outlined"
          disabled={currentStep === null || currentStep === stepCount - 1}
          onClick={onNext}
        >
          <ChevronRight />
        </IconButton>
      </div>
      <label className="replay-jump">
        <span>{messages.jumpToStep}</span>
        <select
          className="replay-select"
          aria-label={messages.jumpToStep}
          value={currentStep === null ? "final" : String(currentStep)}
          onChange={(event) => {
            if (event.target.value === "final") {
              onFinal()
            } else {
              onJump(Number(event.target.value))
            }
          }}
        >
          {steps.map((step, index) => (
            <option key={step.id} value={index}>
              {messages.stepOption(step.ordinal, step.action)}
            </option>
          ))}
          <option value="final">{messages.lastRecordedState}</option>
        </select>
      </label>
      <ActionButton icon={<RotateCcw />} onClick={onFinal} disabled={currentStep === null}>
        {messages.returnToFinal}
      </ActionButton>
    </fieldset>
  )
}
