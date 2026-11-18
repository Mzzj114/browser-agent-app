# 浏览助手 Design System

## 0. Research Log

- Embedded refs: shortlisted `linear.app.md`, `notion.md`, and `warp.md`; picked `taste-skill.md` + `linear.app.md` because the approved direction is precise, quiet, light operational software rather than a dark terminal or editorial workspace. `layout-skill.md` supplies split-pane scroll ownership.
- Lazyweb: 3 searches plus current-tool discovery; viewed `manus.png`, `replit.png`, `github.png`, and `coinbase.png` from the temporary research directory. Adopted fixed pane toolbars, thin structural dividers, dense native code presentation, independent panel scrolling, and restrained completed-state labels. No reference image is shipped or traced.
- UI/UX DB: one design-system query and three focused queries. Rejected its marketing-oriented single-column layout and gold accent; retained Noto Sans SC guidance, keyboard/focus requirements, and progressive-disclosure checks.
- Imagen drafts: skipped because no image-generation tool is available in this environment. The composition contract is the approved split workspace plus the real-product layout grammar above.
- Guidance layering: rejected a one-shot product tour. Consequence and provenance disclosures stay in place at the moment of use, compressed to a single line or badge; orientation to affordances remains visible text rather than a skippable overlay. This also keeps the transparency condition constant across study participants.

## 1. Atmosphere & Identity

A quiet, near-neutral light productivity workspace for reviewing a recorded browser run. Information is dense only where the run is technical; the final response and browser remain easy to read. Near-neutral gray surfaces, structural borders, and a narrow indigo selected-step edge support inspection without framing the agent as trustworthy or the task as fault-finding. Hierarchy comes from alignment, luminance, and native content rather than assistant personality, floating cards, or motion. This is a restrained visual treatment, not an empirically neutral stimulus.

Design dials: variance 4, motion 2, density 7. Light mode only, explicitly chosen by the user.

## 2. Color

### Palette

| Role | Token | Light | Usage |
|------|-------|-------|-------|
| Canvas | --canvas | #F6F7F8 | App background and browser well |
| Surface primary | --surface-primary | #FFFFFF | Chat, header, decision footer |
| Surface secondary | --surface-secondary | #F7F8FA | Browser chrome and code cells |
| Surface sunken | --surface-sunken | #EEF0F2 | Recessed browser surround |
| Surface hover | --surface-hover | #F0F2F5 | Interactive row hover |
| Surface selected | --surface-selected | #F0F1FB | Selected step background |
| Text primary | --text-primary | #25272C | Headings and main content |
| Text secondary | --text-secondary | #555D68 | Secondary copy and metadata |
| Text tertiary | --text-tertiary | #646D79 | Captions and inactive labels |
| Text disabled | --text-disabled | #8B919B | Disabled text only |
| Border default | --border-default | #DDE1E6 | Dividers and control outlines |
| Border strong | --border-strong | #C5CBD3 | Browser frame and emphasized outlines |
| Accent primary | --accent-primary | #5158B8 | Focus, selected controls, interactive affordance |
| Accent hover | --accent-hover | #444BA3 | Accent hover state |
| Accent border | --accent-border | #A9AFE6 | Selected-step edge and focus support |
| Accent soft | --accent-soft | #E3E6FA | Subtle interactive tint |
| Code text | --code-text | #343A46 | Native REPL code |
| Error text | --error-text | #B42318 | Native error output with text label |
| Error surface | --error-surface | #FFF4F2 | Inline native error background |
| Scrim | --scrim | rgb(24 26 32 / 58%) | Reserved for future overlays |
| Focus ring | --focus-ring | #5158B8 | Opaque keyboard focus outline |

### Rules

- Accent is reserved for interaction and current selection, never decorative washes or gradients.
- Static brand, model icon, and both speaker avatars use neutral styling; identity text and icons remain present.
- The fulfilment choices use identical neutral treatment. No color communicates correctness.
- Native errors use both text and color. No run-level failure banner is allowed.
- Every color used in CSS must reference this table.

