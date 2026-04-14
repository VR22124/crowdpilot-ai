# CrowdPilot Workspace Backend (Apps Script)

This backend lets CrowdPilot use Google services on free tier (Spark-friendly) without Firebase Functions deploy.

## What it powers

- Export report to Google Sheets
- Log simulation snapshots in Sheets
- Export wait times in Sheets
- Save simulation files into Google Drive
- Workspace-side predictions and operations suggestions

## 1) Create Apps Script project

1. Go to https://script.new
2. Replace the default file contents with `Code.gs` from this folder.
3. Save the project (example name: `CrowdPilotWorkspaceApi`).

## 2) Set script properties

In Apps Script:

1. Open Project Settings.
2. Under Script Properties, add:
   - `API_TOKEN`: a long random token
   - `SPREADSHEET_ID`: `1QYFxv4Ah0QEHZTRIaZ3HA5WXpfoWUPUOr31JbwloKT0`
   - `DRIVE_FOLDER_ID`: target Google Drive folder ID

## 3) Deploy web app

1. Deploy -> New deployment.
2. Type: Web app.
3. Execute as: Me.
4. Who has access: Anyone with the link.
5. Deploy and copy the Web app URL.

## 4) Configure frontend env

In `.env`:

- `VITE_WORKSPACE_API_URL=<your web app URL>`
- `VITE_WORKSPACE_API_TOKEN=<same API_TOKEN script property>`
- keep `VITE_ENABLE_CLOUD_FUNCTIONS=false` for Spark free tier

## 5) Validate

1. Start app.
2. Click `Export Report`, `Log Simulation`, and `Save Simulation`.
3. Confirm status shows `[source: workspace]`.
4. Verify rows/files in Sheets and Drive.

## Security notes

- Never commit real API tokens.
- Rotate `API_TOKEN` if shared accidentally.
- Restrict spreadsheet sharing to minimum required users/service identities.
