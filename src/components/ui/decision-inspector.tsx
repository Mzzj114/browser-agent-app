import type * as React from "react"
import { assertNever } from "../../domain/assert-never"
import type { ViewedSelection } from "../../domain/decision-replay"
import type { EpisodeCore } from "../../domain/decision-run-schema"
import type { ResponseAction, StudyResponse } from "../../domain/study-response"
import type { StudyRun } from "../../domain/study-run-schema"
import { useMessages } from "../../i18n"
import { ActionButton } from "./buttons"
import { CandidateTable } from "./candidate-table"

type DecisionInspectorProps = {
  readonly run: StudyRun
  readonly viewed: ViewedSelection
  readonly response: StudyResponse
  readonly onResponse: (action: ResponseAction) => void
}

type EpisodePanelProps = {
  readonly episode: EpisodeCore
  readonly response: StudyResponse
  readonly onResponse: (action: ResponseAction) => void
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

function EpisodePanel({
  episode,
  response,
  onResponse,
  evidence,
}: EpisodePanelProps): React.JSX.Element {
  const messages = useMessages()
  const isMarked =
    response.localization.kind === "episode" && response.localization.episodeId === episode.id
  const submitted = response.status === "submitted"

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
      <ActionButton
        selected={isMarked}
        disabled={submitted}
        onClick={() => onResponse({ type: "mark", episodeId: episode.id })}
      >
        {isMarked ? messages.study.clearMark : messages.study.markEarliestMistake}
      </ActionButton>
      {evidence}
    </section>
  )
}

export function DecisionInspector({
  run,
  viewed,
  response,
  onResponse,
}: DecisionInspectorProps): React.JSX.Element {
  const messages = useMessages()

  if (viewed.kind === "final") return <FinalStatePanel />

  switch (run.condition) {
    case "baseline": {
      const episode = findEpisode(run.episodes, viewed.episodeId)
      return episode ? (
        <EpisodePanel
          episode={episode}
          response={response}
          onResponse={onResponse}
          evidence={null}
        />
      ) : (
        <FinalStatePanel />
      )
    }
    case "candidates": {
      const episode = findEpisode(run.episodes, viewed.episodeId)
      if (!episode) return <FinalStatePanel />

      return (
        <EpisodePanel
          episode={episode}
          response={response}
          onResponse={onResponse}
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
              ) : (
                <p className="decision-inspector-note">{messages.study.noTargetRequired}</p>
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
          response={response}
          onResponse={onResponse}
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
              ) : (
                <p className="decision-inspector-note">{messages.study.noTargetRequired}</p>
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
