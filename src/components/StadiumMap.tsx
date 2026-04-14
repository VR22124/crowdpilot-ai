import { useMemo, useState, type FC } from 'react'
import { STADIUM_ZONES, ZONE_SEQUENCE } from '../data/stadium'
import type { CrowdMetricsByZone, EmergencyMode, MatchPhase, NavigationPicks, QueueByZone, RoutePlan, ZoneId } from '../types'

interface StadiumMapProps {
  metrics: CrowdMetricsByZone
  routePlan: RoutePlan | null
  phase: MatchPhase
  emergencyRoute: RoutePlan | null
  queueLengths: QueueByZone
  navigationPicks: NavigationPicks
  emergencyMode: EmergencyMode
  redistributionActive: boolean
}

const COLOR_BY_CLASS = {
  Low: '#B7E4C7',
  Medium: '#FFD166',
  High: '#F4978E',
  Critical: '#E63946',
}

const SVG_W = 1000
const SVG_H = 744

const FLOW_PATHS: Record<string, string> = {
  pregameA: 'M 180 530 C 250 470, 300 430, 330 390',
  pregameB: 'M 500 560 C 500 500, 500 450, 500 400',
  pregameC: 'M 820 530 C 750 470, 700 430, 670 390',
  halftimeA: 'M 300 390 C 370 360, 430 350, 500 350',
  halftimeB: 'M 700 390 C 630 360, 570 350, 500 350',
  foodRush: 'M 330 390 C 390 350, 440 330, 500 320',
  foodRushBack: 'M 670 390 C 610 350, 560 330, 500 320',
  fulltimeA: 'M 500 390 C 430 320, 330 220, 240 92',
  fulltimeB: 'M 500 390 C 570 320, 670 220, 760 92',
  exitFlowA: 'M 360 230 C 330 180, 290 135, 245 95',
  exitFlowB: 'M 640 230 C 670 180, 710 135, 755 95',
}

const QUEUE_ZONES: ZoneId[] = ['gateA', 'gateB', 'gateC', 'foodCourt', 'restroomNorth', 'restroomSouth']

const TUNNELS = [
  { label: 'Tunnel A', x1: 180, y1: 530, x2: 330, y2: 390 },
  { label: 'Tunnel B', x1: 500, y1: 560, x2: 500, y2: 400 },
  { label: 'Tunnel C', x1: 820, y1: 530, x2: 670, y2: 390 },
] as const

type ZoomLevel = 'out' | 'mid' | 'in'

interface LabelCandidate {
  text: string
  x: number
  y: number
  priority: 1 | 2 | 3 | 4 | 5 | 6
  anchor?: 'start' | 'center' | 'end'
}

interface ManagedLabel extends LabelCandidate {
  opacity: number
  scale: number
  sourceX: number
  sourceY: number
}