## 3. Typography

### Scale

| Level | Size | Weight | Line Height | Tracking | Usage |
|------|-------|-------|-------|-------|-------|
| Product title | 16px | 590 | 1.4 | -0.01em | Header identity |
| Section title | 15px | 590 | 1.5 | 0 | Execution section and browser region labels |
| Body large | 16px | 400 | 1.7 | 0 | Original prompt and final response |
| Body | 15px | 400 | 1.65 | 0 | Default interface content |
| Body emphasis | 15px | 510 | 1.5 | 0 | Buttons and selected labels |
| Body small | 14px | 400 | 1.55 | 0 | Secondary content and controls |
| Caption | 12px | 510 | 1.45 | 0 | Metadata and compact labels |
| Code | 13px | 400 | 1.65 | 0 | Native REPL cells and output |
| Code caption | 12px | 400 | 1.5 | 0 | Line numbers and code metadata |

### Font Stack

- Primary: `Inter Variable`, `Noto Sans SC`, `PingFang SC`, `Microsoft YaHei`, `system-ui`, sans-serif.
- Mono: `JetBrains Mono`, `SFMono-Regular`, `Consolas`, `Liberation Mono`, monospace.

### Rules

- Inter Variable is self-hosted through the application bundle. Chinese text uses local system fonts to avoid a large runtime font download.
- Weights 400, 510, and 590 form the hierarchy. No weight above 650.
- Body content never drops below 14px; 12px is reserved for captions and metadata.
- Code and URLs wrap intentionally. Horizontal scrolling is allowed only inside a native code block or zoomed image, never the page shell.

## 4. Spacing & Layout

### Base Unit

All spacing derives from 4px.

| Token | Value | Usage |
|------|-------|-------|
| --space-1 | 4px | Icon-to-label and tight inline gaps |
| --space-2 | 8px | Compact control gaps |
| --space-3 | 12px | Metadata groups and small padding |
| --space-4 | 16px | Default content padding |
| --space-5 | 20px | Message and section separation |
| --space-6 | 24px | Comfortable panel padding |
| --space-8 | 32px | Major content-group separation |
| --space-10 | 40px | Sparse desktop separation |
| --space-12 | 48px | Fallback-screen grouping |
| --control-height | 44px | Minimum interactive target |
| --header-height | 56px | Fixed product header |
| --tab-height | 40px | Recorded browser tab strip |
| --agent-width | clamp(25rem, 30vw, 27rem) | Fixed, non-draggable agent track |
| --radius-control | 6px | Buttons and inputs |
| --radius-surface | 8px | Code cells, message bubbles, step cards |
| --radius-panel | 10px | Browser sheet |
| --radius-composer | 8px | Assistant composer field |
| --radius-round | 50% | Circular icon controls and authoring send |

### Grid

- App shell: one fixed header row, a bounded task/report context strip, a bounded three-pane workspace row, and a bounded response row, using `100dvh` and `100dvb`.
- Study context strip: two equal task/report panels, capped at `clamp(6rem, 18dvh, 9rem)` with internal scrolling.
- Main workspace: `clamp(12rem, 16vw, 14rem) minmax(0, 1fr) clamp(19rem, 25vw, 22rem)` for the execution rail, recorded page, and inspector.
- Response region: a separate shell row capped at `clamp(10rem, 26dvh, 14rem)`; its controls stay reachable while long copy scrolls internally.
- Supported viewport: 1280x720 minimum; designed at 1366x768 and 1440x900 in both locales.
- Below the minimum width or height, replace the workspace with the approved desktop requirement message.
- Dimensions and default replay state must not depend on the evidence condition. `--agent-width` is retained only for the legacy developer showcase.

### Scroll Ownership

