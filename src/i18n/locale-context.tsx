import type { ReactNode } from "react"
import { createContext, useCallback, useContext, useLayoutEffect, useMemo, useState } from "react"
import { HTML_LANG, initialLocale, type Locale, storeLocale } from "./locale"
import { type Messages, messagesFor } from "./messages"

type LocaleContextValue = {
  readonly locale: Locale
  readonly messages: Messages
  readonly setLocale: (locale: Locale) => void
}

const LocaleContext = createContext<LocaleContextValue | null>(null)

function syncLocaleQuery(locale: Locale): void {
  const url = new URL(window.location.href)
  if (!url.searchParams.has("lang")) return
  url.searchParams.set("lang", locale)
  window.history.replaceState(window.history.state, "", `${url.pathname}${url.search}${url.hash}`)
}

type LocaleProviderProps = {
  readonly children: ReactNode
  readonly initialLocale?: Locale
  readonly syncDocument?: boolean
}

export function LocaleProvider({
  children,
  initialLocale: providedLocale,
  syncDocument = true,
}: LocaleProviderProps) {
  const [locale, setLocaleState] = useState<Locale>(() => providedLocale ?? initialLocale())

  const setLocale = useCallback((next: Locale) => {
    setLocaleState(next)
    storeLocale(next)
    syncLocaleQuery(next)
  }, [])

  useLayoutEffect(() => {
    if (!syncDocument) return
    const messages = messagesFor(locale)
    document.documentElement.lang = HTML_LANG[locale]
    document.title = messages.appTitle
    document
      .querySelector('meta[name="description"]')
      ?.setAttribute("content", messages.appDescription)
  }, [locale, syncDocument])

  const value = useMemo<LocaleContextValue>(
    () => ({ locale, messages: messagesFor(locale), setLocale }),
    [locale, setLocale],
  )

  return <LocaleContext.Provider value={value}>{children}</LocaleContext.Provider>
}

export function useLocale(): LocaleContextValue {
  const value = useContext(LocaleContext)
  if (value === null) {
    throw new MissingLocaleProviderError()
  }
  return value
}

export function useMessages(): Messages {
  const value = useContext(LocaleContext)
  if (value === null) throw new MissingLocaleProviderError()
  return value.messages
}

class MissingLocaleProviderError extends Error {
  public constructor() {
    super("useLocale must be used inside a LocaleProvider")
    this.name = "MissingLocaleProviderError"
  }
}
