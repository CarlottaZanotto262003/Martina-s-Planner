/* Sezione "Materie": materie, argomenti con progressi di studio, sessioni di studio programmate. */
(function () {
  'use strict';
  var App = window.App, S = window.Store, U = App.util, ico = App.ico, esc = U.esc;

  var ui = App.ui.subjects = { tab: 'subjects', subjectId: null, showPast: false, quote: App.quote('materie') };

  var STATUS = [
    { id: 'todo', label: 'Da studiare' },
    { id: 'studying', label: 'In studio' },
    { id: 'done', label: 'Studiato' },
    { id: 'reviewed', label: 'Ripassato' }
  ];
  var NEXT = { todo: 'studying', studying: 'done', done: 'reviewed', reviewed: 'todo' };
  function stLabel(id) { for (var i = 0; i < STATUS.length; i++) if (STATUS[i].id === id) return STATUS[i].label; return STATUS[0].label; }

  /* Calcola avanzamento di una materia: "in studio" vale metà, studiato e ripassato valgono pieno. */
  App.subjectStats = function (subjectId) {
    var topics = S.list('topics').filter(function (t) { return t.subjectId === subjectId; })
      .sort(function (a, b) { return a.id.localeCompare(b.id); });
    var c = { todo: 0, studying: 0, done: 0, reviewed: 0 };
    topics.forEach(function (t) { c[t.status in c ? t.status : 'todo']++; });
    var n = topics.length;
    return { n: n, c: c, topics: topics, pct: n ? Math.round((c.studying * 0.5 + c.done + c.reviewed) / n * 100) : 0 };
  };

  function stackedBar(c, n) {
    if (!n) return '<div class="progress"></div>';
    var order = [['reviewed', 'var(--st-reviewed)'], ['done', 'var(--st-done)'], ['studying', 'var(--st-studying)']];
    return '<div class="progress stacked">' + order.map(function (o) {
      return c[o[0]] ? '<i style="width:' + (c[o[0]] / n * 100) + '%;background:' + o[1] + '"></i>' : '';
    }).join('') + '</div>';
  }

  /* ───────── Elenco materie ───────── */
  function subjectsGrid() {
    var subs = S.list('subjects');
    if (!subs.length) {
      return '<div class="card empty"><span class="big">📚</span><strong>Aggiungi le tue materie</strong>' +
        'Per ogni materia potrai segnare gli argomenti e vedere quanto hai studiato.' +
        '<br><button class="btn primary" data-action="subject-new">' + ico('plus') + 'Aggiungi la prima materia</button></div>';
    }
    var cards = subs.map(function (s) {
      var st = App.subjectStats(s.id);
      return '<article class="card subject-card" style="--c:' + s.color + '" data-action="subject-open" data-id="' + s.id + '">' +
        '<div class="row between"><h3>' + esc(s.name) + '</h3><span class="pct">' + st.pct + '%</span></div>' +
        '<div class="row" style="margin:6px 0 12px">' +
          (s.cfu !== '' ? '<span class="chip primary">' + s.cfu + ' CFU</span>' : '') +
          (s.professor ? '<span class="chip">' + esc(s.professor) + '</span>' : '') + '</div>' +
        stackedBar(st.c, st.n) +
        '<p class="small muted" style="margin-top:8px">' + (st.n ? (st.c.done + st.c.reviewed) + ' di ' + st.n + ' argomenti studiati · ' + st.c.reviewed + ' ripassati' : 'Nessun argomento ancora') + '</p>' +
      '</article>';
    }).join('');
    return '<div class="grid-auto">' + cards + '</div>' +
      '<div><button class="btn" data-action="subject-new">' + ico('plus') + 'Nuova materia</button></div>';
  }

  /* ───────── Dettaglio materia ───────── */
  function subjectDetail(sub) {
    var st = App.subjectStats(sub.id);
    var today = U.today();
    var topicsHTML = st.topics.length ? st.topics.map(function (t) {
      return '<div class="topic">' +
        '<button class="status-pill" data-s="' + t.status + '" data-action="topic-cycle" data-id="' + t.id + '" title="Tocca per cambiare stato">' + stLabel(t.status) + '</button>' +
        '<span class="name" data-action="topic-edit" data-id="' + t.id + '">' + esc(t.title) + (t.notes ? ' <span class="muted small">📝</span>' : '') + '</span>' +
        '<button class="icon-btn" data-action="topic-edit" data-id="' + t.id + '" aria-label="Modifica">' + ico('edit') + '</button></div>';
    }).join('') : '<div class="empty"><span class="big">🗂️</span><strong>Nessun argomento</strong>Aggiungi i capitoli o gli argomenti del programma per seguire i tuoi progressi.</div>';

    var sessions = S.list('sessions').filter(function (s) { return s.subjectId === sub.id && !s.done && s.date >= today; })
      .sort(function (a, b) { return (a.date + a.start).localeCompare(b.date + b.start); });
    var exams = S.list('exams').filter(function (e) { return e.subjectId === sub.id; })
      .sort(function (a, b) { return (a.date || '9999').localeCompare(b.date || '9999'); });

    var legend = STATUS.map(function (s) {
      return '<span class="chip"><span class="status-pill" data-s="' + s.id + '" style="padding:0;min-width:0;background:none"></span>' + s.label + ' · ' + st.c[s.id] + '</span>';
    }).join('');

    return '<div><button class="btn ghost sm" data-action="subject-back">' + ico('left') + 'Tutte le materie</button></div>' +
      '<section class="card" style="border-top:6px solid ' + sub.color + '">' +
        '<div class="row between"><div><h2>' + esc(sub.name) + '</h2>' +
          '<div class="row" style="margin-top:6px">' + (sub.cfu !== '' ? '<span class="chip primary">' + sub.cfu + ' CFU</span>' : '') + (sub.professor ? '<span class="chip">' + esc(sub.professor) + '</span>' : '') + '</div></div>' +
          '<div class="row"><span class="pct" style="font-size:2rem">' + st.pct + '%</span>' +
          '<button class="icon-btn bordered" data-action="subject-edit" data-id="' + sub.id + '" aria-label="Modifica materia">' + ico('edit') + '</button></div></div>' +
        '<div style="margin:14px 0 10px">' + stackedBar(st.c, st.n) + '</div>' +
        '<div class="row" style="gap:6px">' + legend + '</div>' +
        (sub.notes ? '<p class="small muted" style="margin-top:12px;white-space:pre-wrap">' + esc(sub.notes) + '</p>' : '') +
      '</section>' +
      '<div class="cols">' +
        '<section class="card"><div class="card-title"><h3>Argomenti e progressi</h3>' +
          '<button class="btn sm" data-action="topic-bulk" data-id="' + sub.id + '">Aggiungi più argomenti</button></div>' +
          '<form class="quick-add" data-submit="topic-quick" data-id="' + sub.id + '" autocomplete="off" style="margin-bottom:10px">' +
            '<div class="line"><input type="text" id="topic-title" name="title" placeholder="Nuovo argomento (es. Cap. 3 – Epidemiologia)" required>' +
            '<button class="btn primary" type="submit">' + ico('plus') + 'Aggiungi</button></div></form>' +
          topicsHTML +
        '</section>' +
        '<div class="stack">' +
          '<section class="card"><div class="card-title"><h3>Prossime sessioni</h3><button class="btn sm" data-action="session-new">' + ico('plus') + 'Programma</button></div>' +
            (sessions.length ? sessions.map(sessionRow).join('') : '<p class="muted small">Nessuna sessione in programma per questa materia.</p>') + '</section>' +
          '<section class="card"><div class="card-title"><h3>Esami</h3><button class="btn sm" data-action="exam-new-for-subject" data-id="' + sub.id + '">' + ico('plus') + 'Aggiungi</button></div>' +
            (exams.length ? exams.map(function (e) {
              var chip = e.status === 'passed' ? '<span class="chip primary">' + (e.grade !== '' ? e.grade + (e.lode ? ' e lode' : '') : 'superato') + '</span>'
                : e.status === 'idoneita' ? '<span class="chip primary">Idoneità</span>' : '<span class="chip amber">da sostenere</span>';
              return '<div class="agenda-item" data-action="open-item" data-kind="exam" data-id="' + e.id + '" style="--c:var(--primary)"><span class="bar"></span><div><div class="t">' + esc(e.name) + '</div><div class="s">' + (e.date ? esc(U.fmt(e.date)) + ' · ' : '') + chip + '</div></div></div>';
            }).join('') : '<p class="muted small">Nessun esame registrato.</p>') + '</section>' +
        '</div>' +
      '</div>';
  }

  /* ───────── Sessioni di studio ───────── */
  function sessionRow(s) {
    var sub = S.get('subjects', s.subjectId);
    var topics = (s.topicIds ? s.topicIds.split(',') : []).map(function (id) { return S.get('topics', id); }).filter(Boolean);
    return '<div class="session' + (s.done ? ' isdone' : '') + '">' +
      '<button class="check' + (s.done ? ' on' : '') + '" data-action="session-toggle" data-id="' + s.id + '" aria-label="Segna come svolta">' + ico('check') + '</button>' +
      '<div class="time">' + esc(s.start || '—') + '<small>' + (s.end ? '→ ' + esc(s.end) : '') + '</small></div>' +
      '<div class="body" data-action="session-edit" data-id="' + s.id + '">' +
        (sub ? '<span class="chip" style="--c:' + sub.color + '"><span class="sw"></span>' + esc(sub.name) + '</span>' : '') +
        '<div class="goal" style="margin-top:4px">' + esc(s.goal || 'Sessione di studio') + '</div>' +
        (topics.length ? '<div class="topic-chips">' + topics.map(function (t) { return '<span class="chip">' + esc(t.title) + '</span>'; }).join('') + '</div>' : '') +
        (s.notes ? '<div class="small muted" style="margin-top:4px">📝 ' + esc(s.notes) + '</div>' : '') +
      '</div></div>';
  }

  function dayLabel(d) {
    var diff = U.diffDays(U.today(), d);
    if (diff === 0) return 'Oggi · ' + U.fmt(d);
    if (diff === 1) return 'Domani · ' + U.fmt(d);
    return U.fmtLong(d);
  }

  function sessionsTab() {
    var today = U.today();
    var all = S.list('sessions');
    function by(a, b) { return (a.date + (a.start || '99')).localeCompare(b.date + (b.start || '99')); }
    var late = all.filter(function (s) { return !s.done && s.date < today; }).sort(by);
    var upcoming = all.filter(function (s) { return !s.done && s.date >= today; }).sort(by);
    var past = all.filter(function (s) { return s.done; }).sort(function (a, b) { return by(b, a); });

    var html = '<div class="row between"><p class="muted">Pianifica quando studi, cosa e per quanto tempo.</p>' +
      '<button class="btn primary" data-action="session-new">' + ico('plus') + 'Programma una sessione</button></div>';

    if (!all.length) {
      return html + '<div class="card empty"><span class="big">⏰</span><strong>Nessuna sessione programmata</strong>Scegli un giorno, una materia e gli argomenti da affrontare: avrai tutto in ordine nel calendario.</div>';
    }
    if (late.length) {
      html += '<section class="card"><div class="card-title"><h3 style="color:var(--danger)">Da recuperare</h3></div>' + late.map(function (s) {
        return '<div class="small muted" style="margin-top:6px">' + esc(U.fmt(s.date)) + ' · ' + esc(U.rel(s.date)) + '</div>' + sessionRow(s);
      }).join('') + '</section>';
    }
    var days = [];
    upcoming.forEach(function (s) { if (days.indexOf(s.date) < 0) days.push(s.date); });
    if (days.length) {
      html += '<section class="card">' + days.map(function (d, i) {
        return '<div class="group-title" style="' + (i ? '' : 'margin-top:0') + '"><span>' + esc(dayLabel(d)) + '</span></div>' +
          upcoming.filter(function (s) { return s.date === d; }).map(sessionRow).join('');
      }).join('') + '</section>';
    } else if (!late.length) {
      html += '<div class="card empty"><span class="big">🎯</span><strong>Niente in programma</strong>Hai svolto tutte le sessioni. Vuoi programmarne un\'altra?</div>';
    }
    if (past.length) {
      html += '<div><button class="btn ghost sm" data-action="sessions-toggle-past">' + (ui.showPast ? 'Nascondi' : 'Mostra') + ' le sessioni svolte (' + past.length + ')</button></div>';
      if (ui.showPast) html += '<section class="card">' + past.slice(0, 30).map(function (s) {
        return '<div class="small muted" style="margin-top:6px">' + esc(U.fmt(s.date)) + '</div>' + sessionRow(s);
      }).join('') + '</section>';
    }
    return html;
  }

  /* ───────── Render ───────── */
  function render() {
    var head = '<div class="page-head"><div><h2>Materie e studio</h2><p>' + esc(ui.quote) + '</p></div>' +
      '<div class="seg" role="group" aria-label="Vista">' +
        '<button data-action="subtab" data-value="subjects" aria-pressed="' + (ui.tab === 'subjects') + '">Le mie materie</button>' +
        '<button data-action="subtab" data-value="sessions" aria-pressed="' + (ui.tab === 'sessions') + '">Sessioni di studio</button>' +
      '</div></div>';
    if (ui.tab === 'sessions') return head + sessionsTab();
    var sub = ui.subjectId ? S.get('subjects', ui.subjectId) : null;
    if (!sub) ui.subjectId = null;
    return head + (sub ? subjectDetail(sub) : subjectsGrid());
  }
  App.views.subjects = { render: render };

  /* ───────── Azioni ───────── */
  App.actions['subtab'] = function (el) { ui.tab = el.dataset.value; App.render(); };
  App.actions['subject-open'] = function (el) { ui.subjectId = el.dataset.id; App.render(); window.scrollTo(0, 0); };
  App.actions['subject-back'] = function () { ui.subjectId = null; App.render(); };
  App.actions['subject-new'] = function () { App.forms.subject(); };
  App.actions['subject-edit'] = function (el) { App.forms.subject(el.dataset.id); };
  App.actions['topic-edit'] = function (el) { App.forms.topic(el.dataset.id); };
  App.actions['topic-bulk'] = function (el) { App.forms.topicBulk(el.dataset.id); };
  App.actions['session-new'] = function () { App.forms.session(null); };
  App.actions['session-edit'] = function (el) { App.forms.session(el.dataset.id); };
  App.actions['sessions-toggle-past'] = function () { ui.showPast = !ui.showPast; App.render(); };
  App.actions['exam-new-for-subject'] = function (el) { App.forms.exam(null, { subjectId: el.dataset.id }); };

  App.actions['topic-cycle'] = function (el) {
    var t = S.get('topics', el.dataset.id);
    if (!t) return;
    var next = NEXT[t.status] || 'studying';
    S.upsert('topics', Object.assign({}, t, { status: next }));
    if (next === 'done') App.praise();
  };

  App.actions['session-toggle'] = function (el) {
    var s = S.get('sessions', el.dataset.id);
    if (!s) return;
    var nowDone = !s.done;
    S.batch(function () {
      S.upsert('sessions', Object.assign({}, s, { done: nowDone }));
      if (nowDone && s.topicIds) {
        var pending = s.topicIds.split(',').map(function (id) { return S.get('topics', id); })
          .filter(function (t) { return t && (t.status === 'todo' || t.status === 'studying'); });
        if (pending.length && window.confirm('Segno come "Studiato" ' + U.plural(pending.length, 'argomento', 'argomenti') + ' di questa sessione?')) {
          pending.forEach(function (t) { S.upsert('topics', Object.assign({}, t, { status: 'done' })); });
        }
      }
    });
    if (nowDone) App.praise();
  };

  App.submits['topic-quick'] = function (form) {
    var title = form.elements.title.value.trim();
    if (!title) return;
    App.ui.focusId = 'topic-title';
    S.upsert('topics', { subjectId: form.dataset.id, title: title, status: 'todo', notes: '' });
  };

  /* ───────── Form ───────── */
  App.forms.subject = function (id) {
    var sub = id ? S.get('subjects', id) : null;
    App.openForm({
      title: sub ? 'Modifica materia' : 'Nuova materia',
      values: sub || { name: '', cfu: '', professor: '', notes: '', color: App.SUBJECT_COLORS[S.list('subjects').length % App.SUBJECT_COLORS.length] },
      fields: [
        { name: 'name', label: 'Nome della materia', type: 'text', required: true },
        [{ name: 'cfu', label: 'CFU', type: 'number', min: 0, max: 60, step: 1 }, { name: 'professor', label: 'Docente', type: 'text' }],
        { name: 'color', label: 'Colore', type: 'colors' },
        { name: 'notes', label: 'Note (metodo d\'esame, libri, contatti…)', type: 'textarea' }
      ],
      validate: function (v) { return String(v.name).trim() ? '' : 'Scrivi il nome della materia.'; },
      onSubmit: function (v) {
        var row = S.upsert('subjects', Object.assign({}, sub || {}, { name: String(v.name).trim(), cfu: v.cfu, professor: v.professor, color: v.color, notes: v.notes }));
        if (!sub) { ui.subjectId = row.id; ui.tab = 'subjects'; App.render(); window.scrollTo(0, 0); }
      },
      onDelete: sub ? function () {
        S.batch(function () {
          S.list('topics').filter(function (t) { return t.subjectId === sub.id; }).forEach(function (t) { S.remove('topics', t.id); });
          S.list('sessions').filter(function (s) { return s.subjectId === sub.id; }).forEach(function (s) { S.remove('sessions', s.id); });
          S.list('exams').filter(function (e) { return e.subjectId === sub.id; }).forEach(function (e) { S.upsert('exams', Object.assign({}, e, { subjectId: '' })); });
          S.remove('subjects', sub.id);
        });
        ui.subjectId = null; App.render();
      } : null,
      deleteMessage: 'Eliminare la materia? Verranno eliminati anche i suoi argomenti e le sessioni di studio (gli esami restano).'
    });
  };

  App.forms.topic = function (id) {
    var t = S.get('topics', id);
    if (!t) return;
    App.openForm({
      title: 'Modifica argomento',
      values: t,
      fields: [
        { name: 'title', label: 'Argomento', type: 'text', required: true },
        { name: 'status', label: 'Stato', type: 'select', options: STATUS.map(function (s) { return { value: s.id, label: s.label }; }) },
        { name: 'notes', label: 'Note', type: 'textarea', placeholder: 'Cosa devi ricordare, dubbi da chiedere al docente…' }
      ],
      validate: function (v) { return String(v.title).trim() ? '' : 'Scrivi il nome dell\'argomento.'; },
      onSubmit: function (v) { S.upsert('topics', Object.assign({}, t, { title: String(v.title).trim(), status: v.status, notes: v.notes })); },
      onDelete: function () {
        S.batch(function () {
          S.remove('topics', t.id);
          S.list('sessions').forEach(function (s) {
            if (s.topicIds && s.topicIds.split(',').indexOf(t.id) >= 0) {
              S.upsert('sessions', Object.assign({}, s, { topicIds: s.topicIds.split(',').filter(function (x) { return x !== t.id; }).join(',') }));
            }
          });
        });
      },
      deleteMessage: 'Eliminare questo argomento?'
    });
  };

  App.forms.topicBulk = function (subjectId) {
    App.openForm({
      title: 'Aggiungi più argomenti',
      values: { lines: '' },
      submitLabel: 'Aggiungi',
      fields: [
        { type: 'note', html: 'Scrivi <b>un argomento per riga</b> (puoi incollare l\'indice del libro o del programma). Elenchi puntati e numeri a inizio riga vengono tolti da soli.' },
        { name: 'lines', label: 'Argomenti', type: 'textarea', rows: 9, required: true, placeholder: '1. Introduzione alla prevenzione\n2. Epidemiologia\n3. Screening oncologici' }
      ],
      validate: function (v) { return String(v.lines).trim() ? '' : 'Scrivi almeno un argomento.'; },
      onSubmit: function (v) {
        var lines = String(v.lines).split(/\r?\n/).map(function (l) { return l.replace(/^\s*(?:[-•*]|\d+[.)])\s*/, '').trim(); }).filter(Boolean);
        S.batch(function () {
          lines.forEach(function (l) { S.upsert('topics', { subjectId: subjectId, title: l, status: 'todo', notes: '' }); });
        });
        App.toast(U.plural(lines.length, 'argomento aggiunto', 'argomenti aggiunti') + ' ✓');
      }
    });
  };

  App.forms.session = function (id, defaults) {
    var subs = S.list('subjects');
    if (!subs.length) { App.toast('Aggiungi prima una materia 📚'); return; }
    var s = id ? S.get('sessions', id) : null;
    var firstSub = (ui.tab === 'subjects' && ui.subjectId && S.get('subjects', ui.subjectId)) ? ui.subjectId : subs[0].id;
    App.openForm({
      title: s ? 'Modifica sessione' : 'Programma una sessione di studio',
      values: s || Object.assign({ subjectId: firstSub, date: U.today(), start: '', end: '', goal: '', topicIds: '', notes: '' }, defaults || {}),
      fields: function (v) {
        var topics = App.subjectStats(v.subjectId).topics;
        return [
          { name: 'subjectId', label: 'Materia', type: 'select', reactive: true, options: subs.map(function (x) { return { value: x.id, label: x.name }; }) },
          { name: 'date', label: 'Giorno', type: 'date', required: true },
          [{ name: 'start', label: 'Dalle', type: 'time' }, { name: 'end', label: 'Alle', type: 'time' }],
          { name: 'goal', label: 'Obiettivo', type: 'text', placeholder: 'Es. Ripassare il cap. 3 e fare gli schemi' },
          { name: 'topicIds', label: 'Argomenti da studiare', type: 'multicheck', options: topics.map(function (t) { return { value: t.id, label: t.title + ' · ' + stLabel(t.status) }; }), empty: 'Questa materia non ha ancora argomenti: aggiungili dalla scheda della materia.' },
          { name: 'notes', label: 'Note', type: 'textarea', rows: 2 }
        ];
      },
      onChange: function (v, name) { if (name === 'subjectId') v.topicIds = ''; },
      validate: function (v) {
        if (!v.date) return 'Scegli il giorno.';
        if (v.start && v.end && v.end <= v.start) return 'L\'orario di fine deve essere dopo quello di inizio.';
        return '';
      },
      onSubmit: function (v) {
        S.upsert('sessions', Object.assign({}, s || { done: false }, { subjectId: v.subjectId, date: v.date, start: v.start, end: v.end, goal: v.goal, topicIds: v.topicIds, notes: v.notes }));
        App.toast(s ? 'Sessione aggiornata ✓' : 'Sessione programmata ✓');
      },
      onDelete: s ? function () { S.remove('sessions', s.id); } : null,
      deleteMessage: 'Eliminare questa sessione di studio?'
    });
  };
})();