- Product header, task/report context, rail heading, replay toolbar, and response controls stay fixed.
- `.study-context-panel` owns task/report overflow.
- `.execution-rail-list` owns chronological action scrolling.
- `.browser-viewport` owns fitted and actual-size screenshot scrolling.
- `.study-inspector-panel` owns viewed-step evidence scrolling, including long candidate lists.
- `.study-response` owns response-form overflow when dense.
- Every scroll region has `min-block-size: 0` and `min-inline-size: 0`; no region may create page-level shell overflow or cover another pane's controls.

## 5. Components

### Participant decision-evidence workspace

The production entry composes these components. Legacy chat/transcript components remain developer-showcase-only.

#### ExecutionRail

- Structure: navigation landmark with a chronological ordered list of native buttons, one per episode. Each row shows step number, human-readable actual action, and separate viewed/marked labels.
- Variants: default, viewed, marked, viewed-and-marked.
- States: hover, focus-visible, `aria-current="step"` for viewed, text label for marked.
- Accessibility: viewing and marking are distinct textual states; the mark is never color-only.
- Layout: `.execution-rail-list` owns vertical scrolling; the rail does not stretch the shell.

#### CandidateTable

- Structure: read-only table with caption, candidate/context headings, selected marker, and an optional probability column only in the probabilities condition.
- Variants: unscored candidates, scored probabilities.
- States: selected row; no sorting, filtering, coloring, bars, or click-to-act rows.
- Accessibility: native table headings, row headers, and explicit “Selected” text; repeated labels stay distinct through contextual cells and stable IDs.
- Layout: rows wrap and the inspector owns vertical scrolling; a 250-row illustrative test list must not widen the shell.

#### DecisionInspector

- Structure: final-state explanation, or viewed episode summary, factual outcome, entered text, mark/clear control, and permitted candidate evidence.
- Variants: final state, baseline episode, candidates episode, probabilities episode, operation-only/no-target terminal.
- States: unmarked, marked, cleared, submitted-disabled marking.
- Accessibility: final state exposes no marking control; viewed and marked semantics remain separate; terminal DONE/BLOCKED and control operations show “No target required.”
- Layout: inspector outer dimensions are condition-independent; long evidence scrolls inside `.study-inspector-panel`.

#### StudyResponseForm

- Structure: equal accept/reject choices, stable-ID localization select with Cannot determine, persistent 500-character explanation, explicit Submit, validation summary, consequence copy, and neutral on-screen status.
- Variants: unanswered, tentative accept/reject, concrete marked step, Cannot determine, submitted.
- States: editable, error-visible, submitted-locked.
- Accessibility: native controls, visible focus, per-field `aria-invalid`/`aria-describedby`, polite status announcements, and no correctness feedback.
- Layout: bounded response row with internal overflow; all controls remain keyboard reachable at 1280×720 with long Chinese text and evidence lists.

#### BrowserFrame participant contract

- Structure: recorded tab, read-only address, recorded-execution count, before/current-state caption, recorded action and capture time, and a screenshot whose trigger toggles fit/actual size.
- Variants: explicit final observation, viewed historical step, missing screenshot, fitted, actual size.
- States: final, historical, missing evidence, zoomed.
- Accessibility: read-only text is not presented as editable; alt text names the recorded page; the trigger names the current fit/actual-size action.
- Layout: bounded viewport with two-axis scrolling at actual size; images keep intrinsic dimensions and unfiltered opacity.
- Failure: a real image error shows missing evidence while keeping URL/title/action. Moving to a healthy path recovers the image; the renderer never substitutes an after-state and labels it “before.”

### BrandMark

- Structure: compact outlined rounded square with a browser/globe SVG icon and product title.
- Variants: default only.
- Spacing: space-2 icon gap, space-3 header padding.
- States: static; no hover or click affordance.
- Accessibility: icon is decorative; product title is real text.
- Layout: cluster in the fixed header; never scrolls.

### IconButton

- Structure: native `<button>` with an SVG icon and accessible name.
- Variants: ghost, outlined, dialog.
- Spacing: control-height square, space-2 internal gap.
- States: default, hover, active, focus-visible, disabled.
- Accessibility: 44px target, visible focus ring, `aria-label`, native disabled semantics.
- Motion: 120ms color and 0.98 active scale; no layout movement.
- Layout: cluster; does not own scrolling.

