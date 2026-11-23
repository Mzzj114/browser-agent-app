import { describe, expect, it } from "vitest"
import { studyConditionFromEnvironment, studyConditionRoutes } from "../scripts/study-condition"
import { studyConditions } from "../src/domain/study-condition"

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

describe("studyConditionRoutes", () => {
  it("keeps the condition name out of the participant URL", () => {
    for (const condition of studyConditions) {
      const route = studyConditionRoutes[condition]
      expect(route).not.toContain(condition)
    }
  })

  it("gives each condition its own segment", () => {
    const routes = Object.values(studyConditionRoutes)
    expect(new Set(routes).size).toBe(routes.length)
  })
})
