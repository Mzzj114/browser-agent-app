import { ChevronLeft, ChevronRight, RotateCcw } from "lucide-react"
import { useMessages } from "../../i18n"
import { ActionButton, IconButton } from "./buttons"

type ReplayControlsProps = {
  readonly currentStep: number | null
  readonly stepCount: number
  readonly onPrevious: () => void
  readonly onNext: () => void
  readonly onFinal: () => void
}

export function ReplayControls({
  currentStep,
  stepCount,
  onPrevious,
  onNext,
  onFinal,
}: ReplayControlsProps) {
  const messages = useMessages()
  const position =
    currentStep === null ? messages.finalState : messages.replayPosition(currentStep + 1, stepCount)
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
      <ActionButton icon={<RotateCcw />} onClick={onFinal} disabled={currentStep === null}>
        {messages.returnToFinal}
      </ActionButton>
    </fieldset>
  )
}
