import { readFileSync } from "node:fs"
import { resolve } from "node:path"
import { expect, test } from "vitest"
import { parseCaseCodes } from "../../src/study/case-codes.ts"
import cases from "../../src/study/cases.json"

const rosterRuns = new Set([
  "F1_add_single_item_intv",
  "F1_add_to_wishlist_intv",
  "F1_browse_category_intv",
  "F1_spec_comparison_intv",
  "F2_cart_management_intv",
  "F2_buy_highest_rated_intv",
  "F2_write_review_clean",
  "F2_write_detailed_review_clean",
  "F3_add_new_address_intv",
  "F3_cancel_order_intv",
  "F3_return_item_clean",
  "F3_update_shipping_intv",
  "F4_cart_recover_from_oos_clean",
  "F4_reorder_past_item_clean",
  "F4_stale_wishlist_refresh_clean",
  "F6_review_aggregation_read_only_clean",
  "F1_add_single_item_clean",
  "F1_browse_category_clean",
  "F2_buy_highest_rated_clean",
  "F2_cart_management_clean",
  "F3_add_new_address_clean",
  "F4_verify_order_ok_clean",
  "F6_review_aggregation_read_only_intv",
])

const manifest = JSON.parse(
  readFileSync(resolve("fixtures", "agent-runs", "manifest.json"), "utf8"),
) as { readonly runs: readonly { readonly id: string }[] }

const manifestIds = new Set(manifest.runs.map((run) => run.id))
const entries = Object.entries(cases) as readonly (readonly [string, string])[]

test("the case map covers the 23 approved roster runs", () => {
  expect(entries).toHaveLength(23)
  expect(new Set(entries.map(([code]) => code)).size).toBe(23)
  expect(new Set(entries.map(([, runId]) => runId)).size).toBe(23)
})

test("every case code matches the C01…C23 format", () => {
  for (const [code] of entries) {
    expect(code).toMatch(/^C\d{2}$/)
  }
})

test("every case run id exists in the committed library and the roster", () => {
  for (const [, runId] of entries) {
    expect(runId.length).toBeGreaterThan(0)
    expect(manifestIds.has(runId)).toBe(true)
    expect(rosterRuns.has(runId)).toBe(true)
  }
  expect(new Set(entries.map(([, runId]) => runId))).toEqual(rosterRuns)
})

test("codes follow the lexicographic run id order", () => {
  const sorted = [...entries.map(([, runId]) => runId)].sort()
  sorted.forEach((runId, index) => {
    const code = `C${String(index + 1).padStart(2, "0")}`
    expect(cases[code as keyof typeof cases]).toBe(runId)
  })
})

test("parseCaseCodes returns the checked-in map", () => {
  const parsed = parseCaseCodes(cases)
  expect(parsed.size).toBe(23)
  expect(parsed.get("C01")).toBe("F1_add_single_item_clean")
})

test("parseCaseCodes accepts a well-formed map", () => {
  expect(parseCaseCodes({ C01: "F1_add_single_item_clean" }).get("C01")).toBe(
    "F1_add_single_item_clean",
  )
})

test.each([
  ["a non-object", null],
  ["an array", []],
  ["an empty object", {}],
])("parseCaseCodes rejects %s", (_label, raw) => {
  expect(() => parseCaseCodes(raw)).toThrow()
})

test.each([
  ["a lowercase key", { c1: "F1_add_single_item_clean" }],
  ["a one-digit key", { C1: "F1_add_single_item_clean" }],
  ["a word key", { CASE1: "F1_add_single_item_clean" }],
  ["an empty value", { C01: "" }],
  ["a non-string value", { C01: 7 }],
])("parseCaseCodes rejects %s", (_label, raw) => {
  expect(() => parseCaseCodes(raw)).toThrow()
})

test("parseCaseCodes rejects duplicate run ids", () => {
  expect(() =>
    parseCaseCodes({ C01: "F1_add_single_item_clean", C02: "F1_add_single_item_clean" }),
  ).toThrow()
})
