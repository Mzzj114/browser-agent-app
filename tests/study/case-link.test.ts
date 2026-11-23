import { expect, test } from "vitest"
import { caseCodes } from "../../src/study/case-codes.ts"
import { parseStudyLink } from "../../src/study/case-link.ts"

function params(text: string): URLSearchParams {
  return new URLSearchParams(text)
}

test("an empty query stays in demo mode", () => {
  expect(parseStudyLink(params(""), caseCodes)).toEqual({ kind: "demo" })
})

test("a demo run deep link stays in demo mode", () => {
  expect(parseStudyLink(params("run=F1_add_single_item_clean"), caseCodes)).toEqual({
    kind: "demo",
  })
})

test.each([
  ["p without case", "p=P01"],
  ["c without case", "c=1"],
  ["case without p", "case=C01"],
  ["case with a missing p", "case=C01&c=1"],
  ["case with a missing c", "case=C01&p=P01"],
  ["p containing a space", "case=C01&p=P+01&c=1"],
  ["p of 33 characters", `case=C01&p=${"P".repeat(33)}&c=1`],
  ["c of 0", "case=C01&p=P01&c=0"],
  ["c of 4", "case=C01&p=P01&c=4"],
  ["c that is not a number", "case=C01&p=P01&c=abc"],
  ["c that is empty", "case=C01&p=P01&c="],
  ["an unknown case code", "case=NOPE&p=P01&c=1"],
  ["an empty case code", "case=&p=P01&c=1"],
])("a %s is an invalid study link", (_label, query) => {
  expect(parseStudyLink(params(query), caseCodes)).toEqual({ kind: "invalid" })
})

test("a complete study link resolves to one case", () => {
  expect(parseStudyLink(params("p=P01&c=1&case=C01"), caseCodes)).toEqual({
    kind: "case",
    participantCode: "P01",
    caseOrder: 1,
    caseCode: "C01",
    runId: caseCodes.get("C01"),
  })
})

test("case order 3 is accepted", () => {
  expect(parseStudyLink(params("p=P07&c=3&case=C19"), caseCodes)).toEqual({
    kind: "case",
    participantCode: "P07",
    caseOrder: 3,
    caseCode: "C19",
    runId: caseCodes.get("C19"),
  })
})

test("extra unrelated parameters are ignored in study mode", () => {
  expect(
    parseStudyLink(params("p=P01&c=2&case=C05&run=F1_browse_category_intv"), caseCodes),
  ).toEqual({
    kind: "case",
    participantCode: "P01",
    caseOrder: 2,
    caseCode: "C05",
    runId: caseCodes.get("C05"),
  })
})
