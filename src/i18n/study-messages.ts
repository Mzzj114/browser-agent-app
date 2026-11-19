import type { ResponseError } from "../domain/study-response"

export type StudyMessages = {
  readonly executionOverview: string
  readonly viewedStep: (ordinal: number) => string
  readonly viewedStepTag: string
  readonly stepLabel: (ordinal: number) => string
  readonly originalTask: string
  readonly agentReportedResult: string
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
  readonly markEarliestMistake: string
  readonly clearMark: string
  readonly yourMark: string
  readonly syntheticProvenance: string
  readonly conditionalScoreExplanation: string
  readonly roundingCaveat: string
  readonly localizationPrompt: string
  readonly localizationPlaceholder: string
  readonly cannotDetermine: string
  readonly uncertaintyHelper: string
  readonly explanationHeading: string
  readonly explanationPlaceholder: string
  readonly explanationOptional: string
  readonly explanationRequired: string
  readonly explanationOptionalHelper: string
  readonly explanationCannotDetermineHelper: string
  readonly explanationRequiredHelper: string
  readonly errorSummaryHeading: string
  readonly responseErrorMessages: Readonly<Record<ResponseError, string>>
  readonly onScreenOnly: string
  readonly responseSubmittedStatus: string
  readonly loadingStudy: string
  readonly loadErrorTitle: string
  readonly loadErrorHint: string
}

export const zhStudyMessages = {
  executionOverview: "执行概览",
  viewedStep: (ordinal) => `正在查看第 ${ordinal} 步`,
  viewedStepTag: "正在查看",
  stepLabel: (ordinal) => `第 ${ordinal} 步`,
  originalTask: "原始任务",
  agentReportedResult: "Agent 报告的结果",
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
  markEarliestMistake: "标记为最早错误操作",
  clearMark: "清除标记",
  yourMark: "你的标记",
  syntheticProvenance: "合成的决策回放。运行记录与页面状态为编写示例，并非采集的模型输出。",
  conditionalScoreExplanation:
    "概率数值为合成的编写示例，并非采集的 Jev 模型输出，也不代表正确性估计；概率仅适用于同一操作或同一目标列表内部，不代表整体操作得分。",
  roundingCaveat: "百分比四舍五入保留一位小数，合计可能不等于 100%。",
  localizationPrompt: "哪一步包含 Agent 最早的错误操作？",
  localizationPlaceholder: "请选择步骤或“无法判断”",
  cannotDetermine: "无法判断",
  uncertaintyHelper: "证据不明确时可选择“无法判断”。",
  explanationHeading: "简短说明",
  explanationPlaceholder: "简要说明你核对过的证据或判断依据。",
  explanationOptional: "可选",
  explanationRequired: "必填",
  explanationOptionalHelper: "除非你标记具体步骤，否则说明为可选项。",
  explanationCannotDetermineHelper: "选择“无法判断”时，说明为可选项。",
  explanationRequiredHelper: "标记具体步骤时必填（两种判断均需说明）。请说明支持该步骤的证据。",
  errorSummaryHeading: "请检查你的评估。",
  responseErrorMessages: {
    "verdict-required": "请选择这次记录的执行是否符合原始任务。",
    "localization-required": "请选择最早的错误步骤或“无法判断”。",
    "unknown-episode": "所选步骤不属于本次回放。请选择一个可用步骤。",
    "explanation-required": "请为标记的步骤填写简短说明。",
    "explanation-too-long": "请将说明缩短至 500 个字符以内。",
  },
  onScreenOnly: "评估仅显示在本页，刷新后将清除。",
  responseSubmittedStatus: "评估仅记录在本页。",
  loadingStudy: "正在加载研究材料…",
  loadErrorTitle: "无法加载研究材料",
  loadErrorHint: "请刷新页面重试。如果问题持续出现，请联系研究人员。",
} satisfies StudyMessages

export const enStudyMessages = {
  executionOverview: "Execution overview",
  viewedStep: (ordinal) => `Viewed step ${ordinal}`,
  viewedStepTag: "Viewed",
  stepLabel: (ordinal) => `Step ${ordinal}`,
  originalTask: "Original task",
  agentReportedResult: "Agent-reported result",
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
  markEarliestMistake: "Mark as earliest mistake",
  clearMark: "Clear mark",
  yourMark: "Your mark",
  syntheticProvenance:
    "Synthetic decision replay. The run and its page states are authored examples, not captured model output.",
  conditionalScoreExplanation:
    "Probability values are synthetic authored examples, not captured Jev model output or correctness estimates; they apply within each operation or target list only and are not overall action scores.",
  roundingCaveat:
    "Percentages are rounded to one decimal place and may not add up to exactly 100%.",
  localizationPrompt: "Which step contains the agent's earliest mistaken action?",
  localizationPlaceholder: "Select a step or Cannot determine",
  cannotDetermine: "Cannot determine",
  uncertaintyHelper: "Choose Cannot determine if the evidence is unclear.",
  explanationHeading: "Short explanation",
  explanationPlaceholder: "Briefly describe the evidence you checked.",
  explanationOptional: "Optional",
  explanationRequired: "Required",
  explanationOptionalHelper: "Optional unless you mark a specific step.",
  explanationCannotDetermineHelper: "Optional when you choose Cannot determine.",
  explanationRequiredHelper:
    "Required for a marked step with either judgment. Describe the evidence for that step.",
  errorSummaryHeading: "Please check your response.",
  responseErrorMessages: {
    "verdict-required": "Choose whether the recorded work fulfills the original request.",
    "localization-required": "Select the earliest mistaken step or Cannot determine.",
    "unknown-episode": "The selected step is not part of this replay. Select an available step.",
    "explanation-required": "Add a short explanation for the marked step.",
    "explanation-too-long": "Shorten the explanation to 500 characters or fewer.",
  },
  onScreenOnly: "Shown on this page only. Reloading clears your response.",
  responseSubmittedStatus: "Response recorded on this page only.",
  loadingStudy: "Loading study materials…",
  loadErrorTitle: "Unable to load the study materials",
  loadErrorHint: "Refresh the page to try again. If the problem continues, contact the researcher.",
} satisfies StudyMessages
