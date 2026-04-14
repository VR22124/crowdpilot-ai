const { onRequest } = require('firebase-functions/v2/https')
const { onSchedule } = require('firebase-functions/v2/scheduler')
const logger = require('firebase-functions/logger')

function scoreZone(metric) {
  const trendFactor = Math.max(metric.trend || 0, 0) * 12
  return metric.density + trendFactor
}

exports.predictCrowdState = onRequest({ cors: true, region: 'us-central1' }, (req, res) => {
  const body = req.body || {}
  const metrics = body.metrics || {}

  const gateCandidates = ['gateA', 'gateB', 'gateC']
  const exitCandidates = ['exitA', 'exitB']

  const recommendedFrom = gateCandidates.reduce((best, current) =>
    scoreZone(metrics[current] || { density: 100, trend: 1 }) < scoreZone(metrics[best] || { density: 100, trend: 1 }) ? current : best,
  )

  const recommendedTo = exitCandidates.reduce((best, current) =>
    scoreZone(metrics[current] || { density: 100, trend: 1 }) < scoreZone(metrics[best] || { density: 100, trend: 1 }) ? current : best,
  )

  res.json({
    recommendedFrom,
    recommendedTo,
    confidence: 0.86,
    reason: `Balance traffic toward ${recommendedFrom} and pre-position exits at ${recommendedTo}.`,
  })
})

exports.refreshDensityState = onSchedule('every 5 minutes', async () => {
  logger.info('Scheduled density refresh tick executed')
})
