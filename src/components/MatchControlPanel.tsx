import type { FC } from 'react'
import type { MatchPhase } from '../types'

interface MatchControlPanelProps {
  phase: MatchPhase
  onChangePhase: (phase: MatchPhase) => void
}

const CONTROLS: { label: string; phase: MatchPhase }[] = [
  { label: 'Pre Match', phase: 'preMatch' },
  { label: 'First Innings', phase: 'firstInnings' },
  { label: 'Innings Break', phase: 'inningsBreak' },
  { label: 'Second Innings', phase: 'secondInnings' },
  { label: 'Match End', phase: 'matchEnd' },
]

export const MatchControlPanel: FC<MatchControlPanelProps> = ({ phase, onChangePhase }) => {
  return (
    <section className="panel controls" aria-label="Match control panel">
      <div className="panel-heading compact">
        <h3>Control Center</h3>
        <p>Change match phase and crowd behavior instantly</p>
      </div>
      <div className="control-grid">
        {CONTROLS.map((item) => (
          <button
            key={item.phase}
            className={phase === item.phase ? 'active' : ''}
            onClick={() => onChangePhase(item.phase)}
          >
            {item.label}
          </button>
        ))}
      </div>
    </section>
  )
}
