const express = require('express')

const app = express()
app.use(express.json())

app.post('/simulate', (req, res) => {
  const input = req.body || {}
  const metrics = input.metrics || {}

  Object.keys(metrics).forEach((zoneId) => {
    const zone = metrics[zoneId]
    const drift = (Math.random() - 0.5) * 3.5
    const next = Math.max(4, Math.min(98, zone.density + drift + Math.max(zone.trend, 0) * 0.9))
    zone.density = Number(next.toFixed(2))
  })

  res.json({ metrics })
})

app.get('/health', (_req, res) => {
  res.json({ ok: true })
})

const port = process.env.PORT || 8080
app.listen(port, () => {
  console.log(`Cloud Run simulation service on :${port}`)
})
