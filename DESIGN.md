# 浏览助手 Design System

## 0. Research Log

- Embedded refs: shortlisted `linear.app.md`, `notion.md`, and `warp.md`; picked `taste-skill.md` + `linear.app.md` because the approved direction is precise, quiet, light operational software rather than a dark terminal or editorial workspace. `layout-skill.md` supplies split-pane scroll ownership.
- Lazyweb: 3 searches plus current-tool discovery; viewed `manus.png`, `replit.png`, `github.png`, and `coinbase.png` from the temporary research directory. Adopted fixed pane toolbars, thin structural dividers, dense native code presentation, independent panel scrolling, and restrained completed-state labels. No reference image is shipped or traced.
- UI/UX DB: one design-system query and three focused queries. Rejected its marketing-oriented single-column layout and gold accent; retained Noto Sans SC guidance, keyboard/focus requirements, and progressive-disclosure checks.
- Imagen drafts: skipped because no image-generation tool is available in this environment. The composition contract is the approved split workspace plus the real-product layout grammar above.

## 1. Atmosphere & Identity

A calm forensic workspace that feels precise without feeling like a laboratory instrument. Information is dense only where the run is technical; the final response and browser remain easy to read. The signature is a physical browser sheet recessed into a cool-gray well, paired with a quiet execution rail whose selected step is marked by a narrow indigo edge. Hierarchy comes from alignment, luminance, and native content rather than decorative cards or motion.

Design dials: variance 4, motion 2, density 7. Light mode only, explicitly chosen by the user.

## 2. Color

### Palette

| Role | Token | Light | Usage |
|------|-------|-------|-------|
| Canvas | --canvas | #F4F5F7 | App background and browser well |
| Surface primary | --surface-primary | #FFFFFF | Chat, header, decision footer, dialog |
| Surface secondary | --surface-secondary | #F8F9FA | Browser chrome and code cells |
| Surface sunken | --surface-sunken | #EEF0F3 | Recessed browser surround |
| Surface hover | --surface-hover | #F0F1F5 | Interactive row hover |
| Surface selected | --surface-selected | #EEEFFC | Selected step background |
| Text primary | --text-primary | #24262B | Headings and main content |
| Text secondary | --text-secondary | #575E6B | Secondary copy and metadata |
| Text tertiary | --text-tertiary | #6B7280 | Captions and inactive labels |
| Text disabled | --text-disabled | #8B919C | Disabled text only |
| Border default | --border-default | #E1E4E9 | Dividers and control outlines |
| Border strong | --border-strong | #C9CED7 | Browser frame and emphasized outlines |
| Accent primary | --accent-primary | #5158B8 | Focus, selected controls, interactive affordance |
| Accent hover | --accent-hover | #444BA3 | Accent hover state |
| Accent border | --accent-border | #A9AFE6 | Selected-step edge and focus support |
| Accent soft | --accent-soft | #E3E6FA | Subtle interactive tint |
| Code text | --code-text | #343947 | Native REPL code |
| Error text | --error-text | #B42318 | Native error output with text label |
| Error surface | --error-surface | #FFF4F2 | Inline native error background |
| Scrim | --scrim | rgb(24 26 32 / 58%) | Screenshot dialog backdrop |
| Focus ring | --focus-ring | rgb(81 88 184 / 28%) | Keyboard focus halo |

### Rules

- Accent is reserved for interaction and current selection, never decorative washes or gradients.
- Accept and Reject use identical neutral treatment. No color communicates correctness.
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

- Inter Variable is self-hosted through the application bundle. Chinese uses local system fonts to avoid a large runtime font download.
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
| --radius-surface | 8px | Code cells and small surfaces |
| --radius-panel | 10px | Browser sheet and dialog |
| --radius-round | 50% | Brand icon and icon-only controls |

### Grid

- App shell: one fixed header row and one bounded `minmax(0, 1fr)` workspace row, using `100dvh` and `100dvb`.
- Workspace: `grid-template-columns: var(--agent-width) minmax(0, 1fr)` with a 1px structural divider.
- Agent panel: grid rows `auto minmax(0, 1fr) auto`; only the chat/history body scrolls.
- Browser panel: grid rows `auto auto minmax(0, 1fr) auto`; only the screenshot viewport scrolls.
- Supported viewport: 1280x720 minimum; designed at 1366x768 and 1440x900.
- Below the minimum width or height, replace the workspace with the approved desktop requirement message.

