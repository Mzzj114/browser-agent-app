import type { Locale } from "./locale"

export type Messages = {
  readonly appTitle: string
  readonly appDescription: string
  readonly brand: string
  readonly workspaceHeading: string
  readonly pageResultHeading: string
  readonly agentRecordLabel: string
  readonly originalTask: string
  readonly agentFinalResponse: string
  readonly executionHistory: string
  readonly stepCountBadge: (count: number) => string
  readonly executionStepCount: (count: number) => string
  readonly jumpToLatest: string
  readonly languageLabel: string
  readonly localeZh: string
  readonly localeEn: string
  readonly browserLabel: string
  readonly recordedPage: string
  readonly screenshotAlt: (pageTitle: string) => string
  readonly missingScreenshotTitle: string
  readonly missingScreenshotHint: string
  readonly zoomScreenshot: string
  readonly pythonCellLabel: (index: number) => string
  readonly pythonCellHeading: (index: number) => string
  readonly showOutput: string
  readonly showErrorOutput: string
  readonly decisionQuestion: string
  readonly acceptResult: string
  readonly rejectResult: string
  readonly decisionStatus: (accepted: boolean) => string
  readonly desktopOnlyTitle: string
  readonly desktopOnlyHint: string
  readonly finalState: string
  readonly replayPosition: (step: number, total: number) => string
  readonly replayControlsLabel: string
  readonly previousStep: string
  readonly nextStep: string
  readonly returnToFinal: string
  readonly dialogTitle: string
  readonly zoomOut: string
  readonly zoomIn: string
  readonly fitValue: string
  readonly fitWindow: string
  readonly closeScreenshot: string
  readonly dialogAlt: (pageTitle: string) => string
  readonly stepAriaLabel: (ordinal: number) => string
  readonly stepSelectLabel: (ordinal: number, selected: boolean) => string
  readonly stepHeading: (ordinal: number) => string
  readonly pythonCellCount: (count: number) => string
  readonly viewPage: string
  readonly viewingPage: string
  readonly viewThinking: string
  readonly promptLabel: string
  readonly promptInputLabel: string
  readonly promptPlaceholder: string
  readonly promptNote: string
  readonly sendPrompt: string
}

export const zhMessages = {
  appTitle: "浏览助手",
  appDescription: "浏览助手任务结果核验：查看原始任务、Agent 回复、执行记录与对应网页状态。",
  brand: "浏览助手",
  workspaceHeading: "浏览助手任务结果核验",
  pageResultHeading: "网页结果",
  agentRecordLabel: "Agent 任务记录",
  originalTask: "原始任务",
  agentFinalResponse: "Agent 最终回复",
  executionHistory: "执行历史",
  stepCountBadge: (count) => `${count} 个执行步骤`,
  executionStepCount: (count) => `${count} 步`,
  jumpToLatest: "跳到最新内容",
  languageLabel: "界面语言",
  localeZh: "中文",
  localeEn: "English",
  browserLabel: "Agent 浏览器",
  recordedPage: "录制页面",
  screenshotAlt: (pageTitle) => `${pageTitle}，录制页面截图`,
  missingScreenshotTitle: "此步骤没有可用截图",
  missingScreenshotHint: "仍可查看上方记录的网址与页面标题。",
  zoomScreenshot: "放大查看",
  pythonCellLabel: (index) => `Python 单元 ${index}`,
  pythonCellHeading: (index) => `Python · 单元 ${index}`,
  showOutput: "查看输出",
  showErrorOutput: "查看错误输出",
  decisionQuestion: "你是否接受 Agent 的任务结果？",
  acceptResult: "接受结果",
  rejectResult: "拒绝结果",
  decisionStatus: (accepted) => `已记录：${accepted ? "接受结果" : "拒绝结果"}。`,
  desktopOnlyTitle: "请在桌面窗口中使用浏览助手",
  desktopOnlyHint: "此核验界面需要至少 1280 × 720 的窗口尺寸。请扩大浏览器窗口后重试。",
  finalState: "最终状态",
  replayPosition: (step, total) => `步骤 ${step} / ${total}`,
  replayControlsLabel: "页面回放控制",
  previousStep: "上一步",
  nextStep: "下一步",
  returnToFinal: "返回最终状态",
  dialogTitle: "放大查看",
  zoomOut: "缩小",
  zoomIn: "放大",
  fitValue: "适应",
  fitWindow: "适应窗口",
  closeScreenshot: "关闭截图",
  dialogAlt: (pageTitle) => `${pageTitle}，可缩放录制页面截图`,
  stepAriaLabel: (ordinal) => `步骤 ${ordinal}`,
  stepSelectLabel: (ordinal, selected) =>
    `步骤 ${ordinal}：${selected ? "正在查看页面" : "查看页面"}`,
  stepHeading: (ordinal) => `步骤 ${ordinal}`,
  pythonCellCount: (count) => `${count} 个 Python 单元`,
  viewPage: "查看页面",
  viewingPage: "正在查看",
  viewThinking: "查看模型思考",
  promptLabel: "Agent 指令输入",
  promptInputLabel: "Agent 指令（回放模式下不可用）",
  promptPlaceholder: "继续向 Agent 提问",
  promptNote: "回放中 · 输入已禁用",
  sendPrompt: "发送指令",
} satisfies Messages

