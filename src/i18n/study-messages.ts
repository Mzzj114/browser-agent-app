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
  readonly markEarliestMistake: string
  readonly clearMark: string
  readonly yourMark: string
  readonly syntheticProvenance: string
  readonly conditionalScoreExplanation: string
  readonly roundingCaveat: string
  readonly localizationPrompt: string
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
  markEarliestMistake: "标记为最早错误操作",
  clearMark: "清除标记",
  yourMark: "你的标记",
  syntheticProvenance: "合成的决策回放。运行记录与页面状态为编写示例，并非采集的模型输出。",
  conditionalScoreExplanation: "概率仅适用于同一操作或同一目标列表内部，不代表整体操作得分。",
  roundingCaveat: "百分比四舍五入保留一位小数，合计可能不等于 100%。",
  localizationPrompt: "哪一步包含 Agent 最早的错误操作？",
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
  markEarliestMistake: "Mark as earliest mistake",
  clearMark: "Clear mark",
  yourMark: "Your mark",
  syntheticProvenance:
    "Synthetic decision replay. The run and its page states are authored examples, not captured model output.",
  conditionalScoreExplanation:
    "Probabilities apply within each operation or target list only; they are not overall action scores.",
  roundingCaveat:
    "Percentages are rounded to one decimal place and may not add up to exactly 100%.",
  localizationPrompt: "Which step contains the agent's earliest mistaken action?",
} satisfies StudyMessages
