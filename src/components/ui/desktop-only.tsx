import { Monitor } from "lucide-react"

export function DesktopOnlyMessage() {
  return (
    <main className="desktop-only">
      <div className="desktop-only-content">
        <Monitor aria-hidden="true" />
        <h1>请在桌面窗口中使用浏览助手</h1>
        <p>此核验界面需要至少 1280 × 720 的窗口尺寸。请扩大浏览器窗口后重试。</p>
      </div>
    </main>
  )
}
