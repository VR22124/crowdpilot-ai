const SCRIPT_PROPS = PropertiesService.getScriptProperties();
const DEFAULT_API_TOKEN = '9df60838d42ac117883a7b022bfd178bd3618a3d2ed696d9cf772e0c4d595ac8';
const DEFAULT_SPREADSHEET_ID = '1QYFxv4Ah0QEHZTRIaZ3HA5WXpfoWUPUOr31JbwloKT0';
const DEFAULT_DRIVE_FOLDER_ID = '';

function setWorkspaceConfig(config) {
  const payload = config || {};
  const token = String(payload.apiToken || '').trim();
  const spreadsheetId = String(payload.spreadsheetId || '').trim();
  const driveFolderId = String(payload.driveFolderId || '').trim();

  if (!token) throw new Error('apiToken is required');
  if (!spreadsheetId) throw new Error('spreadsheetId is required');

  SCRIPT_PROPS.setProperty('API_TOKEN', token);
  SCRIPT_PROPS.setProperty('SPREADSHEET_ID', spreadsheetId);
  if (driveFolderId) {
    SCRIPT_PROPS.setProperty('DRIVE_FOLDER_ID', driveFolderId);
  }

  return getWorkspaceConfig();
}

function createDriveFolderIfMissing(folderName) {
  const existing = String(SCRIPT_PROPS.getProperty('DRIVE_FOLDER_ID') || '').trim();
  if (existing) {
    return { created: false, folderId: existing };
  }

  const name = String(folderName || 'CrowdPilot-AI-Simulations').trim() || 'CrowdPilot-AI-Simulations';
  const folder = DriveApp.createFolder(name);
  SCRIPT_PROPS.setProperty('DRIVE_FOLDER_ID', folder.getId());
  return { created: true, folderId: folder.getId(), folderUrl: folder.getUrl() };
}

function getWorkspaceConfig() {
  return {
    spreadsheetId: String(SCRIPT_PROPS.getProperty('SPREADSHEET_ID') || ''),
    driveFolderId: String(SCRIPT_PROPS.getProperty('DRIVE_FOLDER_ID') || ''),
    hasApiToken: Boolean(String(SCRIPT_PROPS.getProperty('API_TOKEN') || '')),
  };
}

function doPost(e) {
  try {
    const body = parseBody_(e);
    if (!isAuthorized_(body.token)) {
      return jsonResponse_({ ok: false, error: 'Unauthorized' });
    }

    const action = String(body.action || '');
    const payload = body.payload || {};

    switch (action) {
      case 'exportToSheets':
        return jsonResponse_({ ok: true, data: exportToSheets_(payload) });
      case 'logSimulation':
        return jsonResponse_({ ok: true, data: logSimulation_(payload) });
      case 'exportWaitTimes':
        return jsonResponse_({ ok: true, data: exportWaitTimes_(payload) });
      case 'saveSimulation':
        return jsonResponse_({ ok: true, data: saveSimulation_(payload) });
      case 'predictCrowdNext10Min':
        return jsonResponse_({ ok: true, data: predictCrowdNext10Min_(payload) });
      case 'suggestBestGate':
        return jsonResponse_({ ok: true, data: suggestBestGate_(payload) });
      case 'predictExitRush':
        return jsonResponse_({ ok: true, data: predictExitRush_(payload) });
      case 'facilityLoadForecast':
        return jsonResponse_({ ok: true, data: facilityLoadForecast_(payload) });
      case 'staffDeploymentSuggestion':
        return jsonResponse_({ ok: true, data: staffDeploymentSuggestion_(payload) });
      default:
        return jsonResponse_({ ok: false, error: 'Unknown action' });
    }
  } catch (error) {
    return jsonResponse_({
      ok: false,
      error: 'Internal error',
      details: String(error && error.message ? error.message : error),
    });
  }
}

function doGet() {
  return jsonResponse_({ ok: true, service: 'CrowdPilot Workspace API', status: 'healthy' });
}

function parseBody_(e) {
  if (!e || !e.postData || !e.postData.contents) return {};
  return JSON.parse(e.postData.contents);
}

function isAuthorized_(token) {
  const expected = SCRIPT_PROPS.getProperty('API_TOKEN') || DEFAULT_API_TOKEN;
  return Boolean(expected) && String(token || '') === expected;
}

function jsonResponse_(obj) {
  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}

