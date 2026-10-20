/* Sezione "Voti": esami, medie, CFU, grafico e stima del voto di laurea. */
(function () {
  'use strict';
  var App = window.App, S = window.Store, U = App.util, ico = App.ico, esc = U.esc;

  var ui = App.ui.exams = { filter: 'all', quote: App.quote('esami') };

  function gv(e) { return e.lode ? 30 : Number(e.grade); }                    // la lode vale 30 nella media
  function wt(e) { return Number(e.cfu) > 0 ? Number(e.cfu) : 1; }           // peso = CFU (se manca, 1)

  function computeStats() {
    var all = S.list('exams');
    var graded = all.filter(function (e) { return e.status === 'passed' && e.grade !== ''; });
    var avg = null, wavg = null;
    if (graded.length) {
      avg = graded.reduce(function (a, e) { return a + gv(e); }, 0) / graded.length;
      var sw = 0, sc = 0;
      graded.forEach(function (e) { sw += gv(e) * wt(e); sc += wt(e); });
      wavg = sw / sc;
    }
    var cfu = all.filter(function (e) { return e.status === 'passed' || e.status === 'idoneita'; })
      .reduce(function (a, e) { return a + (Number(e.cfu) || 0); }, 0);
    return {
      all: all, graded: graded, avg: avg, wavg: wavg, cfu: cfu,
      base: wavg != null ? wavg * 110 / 30 : null,
      passed: all.filter(function (e) { return e.status === 'passed' || e.status === 'idoneita'; }).length
    };
  }

  function chart(list) {
    var n = list.length;
    var W = Math.max(340, 58 * n + 60), H = 250, pl = 34, pr = 10, pt = 18, pb = 64;
    var iw = W - pl - pr, ih = H - pt - pb, bw = Math.min(34, iw / n * 0.62);
    function y(v) { return pt + ih - (v - 16) / 14 * ih; }
    var s = '<svg class="chart" viewBox="0 0 ' + W + ' ' + H + '" width="' + W + '" role="img" aria-label="Grafico dei voti">';
    [18, 21, 24, 27, 30].forEach(function (g) {
      s += '<line class="grid" x1="' + pl + '" x2="' + (W - pr) + '" y1="' + y(g) + '" y2="' + y(g) + '"/>' +
        '<text x="' + (pl - 6) + '" y="' + (y(g) + 4) + '" text-anchor="end">' + g + '</text>';
    });
    var sw = 0, sc = 0, pts = [];
    list.forEach(function (e, i) {
      var cx = pl + (i + 0.5) * iw / n, top = y(gv(e)), base = y(16);
      s += '<rect class="bar' + (e.lode ? ' lode' : '') + '" x="' + (cx - bw / 2).toFixed(1) + '" y="' + top.toFixed(1) + '" width="' + bw.toFixed(1) + '" height="' + (base - top).toFixed(1) + '" rx="6"><title>' + esc(e.name) + ': ' + e.grade + (e.lode ? ' e lode' : '') + '</title></rect>' +
        '<text class="val" x="' + cx.toFixed(1) + '" y="' + (top - 6).toFixed(1) + '" text-anchor="middle">' + e.grade + (e.lode ? 'L' : '') + '</text>';
      var label = e.name.length > 11 ? e.name.slice(0, 10) + '…' : e.name;
      s += '<text x="' + cx.toFixed(1) + '" y="' + (base + 14).toFixed(1) + '" text-anchor="end" transform="rotate(-35 ' + cx.toFixed(1) + ' ' + (base + 14).toFixed(1) + ')">' + esc(label) + '</text>';
      sw += gv(e) * wt(e); sc += wt(e);
      pts.push([cx, y(sw / sc)]);
    });
    if (pts.length > 1) s += '<polyline class="avg" points="' + pts.map(function (p) { return p[0].toFixed(1) + ',' + p[1].toFixed(1); }).join(' ') + '"/>';
    pts.forEach(function (p) { s += '<circle class="avgdot" cx="' + p[0].toFixed(1) + '" cy="' + p[1].toFixed(1) + '" r="4"/>'; });
    return s + '</svg>';
  }

  function examRow(e) {
    var sub = S.get('subjects', e.subjectId);
    var badge;
    if (e.status === 'passed') badge = '<div class="grade' + (e.lode ? ' lode' : '') + '">' + (e.grade !== '' ? e.grade + (e.lode ? 'L' : '') : '✓') + '</div>';
    else if (e.status === 'idoneita') badge = '<div class="grade ido">Idoneo</div>';
    else if (e.date) {
      var d = U.diffDays(U.today(), e.date);
      badge = '<div class="grade plan">' + (d >= 0 ? d + '<br>giorni' : 'da<br>fare') + '</div>';
    } else badge = '<div class="grade plan">—</div>';
    return '<div class="exam" data-action="exam-edit" data-id="' + e.id + '">' + badge +
      '<div class="info"><div class="nm">' + esc(e.name) + '</div><div class="row" style="gap:6px;margin-top:3px">' +
        (e.date ? '<span class="chip' + (e.status === 'planned' ? ' accent' : '') + '">' + esc(U.fmt(e.date, { day: 'numeric', month: 'short', year: 'numeric' })) + '</span>' : '') +
        (e.cfu !== '' ? '<span class="chip">' + e.cfu + ' CFU</span>' : '') +
        (sub ? '<span class="chip" style="--c:' + sub.color + '"><span class="sw"></span>' + esc(sub.name) + '</span>' : '') +
      '</div></div><button class="icon-btn" aria-label="Modifica">' + ico('edit') + '</button></div>';
  }

  function render() {
    var st = computeStats();
    var totalCfu = Number(S.settings().totalCfu) || 180;
    var cfuPct = Math.min(100, Math.round(st.cfu / totalCfu * 100));
    var bonus = Number(S.settings().bonus) || 0;
    var today = U.today();

    var planned = st.all.filter(function (e) { return e.status === 'planned'; })
      .sort(function (a, b) { return (a.date || '9999').localeCompare(b.date || '9999'); });
    var done = st.all.filter(function (e) { return e.status !== 'planned'; })
      .sort(function (a, b) { return (b.date || '').localeCompare(a.date || ''); });
    var shown = ui.filter === 'planned' ? planned : ui.filter === 'passed' ? done : planned.concat(done);

    var chartList = st.graded.slice().sort(function (a, b) { return (a.date || '9999').localeCompare(b.date || '9999'); });

    function fb(id, label) { return '<button class="filter" data-action="exam-filter" data-value="' + id + '" aria-pressed="' + (ui.filter === id) + '">' + label + '</button>'; }

    var sim = '';
    if (st.base != null) {
      var pred = Math.min(110, st.base + bonus);
      sim = '<div class="card"><div class="card-title"><h3>Voto di laurea stimato</h3></div>' +
        '<div class="countdown"><span class="n" style="color:var(--primary)">' + U.nf(pred, 1) + '</span><span class="muted">/ 110</span></div>' +
        '<p class="small muted" style="margin:6px 0 10px">Base: media ponderata × 110 ÷ 30 = ' + U.nf(st.base, 1) + '. Aggiungi i punti extra previsti (tesi, durata del percorso, lodi…).</p>' +
        '<label class="field" style="margin:0"><span class="lab">Punti extra</span><input type="number" step="0.5" min="0" max="15" value="' + bonus + '" data-change="exam-bonus"></label>' +
        '<p class="small muted" style="margin-top:8px">È solo una stima: i criteri esatti sono nel regolamento del tuo corso di laurea.</p></div>';
    }

    var upcoming = planned.filter(function (e) { return e.date && e.date >= today; }).slice(0, 5);

    return '<div class="page-head"><div><h2>Esami e voti</h2><p>' + esc(ui.quote) + '</p></div>' +
      '<button class="btn primary" data-action="exam-new">' + ico('plus') + 'Aggiungi esame</button></div>' +

      '<section class="stats">' +
        '<div class="stat hl"><div class="n">' + (st.wavg != null ? U.nf(st.wavg) : '—') + '</div><div class="l">media ponderata</div></div>' +
        '<div class="stat"><div class="n">' + (st.avg != null ? U.nf(st.avg) : '—') + '</div><div class="l">media aritmetica</div></div>' +
        '<div class="stat"><div class="n">' + (st.base != null ? U.nf(st.base, 1) : '—') + '</div><div class="l">base di laurea (/110)</div></div>' +
        '<div class="stat"><div class="n">' + st.passed + '</div><div class="l">esami superati</div></div>' +
      '</section>' +

      '<section class="card"><div class="row between small"><b>Verso la laurea</b><span>' + st.cfu + ' / ' + totalCfu + ' CFU · ' + cfuPct + '%</span></div>' +
        '<div class="progress" style="margin-top:8px"><i style="width:' + cfuPct + '%"></i></div></section>' +

      '<div class="cols">' +
        '<div class="stack">' +
          '<section class="card"><div class="card-title"><h3>Andamento dei voti</h3></div>' +
            (chartList.length ? '<div class="chart-scroll">' + chart(chartList) + '</div>' +
              '<div class="legend"><span><i style="background:var(--primary)"></i>Voto</span><span><i style="background:var(--amber)"></i>30 e lode</span><span><i style="background:var(--accent)"></i>Media ponderata nel tempo</span></div>'
              : '<div class="empty"><span class="big">📈</span><strong>Il grafico comparirà con i primi voti</strong>Aggiungi un esame superato e inserisci il voto.</div>') +
          '</section>' +
          '<section class="card"><div class="card-title"><h3>I miei esami</h3></div>' +
            '<div class="filters" style="margin-bottom:6px">' + fb('all', 'Tutti') + fb('planned', 'Da sostenere') + fb('passed', 'Superati') + '</div>' +
            (shown.length ? shown.map(examRow).join('') : '<div class="empty"><span class="big">📝</span><strong>Nessun esame qui</strong>Aggiungi gli esami del tuo piano di studi, anche quelli futuri.</div>') +
          '</section>' +
        '</div>' +
        '<div class="stack">' + sim +
          '<div class="card"><div class="card-title"><h3>Prossimi esami</h3></div>' +
            (upcoming.length ? upcoming.map(function (e) {
              return '<div class="agenda-item" data-action="exam-edit" data-id="' + e.id + '" style="--c:var(--accent)"><span class="bar"></span><div><div class="t">' + esc(e.name) + '</div><div class="s">' + esc(U.fmt(e.date)) + ' · ' + esc(U.rel(e.date)) + '</div></div></div>';
            }).join('') : '<p class="muted small">Nessun esame in calendario.</p>') + '</div>' +
        '</div>' +
      '</div>';
  }
  App.views.exams = { render: render };

  /* ───────── Azioni ───────── */
  App.actions['exam-new'] = function () { App.forms.exam(); };
  App.actions['exam-edit'] = function (el) { App.forms.exam(el.dataset.id); };
  App.actions['exam-filter'] = function (el) { ui.filter = el.dataset.value; App.render(); };
  App.changes['exam-bonus'] = function (el) {
    var v = Number(el.value);
    S.saveSettings({ bonus: isNaN(v) ? 0 : Math.max(0, v) });
    App.render();
  };

  /* ───────── Form ───────── */
  App.forms.exam = function (id, defaults) {
    var e = id ? S.get('exams', id) : null;
    var subs = S.list('subjects');
    App.openForm({
      title: e ? 'Modifica esame' : 'Nuovo esame',
      values: e || Object.assign({ subjectId: '', name: '', cfu: '', date: '', grade: '', lode: false, status: 'planned', notes: '' }, defaults || {}),
      fields: function (v) {
        var f = [];
        if (subs.length) {
          f.push({ name: 'subjectId', label: 'Materia (facoltativo)', type: 'select', reactive: true,
            options: [{ value: '', label: '— nessuna —' }].concat(subs.map(function (s) { return { value: s.id, label: s.name }; })) });
        }
        f.push({ name: 'name', label: 'Nome dell\'esame', type: 'text', required: true });
        f.push([{ name: 'cfu', label: 'CFU', type: 'number', min: 0, max: 60, step: 1 }, { name: 'date', label: 'Data', type: 'date' }]);
        f.push({ name: 'status', label: 'Stato', type: 'select', reactive: true, options: [
          { value: 'planned', label: 'Da sostenere' }, { value: 'passed', label: 'Superato (con voto)' }, { value: 'idoneita', label: 'Idoneità (senza voto)' }] });
        if (v.status === 'passed') {
          f.push({ name: 'grade', label: 'Voto (18–30)', type: 'number', min: 18, max: 30, step: 1, required: true, reactive: true });
          if (Number(v.grade) === 30) f.push({ name: 'lode', label: '30 e lode 🌟', type: 'checkbox' });
        }
        f.push({ name: 'notes', label: 'Note', type: 'textarea', rows: 2 });
        return f;
      },
      onChange: function (v, name) {
        if (name === 'subjectId' && v.subjectId) {
          var sub = S.get('subjects', v.subjectId);
          if (sub) { if (!String(v.name).trim()) v.name = sub.name; if (v.cfu === '') v.cfu = sub.cfu; }
        }
        if (name === 'status' && v.status !== 'passed') { v.grade = ''; v.lode = false; }
        if (name === 'grade' && Number(v.grade) !== 30) v.lode = false;
      },
      validate: function (v) {
        if (!String(v.name).trim()) return 'Scrivi il nome dell\'esame.';
        if (v.status === 'passed' && (v.grade === '' || v.grade < 18 || v.grade > 30)) return 'Il voto deve essere tra 18 e 30.';
        return '';
      },
      onSubmit: function (v) {
        var passed = v.status === 'passed';
        var row = S.upsert('exams', Object.assign({}, e || {}, {
          subjectId: v.subjectId || '', name: String(v.name).trim(), cfu: v.cfu, date: v.date,
          status: v.status, grade: passed ? v.grade : '', lode: passed && Number(v.grade) === 30 && !!v.lode, notes: v.notes
        }));
        if (row.status === 'passed' && (!e || e.status !== 'passed')) {
          App.toast(row.grade >= 28 ? 'Che voto! Bravissima, ' + App.name() + ' 🎉' : 'Esame superato! Un altro tassello 💚');
        }
      },
      onDelete: e ? function () { S.remove('exams', e.id); } : null,
      deleteMessage: 'Eliminare questo esame?'
    });
  };
})();
