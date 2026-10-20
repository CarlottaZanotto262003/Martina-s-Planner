/**
 * Planner di Martina — backend su Google Fogli (Google Apps Script)
 * ---------------------------------------------------------------
 * Come si usa (dettagli nel README):
 *  1. Crea un nuovo Foglio Google, poi  Estensioni → Apps Script.
 *  2. Incolla tutto questo file, cambia la PASSWORD qui sotto e salva.
 *  3. Distribuisci → Nuova distribuzione → tipo "App web"
 *       Esegui come: Me      |      Chi ha accesso: Chiunque
 *  4. Copia l'URL che finisce con /exec e incollalo (insieme alla password)
 *     nelle Impostazioni del sito.
 *
 * Le schede del foglio vengono create da sole alla prima sincronizzazione.
 * Puoi aprire il foglio quando vuoi per vedere o correggere i dati a mano.
 */

// ⚠️ CAMBIA QUESTA PASSWORD con una tua (la stessa andrà nelle Impostazioni del sito)
const TOKEN = 'CAMBIA-QUESTA-PASSWORD';

// Struttura delle schede. NON rinominare le colonne: il sito le usa così come sono.
const SCHEMA = {
  tasks:       { cols: ['id', 'title', 'done', 'due', 'priority', 'category', 'notes', 'createdAt', 'updatedAt'], bool: ['done'], num: [] },
  subjects:    { cols: ['id', 'name', 'cfu', 'color', 'professor', 'notes', 'updatedAt'], bool: [], num: ['cfu'] },
  topics:      { cols: ['id', 'subjectId', 'title', 'status', 'notes', 'updatedAt'], bool: [], num: [] },
  sessions:    { cols: ['id', 'subjectId', 'date', 'start', 'end', 'goal', 'topicIds', 'done', 'notes', 'updatedAt'], bool: ['done'], num: [] },
  thesisMeta:  { cols: ['id', 'title', 'supervisor', 'discussionDate', 'targetPages', 'currentPages', 'notes', 'updatedAt'], bool: [], num: ['targetPages', 'currentPages'] },
  thesisSteps: { cols: ['id', 'title', 'status', 'due', 'notes', 'updatedAt'], bool: [], num: [] },
  thesisLog:   { cols: ['id', 'date', 'text', 'pages', 'updatedAt'], bool: [], num: ['pages'] },
  exams:       { cols: ['id', 'subjectId', 'name', 'cfu', 'date', 'grade', 'lode', 'status', 'notes', 'updatedAt'], bool: ['lode'], num: ['cfu', 'grade'] },
  events:      { cols: ['id', 'title', 'date', 'time', 'type', 'notes', 'updatedAt'], bool: [], num: [] }
};

const TIME_COLS = ['start', 'end', 'time'];

/* ───────────────────────── Endpoint ───────────────────────── */

function doGet(e) {
  try {
    const p = (e && e.parameter) || {};
    const bad = checkToken_(p.token);
    if (bad) return out_({ ok: false, error: bad });
    ensureSheets_();
    const data = {};
    Object.keys(SCHEMA).forEach(function (name) { data[name] = readTable_(name); });
    return out_({ ok: true, data: data, serverTime: new Date().toISOString() });
  } catch (err) {
    return out_({ ok: false, error: String(err) });
  }
}

function doPost(e) {
  const lock = LockService.getScriptLock();
  try {
    lock.waitLock(25000);
    const body = JSON.parse(e.postData.contents);
    const bad = checkToken_(body.token);
    if (bad) return out_({ ok: false, error: bad });
    ensureSheets_();

    var applied = 0;
    (body.ops || []).forEach(function (op) {
      if (!SCHEMA[op.table]) return;
      if (op.op === 'upsert' && op.row && op.row.id) { upsert_(op.table, op.row); applied++; }
      else if (op.op === 'delete' && op.id) { remove_(op.table, op.id); applied++; }
      else if (op.op === 'replace' && Array.isArray(op.rows)) { replace_(op.table, op.rows); applied++; }
    });
    return out_({ ok: true, applied: applied });
  } catch (err) {
    return out_({ ok: false, error: String(err) });
  } finally {
    try { lock.releaseLock(); } catch (_) {}
  }
}

/** Esegui una volta a mano (▶ Esegui) se vuoi creare subito le schede e autorizzare lo script. */
function setup() {
  ensureSheets_();
  SpreadsheetApp.getActiveSpreadsheet().toast('Schede create ✓');
}

