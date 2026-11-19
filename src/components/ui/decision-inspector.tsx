import type * as React from "react"
import { assertNever } from "../../domain/assert-never"
import type { ViewedSelection } from "../../domain/decision-replay"
import type { EpisodeCore } from "../../domain/decision-run-schema"
import { isTargetlessOperation } from "../../domain/decision-run-schema"
import type { StudyRun } from "../../domain/study-run-schema"
import { useMessages } from "../../i18n"
import { CandidateTable } from "./candidate-table"

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
              <CandidateTable
                mode="candidates"
                head={episode.operationHead}
                caption={messages.study.offeredOperations}
              />
              {episode.targetHead ? (
                <CandidateTable
                  mode="candidates"
                  head={episode.targetHead}
                  caption={messages.study.offeredTargets}
                />
              ) : isTargetlessOperation(episode.operation) ? (
                <p className="decision-inspector-note">{messages.study.noTargetRequired}</p>
              ) : (
                <p className="decision-inspector-note">{messages.study.missingTargetEvidence}</p>
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
              <CandidateTable
                mode="probabilities"
                head={episode.operationHead}
                caption={messages.study.offeredOperations}
              />
              {episode.targetHead ? (
                <CandidateTable
                  mode="probabilities"
                  head={episode.targetHead}
                  caption={messages.study.offeredTargets}
                />
              ) : isTargetlessOperation(episode.operation) ? (
                <p className="decision-inspector-note">{messages.study.noTargetRequired}</p>
              ) : (
                <p className="decision-inspector-note">{messages.study.missingTargetEvidence}</p>
              )}
              <p className="decision-inspector-note">
                {messages.study.conditionalScoreExplanation}
              </p>
              <p className="decision-inspector-note">{messages.study.roundingCaveat}</p>
            </>
          }
        />
      )
    }
    default:
      return assertNever(run)
  }
}
