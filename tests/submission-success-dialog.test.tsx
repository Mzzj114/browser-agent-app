import { fireEvent, render, screen, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { useState } from "react"
import { describe, expect, it } from "vitest"
import { SubmissionSuccessDialog } from "../src/components/ui/submission-success-dialog"
import { LocaleProvider } from "../src/i18n"

type UploadStatus = "synced" | "retrying" | "failed" | null

function Harness({ uploadStatus }: { readonly uploadStatus: UploadStatus }) {
  const [open, setOpen] = useState(true)

  return (
    <LocaleProvider initialLocale="en" syncDocument={false}>
      <SubmissionSuccessDialog
        open={open}
        uploadStatus={uploadStatus}
        onClose={() => setOpen(false)}
      />
    </LocaleProvider>
  )
}

describe("submission success dialog", () => {
  it("shows the submitted instruction and closes with Done", async () => {
    const user = userEvent.setup()
    render(<Harness uploadStatus="synced" />)

    const dialog = screen.getByRole("dialog", { name: "Response submitted" })
    expect(
      within(dialog).getByText("Case submitted. Please wait for the researcher."),
    ).toBeVisible()
    expect(within(dialog).getByText("Your response was sent to the study server.")).toBeVisible()

    await user.click(within(dialog).getByRole("button", { name: "Done" }))

    expect(document.querySelector("dialog")).not.toHaveAttribute("open")
  })

  it("shows one honest upload line for each outcome", () => {
    const cases = [
      ["synced", "Your response was sent to the study server."],
      ["retrying", "Your response is saved on this device and will be sent automatically."],
      ["failed", "Your response is saved on this device. Please tell the researcher."],
    ] as const

    for (const [uploadStatus, line] of cases) {
      const view = render(<Harness uploadStatus={uploadStatus} />)

      expect(within(screen.getByRole("dialog")).getByText(line)).toBeVisible()
      view.unmount()
    }
  })

  it("omits the upload line until an outcome is known and updates it later", () => {
    const view = render(<Harness uploadStatus={null} />)

    expect(within(screen.getByRole("dialog")).queryByRole("status")).toBeNull()

    view.rerender(<Harness uploadStatus="synced" />)

    expect(
      within(screen.getByRole("dialog")).getByText("Your response was sent to the study server."),
    ).toBeVisible()
  })

  it("closes on the dialog cancel event", () => {
    render(<Harness uploadStatus="retrying" />)

    fireEvent(screen.getByRole("dialog"), new Event("cancel", { bubbles: true, cancelable: true }))

    expect(document.querySelector("dialog")).not.toHaveAttribute("open")
  })

  it("renders Chinese dialog copy", () => {
    render(
      <LocaleProvider initialLocale="zh" syncDocument={false}>
        <SubmissionSuccessDialog open uploadStatus="synced" onClose={() => {}} />
      </LocaleProvider>,
    )

    expect(screen.getByRole("dialog", { name: "评估已提交" })).toBeVisible()
    expect(screen.getByRole("button", { name: "完成" })).toBeVisible()
  })
})
