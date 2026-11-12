import { Globe2 } from "lucide-react"
import type { ButtonHTMLAttributes, ReactNode } from "react"
import { joinClassNames } from "./class-names"

export function BrandMark() {
  return (
    <div className="brand-mark">
      <span className="brand-icon" aria-hidden="true">
        <Globe2 />
      </span>
      <span>浏览助手</span>
    </div>
  )
}

type IconButtonProps = Readonly<ButtonHTMLAttributes<HTMLButtonElement>> & {
  readonly label: string
  readonly variant?: "ghost" | "outlined" | "dialog"
}

export function IconButton({
  label,
  variant = "ghost",
  className,
  type = "button",
  ...buttonProps
}: IconButtonProps) {
  return (
    <button
      {...buttonProps}
      type={type}
      className={joinClassNames("icon-button", className)}
      data-variant={variant}
      aria-label={label}
      title={label}
    />
  )
}

type ActionButtonProps = Readonly<ButtonHTMLAttributes<HTMLButtonElement>> & {
  readonly icon?: ReactNode
  readonly selected?: boolean
}

export function ActionButton({
  icon,
  selected,
  className,
  children,
  type = "button",
  ...buttonProps
}: ActionButtonProps) {
  return (
    <button
      {...buttonProps}
      type={type}
      className={joinClassNames("action-button", className)}
      data-selected={selected === true}
      aria-pressed={selected}
    >
      {icon ? (
        <span className="button-icon" aria-hidden="true">
          {icon}
        </span>
      ) : null}
      <span>{children}</span>
    </button>
  )
}

type StatusBadgeProps = {
  readonly label: string
  readonly icon?: ReactNode
}

export function StatusBadge({ label, icon }: StatusBadgeProps) {
  return (
    <span className="status-badge">
      {icon ? <span aria-hidden="true">{icon}</span> : null}
      <span>{label}</span>
    </span>
  )
}
