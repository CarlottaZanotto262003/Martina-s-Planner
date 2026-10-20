/* Sezione "Da fare": benvenuto, frase del giorno, to-do list e agenda di oggi. */
(function () {
  'use strict';
  var App = window.App, S = window.Store, U = App.util, ico = App.ico, esc = U.esc;

  var CATS = ['Università', 'Tirocinio', 'Tesi', 'Personale', 'Salute', 'Casa', 'Altro'];
  var PW = { alta: 0, media: 1, bassa: 2 };
  var ui = App.ui.home = { filter: 'all' };
  App.ui.heroQuote = App.ui.heroQuote || App.quote('general');

  function pw(t) { return t.priority in PW ? PW[t.priority] : 1; }
  function sorter(a, b) {
    return (a.due || '9999').localeCompare(b.due || '9999') || pw(a) - pw(b) || (a.createdAt || '').localeCompare(b.createdAt || '');
  }

  function dueChip(t) {
    if (!t.due) return '';
    var d = U.diffDays(U.today(), t.due), cls = '', txt;
    if (t.done) txt = U.fmt(t.due);
    else if (d < 0) { cls = 'danger'; txt = 'Scaduta · ' + U.rel(t.due); }
    else if (d === 0) { cls = 'accent'; txt = 'Oggi'; }
    else if (d === 1) { cls = 'amber'; txt = 'Domani'; }
    else txt = U.fmt(t.due) + ' · ' + U.rel(t.due);
    return '<span class="chip ' + cls + '">' + esc(txt) + '</span>';
  }

  function taskItem(t) {
    return '<li class="task' + (t.done ? ' done' : '') + '">' +
      '<button class="check" data-action="task-toggle" data-id="' + t.id + '" aria-label="' + (t.done ? 'Riapri' : 'Segna come fatta') + '">' + ico('check') + '</button>' +
      '<div class="task-main" data-action="task-edit" data-id="' + t.id + '">' +
        '<div class="task-title">' + esc(t.title) + '</div>' +
        '<div class="meta">' + dueChip(t) +
          (t.category ? '<span class="chip">' + esc(t.category) + '</span>' : '') +
          (t.priority === 'alta' && !t.done ? '<span class="chip accent"><span class="prio alta"></span>Priorità alta</span>' : '') +
          (t.notes ? '<span class="chip" title="' + esc(t.notes) + '">📝 nota</span>' : '') +
        '</div>' +
      '</div>' +
      '<button class="icon-btn" data-action="task-edit" data-id="' + t.id + '" aria-label="Modifica">' + ico('edit') + '</button>' +
    '</li>';
  }

  function group(title, list, cls, extra) {
    if (!list.length) return '';
    return '<div class="group-title ' + (cls || '') + '"><span>' + title + ' · ' + list.length + '</span>' + (extra || '') + '</div>' +
      '<ul class="task-list">' + list.map(taskItem).join('') + '</ul>';
  }

  function agendaItem(it, showDate) {
    return '<div class="agenda-item' + (it.done ? ' isdone' : '') + '" data-action="open-item" data-kind="' + it.kind + '" data-id="' + esc(it.id) + '" style="--c:' + it.color + '">' +
      '<span class="bar"></span><div><div class="t">' + esc(it.title) + '</div>' +
      '<div class="s">' + (it.time ? esc(it.time) + ' · ' : '') + esc(it.tag) + (showDate ? ' · ' + esc(U.fmt(it.date)) : '') + '</div></div></div>';
  }

  function render() {
    var today = U.today(), weekEnd = U.addDays(today, 7);
    var tasks = S.list('tasks');
    var open = tasks.filter(function (t) { return !t.done; });
    var done = tasks.filter(function (t) { return t.done; }).sort(function (a, b) { return (b.updatedAt || '').localeCompare(a.updatedAt || ''); });
    var overdue = open.filter(function (t) { return t.due && t.due < today; }).sort(sorter);
    var dToday = open.filter(function (t) { return t.due === today; }).sort(sorter);
    var week = open.filter(function (t) { return t.due > today && t.due <= weekEnd; }).sort(sorter);
    var later = open.filter(function (t) { return t.due > weekEnd; }).sort(sorter);
    var nodate = open.filter(function (t) { return !t.due; }).sort(sorter);
    var weekAgo = U.addDays(today, -7);
    var doneRecent = done.filter(function (t) { return (t.updatedAt || '').slice(0, 10) >= weekAgo; }).length;

    /* Elenco */
    var listHTML = '';
    if (ui.filter === 'all') {
      listHTML = group('Scadute', overdue, 'late') + group('Oggi', dToday) + group('Prossimi 7 giorni', week) +
        group('Più avanti', later) + group('Quando puoi', nodate) +
        group('Completate', done.slice(0, 5), '', done.length ? '<button class="btn ghost sm" data-action="tasks-clear-done">Svuota</button>' : '');
    } else if (ui.filter === 'today') {
      listHTML = group('Scadute', overdue, 'late') + group('Oggi', dToday);
    } else if (ui.filter === 'week') {
      listHTML = group('Scadute', overdue, 'late') + group('Oggi', dToday) + group('Prossimi 7 giorni', week);
    } else {
      listHTML = group('Completate', done, '', done.length ? '<button class="btn ghost sm" data-action="tasks-clear-done">Svuota</button>' : '');
    }
    if (!listHTML) {
      listHTML = '<div class="empty"><span class="big">🌿</span><strong>' +
        (tasks.length ? 'Tutto in ordine qui' : 'La tua lista è ancora vuota') + '</strong>' +
        (tasks.length ? 'Non c\'è niente in questa vista. Respira e goditi il momento.' : 'Scrivi qui sopra la prima cosa da fare: anche una piccola.') + '</div>';
    }

    /* Colonna di destra */
    var items = App.sortItems(App.collectItems().filter(function (i) { return i.kind !== 'task'; }));
    var todayItems = items.filter(function (i) { return i.date === today; });
    var soon = items.filter(function (i) { return i.date > today && i.date <= weekEnd; }).slice(0, 6);
    var exams = S.list('exams').filter(function (e) { return e.status === 'planned' && e.date && e.date >= today; })
      .sort(function (a, b) { return a.date.localeCompare(b.date); });
    var nextExam = exams[0];

    var examCard = nextExam
      ? '<div class="countdown"><span class="n">' + U.diffDays(today, nextExam.date) + '</span><span class="muted">giorni all\'esame</span></div>' +
        '<p style="margin-top:6px;font-weight:500">' + esc(nextExam.name) + '</p><p class="small muted">' + esc(U.fmtLong(nextExam.date)) + '</p>'
      : '<p class="muted small">Nessun esame in programma.</p><button class="btn sm" style="margin-top:8px" data-action="home-new-exam">' + ico('plus') + 'Aggiungi esame</button>';

    var summary;
    var todayCount = overdue.length + dToday.length;
    if (!tasks.length) summary = 'Inizia scrivendo la prima cosa da fare qui sotto.';
    else if (!todayCount) summary = 'Niente in scadenza oggi: una giornata leggera 🌿';
    else summary = 'Per oggi hai ' + U.plural(todayCount, 'cosa', 'cose') + ' da fare' + (overdue.length ? ' (di cui ' + overdue.length + ' in ritardo)' : '') + '.';

    var catOpts = CATS.map(function (c) { return '<option>' + c + '</option>'; }).join('');
    function fb(id, label) { return '<button class="filter" data-action="home-filter" data-value="' + id + '" aria-pressed="' + (ui.filter === id) + '">' + label + '</button>'; }

    return '' +
      '<section class="hero"><small>' + esc(U.fmtLong(today)) + '</small>' +
        '<h2>' + esc(App.greeting()) + ', ' + esc(App.name()) + ' 👋</h2>' +
        '<blockquote>' + esc(App.ui.heroQuote) + '</blockquote>' +
        '<div class="hero-actions"><button class="btn sm" data-action="home-quote">' + ico('refresh') + 'Un\'altra frase</button></div>' +
      '</section>' +

      '<section class="stats">' +
        '<div class="stat hl"><div class="n">' + todayCount + '</div><div class="l">da fare oggi</div></div>' +
        '<div class="stat"><div class="n">' + open.length + '</div><div class="l">attività aperte</div></div>' +
        '<div class="stat"><div class="n">' + doneRecent + '</div><div class="l">fatte negli ultimi 7 giorni</div></div>' +
      '</section>' +

      '<div class="cols">' +
        '<div class="stack">' +
          '<div class="card">' +
            '<p class="muted small" style="margin-bottom:10px">' + esc(summary) + '</p>' +
            '<form class="quick-add" data-submit="task-quick" autocomplete="off">' +
              '<input type="text" id="quick-title" name="title" placeholder="Aggiungi una cosa da fare…" maxlength="200" required>' +
              '<div class="line">' +
                '<input type="date" name="due" aria-label="Scadenza">' +
                '<select name="priority" aria-label="Priorità"><option value="media">Priorità media</option><option value="alta">Priorità alta</option><option value="bassa">Priorità bassa</option></select>' +
                '<select name="category" aria-label="Categoria">' + catOpts + '</select>' +
                '<button class="btn primary" type="submit">' + ico('plus') + 'Aggiungi</button>' +
              '</div>' +
            '</form>' +
          '</div>' +
          '<div class="card">' +
            '<div class="filters" style="margin-bottom:14px">' + fb('all', 'Tutte') + fb('today', 'Oggi') + fb('week', 'Settimana') + fb('done', 'Completate') + '</div>' +
            listHTML +
          '</div>' +
        '</div>' +

        '<div class="stack">' +
          '<div class="card"><div class="card-title"><h3>Prossimo esame</h3></div>' + examCard + '</div>' +
          '<div class="card"><div class="card-title"><h3>Oggi in programma</h3></div>' +
            (todayItems.length ? todayItems.map(function (i) { return agendaItem(i, false); }).join('')
              : '<p class="muted small">Nessuna sessione o impegno oggi.</p><button class="btn sm" style="margin-top:8px" data-action="home-new-session">' + ico('plus') + 'Programma una sessione</button>') +
          '</div>' +
          (soon.length ? '<div class="card"><div class="card-title"><h3>In arrivo</h3></div>' + soon.map(function (i) { return agendaItem(i, true); }).join('') + '</div>' : '') +
          '<div class="mini-quote"><span class="e">🌱</span><span>' + esc(App.quote('materie')) + '</span></div>' +
        '</div>' +
      '</div>';
  }

  App.views.home = { render: render };

  /* ───────── Azioni ───────── */
  App.actions['home-filter'] = function (el) { ui.filter = el.dataset.value; App.render(); };
  App.actions['home-quote'] = function () { App.ui.heroQuote = App.quote('general'); App.render(); };
  App.actions['home-new-exam'] = function () { App.forms.exam(); };
  App.actions['home-new-session'] = function () { App.go('subjects'); App.ui.subjects.tab = 'sessions'; App.render(); App.forms.session(null, { date: U.today() }); };

  App.actions['task-toggle'] = function (el) {
    var t = S.get('tasks', el.dataset.id);
    if (!t) return;
    S.upsert('tasks', Object.assign({}, t, { done: !t.done }));
    if (!t.done) {
      var today = U.today();
      var left = S.list('tasks').filter(function (x) { return !x.done && x.due && x.due <= today; }).length;
      if (t.due && t.due <= today && left === 0) App.toast('Hai finito tutto per oggi! Meriti una pausa 🎉');
      else App.praise();
    }
  };
  App.actions['task-edit'] = function (el) { App.forms.task(el.dataset.id); };
  App.actions['tasks-clear-done'] = function () {
    var done = S.list('tasks').filter(function (t) { return t.done; });
    if (!done.length || !window.confirm('Eliminare le ' + done.length + ' attività completate?')) return;
    S.batch(function () { done.forEach(function (t) { S.remove('tasks', t.id); }); });
  };

  App.submits['task-quick'] = function (form) {
    var title = form.elements.title.value.trim();
    if (!title) return;
    App.ui.focusId = 'quick-title';
    S.upsert('tasks', {
      title: title, due: form.elements.due.value, priority: form.elements.priority.value,
      category: form.elements.category.value, done: false, notes: ''
    });
  };

  /* ───────── Form attività ───────── */
  App.forms.task = function (id, defaults) {
    var t = id ? S.get('tasks', id) : null;
    var cats = CATS.slice();
    if (t && t.category && cats.indexOf(t.category) < 0) cats.push(t.category);
    App.openForm({
      title: t ? 'Modifica attività' : 'Nuova attività',
      values: t || Object.assign({ priority: 'media', category: 'Università', due: '' }, defaults || {}),
      fields: [
        { name: 'title', label: 'Cosa devi fare?', type: 'text', required: true },
        [
          { name: 'due', label: 'Scadenza', type: 'date' },
          { name: 'priority', label: 'Priorità', type: 'select', options: [{ value: 'alta', label: 'Alta' }, { value: 'media', label: 'Media' }, { value: 'bassa', label: 'Bassa' }] }
        ],
        { name: 'category', label: 'Categoria', type: 'select', options: cats.map(function (c) { return { value: c, label: c }; }) },
        { name: 'notes', label: 'Note', type: 'textarea' }
      ],
      validate: function (v) { return String(v.title).trim() ? '' : 'Scrivi cosa devi fare.'; },
      onSubmit: function (v) {
        S.upsert('tasks', Object.assign({}, t || { done: false }, { title: String(v.title).trim(), due: v.due, priority: v.priority, category: v.category, notes: v.notes }));
      },
      onDelete: t ? function () { S.remove('tasks', t.id); } : null,
      deleteMessage: 'Eliminare questa attività?'
    });
  };
})();