### ActionButton

- Structure: native `<button>` with text and optional leading icon.
- Variants: neutral and selected; no separate Accept/Reject hierarchy.
- Spacing: control-height, space-4 inline padding, space-2 icon gap.
- States: default, hover, active, focus-visible, disabled, selected.
- Accessibility: one-line label in the active interface language, visible focus, 4.5:1 text contrast.
- Motion: 120ms color and active scale.
- Layout: equal-width pair in the decision footer.

### StatusBadge

- Structure: neutral icon and text, not a clickable pill.
- Variants: completed, decision-recorded, metadata.
- Spacing: space-1 icon gap, space-2 inline padding.
- States: static only; no decorative status dots.
- Accessibility: icon plus literal status text; never color-only.
- Layout: inline cluster.

### MessageBlock

- Structure: semantic article with small role label and readable body.
- Variants: original user prompt and final assistant response.
- Spacing: space-4 to space-5 separation, readable 65ch measure.
- States: static completed content only; never streams.
- Accessibility: headings and reading order follow prompt, response, execution history.
- Layout: stack inside `.chat-scroll`.

### Disclosure

- Structure: native `<details>` and `<summary>` with a chevron and a label in the active interface language.
- Variants: thinking, output, error output, technical details.
- Spacing: space-3 summary gap and content padding.
- States: default, hover, focus-visible, open, empty, error.
- Accessibility: native keyboard behavior and expanded semantics.
- Motion: no height animation; state change is immediate and stable.

### StepCard (legacy developer showcase only)

- Structure: article with a full-width step-selection button and an optional technical-details disclosure containing thinking and native cells.
- Variants: default, selected, missing screenshot, contains native error.
- States: default, hover, focus-visible, selected, technical details closed/open.
- Accessibility: showcase-only legacy behavior; selection uses `aria-pressed`.
- Layout: used only by the developer showcase, not the participant workspace or production build input. Participant actions are labeled by ExecutionRail.

### CodeCell

- Structure: labeled native Python block and optional native output block inside the StepCard technical-details disclosure.
- Variants: code, output, error output, long content, missing thinking.
- Spacing: space-3 internal padding, code line-height from Section 3.
- States: default, expanded, collapsed, error, empty output.
- Accessibility: literal text remains selectable; long lines wrap by default, with optional horizontal code scroll only when required.
- Layout: stack inside StepCard; `.code-block` owns code-specific overflow. The delivered final-report argument is replaced by a neutral pointer so the report is not duplicated in code.

### BrowserFrame

- Structure: recorded tab, read-only address, recorded-execution count, evidence caption (before/final label, recorded action, capture time), and a screenshot well whose image toggles between fit and actual size.
- Variants: explicit final observation, selected historical before-state, missing screenshot, fitted, actual-size.
- Spacing: tab-height, space-3 chrome padding, no extra well padding.
- States: final selection, historical selection, empty screenshot, fitted, actual size.
- Accessibility: read-only text is not disguised as editable input; screenshots have state-specific alt text; the caption announces the selected state; the image trigger describes the current fit/actual-size action.
- Depth: border-strong plus the subtle browser shadow token.
- Layout: bounded grid; `.browser-viewport` owns screenshot scrolling; the default image fits the panel width, and clicking switches to native pixel size with two-axis scrolling.
- Failure: a failed image request shows the explicit missing-evidence state while keeping URL/title/action; a healthy path recovers without an after-image fallback.

### ReplayControls

- Structure: previous-step IconButton, current-position text, next-step IconButton, chronological step menu, and return-to-last-recorded-state ActionButton.
- Variants: first step, middle step, last step, last recorded state.
- Spacing: space-2 cluster gaps inside the dedicated replay bar.
- States: default, hover, active, focus-visible, disabled at boundaries.
- Accessibility: disabled arrows at boundaries, current position announced as text, the menu names each recorded action.
- Layout: a separate replay bar below the browser frame; it never sits inside browser decoration.