### Scroll Ownership

- Product header, browser chrome, replay toolbar, and decision footer stay fixed.
- `.chat-scroll` owns agent-content scrolling.
- `.browser-viewport` owns screenshot scrolling.
- `.code-block` owns optional horizontal code scrolling.
- `.dialog-scroll` owns zoomed-image scrolling.
- Every scroll region has `min-block-size: 0` and `min-inline-size: 0`.

## 5. Components

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
- Accessibility: one-line Chinese label, visible focus, 4.5:1 text contrast.
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

- Structure: native `<details>` and `<summary>` with a chevron and Chinese label.
- Variants: thinking, output, error output, technical details.
- Spacing: space-3 summary gap and content padding.
- States: default, hover, focus-visible, open, empty, error.
- Accessibility: native keyboard behavior and expanded semantics.
- Motion: no height animation; state change is immediate and stable.

### StepCard

- Structure: article with a full-width native step-selection button, native cells, and disclosures.
- Variants: default, selected, missing screenshot, contains native error.
- Spacing: space-3 cell gaps and space-4 padding.
- States: default, hover, active, focus-visible, selected, disabled where applicable.
- Accessibility: selected state uses `aria-pressed`; selection is text and border plus accent, not accent alone.
- Motion: 120ms color and active scale on the selection button only.
- Layout: vertical execution rail; article itself does not scroll.

### CodeCell

- Structure: labeled native Python block and optional native output block.
- Variants: code, output, error output, long content, missing thinking.
- Spacing: space-3 internal padding, code line-height from Section 3.
- States: default, expanded, collapsed, error, empty output.
- Accessibility: literal text remains selectable; long lines wrap by default, with optional horizontal code scroll only when required.
- Layout: stack inside StepCard; `.code-block` owns code-specific overflow.

### BrowserFrame

- Structure: recorded tab, read-only address, Agent browser label, screenshot well, inline stage toolbar.
- Variants: final state, selected historical state, missing screenshot.
- Spacing: tab-height, space-3 chrome padding, space-4 well padding.
- States: default, historical selection, final selection, empty screenshot.
- Accessibility: read-only text is not disguised as editable input; screenshots have state-specific alt text.
- Depth: border-strong plus the subtle browser shadow token.
- Layout: bounded grid; `.browser-viewport` owns screenshot scrolling; `.browser-stage-toolbar` sits at the bottom of the frame and holds the stage label, replay controls, and zoom action in one row.

### ReplayControls

- Structure: previous-step IconButton, current-position text, next-step IconButton, final-state ActionButton.
- Variants: first step, middle step, last step, final state.
- Spacing: space-2 cluster gaps inside the browser stage toolbar.
- States: default, hover, active, focus-visible, disabled at boundaries.
- Accessibility: disabled arrows at boundaries, current position announced as text.
- Layout: inline at the trailing edge of the bottom browser stage toolbar; never overlaps evidence.

### ScreenshotDialog

- Structure: native `<dialog>`, close button, zoom controls, scrollable image canvas.
- Variants: fit, zoomed, missing screenshot fallback is outside this component.
- Spacing: space-3 toolbar gaps, space-4 canvas padding.
- States: closed, open, fit, zoom in, zoom out, zoom boundary disabled.
- Accessibility: native focus containment, Escape dismissal, explicit close button, focus restored to trigger.
- Motion: 160ms opacity and scale only, disabled under reduced motion.
- Layout: overlay-stack; `.dialog-scroll` owns image scrolling.

### DecisionFooter

- Structure: question text, equal ActionButton pair, or neutral recorded-decision status.
- Variants: undecided, accepted, rejected.
- Spacing: space-4 padding and space-3 button gap.
- States: default, hover, active, focus-visible, submitted-disabled.
- Accessibility: immediate state announced with `aria-live="polite"`; no correctness message.
- Layout: closes the final response inside the scrollable transcript, directly after the assistant message.

