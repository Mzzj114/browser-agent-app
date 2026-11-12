import { ChevronRight } from "lucide-react"
import type { ReactNode } from "react"

type DisclosureProps = {
  readonly label: string
  readonly children: ReactNode
  readonly defaultOpen?: boolean
  readonly tone?: "default" | "error"
}

export function Disclosure({
  label,
  children,
  defaultOpen = false,
  tone = "default",
}: DisclosureProps) {
  return (
    <details className="disclosure" data-tone={tone} open={defaultOpen}>
      <summary>
        <ChevronRight className="disclosure-chevron" aria-hidden="true" />
        <span>{label}</span>
      </summary>
      <div className="disclosure-content">{children}</div>
    </details>
  )
}
