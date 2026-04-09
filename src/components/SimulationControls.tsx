import type { FC } from 'react'
import type { ScenarioKey } from '../types'

interface SimulationControlsProps {
  activeScenario: ScenarioKey | null
  onTrigger: (key: ScenarioKey) => void
}

const SCENARIOS: { key: ScenarioKey; label: string }[] = [
  { key: 'gateCrowd', label: 'Increase gate crowd' },
  { key: 'foodRush', label: 'Food rush' },
  { key: 'halftimeSurge', label: 'Halftime surge' },
  { key: 'exitRush', label: 'Match end exit rush' },
]

export const SimulationControls: FC<SimulationControlsProps> = ({
  activeScenario,
  onTrigger,
}) => {
  return (
    <section className="panel controls" aria-label="Demo simulation controls">
      <div className="panel-heading compact">
        <h3>Demo Simulation Controls</h3>
        <p>Inject crowd pressure and observe AI reactions</p>
      </div>
      <div className="control-grid">
        {SCENARIOS.map((scenario) => (
          <button
            key={scenario.key}
            className={activeScenario === scenario.key ? 'active' : ''}
            onClick={() => onTrigger(scenario.key)}
          >
            {scenario.label}
          </button>
        ))}
      </div>
    </section>
  )
}
