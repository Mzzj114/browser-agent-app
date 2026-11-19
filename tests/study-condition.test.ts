import { describe, expect, it } from "vitest"
import { studyConditionFromEnvironment } from "../scripts/study-condition"

describe("studyConditionFromEnvironment", () => {
  it("defaults to baseline when the environment has no condition", () => {
    expect(studyConditionFromEnvironment({})).toBe("baseline")
  })

  it("accepts each known condition", () => {
    expect(studyConditionFromEnvironment({ STUDY_CONDITION: "candidates" })).toBe("candidates")
    expect(studyConditionFromEnvironment({ STUDY_CONDITION: "probabilities" })).toBe(
      "probabilities",
    )
  })

  it("rejects an unknown condition", () => {
    expect(() => studyConditionFromEnvironment({ STUDY_CONDITION: "control" })).toThrow()
  })
})
