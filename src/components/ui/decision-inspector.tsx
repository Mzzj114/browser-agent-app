import type * as React from "react"
import { assertNever } from "../../domain/assert-never"
import type { ViewedSelection } from "../../domain/decision-replay"
import type { EpisodeCore, Operation } from "../../domain/decision-run-schema"
import { isTargetlessOperation } from "../../domain/decision-run-schema"
import type { StudyRun } from "../../domain/study-run-schema"
import { type Messages, useMessages } from "../../i18n"
import { DecisionChoiceGroup } from "./decision-choice-group"

type DecisionInspectorProps = {
  readonly run: StudyRun
  readonly viewed: ViewedSelection
}

type EpisodePanelProps = {
  readonly episode: EpisodeCore
  readonly evidence: React.ReactNode
}

function findEpisode<T extends { readonly id: string }>(
  episodes: readonly T[],
  episodeId: string,
): T | undefined {
  return episodes.find((episode) => episode.id === episodeId)
}

function targetHeading(operation: Operation, messages: Messages): string {
  switch (operation) {
    case "CLICK":
      return messages.study.whatItClicked
    case "TYPE_TEXT":
      return messages.study.whereItTyped
    case "SELECT":
      return messages.study.whatItSelected
    case "DONE":
    case "BLOCKED":
    case "WAIT":
    case "SCROLL_DOWN":
    case "SCROLL_UP":
      return messages.study.whatItClicked
    default:
      return assertNever(operation)
  }
}

function MissingTargetEvidence({ operation }: { readonly operation: Operation }) {
  const messages = useMessages()
  return (
    <p className="decision-inspector-note">
      {isTargetlessOperation(operation)
        ? messages.study.noTargetRequired
        : messages.study.missingTargetEvidence}
    </p>
  )
}

function FinalStatePanel(): React.JSX.Element {
  const messages = useMessages()

  return (
    <section className="decision-inspector">
      <h2 className="decision-inspector-heading">{messages.study.finalStateHeading}</h2>
      <p className="decision-inspector-explanation">{messages.study.finalStateExplanation}</p>
    </section>
  )
}

function EpisodePanel({ episode, evidence }: EpisodePanelProps): React.JSX.Element {
  const messages = useMessages()

  return (
    <section className="decision-inspector">
      <h2 className="decision-inspector-heading">{messages.study.viewedStep(episode.ordinal)}</h2>
      <p className="decision-inspector-action">{episode.action}</p>
      {episode.outcome ? (
        <div className="decision-inspector-outcome">
          <h3>{messages.study.recordedOutcome}</h3>
          <p>{episode.outcome.text}</p>
        </div>
      ) : null}
      {episode.enteredText ? (
        <div className="decision-inspector-entered-text">
          <h3>{messages.study.enteredText}</h3>
          <p>{episode.enteredText}</p>
          <p className="decision-inspector-note">{messages.study.enteredTextNote}</p>
        </div>
      ) : null}
      {evidence}
    </section>
  )
}

export function DecisionInspector({ run, viewed }: DecisionInspectorProps): React.JSX.Element {
  const messages = useMessages()

  if (viewed.kind === "final") return <FinalStatePanel />

  switch (run.condition) {
    case "baseline": {
      const episode = findEpisode(run.episodes, viewed.episodeId)
      return episode ? <EpisodePanel episode={episode} evidence={null} /> : <FinalStatePanel />
    }
    case "candidates": {
      const episode = findEpisode(run.episodes, viewed.episodeId)
      if (!episode) return <FinalStatePanel />

      return (
        <EpisodePanel
          episode={episode}
          evidence={
            <>
              <DecisionChoiceGroup
                key={`${episode.id}:actions`}
                kind="actions"
                heading={messages.study.whatTheAgentDid}
                otherChoicesHeading={messages.study.otherActionsOffered}
                head={episode.operationHead}
              />
              {episode.targetHead ? (
                <DecisionChoiceGroup
                  key={`${episode.id}:things`}
                  kind="things"
                  heading={targetHeading(episode.operation, messages)}
                  otherChoicesHeading={messages.study.otherThingsOffered}
                  head={episode.targetHead}
                />
              ) : (
                <MissingTargetEvidence operation={episode.operation} />
              )}
            </>
          }
        />
      )
    }
    case "probabilities": {
      const episode = findEpisode(run.episodes, viewed.episodeId)
      if (!episode) return <FinalStatePanel />

      return (
        <EpisodePanel
          episode={episode}
          evidence={
            <>
              <DecisionChoiceGroup
                key={`${episode.id}:actions`}
                kind="actions"
                heading={messages.study.whatTheAgentDid}
                otherChoicesHeading={messages.study.otherActionsOffered}
                head={episode.operationHead}
                reportedConfidence={episode.operationHead.reportedConfidence}
              />
              {episode.targetHead ? (
                <DecisionChoiceGroup
                  key={`${episode.id}:things`}
                  kind="things"
                  heading={targetHeading(episode.operation, messages)}
                  otherChoicesHeading={messages.study.otherThingsOffered}
                  head={episode.targetHead}
                  reportedConfidence={episode.targetHead.reportedConfidence}
                />
              ) : (
                <MissingTargetEvidence operation={episode.operation} />
              )}
              <p className="decision-inspector-note">{messages.study.confidenceExplanation}</p>
            </>
          }
        />
      )
    }
    default:
      return assertNever(run)
  }
}
