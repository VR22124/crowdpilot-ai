# Deployment Guide

## Live Deployment

- Production URL: https://crowdpilot-ai-b5a0d.web.app

## Hosting Deployment

From project root:

```bash
npm run build
npx firebase-tools deploy --only hosting --project <your_project_id>
```

## Workspace Backend Deployment (Spark-safe)

Use the Apps Script backend in `workspace-backend/Code.gs`.

1. Create an Apps Script project.
2. Paste `Code.gs` and `appsscript.json`.
3. Set script properties:
- `API_TOKEN`
- `SPREADSHEET_ID`
- `DRIVE_FOLDER_ID`
4. Deploy as Web App.
5. Put URL and token in local `.env`:
- `VITE_WORKSPACE_API_URL`
- `VITE_WORKSPACE_API_TOKEN`

## Recommended Runtime Flags

- `VITE_ENABLE_CLOUD_FUNCTIONS=false` for free-tier mode.
- Enable functions fallback only when backend is deployed and CORS-ready.

## Verification Checklist

1. App opens and dashboard renders.
2. Route planning works.
3. AI summary generation returns text.
4. Export actions show success with source tag.
5. Sheets/Drive artifacts are created.
