import type { Locale } from "./locale"
import { enStudyMessages, type StudyMessages, zhStudyMessages } from "./study-messages"

export type Messages = {
  readonly appTitle: string
  readonly appDescription: string
  readonly brand: string
  readonly workspaceHeading: string
  readonly pageResultHeading: string
  readonly agentRecordLabel: string
  readonly userSpeaker: string
  readonly agentSpeaker: string
  readonly executionHistory: string
  readonly stepCountBadge: (count: number) => string
  readonly executionStepCount: (count: number) => string
  readonly jumpToLatest: string
  readonly languageLabel: string
  readonly localeZh: string
  readonly localeEn: string
  readonly browserLabel: string
  readonly recordedExecution: (count: number) => string
  readonly screenshotAlt: (pageTitle: string) => string
  readonly missingScreenshotTitle: string
  readonly missingScreenshotHint: string
  readonly stepRecordedAfter: (ordinal: number, total: number) => string
  readonly lastRecordedState: string
  readonly zoomScreenshot: string
  readonly fitScreenshot: string
  readonly zoomLabel: string
  readonly fitLabel: string
  readonly replayBarLabel: string
  readonly jumpToStep: string
  readonly stepOption: (ordinal: number, action: string) => string
  readonly pythonCellLabel: (index: number) => string
  readonly pythonCellHeading: (index: number) => string
  readonly showOutput: string
  readonly showErrorOutput: string
  readonly technicalDetails: (cellCount: number) => string
  readonly technicalFinalReportRedacted: string
  readonly decisionQuestion: string
  readonly decisionExplanation: string
  readonly acceptResult: string
  readonly rejectResult: string
  readonly decisionSubmit: string
  readonly decisionPendingStatus: (accepted: boolean) => string
  readonly decisionSubmittedStatus: (accepted: boolean) => string
  readonly decisionReasonLabel: string
  readonly decisionReasonPlaceholder: string
  readonly decisionRevisions: (count: number) => string
  readonly desktopOnlyTitle: string
  readonly desktopOnlyHint: string
  readonly replayPosition: (step: number, total: number) => string
  readonly replayControlsLabel: string
  readonly previousStep: string
  readonly nextStep: string
  readonly returnToFinal: string
  readonly stepAriaLabel: (ordinal: number) => string
  readonly stepSelectLabel: (ordinal: number, action: string, selected: boolean) => string
  readonly stepHeading: (ordinal: number) => string
  readonly viewPage: string
  readonly viewingPage: string
  readonly viewThinking: string
  readonly inspectionHintLabel: string
  readonly inspectionHint: string
  readonly promptLabel: string
  readonly promptInputLabel: string
  readonly promptPlaceholder: string
  readonly promptNote: string
  readonly sendPrompt: string
  readonly study: StudyMessages
}

export const zhMessages = {
  appTitle: "浏览助手",
  appDescription: "浏览助手任务结果核验：查看原始任务、执行记录与对应网页状态。",
  brand: "浏览助手",
  workspaceHeading: "浏览助手任务结果核验",
  pageResultHeading: "网页结果",
  agentRecordLabel: "Agent 任务记录",
  userSpeaker: "你",
  agentSpeaker: "Agent",
  executionHistory: "执行历史",
  stepCountBadge: (count) => `${count} 个执行步骤`,
  executionStepCount: (count) => `共 ${count} 步`,
  jumpToLatest: "跳到最新内容",
  languageLabel: "界面语言",
  localeZh: "中文",
  localeEn: "English",
  browserLabel: "Agent 浏览器",
  recordedExecution: (count) => `录制执行 · ${count} 步`,
  screenshotAlt: (pageTitle) => `${pageTitle}，录制页面截图`,
  missingScreenshotTitle: "此步骤没有可用截图",
  missingScreenshotHint: "任务和步骤详情仍可查看。",
  stepRecordedAfter: (ordinal, total) => `步骤 ${ordinal} / ${total} · 此步之后录制`,
  lastRecordedState: "最后一次录制的状态",
  zoomScreenshot: "放大截图至实际大小",
  fitScreenshot: "缩放截图以适应面板",
  zoomLabel: "放大",
  fitLabel: "适应",
  replayBarLabel: "回放已录制的执行",
  jumpToStep: "跳转步骤",
  stepOption: (ordinal, action) => `步骤 ${ordinal} · ${action}`,
  pythonCellLabel: (index) => `Python 单元 ${index}`,
  pythonCellHeading: (index) => `Python · 单元 ${index}`,
  showOutput: "查看输出",
  showErrorOutput: "查看错误输出",
  technicalDetails: (cellCount) => `技术细节 · ${cellCount} 个 Python 单元`,
  technicalFinalReportRedacted: "[最终回复见对话中的消息]",
  decisionQuestion: "这次记录的执行是否完成了原始任务？",
  decisionExplanation: "提交不会下单、不会重新运行 Agent，也不会触发修复。",
  acceptResult: "符合原始任务",
  rejectResult: "不符合原始任务",
  decisionSubmit: "提交评估",
  decisionPendingStatus: (accepted) =>
    `已选择：${accepted ? "符合原始任务" : "不符合原始任务"}。提交前仍可更改。`,
  decisionSubmittedStatus: (accepted) =>
    `已提交：${accepted ? "符合原始任务" : "不符合原始任务"}。`,
  decisionReasonLabel: "理由（可选）",
  decisionReasonPlaceholder: "简要说明你核对过的内容或判断依据。",
  decisionRevisions: (count) => `提交前已更改选择 ${count} 次。`,
  desktopOnlyTitle: "请在桌面窗口中使用浏览助手",
  desktopOnlyHint: "此核验界面需要至少 1280 × 720 的窗口尺寸。请扩大浏览器窗口后重试。",
  replayPosition: (step, total) => `步骤 ${step} / ${total}`,
  replayControlsLabel: "页面回放控制",
  previousStep: "上一步",
  nextStep: "下一步",
  returnToFinal: "返回最后录制状态",
  stepAriaLabel: (ordinal) => `步骤 ${ordinal}`,
  stepSelectLabel: (ordinal, action, selected) =>
    `步骤 ${ordinal}，${action}：${selected ? "正在查看页面" : "查看页面"}`,
  stepHeading: (ordinal) => `步骤 ${ordinal}`,
  viewPage: "查看页面",
  viewingPage: "正在查看",
  viewThinking: "查看模型思考",
  inspectionHintLabel: "如何检查录制",
  inspectionHint: "选择任一步，查看该步之后录制的页面。",
  promptLabel: "Agent 指令输入",
  promptInputLabel: "Agent 指令（回放模式下不可用）",
  promptPlaceholder: "继续向 Agent 提问",
  promptNote: "回放中 · 输入已禁用",
  sendPrompt: "发送指令",
  study: zhStudyMessages,
} satisfies Messages

