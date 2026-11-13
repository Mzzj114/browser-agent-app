import { Monitor } from "lucide-react"
import { useMessages } from "../../i18n"

export function DesktopOnlyMessage() {
  const messages = useMessages()
  return (
    <main className="desktop-only">
      <div className="desktop-only-content">
        <Monitor aria-hidden="true" />
        <h1>{messages.desktopOnlyTitle}</h1>
        <p>{messages.desktopOnlyHint}</p>
      </div>
    </main>
  )
}