### DecisionFooter (legacy developer showcase only)

- Structure: fulfilment question, equal tentative-choice pair, explicit submit action with its consequence line, neutral status, optional reason disclosure, and a revision note.
- Variants: no selection, tentative selection, submitted accepted, submitted rejected.
- Spacing: space-4 padding and space-3 button gap.
- States: default, hover, active, focus-visible, choice-selected, submitted-disabled.
- Accessibility: showcase-only legacy behavior; the participant response contract is StudyResponseForm.
- Layout: used only by the developer showcase; the participant response is a separate bounded shell row.

### InspectionHint

- Structure: one muted static line inside the execution history; the label and guidance share a single line.
- Variants: default only.
- Spacing: no enclosing panel; space-2 inline gap after the label, subordinate to the section heading.
- States: static.
- Accessibility: plain text, no auto-advance and no task-specific hint.
- Layout: above the step list; never obscures evidence.

### AgentPrompt (legacy developer showcase only)

- Structure: disabled prompt field, recorded model label, read-only note, and disabled send IconButton.
- Variants: replay-only read-only composer.
- States: disabled input and disabled send action.
- Accessibility: showcase-only legacy behavior; the participant workspace uniformly removes the composer.
- Layout: developer showcase only; not rendered by the participant entry.

### DesktopOnlyMessage

- Structure: browser icon, heading in the active interface language, short viewport instruction.
- Variants: narrow width or short height.
- Spacing: space-6 to space-12 grouping.
- States: static fallback only.
- Accessibility: semantic main landmark and readable single column at 375px.
- Layout: centered cover; no horizontal page scroll.

## 6. Motion & Interaction

### Timing

| Type | Duration | Easing | Usage |
|------|----------|--------|-------|
| Micro | 120ms | ease-out | Button press, hover color |
| Standard | 160ms | cubic-bezier(0.16, 1, 0.3, 1) | Reserved for future overlays |
| Maximum | 200ms | ease-out | Exceptional state emphasis only |

### Rules

- Only transform, opacity, and color transitions are allowed; no layout-property animation.
- Motion communicates selection, press feedback, or state change. No decorative or perpetual animation.
- No streaming, simulated execution, autoplay, animated scrolling, or automatic evidence movement.
- `prefers-reduced-motion: reduce` removes nonessential transitions and active scaling.
- z-index scale: base 0, fixed browser/chrome 10.

## 7. Depth & Surface

### Strategy

Structural borders and tonal shifts own normal hierarchy. Only the recorded browser retains a small separation shadow; ordinary cards, the replay bar, and the composer are flat.

| Level | Token | Value | Usage |
|------|-------|-------|-------|
| Browser | --shadow-browser | 0 1px 2px rgb(24 26 32 / 6%) | Recorded-browser separation |
| Card | --shadow-card | none | Flat cards, replay bar, and composer |
| Dialog | --shadow-dialog | 0 24px 80px rgb(30 29 24 / 22%), 0 4px 16px rgb(30 29 24 / 10%) | Reserved for future overlays |
| Inset | --shadow-inset | inset 0 1px 0 rgb(255 255 255 / 70%) | Subtle browser-chrome highlight |
| Default border | --border-ring-default | 1px solid var(--border-default) | Controls and dividers |
| Strong border | --border-ring-strong | 1px solid var(--border-strong) | Browser sheet |

### Rules

- No floating card grid, gradient mesh, glow, glassmorphism, or decorative shadow stacks.
- The selected step uses only `inset 2px 0 0 var(--accent-primary)` plus its selected surface and text/ARIA state; never combine `none` with another shadow layer.
- Browser separation must remain subtle at 1366x768.

## 8. Accessibility Constraints & Accepted Debt

### Constraints