export const enMessages = {
  appTitle: "Browser Assistant",
  appDescription:
    "Verify browser assistant task results: review the original task, the execution record, and the corresponding page states.",
  brand: "Browser Assistant",
  workspaceHeading: "Browser assistant task verification",
  pageResultHeading: "Page result",
  agentRecordLabel: "Agent task record",
  userSpeaker: "You",
  agentSpeaker: "Agent",
  executionHistory: "Execution history",
  stepCountBadge: (count) => `${count} ${count === 1 ? "step" : "steps"}`,
  executionStepCount: (count) => `${count} ${count === 1 ? "total step" : "total steps"}`,
  jumpToLatest: "Jump to latest",
  languageLabel: "Interface language",
  localeZh: "中文",
  localeEn: "English",
  browserLabel: "Agent browser",
  recordedExecution: (count) => `Recorded execution · ${count} ${count === 1 ? "step" : "steps"}`,
  screenshotAlt: (pageTitle) => `${pageTitle}, recorded page screenshot`,
  missingScreenshotTitle: "No screenshot for this step",
  missingScreenshotHint: "The task and step details remain available.",
  stepRecordedAfter: (ordinal, total) => `Step ${ordinal} / ${total} · recorded after this step`,
  lastRecordedState: "Last recorded state",
  zoomScreenshot: "Zoom screenshot to actual size",
  fitScreenshot: "Fit screenshot to panel",
  zoomLabel: "Zoom",
  fitLabel: "Fit",
  replayBarLabel: "Replay recorded execution",
  jumpToStep: "Jump to step",
  stepOption: (ordinal, action) => `Step ${ordinal} · ${action}`,
  pythonCellLabel: (index) => `Python cell ${index}`,
  pythonCellHeading: (index) => `Python · Cell ${index}`,
  showOutput: "Show output",
  showErrorOutput: "Show error output",
  technicalDetails: (cellCount) =>
    `Technical details · ${cellCount} Python ${cellCount === 1 ? "cell" : "cells"}`,
  technicalFinalReportRedacted: "[final response shown in the conversation]",
  decisionQuestion: "Did the recorded run fulfill the request?",
  decisionExplanation: "Submitting does not place an order, rerun the agent, or trigger a repair.",
  acceptResult: "Fulfills the request",
  rejectResult: "Does not fulfill the request",
  decisionSubmit: "Submit assessment",
  decisionPendingStatus: (accepted) =>
    `Selected: ${accepted ? "fulfills the request" : "does not fulfill the request"}. You can still change it before submitting.`,
  decisionSubmittedStatus: (accepted) =>
    `Submitted: ${accepted ? "fulfills the request" : "does not fulfill the request"}.`,
  decisionReasonLabel: "Reason (optional)",
  decisionReasonPlaceholder: "Briefly note what you checked or why.",
  decisionRevisions: (count) =>
    `Selection changed ${count} ${count === 1 ? "time" : "times"} before submission.`,
  desktopOnlyTitle: "Please use Browser Assistant in a desktop window",
  desktopOnlyHint:
    "This verification interface requires a window of at least 1280 × 720. Please enlarge your browser window and try again.",
  replayPosition: (step, total) => `Step ${step} / ${total}`,
  replayControlsLabel: "Page replay controls",
  previousStep: "Previous step",
  nextStep: "Next step",
  returnToFinal: "Return to last recorded state",
  stepAriaLabel: (ordinal) => `Step ${ordinal}`,
  stepSelectLabel: (ordinal, action, selected) =>
    `Step ${ordinal}, ${action}: ${selected ? "viewing page" : "view page"}`,
  stepHeading: (ordinal) => `Step ${ordinal}`,
  viewPage: "View page",
  viewingPage: "Viewing page",
  viewThinking: "View model thinking",
  inspectionHintLabel: "How to inspect",
  inspectionHint: "Select any step to view the page recorded after it.",
  promptLabel: "Agent prompt input",
  promptInputLabel: "Agent prompt (unavailable in replay mode)",
  promptPlaceholder: "Continue asking the Agent",
  promptNote: "Replay · Input disabled",
  sendPrompt: "Send prompt",
  study: enStudyMessages,
} satisfies Messages

const messagesByLocale: Record<Locale, Messages> = {
  zh: zhMessages,
  en: enMessages,
}

export function messagesFor(locale: Locale): Messages {
  return messagesByLocale[locale]
}
