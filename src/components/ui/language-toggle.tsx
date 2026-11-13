import { useLocale } from "../../i18n"
import { ActionButton } from "./buttons"

export function LanguageToggle() {
  const { locale, messages, setLocale } = useLocale()
  return (
    <fieldset className="language-toggle" aria-label={messages.languageLabel}>
      <ActionButton
        className="language-option"
        selected={locale === "zh"}
        onClick={() => setLocale("zh")}
      >
        {messages.localeZh}
      </ActionButton>
      <ActionButton
        className="language-option"
        selected={locale === "en"}
        onClick={() => setLocale("en")}
      >
        {messages.localeEn}
      </ActionButton>
    </fieldset>
  )
}