export const StadiumMap: FC<StadiumMapProps> = ({
  metrics,
  routePlan,
  phase,
  emergencyRoute,
  queueLengths,
  navigationPicks,
  emergencyMode,
  redistributionActive,
}) => {
  const [focusedZone, setFocusedZone] = useState<ZoneId | null>(null)
  const [hoveredZone, setHoveredZone] = useState<ZoneId | null>(null)
  const [zoomLevel, setZoomLevel] = useState<ZoomLevel>('out')
  const [hoveredFacility, setHoveredFacility] = useState<string | null>(null)
  const activeRoute = phase === 'matchEnd' && emergencyRoute ? emergencyRoute : routePlan
  const routeSet = new Set(activeRoute?.primaryPath ?? [])
  const highlightedZone = hoveredZone ?? focusedZone

  const routePathD = useMemo(() => {
    if (!activeRoute || activeRoute.primaryGeometry.length < 2) return ''
    const points = activeRoute.primaryGeometry.map((point) => pointFromPercent(point.x, point.y))
    return smoothPath(points)
  }, [activeRoute])

  const altPathD = useMemo(() => {
    if (!activeRoute || activeRoute.alternativeGeometry.length < 2) return ''
    const points = activeRoute.alternativeGeometry.map((point) => pointFromPercent(point.x, point.y))
    return smoothPath(points)
  }, [activeRoute])

  const concourseFlowWeight = useMemo(() => {
    const avg = (metrics.foodCourt.density + metrics.seatingA.density + metrics.seatingB.density + metrics.seatingC.density) / 4
    return 2 + (avg / 100) * 5
  }, [metrics])

  const zoomScale = zoomLevel === 'out' ? 1 : zoomLevel === 'mid' ? 1.16 : 1.32
  const zoomTx = SVG_W * (1 - zoomScale) * 0.5
  const zoomTy = SVG_H * (1 - zoomScale) * 0.5
  const showSections = zoomLevel !== 'out'
  const showInfrastructure = zoomLevel !== 'out'
  const showConcourseLabels = zoomLevel !== 'out'
  const showFacilityLabels = zoomLevel !== 'out'
  const avoidedSet = useMemo(() => new Set(activeRoute?.avoidedZones ?? []), [activeRoute])
  const visibleZoneIds = useMemo(() => {
    if (zoomLevel === 'out') {
      return ZONE_SEQUENCE.filter((zoneId) => {
        const category = STADIUM_ZONES[zoneId].category
        return category === 'entry' || category === 'exit'
      })
    }
    if (zoomLevel === 'mid') {
      return ZONE_SEQUENCE.filter((zoneId) => {
        const category = STADIUM_ZONES[zoneId].category
        return category === 'entry' || category === 'exit' || category === 'facility' || category === 'seating'
      })
    }
    return ZONE_SEQUENCE
  }, [zoomLevel])

  const facilityNodes = useMemo(
    () => [
      { label: 'Food North', x: 500, y: 165 },
      { label: 'Food South', x: 500, y: 485 },
      { label: 'Food East', x: 760, y: 320 },
      { label: 'Food West', x: 240, y: 320 },
      { label: 'Restroom Cluster North West', x: 330, y: 180 },
      { label: 'Restroom Cluster North East', x: 670, y: 180 },
      { label: 'Restroom Cluster South East', x: 670, y: 460 },
      { label: 'Restroom Cluster South West', x: 330, y: 460 },
      { label: 'Medical Hub', x: 500, y: 116 },
    ],
    [],
  )

  const bestExitPoint = useMemo(() => toPoint(navigationPicks.bestExit), [navigationPicks.bestExit])

  const managedLabels = useMemo(() => {
    const candidates: LabelCandidate[] = []

    const gateAndExitIds = (['gateA', 'gateB', 'gateC', 'exitA', 'exitB'] as ZoneId[]).filter((id) => visibleZoneIds.includes(id))
    for (const zoneId of gateAndExitIds) {
      const p = toPoint(zoneId)
      candidates.push({ text: STADIUM_ZONES[zoneId].label, x: p.x + 10, y: p.y - 10, priority: 1 })
    }

    if (zoomLevel !== 'out') {
      TUNNELS.forEach((tunnel) => {
        candidates.push({ text: tunnel.label, x: (tunnel.x1 + tunnel.x2) / 2 + 8, y: (tunnel.y1 + tunnel.y2) / 2 - 6, priority: 2 })
      })
      candidates.push({ text: STADIUM_ZONES.seatingA.label, x: 500, y: 206, priority: 2, anchor: 'center' })
      candidates.push({ text: STADIUM_ZONES.seatingB.label, x: 500, y: 352, priority: 2, anchor: 'center' })
      candidates.push({ text: STADIUM_ZONES.seatingC.label, x: 500, y: 452, priority: 2, anchor: 'center' })
    }

    if (zoomLevel !== 'out') {
      facilityNodes.forEach((facility) => {
        const priority = facility.label.includes('Restroom') || facility.label.includes('Medical') ? 3 : 4
        candidates.push({ text: facility.label, x: facility.x + 10, y: facility.y - 8, priority })
      })
    }

    if (zoomLevel === 'in') {
      buildSeatSegments().forEach((segment) => {
        candidates.push({ text: segment.label, x: segment.tx, y: segment.ty, priority: 5, anchor: 'center' })
      })

      ;[
        { label: 'Staff A', x: 360, y: 304 },
        { label: 'Staff B', x: 500, y: 292 },
        { label: 'Staff C', x: 638, y: 304 },
      ].forEach((staff) => {
        candidates.push({ text: staff.label, x: staff.x + 10, y: staff.y - 8, priority: 6 })
      })

      if (routePathD) {
        candidates.push({ text: 'Primary Route', x: 760, y: 92, priority: 2 })
      }

      if (activeRoute?.avoidedZones?.length) {
        candidates.push({
          text: `Avoiding ${STADIUM_ZONES[activeRoute.avoidedZones[0]].label}`,
          x: 760,
          y: 122,
          priority: 2,
        })
      }
    }

    return resolveLabelCandidates(candidates, zoomLevel)
  }, [activeRoute, facilityNodes, routePathD, visibleZoneIds, zoomLevel])

  const particleCount = phase === 'matchEnd' ? 48 : 28
  const phasePathIds =
    phase === 'inningsBreak'
      ? ['halftimeA', 'halftimeB', 'foodRush', 'foodRushBack']
      : phase === 'matchEnd'
        ? ['fulltimeA', 'fulltimeB', 'exitFlowA', 'exitFlowB']
        : ['pregameA', 'pregameB', 'pregameC', 'foodRush']

  return (
    <section className="panel stadium-map" aria-label="Live crowd heatmap" data-testid="stadium-map">
      <div className="panel-heading">
        <div className="map-toolbar">
          <div className="map-zoom-controls" role="group" aria-label="Map zoom levels">
            <button type="button" data-testid="zoom-out" className={zoomLevel === 'out' ? 'active' : ''} onClick={() => setZoomLevel('out')}>Out</button>
            <button type="button" data-testid="zoom-mid" className={zoomLevel === 'mid' ? 'active' : ''} onClick={() => setZoomLevel('mid')}>Mid</button>
            <button type="button" data-testid="zoom-in" className={zoomLevel === 'in' ? 'active' : ''} onClick={() => setZoomLevel('in')}>In</button>
          </div>
          <p className="map-route-legend">Gate → Tunnel → Concourse → Section → Seat</p>
        </div>
      </div>

      <div className="stadium-canvas" data-testid="stadium-canvas">
        <svg viewBox={`0 0 ${SVG_W} ${SVG_H}`} role="img" aria-label="Stadium map" data-testid="stadium-svg" data-zoom-level={zoomLevel}>
          <defs>
            <linearGradient id="nightTop" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#0b1220" stopOpacity="0.95" />
              <stop offset="100%" stopColor="#131e33" stopOpacity="0.4" />
            </linearGradient>
            <radialGradient id="fieldGlow" cx="50%" cy="50%" r="60%">
              <stop offset="0%" stopColor="#4f8f56" stopOpacity="0.86" />
              <stop offset="100%" stopColor="#2f5f35" stopOpacity="0.94" />
            </radialGradient>
            <radialGradient id="stadiumGlow" cx="50%" cy="50%" r="75%">
              <stop offset="20%" stopColor="#3A86FF" stopOpacity="0.16" />
              <stop offset="100%" stopColor="#0f172a" stopOpacity="0" />
            </radialGradient>
            <linearGradient id="pitchStripes" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor="#2f6f3e" />
              <stop offset="20%" stopColor="#3a7d44" />
              <stop offset="40%" stopColor="#316f3f" />
              <stop offset="60%" stopColor="#3a7d44" />
              <stop offset="80%" stopColor="#316f3f" />
              <stop offset="100%" stopColor="#2f6f3e" />
            </linearGradient>
            <filter id="grassNoise" x="-20%" y="-20%" width="140%" height="140%">
              <feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="2" stitchTiles="stitch" result="noise" />
              <feColorMatrix in="noise" type="saturate" values="0" result="monoNoise" />
              <feComponentTransfer in="monoNoise" result="softNoise">
                <feFuncA type="table" tableValues="0 0.04" />
              </feComponentTransfer>
              <feBlend in="SourceGraphic" in2="softNoise" mode="overlay" />
            </filter>
            <filter id="blurHeat" x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur stdDeviation="18" />
            </filter>
            <filter id="routeGlow" x="-100%" y="-100%" width="300%" height="300%">
              <feGaussianBlur stdDeviation="4" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
            <linearGradient id="routeMotionGradient" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#60a5fa" stopOpacity="0.5" />
              <stop offset="45%" stopColor="#dbeafe" stopOpacity="1" />
              <stop offset="100%" stopColor="#3A86FF" stopOpacity="0.7" />
              <animateTransform attributeName="gradientTransform" type="translate" values="-1 0;1 0;-1 0" dur="3.2s" repeatCount="indefinite" />
            </linearGradient>
            <radialGradient id="floodlightGlow" cx="50%" cy="0%" r="75%">
              <stop offset="0%" stopColor="#dbeafe" stopOpacity="0.32" />
              <stop offset="100%" stopColor="#dbeafe" stopOpacity="0" />
            </radialGradient>
            <radialGradient id="vignette" cx="50%" cy="48%" r="65%">
              <stop offset="60%" stopColor="#000" stopOpacity="0" />
              <stop offset="100%" stopColor="#000" stopOpacity="0.5" />
            </radialGradient>
            <marker id="flowArrow" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto">
              <path d="M0,0 L6,3 L0,6 Z" fill="#93c5fd" />
            </marker>
            <marker id="clockwiseArrow" markerWidth="7" markerHeight="7" refX="5.5" refY="3" orient="auto">
              <path d="M0,0 L6,3 L0,6 Z" fill="#60a5fa" />
            </marker>
            <marker id="counterArrow" markerWidth="7" markerHeight="7" refX="5.5" refY="3" orient="auto">
              <path d="M0,0 L6,3 L0,6 Z" fill="#f59e0b" />
            </marker>
            {Object.entries(FLOW_PATHS).map(([id, d]) => (
              <path key={id} id={id} d={d} fill="none" stroke="none" />
            ))}
            {TUNNELS.map((tunnel) => (
              <path
                key={tunnel.label}
                id={createPathId(tunnel.label)}
                d={`M ${tunnel.x1} ${tunnel.y1} L ${tunnel.x2} ${tunnel.y2}`}
                fill="none"
                stroke="none"
              />
            ))}
            {routePathD ? <path id="primaryRoutePath" d={routePathD} fill="none" stroke="none" /> : null}
            {altPathD ? <path id="alternateRoutePath" d={altPathD} fill="none" stroke="none" /> : null}
          </defs>

          <g transform={`translate(${zoomTx} ${zoomTy}) scale(${zoomScale})`}>
            <rect width={SVG_W} height={SVG_H} fill="url(#stadiumGlow)" opacity="0.65" />
            <rect width={SVG_W} height={SVG_H} fill="url(#nightTop)" opacity="0.85" />
            <rect width={SVG_W} height={SVG_H} fill="url(#floodlightGlow)" opacity="0.5" />

            <ellipse cx="500" cy="338" rx="438" ry="272" fill="#030712" opacity="0.2" />
            <ellipse cx="500" cy="338" rx="438" ry="272" fill="#030712" opacity={zoomLevel === 'mid' ? 0.15 : 0.2} />
            <ellipse cx="500" cy="320" rx="430" ry="265" fill="#0b1220" stroke="#334155" strokeOpacity={zoomLevel === 'mid' ? 0.15 : 0.2} strokeWidth="2" />
            <ellipse cx="500" cy="352" rx="360" ry="228" fill="#0f1a2d" opacity="0.58" />
            <ellipse cx="500" cy="320" rx="355" ry="225" fill="#1a2940" stroke="#425a74" strokeOpacity={zoomLevel === 'mid' ? 0.2 : 0.3} strokeWidth="1.3" />
            <ellipse cx="500" cy="334" rx="324" ry="206" fill="#162338" opacity={zoomLevel === 'mid' ? 0.2 : 0.3} />
            <ellipse cx="500" cy="320" rx="300" ry="185" fill="#2e3b4b" stroke="#738396" strokeOpacity={zoomLevel === 'mid' ? 0.2 : 0.25} strokeWidth="1.1" />

            <path d="M 160 272 C 275 198, 725 198, 840 272" stroke="#0b1220" strokeOpacity="0.2" strokeWidth="9" fill="none" />
            <path d="M 180 405 C 300 474, 700 474, 820 405" stroke="#0b1220" strokeOpacity="0.2" strokeWidth="8" fill="none" />

            <ellipse cx="500" cy="320" rx="220" ry="125" fill="url(#pitchStripes)" filter="url(#grassNoise)" />
            <ellipse cx="500" cy="320" rx="220" ry="125" fill="url(#fieldGlow)" opacity="0.24" />
            <ellipse cx="500" cy="320" rx="220" ry="125" fill="none" stroke="#f6e7c1" strokeOpacity="0.45" strokeWidth="2" />

            {showConcourseLabels ? null : null}

            {showSections
              ? buildSeatSegments().map((segment) => (
                  <g key={segment.label}>
                    <path d={segment.path} fill={segment.fill} stroke="#64748b" strokeOpacity="0.25" />
                    <path
                      d={segment.path}
                      fill={segment.fill}
                      stroke="#64748b"
                      strokeOpacity={0.25}
                      opacity={1}
                    />
                    {zoomLevel === 'in' ? (
                      <text x={segment.tx} y={segment.ty} textAnchor="middle" className="seat-segment-label">
                        {segment.label}
                      </text>
                    ) : null}
                  </g>
                ))
              : null}

            <path
              d="M 300 222 A 240 128 0 0 1 700 222"
              fill="none"
              stroke="#60a5fa"
              strokeOpacity="0.22"
              strokeWidth={Math.max(1.2, concourseFlowWeight - 2)}
              markerEnd="url(#clockwiseArrow)"
            />
            <path
              d="M 708 392 A 246 136 0 0 1 292 392"
              fill="none"
              stroke="#f59e0b"
              strokeOpacity="0.16"
              strokeWidth={Math.max(1, concourseFlowWeight - 2.7)}
              markerEnd="url(#counterArrow)"
            />

            {showInfrastructure
              ? TUNNELS.map((tunnel) => (
                  <g key={tunnel.label}>
                    <path d={`M ${tunnel.x1} ${tunnel.y1} L ${tunnel.x2} ${tunnel.y2}`} stroke="#6C757D" strokeWidth="4.5" strokeOpacity="0.35" />
                    <circle r="2.6" fill="#e2e8f0" opacity="0.48">
                      <animateMotion dur="2.8s" repeatCount="indefinite" rotate="auto">
                        <mpath href={`#${createPathId(tunnel.label)}`} />
                      </animateMotion>
                    </circle>
                    {zoomLevel === 'in' ? null : null}
                  </g>
                ))
              : null}

            {showInfrastructure
              ? [
                  { label: 'Exit Corridor A', x1: 245, y1: 95, x2: 360, y2: 230 },
                  { label: 'Exit Corridor B', x1: 755, y1: 95, x2: 640, y2: 230 },
                ].map((corridor) => (
                  <g key={corridor.label}>
                    <path d={`M ${corridor.x1} ${corridor.y1} L ${corridor.x2} ${corridor.y2}`} stroke="#6C757D" strokeWidth="3.6" strokeOpacity="0.24" />
                  </g>
                ))
              : null}

            {showInfrastructure
              ? [
                  { x: 330, y: 388 },
                  { x: 500, y: 398 },
                  { x: 670, y: 388 },
                ].map((opening, idx) => (
                  <g key={`vomitory-${idx}`}>
                    <rect x={opening.x - 12} y={opening.y - 4} width="24" height="8" rx="4" fill="#94a3b8" fillOpacity="0.28" />
                    {zoomLevel === 'in' ? (
                      <text x={opening.x} y={opening.y - 9} textAnchor="middle" className="facility-label">
                        Stair Connector
                      </text>
                    ) : null}
                  </g>
                ))
              : null}

            {(zoomLevel === 'in' || zoomLevel === 'mid')
              ? facilityNodes.map((facility) => (
                  <g
                    key={facility.label}
                    onMouseEnter={() => setHoveredFacility(facility.label)}
                    onMouseLeave={() => setHoveredFacility(null)}
                    opacity={showFacilityLabels || hoveredFacility === facility.label ? 0.86 : 0.7}
                  >
                    <circle cx={facility.x} cy={facility.y} r="6.2" fill="#0f172a" stroke="#cbd5e1" strokeOpacity="0.55" />
                    {facility.label.includes('Food') ? (
                      <g transform={`translate(${facility.x - 3.5}, ${facility.y - 5})`} className="facility-icon">
                        <rect x="0" y="0" width="2" height="10" rx="1" />
                        <rect x="5" y="0" width="2" height="10" rx="1" />
                        <rect x="2.5" y="0" width="2" height="5" rx="1" />
                      </g>
                    ) : facility.label.includes('Restroom') ? (
                      <g transform={`translate(${facility.x - 3.6}, ${facility.y - 4.8})`} className="facility-icon">
                        <circle cx="2" cy="2" r="1.5" />
                        <rect x="1.1" y="3.7" width="1.8" height="4.8" rx="0.8" />
                        <circle cx="5.5" cy="2" r="1.5" />
                        <rect x="4.6" y="3.7" width="1.8" height="4.8" rx="0.8" />
                      </g>
                    ) : (
                      <g transform={`translate(${facility.x - 4}, ${facility.y - 4})`} className="facility-icon">
                        <rect x="3" y="0" width="2" height="8" rx="0.8" />
                        <rect x="0" y="3" width="8" height="2" rx="0.8" />
                      </g>
                    )}
                    {showFacilityLabels || hoveredFacility === facility.label ? null : null}
                  </g>
                ))
              : null}

            {Object.values(FLOW_PATHS).map((d, index) => (
              <path
                key={`flow-lane-${index}`}
                d={d}
                fill="none"
                stroke="#3A86FF"
                strokeOpacity="0.12"
                strokeWidth="1.6"
                markerEnd="url(#flowArrow)"
              />
            ))}

            <path d="M 500 556 C 548 520, 610 486, 820 530" fill="none" stroke="#93c5fd" strokeOpacity="0.18" strokeWidth="2" markerEnd="url(#flowArrow)" />
            <path d="M 245 95 C 380 84, 620 84, 755 95" fill="none" stroke="#fb7185" strokeOpacity="0.16" strokeWidth="2" markerEnd="url(#flowArrow)" />

            {visibleZoneIds.map((zoneId) => {
              const zone = STADIUM_ZONES[zoneId]
              const metric = metrics[zoneId]
              const { x, y } = toPoint(zoneId)
              const isRoute = routeSet.has(zoneId)
              const isEmergencyExit = phase === 'matchEnd' && (zoneId === 'exitA' || zoneId === 'exitB')
              const isAIPick = zoneId === navigationPicks.bestGate || zoneId === navigationPicks.bestExit
              const isAvoidedZone = avoidedSet.has(zoneId)
              const active = highlightedZone === zoneId || isRoute || isAIPick || isAvoidedZone
              const showLabel = false
              const capacityGlow = Math.max(0.1, metric.density / 100)
              const nodeRadius = zoomLevel === 'in' ? (isRoute ? 7.5 : 5.7) : isRoute ? 10.8 : 8.2
              const isEmergencyBlocked =
                emergencyMode !== 'normal' &&
                (metric.classification === 'Critical' || (emergencyMode === 'evacuation' && metric.classification === 'High'))

              return (
                <g
                  key={zone.id}
                  onMouseEnter={() => setHoveredZone(zoneId)}
                  onMouseLeave={() => setHoveredZone(null)}
                  onClick={() => setFocusedZone(zoneId)}
                  opacity={isEmergencyBlocked ? 0.32 : active ? 1 : 0.62}
                >
                  <circle
                    cx={x}
                    cy={y}
                    r={14 + metric.density * 0.34}
                    fill={COLOR_BY_CLASS[metric.classification]}
                    fillOpacity={metric.classification === 'Critical' || metric.classification === 'High' ? 0.26 + capacityGlow * 0.15 : 0.1 + capacityGlow * 0.18}
                    filter="url(#blurHeat)"
                  >
                    {metric.classification === 'Critical' ? (
                      <animate attributeName="opacity" values="0.92;0.22;0.92" dur="1.8s" repeatCount="indefinite" />
                    ) : (
                      <animate attributeName="opacity" values="0.75;0.35;0.75" dur="3.6s" repeatCount="indefinite" />
                    )}
                  </circle>

                  {zoomLevel === 'in' ? (
                    <text x={x} y={y + 21} textAnchor="middle" className="zone-density">
                      {Math.round(metric.density)}%
                    </text>
                  ) : null}
                  <circle cx={x} cy={y} r={nodeRadius} fill={COLOR_BY_CLASS[metric.classification]} />

                  {metric.density > 58 ? (
                    <circle cx={x} cy={y} r={17 + metric.density * 0.05} fill="none" stroke={COLOR_BY_CLASS[metric.classification]} strokeOpacity="0.42" strokeWidth="1.2" />
                  ) : null}

                  {isAIPick ? (
                    <circle cx={x} cy={y} r={18} fill="none" stroke="#7dd3fc" strokeOpacity="0.74" strokeWidth="1.7">
                      <animate attributeName="r" values="13;20;13" dur="2.4s" repeatCount="indefinite" />
                    </circle>
                  ) : null}

                  {isAvoidedZone ? (
                    <circle cx={x} cy={y} r={22} fill="none" stroke="#fb7185" strokeOpacity="0.8" strokeWidth="1.8" strokeDasharray="4 4" />
                  ) : null}

                  <circle
                    cx={x}
                    cy={y}
                    r={zoomLevel === 'in' ? (isEmergencyExit ? 14 : 10) : isEmergencyExit ? 20 : 14}
                    fill="none"
                    stroke={isEmergencyExit ? '#fef08a' : active ? '#e0f2fe' : '#cbd5e1'}
                    strokeOpacity={isEmergencyExit ? 0.9 : active ? 0.52 : 0.28}
                    strokeWidth={isEmergencyExit ? 2.2 : 1}
                  >
                    <animate attributeName="r" values={zoomLevel === 'in' ? (isEmergencyExit ? '11;16;11' : '8;12;8') : isEmergencyExit ? '16;28;16' : '12;17;12'} dur="3s" repeatCount="indefinite" />
                  </circle>

                  {showLabel ? null : null}

                  {isEmergencyBlocked ? (
                    <path d={`M ${x - 5} ${y - 5} L ${x + 5} ${y + 5} M ${x + 5} ${y - 5} L ${x - 5} ${y + 5}`} stroke="#fda4af" strokeWidth="1.5" />
                  ) : null}

                  {zone.category === 'entry' ? (
                    <g transform={`translate(${x - 3.8}, ${y - 4.5})`} className="zone-icon gate-icon">
                      <rect x="0" y="0" width="7.6" height="7.8" rx="1.2" />
                      <rect x="3.2" y="1.5" width="1.2" height="5" rx="0.4" />
                    </g>
                  ) : null}
                  {zone.category === 'exit' ? (
                    <g transform={`translate(${x - 4.2}, ${y - 4.2})`} className="zone-icon exit-icon">
                      <path d="M 0 4 L 5.6 4" strokeWidth="1.4" />
                      <path d="M 4.2 1.8 L 7.6 4 L 4.2 6.2" strokeWidth="1.4" fill="none" />
                    </g>
                  ) : null}
                </g>
              )
            })}

            {showInfrastructure
              ? QUEUE_ZONES.map((zoneId) => {
                  const lane = queueLaneFor(zoneId)
                  const count = Math.max(2, Math.min(10, Math.round((queueLengths[zoneId] ?? 0) / 2)))
                  return (
                    <g key={`queue-${zoneId}`} opacity="0.72">
                      <path d={lane.path} fill="none" stroke="#f8fafc" strokeOpacity="0.12" strokeWidth="3.6" strokeLinecap="round" />
                      <path id={`queue-path-${zoneId}`} d={lane.path} fill="none" stroke="none" />
                      {Array.from({ length: count }).map((_, index) => (
                        <circle key={`${zoneId}-${index}`} r="1.9" fill="#e2e8f0" opacity="0.78">
                          <animateMotion dur={`${2.4 + (index % 4) * 0.4}s`} begin={`${(index * 0.15) % 1.2}s`} repeatCount="indefinite" rotate="auto">
                            <mpath href={`#queue-path-${zoneId}`} />
                          </animateMotion>
                        </circle>
                      ))}
                    </g>
                  )
                })
              : null}

            {zoomLevel !== 'out' && altPathD ? (
              <path d={altPathD} fill="none" stroke="#7aa2ff" strokeOpacity="0.36" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" strokeDasharray="8 7" />
            ) : null}

            {routePathD ? (
              <>
                <path d={routePathD} fill="none" stroke="#60a5fa" strokeWidth="10" strokeOpacity="0.12" filter="url(#routeGlow)" />
                <path d={routePathD} fill="none" stroke="url(#routeMotionGradient)" strokeWidth="5.2" strokeLinecap="round" strokeLinejoin="round" pathLength="1" strokeDasharray="1" strokeDashoffset="1">
                  <animate attributeName="stroke-dashoffset" from="1" to="0" dur="0.9s" fill="freeze" />
                </path>
                <path d={routePathD} fill="none" stroke="#93c5fd" strokeOpacity="0.55" strokeWidth="4.2" strokeLinecap="round" strokeLinejoin="round" pathLength="1" strokeDasharray="0.24 0.76" strokeDashoffset="0">
                  <animate attributeName="stroke-dashoffset" from="1" to="0" dur="2.2s" repeatCount="indefinite" />
                </path>
                <circle r="5.4" fill="#f8fafc">
                  <animateMotion dur="3.2s" repeatCount="indefinite" rotate="auto">
                    <mpath href="#primaryRoutePath" />
                  </animateMotion>
                </circle>
                <path d="M -4 -2 L 4 0 L -4 2 Z" fill="#93c5fd">
                  <animateMotion dur="2.4s" repeatCount="indefinite" rotate="auto">
                    <mpath href="#primaryRoutePath" />
                  </animateMotion>
                </path>

                <path d={`M 500 320 Q ${(500 + bestExitPoint.x) / 2} ${(320 + bestExitPoint.y) / 2 - 24} ${bestExitPoint.x} ${bestExitPoint.y}`} fill="none" stroke="#fef08a" strokeOpacity="0.5" strokeWidth="2" markerEnd="url(#flowArrow)" />
                <circle cx={bestExitPoint.x} cy={bestExitPoint.y} r="22" fill="none" stroke="#fde68a" strokeOpacity="0.75" strokeWidth="2">
                  <animate attributeName="r" values="16;26;16" dur="1.6s" repeatCount="indefinite" />
                </circle>

              </>
            ) : null}

            {activeRoute?.avoidedZones?.length ? null : null}

            {emergencyMode !== 'normal' ? (
              <>
                <path d="M 170 520 C 240 450, 330 400, 420 366" fill="none" stroke="#22c55e" strokeWidth="3" strokeOpacity="0.6" strokeDasharray="6 6" />
                <path d="M 830 520 C 760 450, 670 400, 580 366" fill="none" stroke="#22c55e" strokeWidth="3" strokeOpacity="0.6" strokeDasharray="6 6" />
              </>
            ) : null}

            {redistributionActive ? (
              <>
                <path id="redistribute-b-to-c" d="M 500 558 C 600 538, 700 525, 820 532" fill="none" stroke="#93c5fd" strokeOpacity="0.24" strokeWidth="2.4" markerEnd="url(#flowArrow)" />
                {Array.from({ length: 8 }).map((_, i) => (
                  <circle key={`rbc-${i}`} r="2" fill="#dbeafe" opacity="0.8">
                    <animateMotion dur="2.6s" begin={`${i * 0.24}s`} repeatCount="indefinite" rotate="auto">
                      <mpath href="#redistribute-b-to-c" />
                    </animateMotion>
                  </circle>
                ))}
              </>
            ) : null}

            {avoidedSet.size > 0 && altPathD ? (
              <>
                {Array.from({ length: 6 }).map((_, i) => (
                  <circle key={`reroute-${i}`} r="1.8" fill="#f8fafc" opacity="0.7">
                    <animateMotion dur="2.4s" begin={`${i * 0.28}s`} repeatCount="indefinite" rotate="auto">
                      <mpath href="#alternateRoutePath" />
                    </animateMotion>
                  </circle>
                ))}
              </>
            ) : null}

            {managedLabels.map((label, index) => (
              <g
                key={`${label.text}-${index}`}
                className={`map-label-item ${zoomLevel}`}
                style={{
                  opacity: label.opacity,
                  transformOrigin: `${label.x}px ${label.y}px`,
                  transform: `scale(${label.scale})`,
                }}
              >
                {Math.abs(label.sourceX - label.x) > 2 || Math.abs(label.sourceY - label.y) > 2 ? (
                  <path d={`M ${label.sourceX} ${label.sourceY} L ${label.x} ${label.y}`} className="map-label-leader" />
                ) : null}
                {renderMapLabel(label.x, label.y, label.text, label.anchor ?? 'start')}
              </g>
            ))}

            <ellipse cx="500" cy="320" rx="220" ry="125" fill="url(#pitchStripes)" filter="url(#grassNoise)" pointerEvents="none" />
            <ellipse cx="500" cy="320" rx="220" ry="125" fill="url(#fieldGlow)" opacity="0.24" pointerEvents="none" />
            <ellipse cx="500" cy="320" rx="220" ry="125" fill="none" stroke="#f6e7c1" strokeOpacity="0.45" strokeWidth="2" pointerEvents="none" />

            {Array.from({ length: particleCount }).map((_, index) => {
              const pathId = phasePathIds[index % phasePathIds.length]
              const duration = 5.5 + (index % 6) * 0.7
              const begin = `${(index * 0.17) % 2.8}s`

              return (
                <circle key={`particle-${index}`} r="1.9" fill="#bfdbfe" opacity="0.6">
                  <animateMotion dur={`${duration}s`} begin={begin} repeatCount="indefinite" rotate="auto">
                    <mpath href={`#${pathId}`} />
                  </animateMotion>
                </circle>
              )
            })}
          </g>

          <rect width={SVG_W} height={SVG_H} fill="url(#vignette)" pointerEvents="none" />
        </svg>
      </div>

    </section>
  )
}

