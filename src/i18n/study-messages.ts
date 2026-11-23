import type { ResponseError } from "../domain/study-response"

export type StudyMessages = {
  readonly executionOverview: string
  readonly stepsHeading: string
  readonly viewedStep: (ordinal: number) => string
  readonly viewedStepTag: string
  readonly stepLabel: (ordinal: number) => string
  readonly originalTask: string
  readonly originalTaskHint: string
  readonly beforeStepCaption: (ordinal: number, total: number) => string
  readonly finalStateHeading: string
  readonly finalStateExplanation: string
  readonly recordedOutcome: string
  readonly enteredText: string
  readonly enteredTextNote: string
  readonly whatTheAgentDid: string
  readonly whatItClicked: string
  readonly whereItTyped: string
  readonly whatItSelected: string
  readonly otherActionsOffered: string
  readonly otherThingsOffered: string
  readonly moreActions: (count: number) => string
  readonly moreThings: (count: number) => string
  readonly fewerActions: string
  readonly fewerThings: string
  readonly confidenceLabel: string
  readonly confidenceUnavailable: string
  readonly confidenceExplanation: string
  readonly selected: string
  readonly noTargetRequired: string
  readonly missingTargetEvidence: string
  readonly syntheticProvenance: string
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
  stepsHeading: "步骤",
  viewedStep: (ordinal) => `正在查看第 ${ordinal} 步`,
  viewedStepTag: "正在查看",
  stepLabel: (ordinal) => `第 ${ordinal} 步`,
  originalTask: "原始任务",
  originalTaskHint: "展开以查看完整原始任务",
  beforeStepCaption: (ordinal, total) => `第 ${ordinal} 步操作前 · 共 ${total} 步`,
  finalStateHeading: "最终状态",
  finalStateExplanation: "此处显示最后一次记录操作后的页面。最终状态不是编号步骤。",
  recordedOutcome: "记录的结果",
  enteredText: "已输入文本",
  enteredTextNote: "实际输入的文本，不参与评分。",
  whatTheAgentDid: "Agent 执行的操作",
  whatItClicked: "Agent 点击的目标",
  whereItTyped: "Agent 输入的位置",
  whatItSelected: "Agent 选择的目标",
  otherActionsOffered: "未采取的其他操作",
  otherThingsOffered: "其他可点击目标",
  moreActions: (count) => `还有 ${count} 个操作`,
  moreThings: (count) => `还有 ${count} 个目标`,
  fewerActions: "收起其他操作",
  fewerThings: "收起其他目标",
  confidenceLabel: "置信度",
  confidenceUnavailable: "未记录",
  confidenceExplanation:
    "置信度是 Agent 对其选择给出的自我报告，不代表对该选择是否正确的外部核验。",
  selected: "已选择",
  noTargetRequired: "无需选择目标。",
  missingTargetEvidence: "此操作缺少目标证据。",
  syntheticProvenance: "记录的决策回放。截图来自 Agent 的英文语言会话，页面内容保持英文。",
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
  stepsHeading: "Steps",
  viewedStep: (ordinal) => `Viewed step ${ordinal}`,
  viewedStepTag: "Viewed",
  stepLabel: (ordinal) => `Step ${ordinal}`,
  originalTask: "Original task",
  originalTaskHint: "Expand to read the complete original task",
  beforeStepCaption: (ordinal, total) => `Before step ${ordinal} of ${total}`,
  finalStateHeading: "Final state",
  finalStateExplanation:
    "The final page is shown after the last recorded action. It is not a numbered step.",
  recordedOutcome: "Recorded outcome",
  enteredText: "Entered text",
  enteredTextNote: "Actual input; not scored.",
  whatTheAgentDid: "What the agent did",
  whatItClicked: "What it clicked",
  whereItTyped: "Where it typed",
  whatItSelected: "What it selected",
  otherActionsOffered: "Other actions not taken",
  otherThingsOffered: "Other things it could click",
  moreActions: (count) => (count === 1 ? "and 1 more action" : `and ${count} more actions`),
  moreThings: (count) => (count === 1 ? "and 1 more thing" : `and ${count} more things`),
  fewerActions: "Show fewer actions",
  fewerThings: "Show fewer things",
  confidenceLabel: "Confidence",
  confidenceUnavailable: "Not recorded",
  confidenceExplanation:
    "Confidence is the value the agent reported for its choice. It is not a check that the choice was correct.",
  selected: "Selected",
  noTargetRequired: "No target required.",
  missingTargetEvidence: "Target evidence is missing for this operation.",
  syntheticProvenance:
    "Recorded decision replay. Screenshots come from the agent's English-language session and remain in English.",
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
