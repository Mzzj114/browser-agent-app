export type SubmissionSinkConfig = {
  readonly url: string
  readonly key: string
}

/**
 * The participant build may hold only the publishable key. Study links fail
 * closed with a neutral configuration error when either value is missing,
 * rather than silently dropping submissions.
 */
export function submissionSinkConfig(
  env: Record<string, string | undefined>,
): SubmissionSinkConfig | null {
  const url = (env["VITE_SUPABASE_URL"] ?? "").trim().replace(/\/+$/, "")
  const key = (env["VITE_SUPABASE_PUBLISHABLE_KEY"] ?? "").trim()

  if (url.length === 0 || key.length === 0) return null
  if (!/^https?:\/\//.test(url)) return null

  return { url, key }
}
