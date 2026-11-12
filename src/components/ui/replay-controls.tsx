import { ChevronLeft, ChevronRight, RotateCcw } from "lucide-react"
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
  const position = currentStep === null ? "最终状态" : `步骤 ${currentStep + 1} / ${stepCount}`
  return (
    <fieldset className="replay-controls" aria-label="页面回放控制">
      <div className="replay-navigation">
        <IconButton
          label="上一步"
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
          label="下一步"
          variant="outlined"
          disabled={currentStep === null || currentStep === stepCount - 1}
          onClick={onNext}
        >
          <ChevronRight />
        </IconButton>
      </div>
      <ActionButton icon={<RotateCcw />} onClick={onFinal} disabled={currentStep === null}>
        返回最终状态
      </ActionButton>
    </fieldset>
  )
}
