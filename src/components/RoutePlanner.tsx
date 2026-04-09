import type { FC } from 'react'
import { STADIUM_ZONES } from '../data/stadium'
import type { RoutePlan, ZoneDefinition, ZoneId } from '../types'

interface RoutePlannerProps {
  from: ZoneId
  to: ZoneId
  zoneOptions: ZoneDefinition[]
  routePlan: RoutePlan | null
  onChangeFrom: (value: ZoneId) => void
  onChangeTo: (value: ZoneId) => void
  onPlanRoute: () => void
}

export const RoutePlanner: FC<RoutePlannerProps> = ({
  from,
  to,
  zoneOptions,
  routePlan,
  onChangeFrom,
  onChangeTo,
  onPlanRoute,
}) => {
  return (
    <section className="panel route-planner" aria-label="Smart route planner">
      <div className="panel-heading compact">
        <h3>Route Optimization Agent</h3>
        <p>Gate → tunnel → concourse → stair → section routing</p>
      </div>

      <div className="planner-form">
        <label>
          Current location
          <select value={from} onChange={(event) => onChangeFrom(event.target.value as ZoneId)}>
            {zoneOptions.map((zone) => (
              <option key={zone.id} value={zone.id}>
                {zone.label}
              </option>
            ))}
          </select>
        </label>
        <label>
          Destination
          <select value={to} onChange={(event) => onChangeTo(event.target.value as ZoneId)}>
            {zoneOptions.map((zone) => (
              <option key={zone.id} value={zone.id}>
                {zone.label}
              </option>
            ))}
          </select>
        </label>
        <button onClick={onPlanRoute}>Compute Smart Route</button>
      </div>

      {routePlan && (
        <div className="route-results">
          <p>
            Fastest route: <strong>{routePlan.etaMinutes} min</strong>
          </p>
          <p>{routePlan.primaryPath.map((zoneId) => STADIUM_ZONES[zoneId].label).join(' → ')}</p>
          <p>
            Congestion score: <strong>{routePlan.congestionScore}</strong>
          </p>
          <p>
            Avoid congestion: <strong>{routePlan.avoidsPitch ? 'Pitch avoided (walkable only)' : 'Review route'}</strong>
          </p>
          <p>
            Alternate: <strong>{routePlan.alternativeEtaMinutes} min</strong>
          </p>
          <p>{routePlan.alternativePath.map((zoneId) => STADIUM_ZONES[zoneId].label).join(' → ')}</p>
          <p>
            Direct route baseline: <strong>{routePlan.directEtaMinutes} min</strong>
          </p>
          <p>
            Time saved vs direct: <strong>{routePlan.timeSavedMinutes} min</strong>
          </p>
          <p>
            Crowd avoided: <strong>{routePlan.crowdAvoided}</strong>
          </p>
          <small>
            Avoided zones: {routePlan.avoidedZones.length > 0 ? routePlan.avoidedZones.map((zoneId) => STADIUM_ZONES[zoneId].label).join(', ') : 'None'}
          </small>
        </div>
      )}
    </section>
  )
}