function toPoint(zoneId: ZoneId): { x: number; y: number } {
  const zone = STADIUM_ZONES[zoneId]
  return pointFromPercent(zone.x, zone.y)
}

function pointFromPercent(x: number, y: number): { x: number; y: number } {
  return {
    x: (x / 100) * SVG_W,
    y: (y / 100) * SVG_H,
  }
}

function createPathId(label: string): string {
  return `path-${label.toLowerCase().replace(/\s+/g, '-')}`
}

function renderMapLabel(x: number, y: number, text: string, anchor: 'start' | 'center' | 'end' = 'start') {
  const textX = anchor === 'center' ? x : anchor === 'end' ? x - 2 : x + 2
  const textAnchor = anchor === 'center' ? 'middle' : anchor

  return (
    <text x={textX} y={y + 1} className="map-label-text" textAnchor={textAnchor}>
      {text}
    </text>
  )
}

function resolveLabelCandidates(candidates: LabelCandidate[], zoomLevel: ZoomLevel): ManagedLabel[] {
  const sorted = [...candidates].sort((a, b) => a.priority - b.priority)
  const placed: Array<ManagedLabel & { box: { x: number; y: number; w: number; h: number } }> = []

  const widthFactor = zoomLevel === 'out' ? 7.6 : zoomLevel === 'mid' ? 6.8 : 6.1
  const height = zoomLevel === 'out' ? 18 : zoomLevel === 'mid' ? 16 : 14
  const maxVisible = zoomLevel === 'out' ? 6 : zoomLevel === 'mid' ? 12 : Number.POSITIVE_INFINITY

  for (const [index, candidate] of sorted.entries()) {
    const width = Math.max(44, candidate.text.length * widthFactor + 10)

    const attempts = [
      { r: 0, a: 0 },
      { r: 12, a: (index * 39) % 360 },
      { r: 20, a: (index * 53 + 120) % 360 },
      { r: 30, a: (index * 71 + 240) % 360 },
      { r: 42, a: (index * 89 + 180) % 360 },
    ]

    const boxFor = (x: number, y: number) => {
      const xPos = (candidate.anchor ?? 'start') === 'center'
        ? x - width / 2
        : (candidate.anchor ?? 'start') === 'end'
          ? x - width
          : x
      return { x: xPos, y: y - 10, w: width, h: height }
    }

    let best: { x: number; y: number; box: { x: number; y: number; w: number; h: number }; overlaps: number } | null = null

    for (const attempt of attempts) {
      const rad = (attempt.a * Math.PI) / 180
      const x = candidate.x + Math.cos(rad) * attempt.r
      const y = candidate.y + Math.sin(rad) * attempt.r
      const box = boxFor(x, y)

      const overlaps = placed.filter((other) => {
        return !(box.x + box.w < other.box.x || other.box.x + other.box.w < box.x || box.y + box.h < other.box.y || other.box.y + other.box.h < box.y)
      }).length

      if (!best || overlaps < best.overlaps) {
        best = { x, y, box, overlaps }
      }
      if (overlaps === 0) break
    }

    if (!best) continue

    const visibleCount = placed.filter((label) => label.opacity > 0.2).length
    const hideForLimit = zoomLevel !== 'in' && visibleCount >= maxVisible
    const hideForOverlap = zoomLevel !== 'in' && best.overlaps > 0 && candidate.priority >= 4

    placed.push({
      ...candidate,
      x: best.x,
      y: best.y,
      sourceX: candidate.x,
      sourceY: candidate.y,
      opacity: hideForLimit || hideForOverlap ? 0 : zoomLevel === 'in' ? 0.9 : 0.95,
      scale: best.overlaps > 0 ? 0.95 : 1,
      box: best.box,
    })
  }

  return placed.map((label) => {
    const { box, ...rest } = label
    void box
    return rest
  })
}