### AgentPrompt

- Structure: disabled prompt field, recorded model label, read-only note, and disabled send IconButton.
- Variants: replay-only read-only composer.
- States: disabled input and disabled send action.
- Accessibility: labelled fieldset group; the prompt textarea and send control stay visibly disabled.
- Layout: fixed final row of the agent panel; the model name comes from the run metadata (`engine.model`).

### DesktopOnlyMessage

- Structure: browser icon, Chinese heading, short viewport instruction.
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
| Standard | 160ms | cubic-bezier(0.16, 1, 0.3, 1) | Dialog opacity and scale |
| Maximum | 200ms | ease-out | Exceptional state emphasis only |

### Rules

- Only transform, opacity, and color transitions are allowed; no layout-property animation.
- Motion communicates selection, press feedback, or dialog entry/exit. No decorative or perpetual animation.
- No streaming, simulated execution, autoplay, animated scrolling, or automatic evidence movement.
- `prefers-reduced-motion: reduce` removes nonessential transitions and active scaling.
- z-index scale: base 0, fixed browser/chrome 10, screenshot dialog 100, dialog toolbar 110.

## 7. Depth & Surface

### Strategy

Mixed: structural borders and tonal shifts own normal hierarchy. Shadows are reserved for the physical browser sheet and modal dialog.

| Level | Token | Value | Usage |
|------|-------|-------|-------|
| Browser | --shadow-browser | 0 1px 2px rgb(36 42 56 / 5%), 0 12px 32px rgb(36 42 56 / 6%) | Physical recorded-browser sheet |
| Dialog | --shadow-dialog | 0 24px 80px rgb(24 26 32 / 22%), 0 4px 16px rgb(24 26 32 / 10%) | Screenshot overlay |
| Inset | --shadow-inset | inset 0 1px 0 rgb(255 255 255 / 70%) | Subtle browser-chrome highlight |
| Default border | --border-ring-default | 1px solid var(--border-default) | Controls and dividers |
| Strong border | --border-ring-strong | 1px solid var(--border-strong) | Browser sheet |

### Rules

- No floating card grid, gradient mesh, glow, glassmorphism, or decorative shadow stacks.
- Browser depth supports the metaphor of a recorded physical page and must remain subtle at 1366x768.

## 8. Accessibility Constraints & Accepted Debt

### Constraints

- Target WCAG 2.2 AA: 4.5:1 normal text and 3:1 large text/icon contrast.
- `lang="zh-CN"`, logical heading order, real landmarks, native buttons/details/dialog, and useful alt text.
- Every action is keyboard reachable with a visible focus indicator and a minimum 44px target.
- Dialog traps and releases focus correctly; Escape closes it.
- No automatic motion or timed trial progression; reduced-motion preferences are respected.
- Selection, native errors, and decision state are never communicated through color alone.
- Long Chinese text, URLs, and code cannot create page-level horizontal scrolling.
- Cognitive load is stabilized through persistent pane positions, no automatic replay, and progressive disclosure of native detail.

### Accepted Debt

| Item | Location | Why accepted | Owner / Exit |
|------|----------|--------------|--------------|
| No responsive mobile or 200%-zoom workspace; the desktop-only message appears below 1280x720 CSS px | App shell | Explicit user-approved desktop-only experiment viewport and consistent evidence presentation | Revisit only if the study adds mobile or scalable-workspace requirements |
| Raw REPL cells may be difficult for non-technical participants | Execution history | Explicit user decision to reflect real 1.x REPL tools without generated summaries | Preserve native code and readable formatting; reconsider only through a new research decision |
| Decision irreversibility lasts only for the mounted session | Decision footer | Backend and durable study flow are explicitly out of scope | Future study apparatus owns persistence |
| Synthetic fixture is not a real recorded run | Fixture source and assets | Required to build before trial generation; source remains marked synthetic while the UI does not reveal the answer | Replace through the future exact 1.x recorder adapter |
| Chinese glyph appearance varies with local system fonts | All Chinese text | Avoids a multi-megabyte CJK webfont and keeps runtime assets local | Revisit if cross-platform screenshot fidelity becomes a study requirement |