function getSpreadsheet_() {
  const spreadsheetId = SCRIPT_PROPS.getProperty('SPREADSHEET_ID') || DEFAULT_SPREADSHEET_ID;
  if (!spreadsheetId) throw new Error('Missing SPREADSHEET_ID script property');
  return SpreadsheetApp.openById(spreadsheetId);
}

function getOrCreateSheet_(name, headers) {
  const ss = getSpreadsheet_();
  let sheet = ss.getSheetByName(name);
  if (!sheet) {
    sheet = ss.insertSheet(name);
    sheet.appendRow(headers);
  }
  return sheet;
}

function nowIso_() {
  return new Date().toISOString();
}

function safeNumber_(value, fallback) {
  const num = Number(value);
  if (!isFinite(num)) return fallback;
  return num;
}

function stringify_(value, maxLen) {
  const text = String(value == null ? '' : value);
  if (!maxLen) return text;
  return text.slice(0, maxLen);
}

function densityAverage_(metrics, keys) {
  if (!metrics) return 0;
  const values = keys.map(function (key) {
    const zone = metrics[key] || {};
    return safeNumber_(zone.density, 0);
  });
  if (!values.length) return 0;
  return values.reduce(function (acc, cur) { return acc + cur; }, 0) / values.length;
}

function exportToSheets_(payload) {
  const phase = stringify_(payload.phase || 'unknown', 32);
  const notes = stringify_(payload.notes || '', 6000);
  const densityHistory = Array.isArray(payload.densityHistory) ? payload.densityHistory.slice(-30) : [];
  const queues = payload.queueLengths || {};

  const sheet = getOrCreateSheet_('exports', ['timestamp', 'phase', 'avg_density', 'queues_json', 'notes']);
  const avgDensity = densityHistory.length
    ? densityHistory.reduce(function (acc, cur) { return acc + safeNumber_(cur, 0); }, 0) / densityHistory.length
    : 0;

  sheet.appendRow([
    nowIso_(),
    phase,
    Number(avgDensity.toFixed(1)),
    JSON.stringify(queues),
    notes,
  ]);

  return {
    ok: true,
    message: 'Report exported to Google Sheets.',
    link: 'https://docs.google.com/spreadsheets/d/' + getSpreadsheet_().getId(),
    source: 'workspace',
  };
}

function logSimulation_(payload) {
  const phase = stringify_(payload.phase || 'unknown', 32);
  const alerts = Array.isArray(payload.alerts) ? payload.alerts.slice(0, 12) : [];

  const sheet = getOrCreateSheet_('simulation_logs', [
    'timestamp',
    'phase',
    'gate_avg_density',
    'exit_avg_density',
    'alerts_json',
    'metrics_json',
    'queues_json',
  ]);

  const metrics = payload.metrics || {};
  const queues = payload.queues || {};

  sheet.appendRow([
    nowIso_(),
    phase,
    Number(densityAverage_(metrics, ['gateA', 'gateB', 'gateC']).toFixed(1)),
    Number(densityAverage_(metrics, ['exitA', 'exitB']).toFixed(1)),
    JSON.stringify(alerts),
    JSON.stringify(metrics),
    JSON.stringify(queues),
  ]);

  return {
    ok: true,
    message: 'Simulation snapshot logged to Sheets.',
    link: 'https://docs.google.com/spreadsheets/d/' + getSpreadsheet_().getId(),
    source: 'workspace',
  };
}

function exportWaitTimes_(payload) {
  const phase = stringify_(payload.phase || 'unknown', 32);
  const waitTimes = Array.isArray(payload.waitTimes) ? payload.waitTimes.slice(0, 20) : [];
  const sheet = getOrCreateSheet_('wait_times', ['timestamp', 'phase', 'zone', 'minutes']);

  waitTimes.forEach(function (item) {
    sheet.appendRow([
      nowIso_(),
      phase,
      stringify_(item && item.label, 64),
      safeNumber_(item && item.minutes, 0),
    ]);
  });

  return {
    ok: true,
    message: 'Wait times exported to Sheets.',
    link: 'https://docs.google.com/spreadsheets/d/' + getSpreadsheet_().getId(),
    source: 'workspace',
  };
}

