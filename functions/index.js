const { onRequest, onCall } = require('firebase-functions/v2/https')
const { onSchedule } = require('firebase-functions/v2/scheduler')
const logger = require('firebase-functions/logger')
const { google } = require('googleapis')

const runtimeOptions = {
  region: 'us-central1',
  serviceAccount: 'crowdpilot-ai-b5a0d@appspot.gserviceaccount.com',
}

const DEFAULT_SPREADSHEET_ID = '1QYFxv4Ah0QEHZTRIaZ3HA5WXpfoWUPUOr31JbwloKT0'

function scoreZone(metric) {
  const trendFactor = Math.max(metric?.trend || 0, 0) * 12
  return (metric?.density || 100) + trendFactor
}

function average(values) {
  if (!values.length) return 0
  return values.reduce((sum, value) => sum + value, 0) / values.length
}

async function getGoogleClients() {
  const auth = new google.auth.GoogleAuth({
    scopes: [
      'https://www.googleapis.com/auth/spreadsheets',
      'https://www.googleapis.com/auth/drive.file',
    ],
  })

  const authClient = await auth.getClient()
  return {
    sheets: google.sheets({ version: 'v4', auth: authClient }),
    drive: google.drive({ version: 'v3', auth: authClient }),
  }
}

exports.predictCrowdState = onRequest({ ...runtimeOptions, cors: true }, (req, res) => {
  const body = req.body || {}
  const metrics = body.metrics || {}

  const gateCandidates = ['gateA', 'gateB', 'gateC']
  const exitCandidates = ['exitA', 'exitB']

  const recommendedFrom = gateCandidates.reduce((best, current) =>
    scoreZone(metrics[current]) < scoreZone(metrics[best]) ? current : best,
  )

  const recommendedTo = exitCandidates.reduce((best, current) =>
    scoreZone(metrics[current]) < scoreZone(metrics[best]) ? current : best,
  )

  res.json({
    recommendedFrom,
    recommendedTo,
    confidence: 0.86,
    reason: `Balance traffic toward ${recommendedFrom} and pre-position exits at ${recommendedTo}.`,
  })
})

exports.predictCrowdNext10Min = onCall(runtimeOptions, async (request) => {
  const densityHistory = request.data?.densityHistory || []
  const recent = densityHistory.slice(-3)
  const current = recent[recent.length - 1] || 45
  const slope = recent.length >= 2 ? recent[recent.length - 1] - recent[recent.length - 2] : 2
  const values = [
    Math.max(0, Math.min(100, Math.round(current + slope))),
    Math.max(0, Math.min(100, Math.round(current + slope * 2))),
    Math.max(0, Math.min(100, Math.round(current + slope * 3))),
  ]

  return {
    summary: 'Cloud function forecast generated for next 10 minutes.',
    confidence: 0.79,
    values,
  }
})

exports.suggestBestGate = onCall(runtimeOptions, async (request) => {
  const metrics = request.data?.metrics || {}
  const gateCandidates = ['gateA', 'gateB', 'gateC']
  const gate = gateCandidates.reduce((best, current) =>
    scoreZone(metrics[current]) < scoreZone(metrics[best]) ? current : best,
  gateCandidates[0])

  return {
    gate,
    reason: `Selected ${gate} because it has the lowest weighted crowd score.`,
  }
})

exports.predictExitRush = onCall(runtimeOptions, async (request) => {
  const metrics = request.data?.metrics || {}
  const exitAverage = average([
    metrics.exitA?.density || 0,
    metrics.exitB?.density || 0,
  ])

  const level = exitAverage > 72 ? 'high' : exitAverage > 45 ? 'medium' : 'low'
  return {
    level,
    reason: `Exit rush classified as ${level} from current exit density average (${Math.round(exitAverage)}%).`,
  }
})

exports.facilityLoadForecast = onCall(runtimeOptions, async (request) => {
  const metrics = request.data?.metrics || {}
  const candidates = ['foodCourt', 'restroomNorth', 'restroomSouth']
  const busiestFacility = candidates.reduce((best, current) =>
    scoreZone(metrics[current]) > scoreZone(metrics[best]) ? current : best,
  candidates[0])

  return {
    busiestFacility,
    reason: `${busiestFacility} is projected to sustain the highest facility load.`,
  }
})