function smoothPath(points: Array<{ x: number; y: number }>): string {
  if (points.length === 0) return ''
  if (points.length === 1) return `M ${points[0].x} ${points[0].y}`
  if (points.length === 2) {
    const [p0, p1] = points
    const cx1 = p0.x + (p1.x - p0.x) / 3
    const cy1 = p0.y
    const cx2 = p0.x + ((p1.x - p0.x) * 2) / 3
    const cy2 = p1.y
    return `M ${p0.x} ${p0.y} C ${cx1} ${cy1}, ${cx2} ${cy2}, ${p1.x} ${p1.y}`
  }

  let d = `M ${points[0].x} ${points[0].y}`
  for (let i = 0; i < points.length - 1; i += 1) {
    const p0 = points[i - 1] ?? points[i]
    const p1 = points[i]
    const p2 = points[i + 1]
    const p3 = points[i + 2] ?? p2

    const c1x = p1.x + (p2.x - p0.x) / 6
    const c1y = p1.y + (p2.y - p0.y) / 6
    const c2x = p2.x - (p3.x - p1.x) / 6
    const c2y = p2.y - (p3.y - p1.y) / 6

    d += ` C ${c1x} ${c1y}, ${c2x} ${c2y}, ${p2.x} ${p2.y}`
  }
  return d
}