function saveSimulation_(payload) {
  const folderId = SCRIPT_PROPS.getProperty('DRIVE_FOLDER_ID') || DEFAULT_DRIVE_FOLDER_ID;
  if (!folderId) {
    const fallbackFile = DriveApp.createFile(
      'crowdpilot-' + stringify_(payload.phase || 'unknown', 32) + '-' + new Date().getTime() + '.json',
      JSON.stringify({
        generatedAt: nowIso_(),
        phase: stringify_(payload.phase || 'unknown', 32),
        summary: stringify_(payload.summary || '', 8000),
        densityHistory: Array.isArray(payload.densityHistory) ? payload.densityHistory.slice(-30) : [],
        timestamp: safeNumber_(payload.timestamp, Date.now()),
      }, null, 2),
      MimeType.PLAIN_TEXT,
    );
    return {
      ok: true,
      message: 'Simulation saved to Google Drive root.',
      link: fallbackFile.getUrl(),
      source: 'workspace',
    };
  }

  const folder = DriveApp.getFolderById(folderId);
  const phase = stringify_(payload.phase || 'unknown', 32);
  const filename = 'crowdpilot-' + phase + '-' + new Date().getTime() + '.json';
  const content = JSON.stringify({
    generatedAt: nowIso_(),
    phase: phase,
    summary: stringify_(payload.summary || '', 8000),
    densityHistory: Array.isArray(payload.densityHistory) ? payload.densityHistory.slice(-30) : [],
    timestamp: safeNumber_(payload.timestamp, Date.now()),
  }, null, 2);

  const file = folder.createFile(filename, content, MimeType.PLAIN_TEXT);

  return {
    ok: true,
    message: 'Simulation saved to Google Drive.',
    link: file.getUrl(),
    source: 'workspace',
  };
}

function predictCrowdNext10Min_(payload) {
  const history = Array.isArray(payload.densityHistory) ? payload.densityHistory.slice(-4) : [];
  const baseline = history.length ? safeNumber_(history[history.length - 1], 45) : 45;
  const trend = history.length >= 2 ? baseline - safeNumber_(history[history.length - 2], baseline) : 2;

  const values = [1, 2, 3].map(function (step) {
    return Number(Math.max(5, Math.min(98, baseline + trend * step)).toFixed(1));
  });

  return {
    summary: 'Workspace forecast generated from recent crowd trend.',
    confidence: 0.8,
    values: values,
    source: 'workspace',
  };
}

function suggestBestGate_(payload) {
  const metrics = payload.metrics || {};
  const gates = ['gateA', 'gateB', 'gateC'];
  let bestGate = gates[0];
  let bestScore = 101;

  gates.forEach(function (gate) {
    const score = safeNumber_((metrics[gate] || {}).density, 100);
    if (score < bestScore) {
      bestScore = score;
      bestGate = gate;
    }
  });

  return {
    gate: bestGate,
    reason: 'Workspace logic selected the least dense entry gate.',
  };
}

function predictExitRush_(payload) {
  const metrics = payload.metrics || {};
  const avgExit = densityAverage_(metrics, ['exitA', 'exitB']);
  const level = avgExit > 72 ? 'high' : (avgExit > 48 ? 'medium' : 'low');

  return {
    level: level,
    reason: 'Workspace exit rush forecast based on current exit density.',
  };
}

function facilityLoadForecast_(payload) {
  const metrics = payload.metrics || {};
  const facilities = ['foodCourt', 'restroomNorth', 'restroomSouth'];
  let busiest = facilities[0];
  let busiestDensity = safeNumber_((metrics[busiest] || {}).density, 0);

  facilities.forEach(function (facility) {
    const currentDensity = safeNumber_((metrics[facility] || {}).density, 0);
    if (currentDensity > busiestDensity) {
      busiest = facility;
      busiestDensity = currentDensity;
    }
  });

  return {
    busiestFacility: busiest,
    reason: 'Workspace facility load forecast based on current densities.',
  };
}

function staffDeploymentSuggestion_(payload) {
  const metrics = payload.metrics || {};
  const gateAvg = densityAverage_(metrics, ['gateA', 'gateB', 'gateC']);

  if (gateAvg > 70) {
    return {
      recommendation: 'Deploy 2 additional stewards to gates and 1 floating queue marshal.',
      confidence: 0.84,
    };
  }

  if (gateAvg > 52) {
    return {
      recommendation: 'Assign 1 additional steward to the busiest gate and monitor every 3 minutes.',
      confidence: 0.75,
    };
  }

  return {
    recommendation: 'Maintain baseline staffing with normal patrol intervals.',
    confidence: 0.7,
  };
}
