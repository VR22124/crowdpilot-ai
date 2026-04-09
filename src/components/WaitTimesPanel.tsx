import type { FC } from 'react'
import type { WaitTimeItem } from '../types'

interface WaitTimesPanelProps {
  waitTimes: WaitTimeItem[]
}

export const WaitTimesPanel: FC<WaitTimesPanelProps> = ({ waitTimes }) => {
  return (
    <section className="wait-time-grid" aria-label="Predicted wait times">
      {waitTimes.map((item) => (
        <article key={item.zoneId} className={`wait-card ${item.classification.toLowerCase()}`}>
          <h4>{item.label}</h4>
          <p>{item.minutes} min</p>
          <small>{item.classification} density · queue {item.queueLength}</small>
        </article>
      ))}
    </section>
  )
}
