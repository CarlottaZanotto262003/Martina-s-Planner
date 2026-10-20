/* Sezione "Calendario": vista mensile con eventi, esami, sessioni di studio, scadenze e tesi. */
(function () {
  'use strict';
  var App = window.App, S = window.Store, U = App.util, ico = App.ico, esc = U.esc;

  var now = new Date();
  var ui = App.ui.calendar = { year: now.getFullYear(), month: now.getMonth(), sel: U.today() };

  function itemsByDate() {
    var map = {};
    App.collectItems().forEach(function (it) { (map[it.date] = map[it.date] || []).push(it); });
    Object.keys(map).forEach(function (d) { App.sortItems(map[d]); });
    return map;
  }

  function render() {
    var map = itemsByDate();
    var today = U.today();
    var first = new Date(ui.year, ui.month, 1);
    var offset = (first.getDay() + 6) % 7;             // settimana che parte dal lunedì
    var start = new Date(ui.year, ui.month, 1 - offset);
    var title = first.toLocaleDateString('it-IT', { month: 'long', year: 'numeric' });

    var cells = '';
    for (var i = 0; i < 42; i++) {
      var d = new Date(start.getFullYear(), start.getMonth(), start.getDate() + i);
      if (i >= 35 && d.getMonth() !== ui.month) break;     // niente sesta riga se è tutta del mese dopo
      var iso = U.iso(d), its = map[iso] || [];
      var cls = 'cal-cell' + (d.getMonth() !== ui.month ? ' out' : '') + (iso === today ? ' today' : '') + (iso === ui.sel ? ' sel' : '');
      var dots = its.slice(0, 4).map(function (x) { return '<i style="--c:' + x.color + '"></i>'; }).join('');
      var labs = its.slice(0, 2).map(function (x) { return '<span class="cal-lab" style="--c:' + x.color + '">' + esc(x.title) + '</span>'; }).join('') +
        (its.length > 2 ? '<span class="cal-more">+' + (its.length - 2) + ' altri</span>' : '');
      cells += '<button class="' + cls + '" data-action="cal-select" data-date="' + iso + '" aria-label="' + esc(U.fmtLong(iso)) + (its.length ? ', ' + U.plural(its.length, 'impegno', 'impegni') : '') + '">' +
        '<span class="num">' + d.getDate() + '</span><div class="cal-dots">' + dots + '</div><div class="cal-labels">' + labs + '</div></button>';
    }

    var dow = ['Lun', 'Mar', 'Mer', 'Gio', 'Ven', 'Sab', 'Dom'].map(function (x) { return '<div class="cal-dow">' + x + '</div>'; }).join('');

    var sel = map[ui.sel] || [];
    var detail = '<div class="card-title"><h3 style="text-transform:capitalize">' + esc(U.fmtLong(ui.sel)) + '</h3>' +
      '<button class="btn sm primary" data-action="cal-new" data-date="' + ui.sel + '">' + ico('plus') + 'Aggiungi</button></div>' +
      (sel.length ? sel.map(function (it) {
        return '<div class="agenda-item' + (it.done ? ' isdone' : '') + '" data-action="open-item" data-kind="' + it.kind + '" data-id="' + esc(it.id) + '" style="--c:' + it.color + '"><span class="bar"></span><div>' +
          '<div class="t">' + esc(it.title) + '</div><div class="s">' + (it.time ? esc(it.time) + ' · ' : '') + esc(it.tag) + '</div></div></div>';
      }).join('') : '<p class="muted small">Niente in programma in questo giorno.</p>');

    var legend = Object.keys(App.EVENT_TYPES).map(function (k) {
      var t = App.EVENT_TYPES[k];
      return '<span><i style="--c:' + t.color + '"></i>' + esc(t.label) + '</span>';
    }).join('') + '<span><i style="--c:#6f8782"></i>Da fare</span>';

    // Prossimi impegni (30 giorni)
    var limit = U.addDays(today, 30), upcoming = [];
    Object.keys(map).sort().forEach(function (d) {
      if (d >= today && d <= limit) map[d].forEach(function (it) { upcoming.push(it); });
    });

    return '<div class="page-head"><div><h2>Calendario</h2><p>Scadenze, esami, appuntamenti: tutto in un colpo d\'occhio.</p></div>' +
      '<button class="btn primary" data-action="cal-new" data-date="' + ui.sel + '">' + ico('plus') + 'Nuovo evento</button></div>' +
      '<div class="cols">' +
        '<section class="card">' +
          '<div class="cal-head"><button class="icon-btn bordered" data-action="cal-prev" aria-label="Mese precedente">' + ico('left') + '</button>' +
            '<h3>' + esc(title) + '</h3>' +
            '<div class="row" style="gap:6px"><button class="btn sm" data-action="cal-today">Oggi</button>' +
            '<button class="icon-btn bordered" data-action="cal-next" aria-label="Mese successivo">' + ico('right') + '</button></div></div>' +
          '<div class="cal-grid">' + dow + cells + '</div>' +
          '<div class="cal-legend">' + legend + '</div>' +
        '</section>' +
        '<div class="stack">' +
          '<section class="card">' + detail + '</section>' +
          '<section class="card"><div class="card-title"><h3>Nei prossimi 30 giorni</h3></div>' +
            (upcoming.length ? upcoming.slice(0, 10).map(function (it) {
              return '<div class="agenda-item" data-action="open-item" data-kind="' + it.kind + '" data-id="' + esc(it.id) + '" style="--c:' + it.color + '"><span class="bar"></span><div>' +
                '<div class="t">' + esc(it.title) + '</div><div class="s">' + esc(U.fmt(it.date)) + (it.time ? ' · ' + esc(it.time) : '') + ' · ' + esc(it.tag) + '</div></div></div>';
            }).join('') : '<p class="muted small">Nessun impegno nei prossimi 30 giorni.</p>') +
          '</section>' +
        '</div>' +
      '</div>';
  }
  App.views.calendar = { render: render };

  /* ───────── Azioni ───────── */
  function shift(n) {
    var d = new Date(ui.year, ui.month + n, 1);
    ui.year = d.getFullYear(); ui.month = d.getMonth();
    App.render();
  }
  App.actions['cal-prev'] = function () { shift(-1); };
  App.actions['cal-next'] = function () { shift(1); };
  App.actions['cal-today'] = function () {
    var n = new Date();
    ui.year = n.getFullYear(); ui.month = n.getMonth(); ui.sel = U.today();
    App.render();
  };
  App.actions['cal-select'] = function (el) {
    ui.sel = el.dataset.date;
    var d = U.parse(ui.sel);
    ui.year = d.getFullYear(); ui.month = d.getMonth();
    App.render();
  };
  App.actions['cal-new'] = function (el) { App.forms.event(null, { date: el.dataset.date || ui.sel }); };

  /* ───────── Form evento ───────── */
  App.forms.event = function (id, defaults) {
    var e = id ? S.get('events', id) : null;
    App.openForm({
      title: e ? 'Modifica evento' : 'Nuovo evento',
      values: e || Object.assign({ title: '', date: ui.sel || U.today(), time: '', type: 'appuntamento', notes: '' }, defaults || {}),
      fields: [
        { name: 'title', label: 'Titolo', type: 'text', required: true, placeholder: 'Es. Consegna relazione tirocinio' },
        [{ name: 'date', label: 'Giorno', type: 'date', required: true }, { name: 'time', label: 'Ora (facoltativa)', type: 'time' }],
        { name: 'type', label: 'Tipo', type: 'select', options: Object.keys(App.EVENT_TYPES).map(function (k) { return { value: k, label: App.EVENT_TYPES[k].label }; }) },
        { name: 'notes', label: 'Note e informazioni', type: 'textarea', rows: 4, placeholder: 'Aula, link, documenti da portare…' }
      ],
      validate: function (v) {
        if (!String(v.title).trim()) return 'Scrivi un titolo.';
        if (!v.date) return 'Scegli il giorno.';
        return '';
      },
      onSubmit: function (v) {
        S.upsert('events', Object.assign({}, e || {}, { title: String(v.title).trim(), date: v.date, time: v.time, type: v.type, notes: v.notes }));
        ui.sel = v.date;
        var d = U.parse(v.date); ui.year = d.getFullYear(); ui.month = d.getMonth();
        App.render();
      },
      onDelete: e ? function () { S.remove('events', e.id); } : null,
      deleteMessage: 'Eliminare questo evento?'
    });
  };
})();
