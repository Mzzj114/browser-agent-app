import type * as React from "react"
import type { ViewedSelection } from "../../domain/decision-replay"
import type { EpisodeCore } from "../../domain/decision-run-schema"
import { useMessages } from "../../i18n"

type ExecutionRailProps = {
  readonly episodes: readonly Pick<EpisodeCore, "id" | "ordinal" | "action">[]
  readonly viewed: ViewedSelection
  readonly onView: (episodeId: string) => void
  readonly onFinal: () => void
}

export function ExecutionRail({
  episodes,
  viewed,
  onView,
  onFinal,
}: ExecutionRailProps): React.JSX.Element {
  const messages = useMessages()
  const isFinalViewed = viewed.kind === "final"

  return (
    <nav className="execution-rail" aria-label={messages.study.executionOverview}>
      <h2 className="execution-rail-heading">{messages.study.executionOverview}</h2>
      <ol className="execution-rail-list">
        {episodes.map((episode) => {
          const isViewed = viewed.kind === "episode" && viewed.episodeId === episode.id

          return (
            <li key={episode.id}>
              <button
                type="button"
                className="execution-rail-item"
                data-viewed={isViewed}
                aria-current={isViewed ? "step" : undefined}
                onClick={() => onView(episode.id)}
              >
                <span className="execution-rail-step">
                  {messages.study.stepLabel(episode.ordinal)}
                </span>
                <span className="execution-rail-action">{episode.action}</span>
                <span className="execution-rail-state">
                  {isViewed ? (
                    <span className="execution-rail-viewed">
                      {messages.study.viewedStep(episode.ordinal)}
                    </span>
                  ) : null}
                </span>
              </button>
            </li>
          )
        })}
        <li>
          <button
            type="button"
            className="execution-rail-item"
            data-viewed={isFinalViewed}
            aria-current={isFinalViewed ? "step" : undefined}
            onClick={onFinal}
          >
            <span className="execution-rail-action">{messages.study.finalStateHeading}</span>
            <span className="execution-rail-state">
              {isFinalViewed ? (
                <span className="execution-rail-viewed">{messages.study.viewedStepTag}</span>
              ) : null}
            </span>
          </button>
        </li>
      </ol>
    </nav>
  )
}