export const enMessages = {
  appTitle: "Browser Assistant",
  appDescription:
    "Verify browser assistant task results: review the original task, the agent response, the execution record, and the corresponding page states.",
  brand: "Browser Assistant",
  workspaceHeading: "Browser assistant task verification",
  pageResultHeading: "Page result",
  agentRecordLabel: "Agent task record",
  originalTask: "Original task",
  agentFinalResponse: "Agent final response",
  executionHistory: "Execution history",
  stepCountBadge: (count) => `${count} ${count === 1 ? "step" : "steps"}`,
  executionStepCount: (count) => `${count} ${count === 1 ? "step" : "steps"}`,
  jumpToLatest: "Jump to latest",
  languageLabel: "Interface language",
  localeZh: "中文",
  localeEn: "English",
  browserLabel: "Agent browser",
  recordedPage: "Recorded page",
  screenshotAlt: (pageTitle) => `${pageTitle}, recorded page screenshot`,
  missingScreenshotTitle: "No screenshot for this step",
  missingScreenshotHint: "The recorded URL and page title are still shown above.",
  zoomScreenshot: "Zoom in",
  pythonCellLabel: (index) => `Python cell ${index}`,
  pythonCellHeading: (index) => `Python · Cell ${index}`,
  showOutput: "Show output",
  showErrorOutput: "Show error output",
  decisionQuestion: "Do you accept the Agent's task result?",
  acceptResult: "Accept result",
  rejectResult: "Reject result",
  decisionStatus: (accepted) => `Recorded: ${accepted ? "result accepted" : "result rejected"}.`,
  desktopOnlyTitle: "Please use Browser Assistant in a desktop window",
  desktopOnlyHint:
    "This verification interface requires a window of at least 1280 × 720. Please enlarge your browser window and try again.",
  finalState: "Final state",
  replayPosition: (step, total) => `Step ${step} / ${total}`,
  replayControlsLabel: "Page replay controls",
  previousStep: "Previous step",
  nextStep: "Next step",
  returnToFinal: "Return to final state",
  dialogTitle: "Screenshot viewer",
  zoomOut: "Zoom out",
  zoomIn: "Zoom in",
  fitValue: "Fit",
  fitWindow: "Fit to window",
  closeScreenshot: "Close screenshot",
  dialogAlt: (pageTitle) => `${pageTitle}, zoomable recorded page screenshot`,
  stepAriaLabel: (ordinal) => `Step ${ordinal}`,
  stepSelectLabel: (ordinal, selected) =>
    `Step ${ordinal}: ${selected ? "viewing page" : "view page"}`,
  stepHeading: (ordinal) => `Step ${ordinal}`,
  pythonCellCount: (count) => `${count} Python ${count === 1 ? "cell" : "cells"}`,
  viewPage: "View page",
  viewingPage: "Viewing page",
  viewThinking: "View model thinking",
  promptLabel: "Agent prompt input",
  promptInputLabel: "Agent prompt (unavailable in replay mode)",
  promptPlaceholder: "Continue asking the Agent",
  promptNote: "Replay · Input disabled",
  sendPrompt: "Send prompt",
} satisfies Messages

const messagesByLocale: Record<Locale, Messages> = {
  zh: zhMessages,
  en: enMessages,
}

export function messagesFor(locale: Locale): Messages {
  return messagesByLocale[locale]
}
