import { expect, test } from "vitest"
import { submissionSinkConfig } from "../../src/study/config.ts"

const fullEnv = {
  VITE_SUPABASE_URL: "https://study.supabase.co",
  VITE_SUPABASE_PUBLISHABLE_KEY: "sb_publishable_test-key",
}

test("reads the trimmed endpoint and publishable key", () => {
  expect(
    submissionSinkConfig({
      VITE_SUPABASE_URL: "  https://study.supabase.co  ",
      VITE_SUPABASE_PUBLISHABLE_KEY: " sb_publishable_test-key ",
    }),
  ).toEqual({ url: "https://study.supabase.co", key: "sb_publishable_test-key" })
})

test.each([
  ["the url is missing", { VITE_SUPABASE_PUBLISHABLE_KEY: "sb_publishable_test-key" }],
  ["the url is blank", { ...fullEnv, VITE_SUPABASE_URL: "   " }],
  ["the url is not http(s)", { ...fullEnv, VITE_SUPABASE_URL: "study.supabase.co" }],
  ["the key is missing", { VITE_SUPABASE_URL: "https://study.supabase.co" }],
  ["the key is blank", { ...fullEnv, VITE_SUPABASE_PUBLISHABLE_KEY: "  " }],
  ["the environment is empty", {}],
])("returns null when %s", (_label, env) => {
  expect(submissionSinkConfig(env)).toBeNull()
})
