/**
 * Core dell'app: utilità, modali/form generici, router, intro, impostazioni.
 * Le sezioni (views-*.js) si registrano in App.views / App.actions / App.forms.
 */
(function () {
  'use strict';

  var S = window.Store;
  var App = window.App = { views: {}, actions: {}, changes: {}, submits: {}, forms: {}, ui: {} };

  /* ───────────────────────── Utilità ───────────────────────── */
  var U = App.util = {
    esc: function (s) {
      return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
        return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
      });
    },
    pad: function (n) { return String(n).padStart(2, '0'); },
    iso: function (d) { return d.getFullYear() + '-' + U.pad(d.getMonth() + 1) + '-' + U.pad(d.getDate()); },
    today: function () { return U.iso(new Date()); },
    parse: function (s) { var p = s.split('-').map(Number); return new Date(p[0], p[1] - 1, p[2]); },
    addDays: function (s, n) { var d = U.parse(s); d.setDate(d.getDate() + n); return U.iso(d); },
    diffDays: function (a, b) { return Math.round((U.parse(b) - U.parse(a)) / 86400000); },
    fmt: function (s, o) { return U.parse(s).toLocaleDateString('it-IT', o || { weekday: 'short', day: 'numeric', month: 'short' }); },
    fmtLong: function (s) { return U.parse(s).toLocaleDateString('it-IT', { weekday: 'long', day: 'numeric', month: 'long' }); },
    rel: function (s) {
      var d = U.diffDays(U.today(), s);
      if (d === 0) return 'oggi';
      if (d === 1) return 'domani';
      if (d === -1) return 'ieri';
      if (d > 1) return 'tra ' + d + ' giorni';
      return Math.abs(d) + ' giorni fa';
    },
    nf: function (n, d) {
      d = d == null ? 2 : d;
      return Number(n).toLocaleString('it-IT', { minimumFractionDigits: d, maximumFractionDigits: d });
    },
    pick: function (arr) { return arr[Math.floor(Math.random() * arr.length)]; },
    plural: function (n, one, many) { return n + ' ' + (n === 1 ? one : many); }
  };

  var ICONS = {
    plus: '<path d="M12 5v14M5 12h14"/>',
    edit: '<path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z"/>',
    trash: '<path d="M3 6h18"/><path d="M8 6V4h8v2"/><path d="M19 6l-1 14H6L5 6"/>',
    check: '<path d="M20 6 9 17l-5-5"/>',
    sliders: '<path d="M4 21v-7M4 10V3M12 21v-9M12 8V3M20 21v-5M20 12V3M1 14h6M9 8h6M17 16h6"/>',
    moon: '<path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8Z"/>',
    sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/>',
    left: '<path d="m15 18-6-6 6-6"/>',
    right: '<path d="m9 18 6-6-6-6"/>',
    refresh: '<path d="M21 12a9 9 0 0 1-15.5 6.2L3 16"/><path d="M3 21v-5h5"/><path d="M3 12A9 9 0 0 1 18.5 5.8L21 8"/><path d="M21 3v5h-5"/>',
    list: '<path d="M9 6h12M9 12h12M9 18h12"/><path d="m3 6 1.5 1.5L7 5M3 12l1.5 1.5L7 11M3 18l1.5 1.5L7 17"/>',
    book: '<path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20V3H6.5A2.5 2.5 0 0 0 4 5.5Z"/><path d="M4 19.5V21h16"/>',
    cap: '<path d="M22 10 12 5 2 10l10 5 10-5Z"/><path d="M6 12v5c3 2 9 2 12 0v-5"/>',
    award: '<circle cx="12" cy="8" r="6"/><path d="M8.2 13.5 7 22l5-3 5 3-1.2-8.5"/>',
    calendar: '<rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/>',
    pulse: '<path d="M3 12h4l2-6 4 12 2-6h6"/>',
    x: '<path d="M18 6 6 18M6 6l12 12"/>'
  };
  App.ico = function (name) { return '<svg class="i" viewBox="0 0 24 24" aria-hidden="true">' + ICONS[name] + '</svg>'; };

  App.EVENT_TYPES = {
    esame: { label: 'Esame', color: '#ee6c5a' },
    scadenza: { label: 'Scadenza', color: '#d4900f' },
    tesi: { label: 'Tesi', color: '#7c5cd6' },
    lezione: { label: 'Lezione / tirocinio', color: '#1a8fb0' },
    appuntamento: { label: 'Appuntamento', color: '#0f766e' },
    altro: { label: 'Altro', color: '#7b8a86' }
  };
  App.SUBJECT_COLORS = ['#0f766e', '#ee6c5a', '#6366f1', '#d4900f', '#1a8fb0', '#c2417c', '#65a30d', '#7c5cd6'];

  /* ───────────────────────── Frasi ───────────────────────── */
  App.name = function () { return S.settings().userName || 'Martina'; };
  App.quote = function (cat) {
    var pool = (window.QUOTES[cat] || []).concat(window.QUOTES.general);
    if (cat === 'general') pool = window.QUOTES.general;
    return U.pick(pool).replace('{name}', App.name());
  };
  App.toast = function (msg) {
    var box = document.getElementById('toasts');
    var t = document.createElement('div');
    t.className = 'toast';
    t.textContent = msg;
    box.appendChild(t);
    setTimeout(function () { t.style.transition = 'opacity .3s'; t.style.opacity = '0'; setTimeout(function () { t.remove(); }, 320); }, 2600);
  };
  App.praise = function () { App.toast(U.pick(window.PRAISE).replace('{name}', App.name())); };
  App.greeting = function () {
    var h = new Date().getHours();
    if (h < 5) return 'Ciao';
    if (h < 13) return 'Buongiorno';
    if (h < 18) return 'Buon pomeriggio';
    return 'Buonasera';
  };

  /* ───────────────────────── Agenda unificata ───────────────────────── */
  App.collectItems = function () {
    var items = [], T = App.EVENT_TYPES;
    S.list('events').forEach(function (e) {
      if (!e.date) return;
      var t = T[e.type] || T.altro;
      items.push({ kind: 'event', id: e.id, title: e.title, date: e.date, time: e.time, color: t.color, tag: t.label });
    });
    S.list('exams').forEach(function (e) {
      if (!e.date || e.status !== 'planned') return;
      items.push({ kind: 'exam', id: e.id, title: 'Esame: ' + e.name, date: e.date, time: '', color: T.esame.color, tag: 'Esame' });
    });
    S.list('tasks').forEach(function (t) {
      if (!t.due || t.done) return;
      items.push({ kind: 'task', id: t.id, title: t.title, date: t.due, time: '', color: '#6f8782', tag: 'Da fare' });
    });
    S.list('sessions').forEach(function (s) {
      if (!s.date) return;
      var sub = S.get('subjects', s.subjectId);
      items.push({ kind: 'session', id: s.id, title: (sub ? sub.name : 'Studio') + (s.goal ? ' · ' + s.goal : ''), date: s.date, time: s.start, color: sub ? sub.color : '#0f766e', tag: 'Sessione di studio', done: s.done });
    });
    S.list('thesisSteps').forEach(function (t) {
      if (!t.due || t.status === 'done') return;
      items.push({ kind: 'thesisStep', id: t.id, title: 'Tesi: ' + t.title, date: t.due, time: '', color: T.tesi.color, tag: 'Tesi' });
    });
    var m = S.get('thesisMeta', 'main');
    if (m && m.discussionDate) items.push({ kind: 'thesis', id: 'main', title: 'Discussione tesi 🎓', date: m.discussionDate, time: '', color: T.tesi.color, tag: 'Tesi' });
    return items;
  };
  App.sortItems = function (a) {
    return a.sort(function (x, y) {
      return (x.date + (x.time || '99:99')).localeCompare(y.date + (y.time || '99:99'));
    });
  };
  App.openItem = function (kind, id) {
    if (kind === 'event') App.forms.event(id);
    else if (kind === 'exam') App.forms.exam(id);
    else if (kind === 'task') App.forms.task(id);
    else if (kind === 'session') App.forms.session(id);
    else if (kind === 'thesisStep') App.forms.thesisStep(id);
    else if (kind === 'thesis') App.go('thesis');
  };
  App.actions['open-item'] = function (el) { App.openItem(el.dataset.kind, el.dataset.id); };

  /* ───────────────────────── Modali ───────────────────────── */
  var modalEl = null, modalKey = null;
  App.closeModal = function () {
    if (modalEl) { modalEl.remove(); modalEl = null; }
    if (modalKey) { document.removeEventListener('keydown', modalKey); modalKey = null; }
  };
  App.openModal = function (html, opts) {
    App.closeModal();
    opts = opts || {};
    var back = document.createElement('div');
    back.className = 'modal-backdrop';
    back.innerHTML = '<div class="modal' + (opts.wide ? ' wide' : '') + '" role="dialog" aria-modal="true">' + html + '</div>';
    back.addEventListener('mousedown', function (e) { if (e.target === back) App.closeModal(); });
    document.body.appendChild(back);
    modalEl = back;
    modalKey = function (e) { if (e.key === 'Escape') App.closeModal(); };
    document.addEventListener('keydown', modalKey);
    return back.firstChild;
  };
  App.actions['modal-close'] = function () { App.closeModal(); };

  function flat(list) {
    var out = [];
    list.forEach(function (f) { if (Array.isArray(f)) out = out.concat(f); else if (f) out.push(f); });
    return out;
  }

  /**
   * Form generico in modale.
   * cfg: { title, fields | fn(vals), values, submitLabel, onSubmit(vals), onDelete(), validate(vals), onChange(vals,name), extra }
   * campi: text, number, date, time, textarea, select{options}, checkbox, multicheck{options}, colors, note
   */
  App.openForm = function (cfg) {
    var vals = Object.assign({}, cfg.values || {});
    var modal = App.openModal('', { wide: cfg.wide });

    function fieldsOf() { return typeof cfg.fields === 'function' ? cfg.fields(vals) : cfg.fields; }

    function fieldHTML(f) {
      var v = vals[f.name]; if (v == null) v = '';
      var req = f.required ? ' required' : '';
      var react = f.reactive ? ' data-reactive="1"' : '';
      var lab = '<span class="lab">' + U.esc(f.label || '') + (f.required ? ' *' : '') + '</span>';
      var hint = f.hint ? '<div class="hint">' + U.esc(f.hint) + '</div>' : '';
      var i, o, h;
      switch (f.type) {
        case 'note':
          return '<div class="notice" style="margin-bottom:14px">' + f.html + '</div>';
        case 'textarea':
          return '<label class="field">' + lab + '<textarea name="' + f.name + '" rows="' + (f.rows || 3) + '" placeholder="' + U.esc(f.placeholder || '') + '"' + req + react + '>' + U.esc(v) + '</textarea>' + hint + '</label>';
        case 'select':
          h = '<label class="field">' + lab + '<select name="' + f.name + '"' + req + react + '>';
          for (i = 0; i < f.options.length; i++) {
            o = f.options[i];
            h += '<option value="' + U.esc(o.value) + '"' + (String(o.value) === String(v) ? ' selected' : '') + '>' + U.esc(o.label) + '</option>';
          }
          return h + '</select>' + hint + '</label>';
        case 'checkbox':
          return '<label class="field check-field"><input type="checkbox" name="' + f.name + '"' + (v ? ' checked' : '') + react + '><span>' + U.esc(f.label) + '</span></label>';
        case 'multicheck':
          var chosen = String(v).split(',');
          h = '<div class="field">' + lab + '<div class="multi">';
          for (i = 0; i < f.options.length; i++) {
            o = f.options[i];
            h += '<label><input type="checkbox" name="' + f.name + '" value="' + U.esc(o.value) + '"' + (chosen.indexOf(o.value) >= 0 ? ' checked' : '') + '><span>' + U.esc(o.label) + '</span></label>';
          }
          if (!f.options.length) h += '<span class="muted small">' + U.esc(f.empty || 'Nessuna opzione') + '</span>';
          return h + '</div>' + hint + '</div>';
        case 'colors':
          h = '<div class="field">' + lab + '<div class="swatches">';
          for (i = 0; i < App.SUBJECT_COLORS.length; i++) {
            var c = App.SUBJECT_COLORS[i];
            h += '<span><input type="radio" id="c' + i + '" name="' + f.name + '" value="' + c + '"' + (c === v ? ' checked' : '') + '><label for="c' + i + '" style="--c:' + c + '"></label></span>';
          }
          return h + '</div></div>';
        default:
          var attrs = '';
          ['min', 'max', 'step', 'placeholder', 'maxlength'].forEach(function (a) { if (f[a] != null) attrs += ' ' + a + '="' + U.esc(f[a]) + '"'; });
          return '<label class="field">' + lab + '<input type="' + (f.type || 'text') + '" name="' + f.name + '" value="' + U.esc(v) + '"' + attrs + req + react + '>' + hint + '</label>';
      }
    }

    function render() {
      var body = fieldsOf().filter(Boolean).map(function (f) {
        return Array.isArray(f) ? '<div class="two">' + f.filter(Boolean).map(fieldHTML).join('') + '</div>' : fieldHTML(f);
      }).join('');
      modal.innerHTML =
        '<div class="modal-head"><h3>' + U.esc(cfg.title) + '</h3><button type="button" class="icon-btn" data-modal-close aria-label="Chiudi">' + App.ico('x') + '</button></div>' +
        '<form>' + body + '<div class="notice err hidden" data-err style="margin-bottom:10px"></div>' +
        (cfg.extra || '') +
        '<div class="modal-foot">' +
        (cfg.onDelete ? '<button type="button" class="btn danger push" data-modal-delete>Elimina</button>' : '') +
        '<button type="button" class="btn" data-modal-close>Annulla</button>' +
        '<button type="submit" class="btn primary">' + U.esc(cfg.submitLabel || 'Salva') + '</button></div></form>';
    }

    function collect() {
      var form = modal.querySelector('form');
      var out = Object.assign({}, vals);
      flat(fieldsOf()).forEach(function (f) {
        if (f.type === 'note') return;
        if (f.type === 'checkbox') {
          var cb = form.elements[f.name]; if (cb) out[f.name] = cb.checked;
        } else if (f.type === 'multicheck') {
          out[f.name] = [].slice.call(form.querySelectorAll('input[name="' + f.name + '"]:checked')).map(function (i) { return i.value; }).join(',');
        } else if (f.type === 'colors') {
          var c = form.querySelector('input[name="' + f.name + '"]:checked'); out[f.name] = c ? c.value : (out[f.name] || '');
        } else {
          var el = form.elements[f.name];
          if (!el) return;
          out[f.name] = f.type === 'number' ? (el.value === '' ? '' : Number(el.value)) : el.value;
        }
      });
      return out;
    }

    modal.addEventListener('click', function (e) {
      if (e.target.closest('[data-modal-close]')) { App.closeModal(); return; }
      if (e.target.closest('[data-modal-delete]')) {
        if (window.confirm(cfg.deleteMessage || 'Vuoi davvero eliminarlo?')) { App.closeModal(); cfg.onDelete(); }
      }
    });
    modal.addEventListener('change', function (e) {
      if (!e.target.closest('[data-reactive]')) return;
      vals = collect();
      if (cfg.onChange) cfg.onChange(vals, e.target.name);
      var scroll = modal.scrollTop;
      render();
      modal.scrollTop = scroll;
    });
    modal.addEventListener('submit', function (e) {
      e.preventDefault();
      var v = collect();
      var err = cfg.validate ? cfg.validate(v) : '';
      if (err) {
        var box = modal.querySelector('[data-err]');
        box.textContent = err; box.classList.remove('hidden');
        return;
      }
      App.closeModal();
      cfg.onSubmit(v);
    });

    render();
    var first = modal.querySelector('input[type="text"], textarea');
    if (first && window.innerWidth > 720 && !first.value) first.focus();
    return modal;
  };

  /* ───────────────────────── Eventi globali ───────────────────────── */
  document.addEventListener('click', function (e) {
    var el = e.target.closest('[data-action]');
    if (!el) return;
    var fn = App.actions[el.dataset.action];
    if (fn) fn(el, e);
  });
  document.addEventListener('change', function (e) {
    var el = e.target.closest('[data-change]');
    if (!el) return;
    var fn = App.changes[el.dataset.change];
    if (fn) fn(el, e);
  });
  document.addEventListener('submit', function (e) {
    var f = e.target.closest('[data-submit]');
    if (!f) return;
    e.preventDefault();
    var fn = App.submits[f.dataset.submit];
    if (fn) fn(f, e);
  });

  /* ───────────────────────── Router e schermata ───────────────────────── */
  var ROUTES = [
    { id: 'home', label: 'Da fare', icon: 'list' },
    { id: 'subjects', label: 'Materie', icon: 'book' },
    { id: 'thesis', label: 'Tesi', icon: 'cap' },
    { id: 'exams', label: 'Voti', icon: 'award' },
    { id: 'calendar', label: 'Calendario', icon: 'calendar' }
  ];

  function currentRoute() {
    var h = location.hash.replace(/^#\/?/, '');
    return ROUTES.some(function (r) { return r.id === h; }) ? h : 'home';
  }
  App.go = function (id) {
    if (location.hash === '#/' + id) App.render(); else location.hash = '#/' + id;
  };

  App.render = function () {
    var id = currentRoute();
    var v = App.views[id];
    var el = document.getElementById('view');
    if (!v) return;
    el.innerHTML = v.render();
    if (v.after) v.after(el);
    if (App.ui.focusId) {
      var f = document.getElementById(App.ui.focusId);
      if (f) f.focus();
      App.ui.focusId = null;
    }
    [].forEach.call(document.querySelectorAll('.tab'), function (t) {
      if (t.dataset.route === id) t.setAttribute('aria-current', 'page'); else t.removeAttribute('aria-current');
    });
  };
  window.addEventListener('hashchange', function () { App.render(); window.scrollTo(0, 0); });

  function buildChrome() {
    document.getElementById('app').innerHTML =
      '<header class="topbar">' +
        '<button class="brand" data-action="show-intro" aria-label="Benvenuta">' +
          '<span class="brand-mark">' + App.ico('pulse') + '</span>' +
          '<span class="brand-name" id="brand-name"></span>' +
        '</button>' +
        '<span class="spacer"></span>' +
        '<button class="sync-pill" id="sync" data-action="sync-click"><span class="dot"></span><span class="txt"></span></button>' +
        '<button class="icon-btn bordered" id="theme-btn" data-action="toggle-theme" aria-label="Cambia tema"></button>' +
        '<button class="icon-btn bordered" data-action="open-settings" aria-label="Impostazioni">' + App.ico('sliders') + '</button>' +
      '</header>' +
      '<nav class="tabs" id="tabs" aria-label="Sezioni">' +
        ROUTES.map(function (r) { return '<a class="tab" href="#/' + r.id + '" data-route="' + r.id + '">' + App.ico(r.icon) + '<span>' + r.label + '</span></a>'; }).join('') +
      '</nav>' +
      '<main id="view" class="view" tabindex="-1"></main>';
    updateBrand();
  }
  function updateBrand() {
    var el = document.getElementById('brand-name');
    if (el) el.innerHTML = 'Il planner di ' + U.esc(App.name()) + '<span class="brand-sub">' + U.esc(S.settings().course || 'Università') + '</span>';
  }

  function updateSync() {
    var el = document.getElementById('sync');
    if (!el) return;
    var st = S.status();
    el.dataset.s = st.state;
    el.querySelector('.txt').textContent = S.statusLabel();
    el.title = st.message || (st.last ? 'Ultima sincronizzazione: ' + new Date(st.last).toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' }) : S.statusLabel());
  }
  App.actions['sync-click'] = function () {
    if (!S.configured()) { App.actions['open-settings'](); return; }
    S.sync();
    App.toast('Sincronizzo con il foglio…');
  };

  /* ───────────────────────── Tema ───────────────────────── */
  var mq = window.matchMedia ? window.matchMedia('(prefers-color-scheme: dark)') : null;
  function applyTheme() {
    var t = S.settings().theme || 'auto';
    if (t === 'auto') t = (mq && mq.matches) ? 'dark' : 'light';
    document.documentElement.dataset.theme = t;
    var meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.setAttribute('content', t === 'dark' ? '#0e1918' : '#0f766e');
    var b = document.getElementById('theme-btn');
    if (b) b.innerHTML = App.ico(t === 'dark' ? 'sun' : 'moon');
  }
  if (mq && mq.addEventListener) mq.addEventListener('change', applyTheme);
  App.actions['toggle-theme'] = function () {
    var cur = document.documentElement.dataset.theme;
    S.saveSettings({ theme: cur === 'dark' ? 'light' : 'dark' });
  };

  /* ───────────────────────── Intro di benvenuto ───────────────────────── */
  function showIntro() {
    if (document.getElementById('intro')) return;
    var el = document.createElement('div');
    el.className = 'intro';
    el.id = 'intro';
    el.innerHTML =
      '<div class="intro-card">' +
        '<svg class="ecg" viewBox="0 0 300 60" aria-hidden="true"><path pathLength="1" d="M0 32 H78 L92 32 L103 9 L119 54 L131 32 H168 L178 24 L188 32 H300"/></svg>' +
        '<p class="intro-kicker">' + U.esc(App.greeting()) + '</p>' +
        '<h1>Benvenuta,<br><em>' + U.esc(App.name()) + '</em> 💚</h1>' +
        '<p class="intro-sub">Il tuo spazio per organizzare studio, tesi ed esami' + (S.settings().course ? ' di ' + U.esc(S.settings().course) : '') + ' — con calma, un passo alla volta.</p>' +
        '<blockquote>' + U.esc(App.quote('general')) + '</blockquote>' +
        '<div><button class="btn primary big" data-action="intro-enter">Iniziamo ✨</button>' +
        '<p class="intro-date">' + U.esc(U.fmtLong(U.today())) + '</p></div>' +
      '</div>';
    document.body.appendChild(el);
    document.body.style.overflow = 'hidden';
    el.querySelector('button').focus();
  }
  App.actions['show-intro'] = showIntro;
  App.actions['intro-enter'] = function () {
    var el = document.getElementById('intro');
    if (!el) return;
    try { sessionStorage.setItem('martina.intro.seen', '1'); } catch (e) { /* niente */ }
    el.classList.add('leaving');
    document.body.style.overflow = '';
    setTimeout(function () { el.remove(); }, 520);
    App.ui.heroQuote = App.quote('general');
    App.render();
  };

  /* ───────────────────────── Impostazioni ───────────────────────── */
  function settingsMsg(kind, text) {
    var box = document.getElementById('settings-msg');
    if (box) box.innerHTML = text ? '<div class="notice ' + kind + '" style="margin-bottom:12px">' + U.esc(text) + '</div>' : '';
  }
  function formVals() {
    var f = document.getElementById('settings-form');
    return { apiUrl: f.elements.apiUrl.value.trim(), token: f.elements.token.value.trim() };
  }

  App.actions['open-settings'] = function () {
    var s = S.settings();
    var m = App.openModal(
      '<div class="modal-head"><h3>Impostazioni</h3><button type="button" class="icon-btn" data-action="modal-close" aria-label="Chiudi">' + App.ico('x') + '</button></div>' +
      '<form id="settings-form" data-submit="settings-save">' +
        '<div class="two">' +
          '<label class="field"><span class="lab">Nome</span><input type="text" name="userName" value="' + U.esc(s.userName) + '"></label>' +
          '<label class="field"><span class="lab">CFU totali per la laurea</span><input type="number" name="totalCfu" min="1" value="' + U.esc(s.totalCfu) + '"></label>' +
        '</div>' +
        '<label class="field"><span class="lab">Tema</span><select name="theme">' +
          [['auto', 'Automatico (come il telefono)'], ['light', 'Chiaro'], ['dark', 'Scuro']].map(function (o) { return '<option value="' + o[0] + '"' + (s.theme === o[0] ? ' selected' : '') + '>' + o[1] + '</option>'; }).join('') +
        '</select></label>' +
        '<hr class="sep">' +
        '<h4 style="margin-bottom:6px">Collegamento al Foglio Google</h4>' +
        '<p class="small muted" style="margin-bottom:12px">Incolla l\'URL dell\'app web di Apps Script (finisce con <b>/exec</b>) e la password che hai scelto nello script. Senza collegamento i dati restano solo su questo dispositivo.</p>' +
        '<label class="field"><span class="lab">URL dello script</span><input type="text" name="apiUrl" value="' + U.esc(s.apiUrl) + '" placeholder="https://script.google.com/macros/s/…/exec" autocomplete="off" autocapitalize="off" spellcheck="false"></label>' +
        '<label class="field"><span class="lab">Password</span><input type="password" name="token" value="' + U.esc(s.token) + '" autocomplete="off"></label>' +
        '<div id="settings-msg"></div>' +
        '<div class="row"><button type="button" class="btn sm" data-action="settings-test">Prova connessione</button>' +
        '<button type="button" class="btn sm" data-action="settings-link">Copia link di configurazione</button></div>' +
        '<hr class="sep">' +
        '<h4 style="margin-bottom:6px">Backup</h4>' +
        '<div class="row"><button type="button" class="btn sm" data-action="settings-export">Scarica backup</button>' +
        '<button type="button" class="btn sm" data-action="settings-import">Ripristina da file</button></div>' +
        '<input type="file" id="import-file" accept="application/json,.json" class="hidden" data-change="settings-import-file">' +
        '<div class="modal-foot"><button type="button" class="btn" data-action="modal-close">Chiudi</button><button type="submit" class="btn primary">Salva</button></div>' +
      '</form>', { wide: true });
    return m;
  };

  App.submits['settings-save'] = function (form) {
    var el = form.elements;
    S.saveSettings({
      userName: el.userName.value.trim() || 'Martina',
      totalCfu: Math.max(1, Number(el.totalCfu.value) || 180),
      theme: el.theme.value,
      apiUrl: el.apiUrl.value.trim(),
      token: el.token.value.trim()
    });
    App.closeModal();
    applyTheme(); updateBrand(); App.render();
    App.toast('Impostazioni salvate ✓');
  };

  App.actions['settings-test'] = function () {
    var v = formVals();
    if (!v.apiUrl || !v.token) { settingsMsg('err', 'Inserisci URL e password.'); return; }
    settingsMsg('', 'Provo a collegarmi…');
    S.testConnection(v.apiUrl, v.token).then(function (n) {
      settingsMsg('ok', 'Collegamento riuscito ✓ (' + n + ' elementi nel foglio)');
    }).catch(function (e) {
      settingsMsg('err', 'Non riesco a collegarmi: ' + e.message);
    });
  };

  App.actions['settings-link'] = function () {
    var v = formVals();
    if (!v.apiUrl || !v.token) { settingsMsg('err', 'Per creare il link inserisci prima URL e password.'); return; }
    var payload = { apiUrl: v.apiUrl, token: v.token, userName: document.getElementById('settings-form').elements.userName.value.trim() };
    var link = location.href.split('#')[0] + '#setup=' + btoa(unescape(encodeURIComponent(JSON.stringify(payload))));
    var done = function () { settingsMsg('ok', 'Link copiato! Contiene la password: mandalo solo alla persona che deve usare il planner. Aprendolo, il collegamento si configura da solo.'); };
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(link).then(done, function () { window.prompt('Copia questo link:', link); });
    } else { window.prompt('Copia questo link:', link); }
  };

  App.actions['settings-export'] = function () {
    var blob = new Blob([S.exportData()], { type: 'application/json' });
    var a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'planner-backup-' + U.today() + '.json';
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(function () { URL.revokeObjectURL(a.href); }, 2000);
  };
  App.actions['settings-import'] = function () { document.getElementById('import-file').click(); };
  App.changes['settings-import-file'] = function (input) {
    var file = input.files && input.files[0];
    if (!file) return;
    var r = new FileReader();
    r.onload = function () {
      if (!window.confirm('Sostituire TUTTI i dati attuali con quelli del file di backup?')) return;
      try { S.importData(String(r.result)); App.closeModal(); App.toast('Backup ripristinato ✓'); }
      catch (e) { settingsMsg('err', 'File non valido: ' + e.message); }
    };
    r.readAsText(file);
    input.value = '';
  };

  /* ───────────────────────── Link di configurazione ───────────────────────── */
  function consumeSetupLink() {
    var m = /^#setup=(.+)$/.exec(location.hash);
    if (!m) return false;
    try {
      var obj = JSON.parse(decodeURIComponent(escape(atob(m[1]))));
      S.saveSettings({ apiUrl: obj.apiUrl || '', token: obj.token || '', userName: obj.userName || S.settings().userName });
      history.replaceState(null, '', location.pathname + location.search + '#/home');
      App.ui.setupDone = true;
      return true;
    } catch (e) {
      history.replaceState(null, '', location.pathname + location.search + '#/home');
      return false;
    }
  }

  /* ───────────────────────── Avvio ───────────────────────── */
  function boot() {
    consumeSetupLink();
    buildChrome();
    applyTheme();
    S.subscribe(function (type) {
      if (type === 'status') updateSync();
      else if (type === 'data') App.render();
      else if (type === 'settings') { applyTheme(); updateBrand(); }
    });
    updateSync();
    App.render();
    S.start();

    var seen = false;
    try { seen = sessionStorage.getItem('martina.intro.seen') === '1'; } catch (e) { /* niente */ }
    if (!seen) showIntro();
    if (App.ui.setupDone) setTimeout(function () { App.toast('Foglio Google collegato ✓'); }, 800);

    if ('serviceWorker' in navigator && /^https?:$/.test(location.protocol)) {
      navigator.serviceWorker.register('sw.js').catch(function () { /* non essenziale */ });
    }
  }

  document.addEventListener('DOMContentLoaded', boot);
})();