function queueLaneFor(zoneId: ZoneId): { path: string } {
  const zone = STADIUM_ZONES[zoneId]
  const start = pointFromPercent(zone.x, zone.y)

  if (zoneId === 'foodCourt') {
    return {
      path: `M ${start.x - 48} ${start.y + 26} C ${start.x - 18} ${start.y + 12}, ${start.x - 8} ${start.y + 8}, ${start.x} ${start.y}`,
    }
  }

  if (zoneId === 'restroomNorth' || zoneId === 'restroomSouth') {
    return {
      path: `M ${start.x - 8} ${start.y - 34} C ${start.x - 20} ${start.y - 22}, ${start.x - 10} ${start.y - 12}, ${start.x} ${start.y}`,
    }
  }

  return {
    path: `M ${start.x} ${start.y + 46} C ${start.x + 2} ${start.y + 30}, ${start.x + 3} ${start.y + 10}, ${start.x} ${start.y}`,
  }
}

function buildSeatSegments(): Array<{ label: string; path: string; tx: number; ty: number; fill: string }> {
  const rows = [
    { prefix: 'A', ry: 205, fill: 'rgba(100,116,139,0.25)' },
    { prefix: 'B', ry: 184, fill: 'rgba(59,130,246,0.25)' },
    { prefix: 'C', ry: 163, fill: 'rgba(14,165,233,0.25)' },
  ]

  const segments: Array<{ label: string; path: string; tx: number; ty: number; fill: string }> = []
  for (const [rowIndex, row] of rows.entries()) {
    for (let i = 0; i < 3; i += 1) {
      const startDeg = 200 + i * 50
      const endDeg = startDeg + 42
      const outerA = polar(500, 320, 330 - rowIndex * 20, row.ry, startDeg)
      const outerB = polar(500, 320, 330 - rowIndex * 20, row.ry, endDeg)
      const innerA = polar(500, 320, 300 - rowIndex * 20, row.ry - 18, startDeg)
      const innerB = polar(500, 320, 300 - rowIndex * 20, row.ry - 18, endDeg)
      const text = polar(500, 320, 315 - rowIndex * 20, row.ry - 8, (startDeg + endDeg) / 2)

      const path = [
        `M ${outerA.x} ${outerA.y}`,
        `A ${330 - rowIndex * 20} ${row.ry} 0 0 1 ${outerB.x} ${outerB.y}`,
        `L ${innerB.x} ${innerB.y}`,
        `A ${300 - rowIndex * 20} ${row.ry - 18} 0 0 0 ${innerA.x} ${innerA.y}`,
        'Z',
      ].join(' ')

      segments.push({
        label: `${row.prefix}${i + 1}`,
        path,
        tx: text.x,
        ty: text.y,
        fill: row.fill,
      })
    }
  }

  return segments
}

function polar(cx: number, cy: number, rx: number, ry: number, deg: number): { x: number; y: number } {
  const rad = (deg * Math.PI) / 180
  return {
    x: cx + rx * Math.cos(rad),
    y: cy + ry * Math.sin(rad),
  }
}
