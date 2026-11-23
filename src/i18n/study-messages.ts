import type { ResponseError } from "../domain/study-response"

export type StudyMessages = {
  readonly executionOverview: string
  readonly viewedStep: (ordinal: number) => string
  readonly viewedStepTag: string
  readonly stepLabel: (ordinal: number) => string
  readonly originalTask: string
  readonly beforeStepCaption: (ordinal: number, total: number) => string
  readonly finalStateHeading: string
  readonly finalStateExplanation: string
  readonly recordedOutcome: string
  readonly enteredText: string
  readonly enteredTextNote: string
  readonly offeredOperations: string
  readonly offeredTargets: string
  readonly candidateColumn: string
  readonly contextColumn: string
  readonly probabilityColumn: string
  readonly selected: string
  readonly noTargetRequired: string
  readonly missingTargetEvidence: string
  readonly syntheticProvenance: string
  readonly conditionalScoreExplanation: string
  readonly roundingCaveat: string
  readonly explanationHeading: string
  readonly explanationPlaceholder: string
  readonly explanationOptional: string
  readonly explanationOptionalHelper: string
  readonly errorSummaryHeading: string
  readonly responseErrorMessages: Readonly<Record<ResponseError, string>>
  readonly onScreenOnly: string
  readonly responseSubmittedStatus: string
  readonly loadingStudy: string
  readonly loadingRuns: string
  readonly loadErrorTitle: string
  readonly loadErrorHint: string
  readonly chooseRun: string
  readonly chooseRunHint: string
  readonly runListLabel: string
  readonly runOrdinal: (ordinal: number) => string
  readonly runStepCount: (count: number) => string
  readonly englishPageNote: string
  readonly backToRuns: string
  readonly unknownRunTitle: string
  readonly unknownRunHint: string
}

export const zhStudyMessages = {
  executionOverview: "执行概览",
  viewedStep: (ordinal) => `正在查看第 ${ordinal} 步`,
  viewedStepTag: "正在查看",
  stepLabel: (ordinal) => `第 ${ordinal} 步`,
  originalTask: "原始任务",
  beforeStepCaption: (ordinal, total) => `第 ${ordinal} 步操作前 · 共 ${total} 步`,
  finalStateHeading: "最终状态",
  finalStateExplanation: "此处显示最后一次记录操作后的页面。最终状态不是编号步骤，也不能被标记。",
  recordedOutcome: "记录的结果",
  enteredText: "已输入文本",
  enteredTextNote: "实际输入的文本，不参与评分。",
  offeredOperations: "候选操作",
  offeredTargets: "候选目标",
  candidateColumn: "候选项",
  contextColumn: "上下文",
  probabilityColumn: "概率",
  selected: "已选择",
  noTargetRequired: "无需选择目标。",
  missingTargetEvidence: "此操作缺少目标证据。",
  syntheticProvenance: "记录的决策回放。截图来自 Agent 的英文语言会话，页面内容保持英文。",
  conditionalScoreExplanation:
    "概率数值为决策模型记录的输出，并非合成示例，也不代表正确性估计；概率仅适用于同一操作或同一目标列表内部，不代表整体操作得分。",
  roundingCaveat: "百分比四舍五入保留一位小数，合计可能不等于 100%。",
  explanationHeading: "简短说明",
  explanationPlaceholder: "简要说明你核对过的证据或判断依据。",
  explanationOptional: "可选",
  explanationOptionalHelper: "两种判断均可选择填写说明。",
  errorSummaryHeading: "请检查你的评估。",
  responseErrorMessages: {
    "verdict-required": "请选择这次记录的执行是否符合原始任务。",
    "explanation-too-long": "请将说明缩短至 500 个字符以内。",
  },
  onScreenOnly: "评估仅显示在本页，刷新后将清除。",
  responseSubmittedStatus: "评估仅记录在本页。",
  loadingStudy: "正在加载研究材料…",
  loadingRuns: "正在加载执行记录…",
  loadErrorTitle: "无法加载研究材料",
  loadErrorHint: "请刷新页面重试。如果问题持续出现，请联系研究人员。",
  chooseRun: "选择一个执行记录",
  chooseRunHint: "选择一条记录，查看执行过程并提交你的评估。",
  runListLabel: "执行记录列表",
  runOrdinal: (ordinal) => `记录 ${ordinal.toString().padStart(2, "0")}`,
  runStepCount: (count) => `${count} 步`,
  englishPageNote: "页面内容为英文",
  backToRuns: "返回执行记录列表",
  unknownRunTitle: "找不到这条执行记录",
  unknownRunHint: "请返回列表并选择一条可用的记录。",
} satisfies StudyMessages

export const enStudyMessages = {
  executionOverview: "Execution overview",
  viewedStep: (ordinal) => `Viewed step ${ordinal}`,
  viewedStepTag: "Viewed",
  stepLabel: (ordinal) => `Step ${ordinal}`,
  originalTask: "Original task",
  beforeStepCaption: (ordinal, total) => `Before step ${ordinal} of ${total}`,
  finalStateHeading: "Final state",
  finalStateExplanation:
    "The final page is shown after the last recorded action. It is not a numbered step and cannot be marked.",
  recordedOutcome: "Recorded outcome",
  enteredText: "Entered text",
  enteredTextNote: "Actual input; not scored.",
  offeredOperations: "Offered operations",
  offeredTargets: "Offered targets",
  candidateColumn: "Candidate",
  contextColumn: "Context",
  probabilityColumn: "Probability",
  selected: "Selected",
  noTargetRequired: "No target required.",
  missingTargetEvidence: "Target evidence is missing for this operation.",
  syntheticProvenance:
    "Recorded decision replay. Screenshots come from the agent's English-language session and remain in English.",
  conditionalScoreExplanation:
    "Probability values are recorded decision-model outputs, not synthetic examples or correctness estimates; they apply within each operation or target list only and are not overall action scores.",
  roundingCaveat:
    "Percentages are rounded to one decimal place and may not add up to exactly 100%.",
  explanationHeading: "Short explanation",
  explanationPlaceholder: "Briefly describe the evidence you checked.",
  explanationOptional: "Optional",
  explanationOptionalHelper: "Optional for either judgment.",
  errorSummaryHeading: "Please check your response.",
  responseErrorMessages: {
    "verdict-required": "Choose whether the recorded work fulfills the original request.",
    "explanation-too-long": "Shorten the explanation to 500 characters or fewer.",
  },
  onScreenOnly: "Shown on this page only. Reloading clears your response.",
  responseSubmittedStatus: "Response recorded on this page only.",
  loadingStudy: "Loading study materials…",
  loadingRuns: "Loading recorded runs…",
  loadErrorTitle: "Unable to load the study materials",
  loadErrorHint: "Refresh the page to try again. If the problem continues, contact the researcher.",
  chooseRun: "Choose a recorded run",
  chooseRunHint: "Select a run to inspect its execution and submit your assessment.",
  runListLabel: "Recorded runs",
  runOrdinal: (ordinal) => `Run ${ordinal.toString().padStart(2, "0")}`,
  runStepCount: (count) => `${count} ${count === 1 ? "step" : "steps"}`,
  englishPageNote: "Page content is in English",
  backToRuns: "Back to recorded runs",
  unknownRunTitle: "That recorded run does not exist",
  unknownRunHint: "Return to the list and choose an available run.",
} satisfies StudyMessages