- Target WCAG 2.2 AA: 4.5:1 normal text and 3:1 large text/icon contrast.
- The document `lang` reflects the active interface language (`zh-CN` or `en`), with logical heading order, real landmarks, native buttons/details, and useful alt text.
- Every action is keyboard reachable with a visible focus indicator and a minimum 44px target.
- Focus uses an opaque 3px solid `--focus-ring` outline at 2px offset, including with reduced motion. Essential enabled icons and the indicator require at least 3:1 contrast against their actual surfaces.
- No automatic motion or timed trial progression; reduced-motion preferences are respected.
- Selection, native errors, and decision state are never communicated through color alone.
- Long interface text (Chinese or English), URLs, and code cannot create page-level horizontal scrolling.
- Cognitive load is stabilized through persistent pane positions, no automatic replay, and progressive disclosure of native detail.

### Decision-Evidence Contract

- The participant entry is one shared three-pane replay workspace. The checked-in condition at `src/study-condition.ts` determines whether offered candidates and synthetic probabilities are projected; no URL, query, storage, or runtime selector changes it.
- Initial view is the explicit final observation. Episode selection shows the before-action screenshot. Final and terminal episode states remain semantically distinct even when the screenshot pixels match.
- Viewed selection and the participant mark are independent. The rail shows separate “Viewed” and “Your mark” text. Cannot determine clears the mark without moving the replay.
- Baseline has no candidate tables, placeholders, hidden score nodes, or technical disclosure. Experimental conditions add read-only, source-ordered candidate tables without score-based styling.
- Responses are on-screen only: no export, backend, telemetry, or judgment storage. Reload clears the response but leaves the fixed run and locale preference behavior unchanged.
- `scripts/verify-study-builds.ts` verifies the emitted condition, fixture revision, permitted study assets, and screenshots. `scripts/compare-study-builds.ts` compares semantic core digests, unscored candidate order/selection, and six browser geometry reports within 1px.
- Browser E2E runs against the production build and preview on port 4173. The synthetic run is not a study-ready stimulus set or a real Jev recording.

### Study Adoption Gate

- Preserve task/report text, report exposure and typography, pane geometry, disclosure defaults, decision semantics, and unfiltered screenshot assets/zoom across theme changes.
- Give both fulfillment answers equivalent default, hover, focused, selected, and submitted treatment. Neither answer receives correctness coloring.
- Review matched Chinese/English captures at 1280×720, 1366×768, and 1440×900 before adoption.
- Pilot with genuinely fulfilled and unfulfilled runs and consistent practice; check replay discovery, evidence readability, historical-state understanding, and submission meaning. Collect appearance feedback after judgments.
- Do not adopt a theme because it increases acceptance, rejection, or error detection. Freeze and identify the theme revision before the main study; hold it constant across conditions except for explicit experimental manipulations.
- Tests and a small pilot cannot establish theme-independent judgments or eliminate aesthetic effects.
- Implementation status: code reviewed; study-owner visual approval, pilot, and theme freeze pending. Not yet study-ready.

### Accepted Debt

| Item | Location | Why accepted | Owner / Exit |
|------|----------|--------------|--------------|
| No responsive mobile or 200%-zoom workspace; the desktop-only message appears below 1280x720 CSS px | App shell | Explicit user-approved desktop-only experiment viewport and consistent evidence presentation | Revisit only if the study adds mobile or scalable-workspace requirements |
| Raw REPL cells remain verbatim for provenance | StepCard technical details | Explicit user decision to reflect real 1.x REPL tools without generated summaries; now secondary to the action label and screenshot | Preserve native code and readable formatting; reconsider only through a new research decision |
| Decision irreversibility lasts only for the mounted session | Decision footer | Backend and durable study flow are explicitly out of scope | Future study apparatus owns persistence |
| Synthetic fixture is not a real recorded run | Fixture source and assets | Required to build before trial generation; source remains marked synthetic while the UI does not reveal the answer | Replace through the future exact 1.x recorder adapter |
| Chinese glyph appearance varies with local system fonts | All Chinese text | Avoids a multi-megabyte CJK webfont and keeps runtime assets local | Revisit if cross-platform screenshot fidelity becomes a study requirement |