exports.staffDeploymentSuggestion = onCall(runtimeOptions, async (request) => {
  const metrics = request.data?.metrics || {}
  const gateDensity = average([
    metrics.gateA?.density || 0,
    metrics.gateB?.density || 0,
    metrics.gateC?.density || 0,
  ])

  const recommendation = gateDensity > 68
    ? 'Deploy 2 additional gate stewards and 1 mobile concourse responder.'
    : 'Maintain baseline staffing and rotate one support agent to facilities.'

  return {
    recommendation,
    confidence: gateDensity > 68 ? 0.83 : 0.74,
  }
})

async function appendRowsToSheet(rows) {
  const spreadsheetId = process.env.GOOGLE_SHEETS_SPREADSHEET_ID || DEFAULT_SPREADSHEET_ID
  if (!spreadsheetId) {
    return { ok: false, message: 'GOOGLE_SHEETS_SPREADSHEET_ID is not configured.' }
  }

  const { sheets } = await getGoogleClients()
  await sheets.spreadsheets.values.append({
    spreadsheetId,
    range: 'Sheet1!A1',
    valueInputOption: 'USER_ENTERED',
    requestBody: {
      values: rows,
    },
  })

  return {
    ok: true,
    message: 'Rows exported to Google Sheets successfully.',
    link: `https://docs.google.com/spreadsheets/d/${spreadsheetId}`,
  }
}

exports.exportToSheets = onCall(runtimeOptions, async (request) => {
  const payload = request.data || {}
  const now = new Date().toISOString()
  const rows = [
    ['timestamp', 'type', 'phase', 'notes', 'density_history'],
    [now, 'crowd_export', payload.phase || 'unknown', payload.notes || '', JSON.stringify(payload.densityHistory || [])],
  ]

  try {
    return await appendRowsToSheet(rows)
  } catch (error) {
    logger.error('exportToSheets failed', error)
    return { ok: false, message: 'Failed to export data to Google Sheets.' }
  }
})

exports.logSimulation = onCall(runtimeOptions, async (request) => {
  const payload = request.data || {}
  const now = new Date().toISOString()
  const rows = [
    ['timestamp', 'type', 'phase', 'alerts', 'metrics', 'queues'],
    [
      now,
      'simulation_log',
      payload.phase || 'unknown',
      JSON.stringify(payload.alerts || []),
      JSON.stringify(payload.metrics || {}),
      JSON.stringify(payload.queues || {}),
    ],
  ]

  try {
    return await appendRowsToSheet(rows)
  } catch (error) {
    logger.error('logSimulation failed', error)
    return { ok: false, message: 'Failed to log simulation to Google Sheets.' }
  }
})

exports.exportWaitTimes = onCall(runtimeOptions, async (request) => {
  const payload = request.data || {}
  const now = new Date().toISOString()
  const rows = [['timestamp', 'type', 'phase', 'waitTimes']]
  rows.push([now, 'wait_times', payload.phase || 'unknown', JSON.stringify(payload.waitTimes || [])])

  try {
    return await appendRowsToSheet(rows)
  } catch (error) {
    logger.error('exportWaitTimes failed', error)
    return { ok: false, message: 'Failed to export wait times to Google Sheets.' }
  }
})

exports.saveSimulation = onCall(runtimeOptions, async (request) => {
  const payload = request.data || {}
  const folderId = process.env.GOOGLE_DRIVE_FOLDER_ID

  try {
    const { drive } = await getGoogleClients()
    const content = JSON.stringify({
      ...payload,
      generatedAt: new Date().toISOString(),
    }, null, 2)

    const driveResponse = await drive.files.create({
      requestBody: {
        name: `crowdpilot-simulation-${Date.now()}.json`,
        mimeType: 'application/json',
        parents: folderId ? [folderId] : undefined,
      },
      media: {
        mimeType: 'application/json',
        body: content,
      },
      fields: 'id,webViewLink',
    })

    return {
      ok: true,
      message: 'Simulation saved to Google Drive.',
      link: driveResponse.data.webViewLink || undefined,
    }
  } catch (error) {
    logger.error('saveSimulation failed', error)
    return { ok: false, message: 'Failed to save simulation to Google Drive.' }
  }
})

exports.refreshDensityState = onSchedule({ ...runtimeOptions, schedule: 'every 5 minutes' }, async () => {
  logger.info('Scheduled density refresh tick executed')
})
