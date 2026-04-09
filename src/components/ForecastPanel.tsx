import type { FC } from 'react'
import type { ForecastItem } from '../types'

interface ForecastPanelProps {
  forecast: ForecastItem[]
}

export const ForecastPanel: FC<ForecastPanelProps> = ({ forecast }) => {
  return (
    <section className="panel forecast" aria-label="Next 10 minute forecast">
      <div className="panel-heading compact">
        <h3>Next 10 min Forecast</h3>
      </div>
      <ul>
        {forecast.map((item) => (
          <li key={item.id}>
            <p>{item.text}</p>
            <small>{Math.round(item.confidence * 100)}% confidence</small>
          </li>
        ))}
      </ul>
    </section>
  )
}