/* ───────────────────────── Utilità ───────────────────────── */

function checkToken_(t) {
  if (TOKEN === 'CAMBIA-QUESTA-PASSWORD') return 'Prima di usare il foglio devi cambiare la password in Code.gs';
  if (String(t || '') !== TOKEN) return 'Password non valida';
  return '';
}

function out_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}

function ss_() { return SpreadsheetApp.getActiveSpreadsheet(); }

function ensureSheets_() {
  const ss = ss_();
  Object.keys(SCHEMA).forEach(function (name) {
    if (ss.getSheetByName(name)) return;
    const cols = SCHEMA[name].cols;
    const sh = ss.insertSheet(name);
    sh.getRange(1, 1, 1, cols.length).setValues([cols]).setFontWeight('bold').setBackground('#d9efe9');
    sh.setFrozenRows(1);
    // Formato "testo semplice": evita che Fogli trasformi date e orari in numeri strani.
    sh.getRange(2, 1, Math.max(sh.getMaxRows() - 1, 1), cols.length).setNumberFormat('@');
  });
  // Elimina la scheda vuota predefinita (Foglio1 / Sheet1)
  ['Foglio1', 'Sheet1'].forEach(function (n) {
    const d = ss.getSheetByName(n);
    if (d && ss.getSheets().length > 1 && d.getLastRow() <= 1 && d.getLastColumn() <= 1 && String(d.getRange(1, 1).getValue()) === '') {
      ss.deleteSheet(d);
    }
  });
}

function fmtDate_(v, col) {
  const tz = Session.getScriptTimeZone();
  return Utilities.formatDate(v, tz, TIME_COLS.indexOf(col) >= 0 ? 'HH:mm' : 'yyyy-MM-dd');
}

function rowToObj_(name, r) {
  const sc = SCHEMA[name];
  const o = {};
  sc.cols.forEach(function (c, i) {
    var v = r[i];
    if (v instanceof Date) v = fmtDate_(v, c);
    if (sc.bool.indexOf(c) >= 0) {
      o[c] = (v === true || String(v).toLowerCase() === 'true');
    } else if (sc.num.indexOf(c) >= 0) {
      const n = Number(v);
      o[c] = (v === '' || v === null || v === undefined || isNaN(n)) ? '' : n;
    } else {
      o[c] = (v === null || v === undefined) ? '' : String(v);
    }
  });
  return o;
}

function objToRow_(name, obj) {
  return SCHEMA[name].cols.map(function (c) {
    const v = obj[c];
    if (v === undefined || v === null) return '';
    if (typeof v === 'boolean') return v ? 'TRUE' : 'FALSE';
    return String(v);
  });
}

function readTable_(name) {
  const sh = ss_().getSheetByName(name);
  if (!sh) return [];
  const last = sh.getLastRow();
  if (last < 2) return [];
  const n = SCHEMA[name].cols.length;
  return sh.getRange(2, 1, last - 1, n).getValues()
    .filter(function (r) { return String(r[0]) !== ''; })
    .map(function (r) { return rowToObj_(name, r); });
}

function findRow_(sh, id) {
  const last = sh.getLastRow();
  if (last < 2) return -1;
  const ids = sh.getRange(2, 1, last - 1, 1).getValues();
  for (var i = 0; i < ids.length; i++) {
    if (String(ids[i][0]) === String(id)) return i + 2;
  }
  return -1;
}

function upsert_(name, row) {
  const sh = ss_().getSheetByName(name);
  const n = SCHEMA[name].cols.length;
  var idx = findRow_(sh, row.id);
  if (idx < 0) idx = Math.max(sh.getLastRow(), 1) + 1;
  sh.getRange(idx, 1, 1, n).setNumberFormat('@').setValues([objToRow_(name, row)]);
}

function remove_(name, id) {
  const sh = ss_().getSheetByName(name);
  const idx = findRow_(sh, id);
  if (idx > 0) sh.deleteRow(idx);
}

function replace_(name, rows) {
  const sh = ss_().getSheetByName(name);
  const n = SCHEMA[name].cols.length;
  const last = sh.getLastRow();
  if (last > 1) sh.getRange(2, 1, last - 1, n).clearContent();
  if (!rows.length) return;
  const values = rows.map(function (r) { return objToRow_(name, r); });
  sh.getRange(2, 1, values.length, n).setNumberFormat('@').setValues(values);
}
