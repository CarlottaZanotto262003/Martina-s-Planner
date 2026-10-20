/* Sezione "Tesi": scheda della tesi, avanzamento, tappe e diario dei progressi. */
(function () {
  'use strict';
  var App = window.App, S = window.Store, U = App.util, ico = App.ico, esc = U.esc;

  var ui = App.ui.thesis = { quote: App.quote('tesi') };
  var STEP_LABEL = { todo: 'Da iniziare', doing: 'In corso', done: 'Fatto' };
  var STEP_NEXT = { todo: 'doing', doing: 'done', done: 'todo' };
  var TEMPLATE = [
    'Scelta dell\'argomento e del relatore', 'Ricerca bibliografica', 'Stesura dell\'indice', 'Introduzione',
    'Materiali e metodi', 'Risultati', 'Discussione e conclusioni', 'Revisione con il relatore',
    'Impaginazione e bibliografia', 'Consegna in segreteria', 'Preparazione della presentazione'
  ];

  function ring(pct, label) {
    var c = 2 * Math.PI * 52, dash = Math.max(0, Math.min(100, pct)) / 100 * c;
    return '<div class="ring"><svg viewBox="0 0 120 120" aria-hidden="true"><circle class="bg" cx="60" cy="60" r="52"/>' +
      '<circle class="fg" cx="60" cy="60" r="52" stroke-dasharray="' + dash.toFixed(1) + ' ' + c.toFixed(1) + '"/></svg>' +
      '<div class="lbl"><div>' + pct + '%<small>' + esc(label) + '</small></div></div></div>';
  }

  function render() {
    var meta = S.get('thesisMeta', 'main');
    var steps = S.list('thesisSteps').sort(function (a, b) { return a.id.localeCompare(b.id); });
    var log = S.list('thesisLog').sort(function (a, b) { return (b.date + b.id).localeCompare(a.date + a.id); });
    var today = U.today();

    var nDone = steps.filter(function (s) { return s.status === 'done'; }).length;
    var nDoing = steps.filter(function (s) { return s.status === 'doing'; }).length;
    var stepsPct = steps.length ? Math.round((nDone + nDoing * 0.5) / steps.length * 100) : 0;
    var target = meta && meta.targetPages !== '' ? meta.targetPages : 0;
    var current = meta && meta.currentPages !== '' ? meta.currentPages : 0;
    var pagesPct = target ? Math.min(100, Math.round(current / target * 100)) : 0;

    var ringPct = steps.length ? stepsPct : pagesPct;
    var ringLabel = steps.length ? 'tappe' : 'pagine';

    /* Scheda principale */
    var head;
    if (!meta) {
      head = '<section class="card empty"><span class="big">🎓</span><strong>Racconta della tua tesi</strong>' +
        'Titolo, relatore, data di discussione e pagine da scrivere: avrai tutto sotto controllo.' +
        '<br><button class="btn primary" data-action="thesis-meta">' + ico('edit') + 'Inserisci i dati della tesi</button></section>';
    } else {
      var info = '';
      if (meta.discussionDate) {
        var d = U.diffDays(today, meta.discussionDate);
        if (d > 0) info = '<span class="chip accent">🎓 Discussione ' + esc(U.fmt(meta.discussionDate, { day: 'numeric', month: 'long', year: 'numeric' })) + ' · mancano ' + U.plural(d, 'giorno', 'giorni') + (d >= 14 ? ' (≈ ' + Math.round(d / 7) + ' settimane)' : '') + '</span>';
        else if (d === 0) info = '<span class="chip accent">🎓 Oggi è il grande giorno! In bocca al lupo ✨</span>';
        else info = '<span class="chip primary">🎓 Discussione del ' + esc(U.fmt(meta.discussionDate, { day: 'numeric', month: 'long', year: 'numeric' })) + '</span>';
      }
      var pace = '';
      if (target && meta.discussionDate) {
        var left = U.diffDays(today, meta.discussionDate), remaining = Math.max(0, target - current);
        if (left > 0 && remaining > 0) {
          pace = '<p class="small muted" style="margin-top:8px">Per arrivare in tempo servono indicativamente <b>' + Math.ceil(remaining / Math.max(1, Math.ceil(left / 7))) + ' pagine a settimana</b> (tenendo conto che resterà tempo per le revisioni).</p>';
        }
      }
      head = '<section class="card"><div class="ring-wrap">' + ring(ringPct, ringLabel) +
        '<div style="flex:1;min-width:220px">' +
          '<div class="row between" style="align-items:flex-start"><div><h2 class="thesis-title">' + esc(meta.title || 'La mia tesi') + '</h2>' +
            (meta.supervisor ? '<p class="muted small">Relatore: ' + esc(meta.supervisor) + '</p>' : '') + '</div>' +
            '<button class="icon-btn bordered" data-action="thesis-meta" aria-label="Modifica dati tesi">' + ico('edit') + '</button></div>' +
          '<div class="row" style="margin:10px 0">' + info + '</div>' +
          (target ? '<div class="row between small"><span>Pagine scritte</span><b>' + current + ' / ' + target + '</b></div>' +
            '<div class="progress" style="margin-top:6px"><i style="width:' + pagesPct + '%"></i></div>' + pace
            : '<p class="small muted">Imposta il numero di pagine da raggiungere per vedere la barra dei progressi.</p>') +
        '</div></div>' +
        (meta.notes ? '<p class="small muted" style="margin-top:14px;white-space:pre-wrap">' + esc(meta.notes) + '</p>' : '') +
      '</section>';
    }

    /* Tappe */
    var stepsHTML = steps.length ? steps.map(function (s) {
      var dueChip = '';
      if (s.due) {
        var dd = U.diffDays(today, s.due);
        dueChip = '<span class="chip ' + (s.status !== 'done' && dd < 0 ? 'danger' : '') + '">' + esc(U.fmt(s.due)) + '</span>';
      }
      return '<div class="topic">' +
        '<button class="status-pill" data-s="' + s.status + '" data-action="thesis-step-cycle" data-id="' + s.id + '" title="Tocca per cambiare stato">' + STEP_LABEL[s.status] + '</button>' +
        '<span class="name" data-action="thesis-step-edit" data-id="' + s.id + '"' + (s.status === 'done' ? ' style="text-decoration:line-through;color:var(--muted)"' : '') + '>' + esc(s.title) + '</span>' +
        dueChip + '<button class="icon-btn" data-action="thesis-step-edit" data-id="' + s.id + '" aria-label="Modifica">' + ico('edit') + '</button></div>';
    }).join('') : '<div class="empty"><span class="big">🧭</span><strong>Nessuna tappa ancora</strong>Dividere la tesi in tappe la rende molto meno spaventosa.' +
      '<br><button class="btn" data-action="thesis-template">Aggiungi le tappe più comuni</button></div>';

    /* Diario */
    var logHTML = log.length ? log.map(function (l) {
      return '<div class="log-entry" data-action="thesis-log-edit" data-id="' + l.id + '"><div class="d"><span>' + esc(U.fmt(l.date, { weekday: 'short', day: 'numeric', month: 'long' })) + '</span>' +
        (l.pages !== '' ? '<span class="chip primary">' + l.pages + ' pagine in totale</span>' : '') + '</div><p>' + esc(l.text) + '</p></div>';
    }).join('') : '<div class="empty"><span class="big">✍️</span><strong>Il tuo diario è vuoto</strong>Annota ogni tanto cosa hai fatto e come ti senti: tra qualche mese sarà bello rileggerlo.</div>';

    return '<div class="page-head"><div><h2>La mia tesi</h2><p>' + esc(ui.quote) + '</p></div></div>' + head +
      '<div class="cols">' +
        '<section class="card"><div class="card-title"><h3>Tappe del lavoro' + (steps.length ? ' · ' + nDone + '/' + steps.length : '') + '</h3>' +
          (steps.length ? '' : '') + '</div>' +
          '<form class="quick-add" data-submit="thesis-step-quick" autocomplete="off" style="margin-bottom:8px">' +
            '<div class="line"><input type="text" id="step-title" name="title" placeholder="Nuova tappa (es. Capitolo 2)" required><button class="btn primary" type="submit">' + ico('plus') + 'Aggiungi</button></div></form>' +
          stepsHTML +
        '</section>' +
        '<section class="card"><div class="card-title"><h3>Diario dei progressi</h3><button class="btn sm" data-action="thesis-log-new">' + ico('plus') + 'Aggiorna</button></div>' + logHTML + '</section>' +
      '</div>';
  }
  App.views.thesis = { render: render };

  /* ───────── Azioni ───────── */
  App.actions['thesis-meta'] = function () { App.forms.thesisMeta(); };
  App.actions['thesis-log-new'] = function () { App.forms.thesisLog(); };
  App.actions['thesis-log-edit'] = function (el) { App.forms.thesisLog(el.dataset.id); };
  App.actions['thesis-step-edit'] = function (el) { App.forms.thesisStep(el.dataset.id); };
  App.actions['thesis-step-cycle'] = function (el) {
    var s = S.get('thesisSteps', el.dataset.id);
    if (!s) return;
    var next = STEP_NEXT[s.status] || 'doing';
    S.upsert('thesisSteps', Object.assign({}, s, { status: next }));
    if (next === 'done') App.toast('Tappa completata! ' + App.quote('tesi'));
  };
  App.actions['thesis-template'] = function () {
    S.batch(function () {
      TEMPLATE.forEach(function (t) { S.upsert('thesisSteps', { title: t, status: 'todo', due: '', notes: '' }); });
    });
  };
  App.submits['thesis-step-quick'] = function (form) {
    var title = form.elements.title.value.trim();
    if (!title) return;
    App.ui.focusId = 'step-title';
    S.upsert('thesisSteps', { title: title, status: 'todo', due: '', notes: '' });
  };

  /* ───────── Form ───────── */
  App.forms.thesisMeta = function () {
    var meta = S.get('thesisMeta', 'main');
    App.openForm({
      title: 'La mia tesi',
      values: meta || { title: '', supervisor: '', discussionDate: '', targetPages: '', currentPages: '', notes: '' },
      fields: [
        { name: 'title', label: 'Titolo (anche provvisorio)', type: 'text' },
        { name: 'supervisor', label: 'Relatore', type: 'text' },
        { name: 'discussionDate', label: 'Data prevista di discussione', type: 'date' },
        [{ name: 'targetPages', label: 'Pagine da scrivere', type: 'number', min: 0, step: 1 }, { name: 'currentPages', label: 'Pagine scritte', type: 'number', min: 0, step: 1 }],
        { name: 'notes', label: 'Note', type: 'textarea', placeholder: 'Argomento, idee, cose da chiedere al relatore…' }
      ],
      onSubmit: function (v) {
        S.upsert('thesisMeta', Object.assign({}, meta || {}, { id: 'main', title: v.title, supervisor: v.supervisor, discussionDate: v.discussionDate, targetPages: v.targetPages, currentPages: v.currentPages, notes: v.notes }));
      },
      onDelete: meta ? function () { S.remove('thesisMeta', 'main'); } : null,
      deleteMessage: 'Rimuovere i dati della tesi? Tappe e diario restano.'
    });
  };

  App.forms.thesisStep = function (id) {
    var s = S.get('thesisSteps', id);
    if (!s) return;
    App.openForm({
      title: 'Modifica tappa',
      values: s,
      fields: [
        { name: 'title', label: 'Tappa', type: 'text', required: true },
        [{ name: 'status', label: 'Stato', type: 'select', options: [{ value: 'todo', label: 'Da iniziare' }, { value: 'doing', label: 'In corso' }, { value: 'done', label: 'Fatto' }] },
         { name: 'due', label: 'Entro il', type: 'date' }],
        { name: 'notes', label: 'Note', type: 'textarea' }
      ],
      validate: function (v) { return String(v.title).trim() ? '' : 'Scrivi il nome della tappa.'; },
      onSubmit: function (v) { S.upsert('thesisSteps', Object.assign({}, s, { title: String(v.title).trim(), status: v.status, due: v.due, notes: v.notes })); },
      onDelete: function () { S.remove('thesisSteps', s.id); },
      deleteMessage: 'Eliminare questa tappa?'
    });
  };

  App.forms.thesisLog = function (id) {
    var l = id ? S.get('thesisLog', id) : null;
    var meta = S.get('thesisMeta', 'main');
    App.openForm({
      title: l ? 'Modifica aggiornamento' : 'Come sta andando la tesi?',
      values: l || { date: U.today(), text: '', pages: meta && meta.currentPages !== '' ? meta.currentPages : '' },
      fields: [
        { name: 'date', label: 'Data', type: 'date', required: true },
        { name: 'text', label: 'Cosa hai fatto / come ti senti', type: 'textarea', rows: 5, required: true, placeholder: 'Es. Ho finito la bozza del capitolo 2 e mandato le correzioni al relatore.' },
        { name: 'pages', label: 'Pagine scritte in totale (facoltativo)', type: 'number', min: 0, step: 1, hint: 'Se lo inserisci, aggiorno anche il contatore nella scheda della tesi.' }
      ],
      validate: function (v) { return String(v.text).trim() ? '' : 'Scrivi qualche riga.'; },
      onSubmit: function (v) {
        S.batch(function () {
          S.upsert('thesisLog', Object.assign({}, l || {}, { date: v.date, text: String(v.text).trim(), pages: v.pages }));
          if (v.pages !== '') {
            S.upsert('thesisMeta', Object.assign({ title: '', supervisor: '', discussionDate: '', targetPages: '', notes: '' }, meta || {}, { id: 'main', currentPages: v.pages }));
          }
        });
        if (!l) App.toast(App.quote('tesi'));
      },
      onDelete: l ? function () { S.remove('thesisLog', l.id); } : null,
      deleteMessage: 'Eliminare questo aggiornamento?'
    });
  };
})();
