/**
 * Store: dati locali (localStorage) + sincronizzazione con il Foglio Google.
 *
 * - Funziona anche offline: ogni modifica è salvata subito sul dispositivo.
 * - Le modifiche vanno in una coda e partono verso il foglio appena possibile.
 * - A intervalli regolari (e quando riapri la scheda) il sito rilegge il foglio,
 *   così telefono e computer restano allineati.
 */
(function () {
  'use strict';

  var SCHEMA = {
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
  var TABLES = Object.keys(SCHEMA);

  var LS = {
    state: 'martina.planner.state.v1',
    queue: 'martina.planner.queue.v1',
    settings: 'martina.planner.settings.v1',
    linked: 'martina.planner.linked.v1',
    last: 'martina.planner.lastsync.v1'
  };

  function load(key, fallback) {
    try { var v = localStorage.getItem(key); return v ? JSON.parse(v) : fallback; } catch (e) { return fallback; }
  }
  function save(key, val) {
    try { localStorage.setItem(key, JSON.stringify(val)); } catch (e) { /* spazio finito o modalità privata */ }
  }

  /* ───────── Impostazioni ───────── */
  var settings = Object.assign(
    { userName: 'Martina', course: '', totalCfu: 180, apiUrl: '', token: '', pollSeconds: 60, theme: 'auto', bonus: 0 },
    window.PLANNER_CONFIG || {},
    load(LS.settings, {})
  );

  function configured() { return !!(settings.apiUrl && settings.token); }

  /* ───────── Dati ───────── */
  function norm(table, row) {
    var sc = SCHEMA[table], o = {};
    sc.cols.forEach(function (c) {
      var v = row[c];
      if (sc.bool.indexOf(c) >= 0) {
        o[c] = (v === true || String(v).toLowerCase() === 'true');
      } else if (sc.num.indexOf(c) >= 0) {
        var n = Number(v);
        o[c] = (v === '' || v == null || isNaN(n)) ? '' : n;
      } else {
        o[c] = (v == null) ? '' : String(v);
      }
    });
    return o;
  }

  var state = {};
  (function init() {
    var saved = load(LS.state, {});
    TABLES.forEach(function (t) {
      state[t] = Array.isArray(saved[t]) ? saved[t].map(function (r) { return norm(t, r); }) : [];
    });
  })();

  var queue = load(LS.queue, []);
  var opSeq = queue.reduce(function (m, o) { return Math.max(m, o.seq || 0); }, 0);

  var uidSeq = 0;
  function uid() {
    uidSeq = (uidSeq + 1) % 1296;
    return Date.now().toString(36) + ('0' + uidSeq.toString(36)).slice(-2) + Math.random().toString(36).slice(2, 5);
  }

  /* ───────── Eventi ───────── */
  var subs = [];
  function subscribe(fn) { subs.push(fn); }
  function emit(type) {
    subs.forEach(function (fn) { try { fn(type); } catch (e) { console.error(e); } });
  }

  /* ───────── Stato sincronizzazione ───────── */
  var status = { state: configured() ? 'idle' : 'local', message: '', last: load(LS.last, null) };
  function setStatus(s, msg) {
    status.state = s;
    status.message = msg || '';
    if (s === 'ok') { status.last = Date.now(); save(LS.last, status.last); }
    emit('status');
  }
  function statusLabel() {
    switch (status.state) {
      case 'local': return 'Solo su questo dispositivo';
      case 'syncing': return 'Sincronizzo…';
      case 'ok': return 'Sincronizzato';
      case 'pending': return 'Da sincronizzare (' + queue.length + ')';
      case 'offline': return 'Offline · salvo qui';
      case 'error': return 'Errore di sincronizzazione';
      default: return 'Collegato al foglio';
    }
  }

  /* ───────── Coda ───────── */
  function enqueue(op) {
    op.seq = ++opSeq;
    if (op.op === 'upsert') {
      queue = queue.filter(function (o) { return !(o.op === 'upsert' && o.table === op.table && o.row.id === op.row.id); });
    } else if (op.op === 'delete') {
      queue = queue.filter(function (o) {
        return !((o.op === 'upsert' && o.table === op.table && o.row.id === op.id) ||
                 (o.op === 'delete' && o.table === op.table && o.id === op.id));
      });
    } else if (op.op === 'replace') {
      queue = queue.filter(function (o) { return o.table !== op.table; });
    }
    queue.push(op);
    save(LS.queue, queue);
  }

  var batching = 0, dirty = false, flushTimer = null, retryTimer = null;

  function commit() {
    if (batching) { dirty = true; return; }
    dirty = false;
    save(LS.state, state);
    emit('data');
    scheduleFlush();
  }

  function scheduleFlush() {
    if (!configured()) { if (status.state !== 'local') setStatus('local'); return; }
    if (queue.length) setStatus('pending');
    clearTimeout(flushTimer);
    flushTimer = setTimeout(flush, 700);
  }

  function batch(fn) {
    batching++;
    try { fn(); } finally {
      batching--;
      if (!batching && dirty) commit();
    }
  }

  /* ───────── Rete ───────── */
  async function request(method, body, url, token) {
    url = url || settings.apiUrl;
    token = token || settings.token;
    var res;
    if (method === 'GET') {
      var u = url + (url.indexOf('?') >= 0 ? '&' : '?') + 'token=' + encodeURIComponent(token) + '&t=' + Date.now();
      res = await fetch(u, { redirect: 'follow' });
    } else {
      res = await fetch(url, {
        method: 'POST',
        redirect: 'follow',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' }, // niente "preflight" CORS
        body: JSON.stringify(Object.assign({ token: token }, body))
      });
    }
    var txt = await res.text();
    try { return JSON.parse(txt); }
    catch (e) { throw new Error('Risposta non valida dallo script: controlla l\'URL e che l\'accesso sia impostato su "Chiunque".'); }
  }

  var flushing = false, pulling = false;

  async function flush() {
    if (!configured() || flushing || !queue.length) return;
    if (navigator.onLine === false) { setStatus('offline'); return; }
    flushing = true;
    setStatus('syncing');
    var sentOps = queue.slice();
    var ok = false;
    try {
      var res = await request('POST', { ops: sentOps });
      if (!res.ok) throw new Error(res.error || 'Errore sconosciuto');
      var sent = {};
      sentOps.forEach(function (o) { sent[o.seq] = true; });
      queue = queue.filter(function (o) { return !sent[o.seq]; });
      save(LS.queue, queue);
      ok = true;
    } catch (e) {
      setStatus(navigator.onLine === false ? 'offline' : 'error', e.message);
      clearTimeout(retryTimer);
      retryTimer = setTimeout(flush, 20000);
    } finally {
      flushing = false;
    }
    if (ok) {
      if (queue.length) { flush(); } else { setStatus('ok'); }
    }
  }

  function applyServer(data) {
    var next = {};
    TABLES.forEach(function (t) { next[t] = (data[t] || []).map(function (r) { return norm(t, r); }); });
    state = next;
    save(LS.state, state);
  }

  async function pull() {
    if (!configured() || pulling || flushing) return;
    if (navigator.onLine === false) { setStatus('offline'); return; }
    if (queue.length) { await flush(); if (queue.length) return; }
    pulling = true;
    setStatus('syncing');
    try {
      var res = await request('GET');
      if (!res.ok) throw new Error(res.error || 'Errore sconosciuto');
      if (queue.length) { scheduleFlush(); return; } // hai modificato qualcosa nel frattempo: prima invio quello
      var before = JSON.stringify(state);
      applyServer(res.data);
      if (JSON.stringify(state) !== before) emit('data');
      setStatus('ok');
    } catch (e) {
      setStatus(navigator.onLine === false ? 'offline' : 'error', e.message);
    } finally {
      pulling = false;
    }
  }

  function queueAll() {
    queue = [];
    TABLES.forEach(function (t) { enqueue({ op: 'replace', table: t, rows: state[t] }); });
  }

  /** Primo collegamento a un foglio: decide se caricare i dati locali o scaricare quelli del foglio. */
  var initialRunning = false;
  async function initialSync() {
    var sig = settings.apiUrl;
    if (load(LS.linked, '') === sig) { return pull(); }
    if (initialRunning) return;
    initialRunning = true;
    setStatus('syncing');
    try {
      var res = await request('GET');
      if (!res.ok) throw new Error(res.error || 'Errore sconosciuto');
      var serverCount = 0, localCount = 0;
      TABLES.forEach(function (t) { serverCount += (res.data[t] || []).length; localCount += state[t].length; });

      if (serverCount === 0) {
        if (localCount > 0) queueAll();
      } else if (localCount === 0) {
        applyServer(res.data); queue = []; save(LS.queue, queue); emit('data');
      } else {
        var useServer = window.confirm(
          'Nel Foglio Google ci sono già dei dati e anche su questo dispositivo.\n\n' +
          'OK = usa i dati del foglio (quelli di questo dispositivo vengono sostituiti)\n' +
          'Annulla = carica sul foglio i dati di questo dispositivo (quelli del foglio vengono sostituiti)'
        );
        if (useServer) { applyServer(res.data); queue = []; save(LS.queue, queue); emit('data'); }
        else queueAll();
      }
      save(LS.linked, sig);
      if (queue.length) await flush(); else setStatus('ok');
    } catch (e) {
      setStatus(navigator.onLine === false ? 'offline' : 'error', e.message);
    } finally {
      initialRunning = false;
    }
  }

  async function testConnection(url, token) {
    var res = await request('GET', null, url, token);
    if (!res.ok) throw new Error(res.error || 'Errore sconosciuto');
    var n = 0;
    TABLES.forEach(function (t) { n += (res.data[t] || []).length; });
    return n;
  }

  /* ───────── API dati ───────── */
  function list(t) { return state[t].slice(); }
  function get(t, id) {
    for (var i = 0; i < state[t].length; i++) if (state[t][i].id === id) return state[t][i];
    return null;
  }

  function upsert(table, row) {
    var now = new Date().toISOString();
    row = Object.assign({}, row, { updatedAt: now });
    if (!row.id) row.id = uid();
    if (table === 'tasks' && !row.createdAt) row.createdAt = now;
    row = norm(table, row);
    var arr = state[table], idx = -1;
    for (var i = 0; i < arr.length; i++) if (arr[i].id === row.id) { idx = i; break; }
    if (idx >= 0) arr[idx] = row; else arr.push(row);
    enqueue({ op: 'upsert', table: table, row: row });
    commit();
    return row;
  }

  function remove(table, id) {
    state[table] = state[table].filter(function (r) { return r.id !== id; });
    enqueue({ op: 'delete', table: table, id: id });
    commit();
  }

  function saveSettings(patch) {
    var prevUrl = settings.apiUrl, prevTok = settings.token;
    Object.assign(settings, patch);
    save(LS.settings, settings);
    emit('settings');
    if (configured()) {
      if (settings.apiUrl !== prevUrl || settings.token !== prevTok) initialSync();
    } else if (status.state !== 'local') {
      setStatus('local');
    }
  }

  function exportData() {
    return JSON.stringify({ app: 'martina-planner', version: 1, exportedAt: new Date().toISOString(), data: state }, null, 2);
  }

  function importData(text) {
    var obj = JSON.parse(text);
    var d = obj.data || obj;
    var next = {};
    TABLES.forEach(function (t) {
      next[t] = Array.isArray(d[t]) ? d[t].map(function (r) { return norm(t, r); }).filter(function (r) { return r.id; }) : [];
    });
    state = next;
    queue = [];
    TABLES.forEach(function (t) { enqueue({ op: 'replace', table: t, rows: state[t] }); });
    commit();
  }

  function start() {
    if (configured()) initialSync();
    var every = Math.max(20, Number(settings.pollSeconds) || 60) * 1000;
    setInterval(function () { if (document.visibilityState === 'visible') { queue.length ? flush() : pull(); } }, every);
    document.addEventListener('visibilitychange', function () { if (document.visibilityState === 'visible') pull(); });
    window.addEventListener('online', function () { flush().then(pull); });
    window.addEventListener('offline', function () { if (configured()) setStatus('offline'); });
  }

  window.Store = {
    TABLES: TABLES,
    uid: uid,
    list: list,
    get: get,
    upsert: upsert,
    remove: remove,
    batch: batch,
    subscribe: subscribe,
    settings: function () { return settings; },
    saveSettings: saveSettings,
    configured: configured,
    status: function () { return status; },
    statusLabel: statusLabel,
    pendingCount: function () { return queue.length; },
    sync: function () { return queue.length ? flush() : pull(); },
    testConnection: testConnection,
    exportData: exportData,
    importData: importData,
    start: start
  };
})();
