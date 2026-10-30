// NYS Science Test Practice: launcher, test shell, review and results.
// Everything runs in the browser. Progress is saved only in this browser.
(() => {
  const h = ITEMS.h;
  const app = document.getElementById('app');
  const ZOOMS = [0.8, 0.9, 1, 1.25, 1.5, 1.75, 2, 2.5, 3];
  const SPLITS = [30, 40, 50, 60, 70];
  const DEFAULT_SPLIT = 3;
  const ALL_TOOLS = ['calculator', 'ruler', 'protractor'];
  const esc = v => String(v).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

  // ---------- storage (per-viewer convenience only) ----------
  const store = {
    get(k) { try { return JSON.parse(localStorage.getItem('nysp:' + k)); } catch (e) { return null; } },
    set(k, v) { try { localStorage.setItem('nysp:' + k, JSON.stringify(v)); } catch (e) { } },
    del(k) { try { localStorage.removeItem('nysp:' + k); } catch (e) { } }
  };
  const freshState = () => ({ answers: {}, elim: {}, masked: {}, bookmarks: {}, notes: {}, idx: 0, scheme: 'white', zoom: 2, split: DEFAULT_SPLIT, submitted: false, selfScores: {}, accom: { masking: false, tts: false, zoom: 2 } });

  const cache = {};
  async function loadJSON(url) {
    if (cache[url]) return cache[url];
    const r = await fetch(url, { cache: 'no-cache' });
    if (!r.ok) throw new Error('Could not load ' + url);
    return (cache[url] = await r.json());
  }

  let T = null; // current test session

  // ---------- router ----------
  window.addEventListener('hashchange', route);
  route();
  function route() {
    cleanupTest();
    const m = location.hash.match(/^#\/(test|results|preview)\/([\w-]+)(?:\/(\d+))?(?:\/(key))?/);
    if (m && m[1] === 'test') startTest(m[2]);
    else if (m && m[1] === 'preview') startTest(m[2], { n: +m[3] || null, key: !!m[4] });
    else if (m && m[1] === 'results') showResults(m[2]);
    else showHome();
  }

  // ---------- home ----------
  async function showHome() {
    store.del('student'); // earlier versions saved a typed name; nothing stores one now
    document.title = 'NYS Science Test Practice';
    const grade = store.get('grade') || 5;
    app.innerHTML = '';
    const home = h('div', { class: 'home' });
    home.innerHTML = `
      <header class="home-hero"><div class="wrap">
        <h1>NYS Science Test Practice</h1>
        <p>Practice real questions from past New York State science tests on the same kind of screen you will see on test day. Use the tools at the bottom of the screen: highlighter, answer eliminator, notes, calculator, ruler, and more.</p>
      </div></header>
      <main class="home-main"><div class="wrap">
        <h2 class="step"><span>1</span> Choose your grade</h2>
        <div class="grade-tabs" role="group" aria-label="Choose your grade">
          <button type="button" data-g="5" aria-pressed="${grade === 5}">Grade 5</button>
          <button type="button" data-g="8" aria-pressed="${grade === 8}">Grade 8</button>
        </div>
        <h2 class="step"><span>2</span> Find the cluster your teacher gave you</h2>
        <label class="find"><span class="sr">Cluster name</span>
          <input id="find" type="search" autocomplete="off" spellcheck="false" placeholder="Type the cluster name, for example Meerkats">
        </label>
        <div class="cluster-list" id="grid" role="list"><p class="empty-note">Loading clusters...</p></div>
        <p class="home-foot">Your answers are saved only in this browser on this Chromebook. Nothing is sent anywhere. Every question on this site comes from a released New York State Elementary-Level or Intermediate-Level Science Test (New York State Education Department). The screen is modeled on the NYS computer-based test so students can practice with its tools. This site is not affiliated with NYSED, NWEA, or Questar.</p>
      </div></main>`;
    app.append(home);
    home.querySelectorAll('.grade-tabs button').forEach(b => b.addEventListener('click', () => { store.set('grade', +b.dataset.g); showHome(); }));
    const grid = home.querySelector('#grid');
    const find = home.querySelector('#find');
    const norm = t => t.toLowerCase().replace(/^the\s+/, '').replace(/[^a-z0-9 ]/g, '').trim();
    let list = [];
    const paint = () => {
      const q = norm(find.value);
      const shown = list.filter(c => !q || norm(c.title).includes(q) || c.title.toLowerCase().includes(find.value.trim().toLowerCase()));
      grid.innerHTML = '';
      if (!list.length) { grid.innerHTML = `<p class="empty-note">No Grade ${grade} clusters have been added yet.</p>`; return; }
      if (!shown.length) { grid.innerHTML = `<p class="empty-note">No Grade ${grade} cluster matches "${esc(find.value)}". Check the spelling, or make sure you picked the right grade.</p>`; return; }
      shown.forEach(c => {
        const st = store.get('state:' + c.id);
        const inProg = st && !st.submitted && Object.keys(st.answers || {}).length;
        const done = st && st.submitted;
        const row = h('div', { class: 'cluster-row', role: 'listitem' });
        row.innerHTML = `<div class="cr-name"><h3>${c.title}</h3>
          <div class="meta">${c.year ? `${c.year} NYS test` : ''}${c.numbers ? ` · Questions ${c.numbers}` : ''} · ${c.questions} questions</div></div>
          <div class="cr-actions"></div>`;
        const act = row.querySelector('.cr-actions');
        if (inProg) act.append(h('span', { class: 'progress-tag' }, 'In progress'));
        if (done) act.append(h('span', { class: 'progress-tag done' }, 'Submitted'));
        const go = h('button', { class: 'btn-primary', type: 'button', 'aria-label': (inProg ? 'Resume ' : 'Start ') + c.title }, inProg ? 'Resume' : 'Start');
        go.addEventListener('click', () => { location.hash = '#/test/' + c.id; });
        if (done) {
          const res = h('button', { class: 'btn-plain', type: 'button' }, 'See results');
          res.addEventListener('click', () => { location.hash = '#/results/' + c.id; });
          act.append(res);
        }
        if (inProg || done) {
          const again = h('button', { class: 'btn-plain', type: 'button' }, 'Start over');
          again.addEventListener('click', () => { if (confirm('Start "' + c.title + '" over? Your saved answers will be cleared.')) { store.del('state:' + c.id); location.hash = '#/test/' + c.id; } });
          act.append(again);
        }
        if (!done) act.append(go);
        grid.append(row);
      });
    };
    find.addEventListener('input', paint);
    find.addEventListener('keydown', e => {
      if (e.key !== 'Enter') return;
      const first = grid.querySelector('.btn-primary');
      if (first && grid.querySelectorAll('.cluster-row').length === 1) first.click();
    });
    try {
      const idx = await loadJSON('clusters/index.json');
      list = idx.clusters.filter(c => c.grade === grade).sort((a, b) => norm(a.title).localeCompare(norm(b.title)));
      paint();
      find.focus();
    } catch (e) {
      grid.innerHTML = `<p class="empty-note">The cluster list could not be loaded. Check your internet connection and refresh the page.</p>`;
    }
  }

  // ---------- modal helper ----------
  function modal(content, { onClose, closable = true, width } = {}) {
    const scrim = h('div', { class: 'scrim' });
    const m = h('div', { class: 'modal', role: 'dialog', 'aria-modal': 'true' });
    if (width) m.style.maxWidth = width + 'px';
    if (typeof content === 'string') m.innerHTML = content; else m.append(content);
    if (closable) {
      const x = h('button', { class: 'modal-x', type: 'button', 'aria-label': 'Close' }, ICON.close);
      x.addEventListener('click', () => { scrim.remove(); onClose && onClose(); });
      m.append(x);
    }
    scrim.append(m);
    document.body.append(scrim);
    const f = m.querySelector('button, input, select'); if (f) setTimeout(() => f.focus(), 20);
    return { scrim, m, close() { scrim.remove(); } };
  }

  // ---------- test ----------
  function cleanupTest() {
    if (!T) return;
    document.querySelectorAll('.panel, .measure, .line-reader, .tts-bar, .scrim, .dd-ghost').forEach(n => n.remove());
    if ('speechSynthesis' in window) speechSynthesis.cancel();
    window.removeEventListener('online', T.onNet); window.removeEventListener('offline', T.onNet);
    window.removeEventListener('keydown', T.onKey);
    T = null;
  }

  // preview: open straight to question n without saving anything (teacher
  // proofreading and automated screenshots). key: show the answer key filled in.
  async function startTest(id, preview) {
    app.innerHTML = '<div class="home"><div class="home-main"><div class="wrap"><p class="empty-note">Loading test...</p></div></div></div>';
    let cl;
    try { cl = await loadJSON(`clusters/${id}/cluster.json`); }
    catch (e) { app.innerHTML = '<div class="home"><div class="home-main"><div class="wrap"><p class="empty-note">This cluster could not be loaded.</p><p><a href="#/">Back to clusters</a></p></div></div></div>'; return; }
    let state = preview ? null : store.get('state:' + id);
    const resuming = state && !state.submitted && (Object.keys(state.answers).length || state.idx);
    if (!state || state.submitted) { state = freshState(); if (cl.split != null) state.split = Math.max(0, SPLITS.indexOf(cl.split)) ; }
    T = { cl, id, state, base: `clusters/${id}/`, pages: {}, mode: null, open: {}, preview: !!preview, name: `Grade ${cl.grade} | ${cl.subject || 'Science'} | ${cl.title}` };
    document.title = cl.title + ' | NYS Science Test Practice';
    if (preview) {
      if (preview.key) cl.items.forEach(it => { const k = keyResponse(it); if (k != null) state.answers[it.n] = k; });
      const i = preview.n ? cl.items.findIndex(it => it.n === preview.n) : 0;
      buildShell(); go(Math.max(0, i));
      document.body.dataset.ready = '1';
    }
    else if (resuming) { buildShell(); go(state.idx); }
    else accommodations();
  }

  function save() { if (T && !T.preview) store.set('state:' + T.id, T.state); }

  // The response a student would give if they matched the key exactly.
  function keyResponse(it) {
    if (it.type === 'multi') {
      const parts = {};
      it.parts.forEach((p, i) => { const r = keyResponse(p); if (r != null) { parts[i] = r; T.state.answers[it.n + '_' + i] = r; } });
      return Object.keys(parts).length ? { parts } : null;
    }
    if (it.type === 'table' && it.key) {
      const r = {};
      Object.entries(it.key).forEach(([id, v]) => { r[id] = v === true ? true : [].concat(v)[0]; });
      return r;
    }
    if (it.type === 'cr' && it.parts) {
      const parts = {};
      it.parts.forEach((p, i) => { if (p.exemplar) parts[i] = { html: p.exemplar, text: p.exemplar }; });
      return Object.keys(parts).length ? { parts, text: it.parts.map((p, i) => `${p.label} ${p.exemplar || ''}`).join('\n') } : null;
    }
    if (it.key == null) return it.type === 'cr' && it.exemplar ? { html: it.exemplar, text: it.exemplar } : null;
    if (it.type === 'mc' || it.type === 'ms') return Array.isArray(it.key) ? [...it.key] : it.key;
    if (it.type === 'dragdrop' || it.type === 'inline') {
      const r = {}, used = new Set();
      Object.entries(it.key).forEach(([z, v]) => {
        const opts = [].concat(v);
        const pick = opts.find(o => it.reuse || !used.has(o)) || opts[0];
        used.add(pick); r[z] = pick;
      });
      return r;
    }
    return null;
  }

  function accommodations() {
    const a = T.state.accom;
    const body = h('div');
    body.innerHTML = `<h2 style="font-size:28px">Select Accommodations</h2>
      <p>Choose the tools you use on test day. On the real test, your teacher sets these for you based on your IEP or 504 plan.</p>
      <div class="accom-list">
        <div class="accom"><div class="ico">${ICON.eyeOff}</div><div><label><input type="checkbox" id="acc-mask" ${a.masking ? 'checked' : ''}> Answer masking</label><p>Hide answer choices so you can focus on one at a time. Use the eye button next to a choice to hide or show it.</p></div></div>
        <div class="accom"><div class="ico">${ICON.speaker}</div><div><label><input type="checkbox" id="acc-tts" ${a.tts ? 'checked' : ''}> Text-to-speech</label><p>Have the question or passage read aloud. Headphones are recommended.</p></div></div>
        <div class="accom"><div class="ico">${ICON.zoomPlus}</div><div><label for="acc-zoom">Initial page zoom</label><p>Sets the starting size of the text. Default is 100%.</p>
          <select id="acc-zoom">${ZOOMS.map((z, i) => `<option value="${i}" ${i === a.zoom ? 'selected' : ''}>${Math.round(z * 100)}%</option>`).join('')}</select></div></div>
      </div>
      <div class="btn-row" style="justify-content:flex-end"><button type="button" id="acc-go">Continue</button></div>`;
    const md = modal(body, { closable: false, width: 680 });
    buildShell(true);
    body.querySelector('#acc-go').addEventListener('click', () => {
      a.masking = body.querySelector('#acc-mask').checked;
      a.tts = body.querySelector('#acc-tts').checked;
      a.zoom = +body.querySelector('#acc-zoom').value;
      T.state.zoom = a.zoom;
      md.close();
      buildShell();
      directions(true);
    });
  }

  function toolsFor() {
    const g = T.cl.grade;
    const list = T.cl.tools || ALL_TOOLS;
    return list;
  }

  function buildShell(blank) {
    app.innerHTML = '';
    const shell = h('div', { class: 'tds' });
    const extra = toolsFor();
    shell.innerHTML = `
      <div class="top-bar">
        <div class="status" id="net">${ICON.check}<div>Online<small>Practice</small></div></div>
        <div class="test-name">${T.name}</div>
        <div class="top-links"><button type="button" id="dir-link">Directions</button><button type="button" id="signout">II/ Sign out</button></div>
      </div>
      <div class="nav-bar">
        <button class="btn-review" type="button" id="review">Review</button>
        <h1 id="qtitle" aria-live="polite"></h1>
        <div class="nav-right">
          <button class="btn-nav" type="button" id="prev" aria-label="Go to previous">${ICON.left}</button>
          <button class="btn-nav" type="button" id="next" aria-label="Go to next">${ICON.right}</button>
        </div>
      </div>
      <div class="content" id="content" data-scheme="${T.state.scheme}">
        <div class="pane pane-left" id="left" tabindex="-1" aria-label="Passage"></div>
        <div class="divider" id="divider"></div>
        <div class="pane pane-right" id="right" tabindex="-1" aria-label="Question"></div>
        <div class="split-ctl" id="splitctl">
          <button type="button" id="split-l" aria-label="Move divider left">${ICON.left}</button>
          <button type="button" class="mid" id="split-r0" aria-label="Reset divider">${ICON.reset}</button>
          <button type="button" id="split-r" aria-label="Move divider right">${ICON.right}</button>
        </div>
      </div>
      <div class="tool-bar" role="toolbar" aria-label="Test tools">
        <div class="zoom-group"><div class="zoom-btns">
          <button type="button" id="zreset" aria-label="Reset zoom">${ICON.reset}</button>
          <button type="button" id="zout" aria-label="Zoom out">${ICON.minus}</button>
          <button type="button" id="zin" aria-label="Zoom in">${ICON.plus}</button>
        </div><span>zoom</span></div>
        <button class="tool" type="button" data-tool="bookmark" aria-pressed="false">${ICON.bookmark}<span>bookmark</span></button>
        <button class="tool" type="button" data-tool="note" aria-pressed="false">${ICON.note}<span>note</span></button>
        <div class="tool-sep"></div>
        <button class="tool" type="button" data-tool="color" aria-pressed="false">${ICON.color}<span>color choices</span></button>
        <button class="tool" type="button" data-tool="highlighter" aria-pressed="false">${ICON.highlighter}<span>highlighter</span></button>
        <button class="tool" type="button" data-tool="eliminator" aria-pressed="false">${ICON.eliminator}<span>answer eliminator</span></button>
        ${extra.includes('calculator') ? `<button class="tool" type="button" data-tool="calculator" aria-pressed="false">${ICON.calculator}<span>calculator</span></button>` : ''}
        ${extra.includes('ruler') ? `<button class="tool" type="button" data-tool="ruler" aria-pressed="false">${ICON.ruler}<span>ruler</span></button>` : ''}
        ${extra.includes('protractor') ? `<button class="tool" type="button" data-tool="protractor" aria-pressed="false">${ICON.protractor}<span>protractor</span></button>` : ''}
        <button class="tool" type="button" data-tool="linereader" aria-pressed="false">${ICON.linereader}<span>line-reader</span></button>
        ${T.state.accom.tts ? `<button class="tool" type="button" data-tool="tts" aria-pressed="false">${ICON.speaker}<span>text-to-speech</span></button>` : ''}
      </div>`;
    app.append(shell);
    const $ = s => shell.querySelector(s);
    T.el = { shell, $, content: $('#content'), left: $('#left'), right: $('#right') };
    if (blank) { $('#splitctl').style.display = 'none'; return; }

    // network indicator
    T.onNet = () => {
      const on = navigator.onLine, n = $('#net');
      n.classList.toggle('off', !on);
      n.innerHTML = (on ? ICON.check : ICON.offline) + `<div>${on ? 'Online' : 'Offline'}<small>Practice</small></div>`;
    };
    window.addEventListener('online', T.onNet); window.addEventListener('offline', T.onNet);
    T.onNet();

    $('#prev').addEventListener('click', () => go(T.state.idx - 1));
    $('#next').addEventListener('click', () => go(T.state.idx + 1));
    $('#review').addEventListener('click', review);
    $('#dir-link').addEventListener('click', () => directions(false));
    $('#signout').addEventListener('click', signOut);
    $('#split-l').addEventListener('click', () => setSplit(T.state.split - 1));
    $('#split-r').addEventListener('click', () => setSplit(T.state.split + 1));
    $('#split-r0').addEventListener('click', () => setSplit(DEFAULT_SPLIT));
    $('#zreset').addEventListener('click', () => setZoom(T.state.accom.zoom));
    $('#zout').addEventListener('click', () => setZoom(T.state.zoom - 1));
    $('#zin').addEventListener('click', () => setZoom(T.state.zoom + 1));
    shell.querySelectorAll('.tool').forEach(b => b.addEventListener('click', () => toggleTool(b.dataset.tool)));

    // highlighter: mouseup/touchend inside panes
    const hlUp = () => {
      if (T.mode !== 'highlighter') return;
      const pane = T.el.content;
      setTimeout(() => TOOLS.highlightSelection(pane), 0);
    };
    T.el.content.addEventListener('mouseup', hlUp);
    T.el.content.addEventListener('touchend', hlUp);
    T.el.content.addEventListener('click', e => {
      if (T.mode !== 'highlighter') return;
      const mk = e.target.closest('mark.hl');
      if (mk && window.getSelection().isCollapsed) TOOLS.unhighlight(mk);
    });

    T.onKey = e => {
      if (e.target.closest && e.target.closest('.cr-edit, input, select, textarea')) return;
      if (document.querySelector('.scrim')) return;
      if (e.altKey && e.key === 'ArrowRight') { go(T.state.idx + 1); e.preventDefault(); }
      if (e.altKey && e.key === 'ArrowLeft') { go(T.state.idx - 1); e.preventDefault(); }
    };
    window.addEventListener('keydown', T.onKey);

    setSplit(T.state.split, true);
  }

  function setSplit(i, quiet) {
    i = Math.max(0, Math.min(SPLITS.length - 1, i));
    T.state.split = i;
    T.el.content.style.setProperty('--split', SPLITS[i] + '%');
    const ctl = T.el.$('#splitctl');
    requestAnimationFrame(() => {
      const d = T.el.$('#divider').getBoundingClientRect(), c = T.el.content.getBoundingClientRect();
      ctl.style.left = (d.left - c.left + d.width / 2) + 'px';
    });
    T.el.$('#split-l').disabled = i === 0;
    T.el.$('#split-r').disabled = i === SPLITS.length - 1;
    if (!quiet) save();
  }

  function setZoom(i) {
    i = Math.max(0, Math.min(ZOOMS.length - 1, i));
    T.state.zoom = i;
    T.el.content.querySelectorAll('.pane-inner').forEach(p => { p.style.zoom = ZOOMS[i]; });
    T.el.$('#zout').disabled = i === 0;
    T.el.$('#zin').disabled = i === ZOOMS.length - 1;
    save();
  }

  // Build and cache the two panes for an item so highlights, eliminated
  // choices, and drag placements stay put while moving between questions.
  function page(idx) {
    if (T.pages[idx]) return T.pages[idx];
    const item = T.cl.items[idx];
    const left = h('div', { class: 'pane-inner' });
    left.append(h('p', { class: 'dir-label' }, 'Directions'));
    left.append(h('p', { class: 'dir-text', 'data-read': '1' }, T.cl.directions));
    (item.stimulus || []).forEach((sid, k) => {
      if (k > 0) left.append(h('div', { class: 'stim-sep' }));
      (T.cl.stimuli[sid] || []).forEach(b => left.append(block(b)));
    });
    const right = h('div', { class: 'pane-inner' });
    right.append(ITEMS.render(item, {
      state: T.state, base: T.base, accom: T.state.accom,
      mode: () => T.mode,
      onChange: () => { save(); paintNav(); }
    }));
    right.querySelectorAll('img').forEach(im => im.setAttribute('draggable', 'false'));
    return (T.pages[idx] = { left, right, single: !(item.stimulus || []).length && item.fullWidth });
  }

  // Table cells are HTML strings or {html, th, rowspan, colspan, align, style}.
  // rowStyles: {rowIndex: css} styles a whole row (e.g. a heavier rule).
  function tableEl(b) {
    const t = h('table', { class: 'stim-table' + (b.compact ? ' compact' : '') });
    if (b.caption) t.append(h('caption', { class: 'fig-cap' }, b.caption));
    const esc2 = v => String(v).replace(/"/g, '&quot;');
    const rows = b.rows.map((r, i) => {
      const cells = r.map((c, j) => {
        const o = (c && typeof c === 'object') ? c : { html: c == null ? '' : c };
        const head = o.th != null ? o.th : ((i === 0 && b.header !== false) || (j === 0 && b.rowHeaders));
        const tag = head ? 'th' : 'td';
        const st = [o.align ? `text-align:${o.align}` : '', o.valign ? `vertical-align:${o.valign}` : '', o.style || ''].filter(Boolean).join(';');
        return `<${tag}${o.rowspan ? ` rowspan="${o.rowspan}"` : ''}${o.colspan ? ` colspan="${o.colspan}"` : ''}${st ? ` style="${esc2(st)}"` : ''}>${o.html}</${tag}>`;
      }).join('');
      const rs = b.rowStyles && b.rowStyles[i];
      return `<tr${rs ? ` style="${esc2(rs)}"` : ''}>${cells}</tr>`;
    }).join('');
    t.insertAdjacentHTML('beforeend', rows);
    return t;
  }
  function figureEl(b) {
    const f = h('figure', { class: 'fig' });
    const cap = b.caption ? h('div', { class: 'fig-cap', 'data-read': '1' }, b.caption) : null;
    if (cap && !b.captionBelow) f.append(cap);
    f.append(h('img', { src: T.base + b.src, alt: b.alt || '', style: b.width ? `width:${b.width}px` : null, draggable: 'false' }));
    if (cap && b.captionBelow) { cap.classList.add('below'); f.append(cap); }
    return f;
  }
  function block(b) {
    switch (b.type) {
      case 'title': return h('p', { class: 'stim-title', 'data-read': '1' }, b.text);
      case 'subtitle': return h('p', { class: 'stim-sub', 'data-read': '1' }, b.text);
      case 'p': return h('p', { class: 'stim-p', 'data-read': '1' }, b.html);
      case 'list': { const u = h(b.ordered ? 'ol' : 'ul', { class: 'stim-list', 'data-read': '1' }); b.items.forEach(t => u.append(h('li', {}, t))); return u; }
      case 'table': return tableEl(b);
      case 'figure': return figureEl(b);
      case 'figures': {
        // side-by-side figures, as printed in the booklet; wraps on narrow panes
        const row = h('div', { class: 'fig-row' });
        if (b.caption) row.append(h('div', { class: 'fig-cap fig-row-cap', 'data-read': '1' }, b.caption));
        b.items.forEach(x => row.append(figureEl(x)));
        return row;
      }
      case 'html': return h('div', { 'data-read': '1' }, b.html);
      default: return h('div');
    }
  }

  function go(idx) {
    const n = T.cl.items.length;
    if (idx < 0 || idx >= n) return;
    closeTransient();
    T.state.idx = idx;
    const p = page(idx);
    const { left, right, content } = T.el;
    left.replaceChildren(p.left);
    right.replaceChildren(p.right);
    content.classList.toggle('single', !!p.single);
    left.scrollTop = 0; right.scrollTop = 0;
    setZoom(T.state.zoom);
    paintNav();
    if (T.open.note) { toggleTool('note'); toggleTool('note'); }
    save();
  }

  function paintNav() {
    const $ = T.el.$, i = T.state.idx, n = T.cl.items.length, item = T.cl.items[i];
    $('#qtitle').textContent = 'Question ' + item.n;
    $('#prev').disabled = i === 0;
    $('#next').disabled = i === n - 1;
    $('#review').textContent = i === n - 1 ? 'Review & Submit' : 'Review';
    const bm = !!T.state.bookmarks[item.n];
    const bb = T.el.shell.querySelector('[data-tool="bookmark"]');
    bb.classList.toggle('active', bm); bb.setAttribute('aria-pressed', bm);
    bb.firstElementChild.outerHTML = bm ? ICON.bookmarkFilled : ICON.bookmark;
  }

  function closeTransient() {
    if (T.open.color) { T.open.color.remove(); T.open.color = null; setActive('color', false); }
  }
  function setActive(tool, on) {
    const b = T.el.shell.querySelector(`[data-tool="${tool}"]`);
    if (b) { b.classList.toggle('active', on); b.setAttribute('aria-pressed', on); }
  }

  function toggleTool(tool) {
    const item = T.cl.items[T.state.idx];
    const o = T.open;
    switch (tool) {
      case 'bookmark':
        if (T.state.bookmarks[item.n]) delete T.state.bookmarks[item.n]; else T.state.bookmarks[item.n] = true;
        paintNav(); save(); return;
      case 'highlighter':
      case 'eliminator': {
        const other = tool === 'highlighter' ? 'eliminator' : 'highlighter';
        T.mode = T.mode === tool ? null : tool;
        setActive(tool, T.mode === tool); setActive(other, false);
        T.el.content.classList.toggle('tool-highlighter', T.mode === 'highlighter');
        T.el.content.classList.toggle('tool-eliminator', T.mode === 'eliminator');
        if (T.mode === 'highlighter') TOOLS.highlightSelection(T.el.content);
        return;
      }
      case 'color':
        if (o.color) { o.color.remove(); o.color = null; setActive('color', false); return; }
        o.color = TOOLS.colorPanel(T.state.scheme, id => { T.state.scheme = id; T.el.content.dataset.scheme = id; save(); }, () => toggleTool('color'));
        setActive('color', true); return;
      case 'note':
        if (o.note) { o.note.remove(); o.note = null; setActive('note', false); return; }
        o.note = TOOLS.notePanel(item.n, T.state.notes[item.n], html => { if (html) T.state.notes[item.n] = html; else delete T.state.notes[item.n]; save(); }, () => toggleTool('note'));
        setActive('note', true); return;
      case 'calculator':
        if (o.calculator) { o.calculator.remove(); o.calculator = null; setActive(tool, false); return; }
        o.calculator = TOOLS.calculator(() => toggleTool('calculator'), T.cl.grade === 5 ? 'basic' : 'scientific');
        setActive(tool, true); return;
      case 'ruler':
      case 'protractor':
        if (o[tool]) { o[tool].remove(); o[tool] = null; setActive(tool, false); return; }
        o[tool] = TOOLS.measureTool(tool, () => toggleTool(tool));
        setActive(tool, true); return;
      case 'linereader':
        if (o.linereader) { o.linereader.remove(); o.linereader = null; setActive(tool, false); return; }
        o.linereader = TOOLS.lineReader(T.el.content, () => toggleTool('linereader'));
        setActive(tool, true); return;
      case 'tts':
        if (o.tts) { o.tts.remove(); o.tts = null; setActive(tool, false); return; }
        o.tts = TOOLS.ttsBar(() => readable(T.el.right), () => readable(T.el.left), () => toggleTool('tts'));
        setActive(tool, true); return;
    }
  }
  function readable(root) {
    const parts = [...root.querySelectorAll('[data-read], .choice')].filter(n => !n.parentElement.closest('[data-read]'));
    return parts.map(n => n.classList.contains('choice') ? 'Choice ' + n.dataset.letter + '. ' + n.querySelector('.choice-body').innerText : n.innerText).join('. ');
  }

  // ---------- directions ----------
  function directions(first) {
    const extra = toolsFor();
    const tb = (ico, label) => `<div class="ico">${ico}<span>${label}</span></div>`;
    const slides = [
      `<h2>${T.name}</h2><p>These directions will help you learn about how to take your test.</p>`,
      `<h2>Information area</h2><h3>Online/Offline Indicator</h3>
       <div class="row"><div class="ico">${ICON.check}</div><div>The checkmark means you are working online.</div></div>
       <div class="row"><div class="ico">${ICON.offline}</div><div>The X means you are offline. Your answers are still saved on this Chromebook.</div></div>
       <h3>Directions and Pause/Sign out</h3>
       <div class="row"><div class="ico"><span>Directions</span></div><div>Opens these directions again at any time during your test.</div></div>
       <div class="row"><div class="ico"><span>II/ Sign out</span></div><div>Pauses and signs out of your test without submitting it. You can come back and pick up where you left off.</div></div>`,
      `<h2>Navigation area</h2><h3>Review screen</h3>
       <div class="row"><div class="ico"><span>Review</span></div><div>Shows your progress and lets you jump to any question. This is also where you submit your test when you are finished.</div></div>
       <h3>Navigation buttons</h3>
       <div class="row">${tb(ICON.right, 'next')}<div>Moves you forward one question.</div></div>
       <div class="row">${tb(ICON.left, 'previous')}<div>Moves you back one question.</div></div>`,
      `<h2>Split screen controls</h2><p>Many questions are split into two sides. The information you need is on the left and the question is on the right.</p>
       <div class="row">${tb(ICON.left, '')}<div>Moves the dividing line to the left.</div></div>
       <div class="row">${tb(ICON.right, '')}<div>Moves the dividing line to the right.</div></div>
       <div class="row">${tb(ICON.reset, '')}<div>Moves the dividing line back to where it started.</div></div>`,
      `<h2>Test tools</h2>
       <div class="row">${tb(ICON.plus, 'zoom')}<div>Zoom in and zoom out change the size of the test. The reset button returns to the original size.</div></div>
       <div class="row">${tb(ICON.bookmark, 'bookmark')}<div>Marks a question you want to come back to. Bookmarked questions show on the review screen.</div></div>
       <div class="row">${tb(ICON.note, 'note')}<div>Opens a place to type a note to yourself. Questions with notes show on the review screen.</div></div>`,
      `<h2>Test tools</h2>
       <div class="row">${tb(ICON.color, 'color choices')}<div>Changes the background color, or switches to white text on black.</div></div>
       <div class="row">${tb(ICON.highlighter, 'highlighter')}<div>Turn it on, then select words to highlight them. Press a highlight with the highlighter on to clear it.</div></div>
       <div class="row">${tb(ICON.eliminator, 'answer eliminator')}<div>Turn it on, then press an answer choice to cross it out. Press it again to bring it back.</div></div>
       <div class="row">${tb(ICON.linereader, 'line-reader')}<div>Covers the rest of the screen so you can focus on one part at a time. Drag it to move it. Drag the yellow tabs to make it taller or shorter.</div></div>`,
      extra.length ? `<h2>Test tools</h2>
       ${extra.includes('calculator') ? `<div class="row">${tb(ICON.calculator, 'calculator')}<div>Opens a ${T.cl.grade === 5 ? 'four-function' : 'scientific'} calculator. Drag the top bar to move it.</div></div>` : ''}
       ${extra.includes('ruler') ? `<div class="row">${tb(ICON.ruler, 'ruler')}<div>Opens a ruler in centimeters and inches. Drag to move it. Use the round button to turn it.</div></div>` : ''}
       ${extra.includes('protractor') ? `<div class="row">${tb(ICON.protractor, 'protractor')}<div>Opens a protractor for measuring angles. Drag to move it. Use the round button to turn it.</div></div>` : ''}
       <p><b>End Directions</b></p>` : `<h2>End Directions</h2>`
    ];
    let i = 0;
    const body = h('div', { class: 'dir-slide' });
    const nav = h('div', { class: 'modal-nav' });
    const prev = h('button', { type: 'button', 'aria-label': 'Previous page' }, ICON.left);
    const next = h('button', { type: 'button', 'aria-label': 'Next page' }, ICON.right);
    nav.append(prev, next);
    const wrap = h('div'); wrap.append(body, nav);
    const md = modal(wrap, { onClose: () => { if (first) waitToStart(); }, width: 560 });
    const paint = () => { body.innerHTML = slides[i]; prev.disabled = i === 0; };
    prev.addEventListener('click', () => { if (i > 0) { i--; paint(); } });
    next.addEventListener('click', () => {
      if (i < slides.length - 1) { i++; paint(); }
      else { md.close(); if (first) waitToStart(); }
    });
    paint();
  }

  function waitToStart() {
    const body = h('div', { style: 'text-align:center' });
    body.innerHTML = `<h2>Wait to start</h2><div class="wait-ico">${ICON.check}</div><p>Wait until your teacher tells you to start the test.</p>
      <div class="btn-row"><button type="button" id="w-exit">Exit</button><button type="button" id="w-start">Start test</button></div>`;
    const md = modal(body, { closable: false, width: 380 });
    body.querySelector('#w-exit').addEventListener('click', () => { md.close(); location.hash = '#/'; });
    body.querySelector('#w-start').addEventListener('click', () => { md.close(); go(0); });
  }

  // ---------- review ----------
  function review() {
    let filter = 'unanswered';
    const items = T.cl.items;
    const answered = it => ITEMS.isAnswered(it, T.state.answers[it.n]);
    const body = h('div', { class: 'review' });
    const md = modal(body, { width: 720 });
    const paint = () => {
      const counts = {
        unanswered: items.filter(it => !answered(it)).length,
        answered: items.filter(answered).length,
        bookmarked: items.filter(it => T.state.bookmarks[it.n]).length,
        notes: items.filter(it => T.state.notes[it.n]).length
      };
      const match = it => filter === 'unanswered' ? !answered(it) : filter === 'answered' ? answered(it) : filter === 'bookmarked' ? T.state.bookmarks[it.n] : T.state.notes[it.n];
      body.innerHTML = `<h1>Review</h1><p>Be sure you have answered all of the questions. Click on a question number to go back to it.</p>
        <button type="button" class="submit" id="rv-submit">Submit test</button>
        <h2>Test questions</h2>
        <div class="review-tabs" role="group" aria-label="Filter questions">
          <button type="button" data-f="unanswered" aria-pressed="${filter === 'unanswered'}">Unanswered (${counts.unanswered})</button>
          <button type="button" data-f="answered" aria-pressed="${filter === 'answered'}">Answered (${counts.answered})</button>
          <button type="button" data-f="bookmarked" aria-pressed="${filter === 'bookmarked'}">${ICON.bookmarkFilled}Bookmarked (${counts.bookmarked})</button>
          <button type="button" data-f="notes" aria-pressed="${filter === 'notes'}">${ICON.note}Notes (${counts.notes})</button>
        </div>
        <div class="review-grid"></div>`;
      const grid = body.querySelector('.review-grid');
      items.forEach((it, i) => {
        const b = h('button', { type: 'button', class: match(it) ? 'match' : '', 'aria-label': `Question ${it.n}, ${answered(it) ? 'answered' : 'unanswered'}${T.state.bookmarks[it.n] ? ', bookmarked' : ''}` }, `<span>${it.n}</span>`);
        if (T.state.bookmarks[it.n]) b.insertAdjacentHTML('beforeend', `<span class="flag">${ICON.bookmarkFilled}</span>`);
        b.addEventListener('click', () => { md.close(); go(i); });
        grid.append(b);
      });
      body.querySelectorAll('.review-tabs button').forEach(b => b.addEventListener('click', () => { filter = b.dataset.f; paint(); }));
      body.querySelector('#rv-submit').addEventListener('click', () => { md.close(); confirmSubmit(counts.unanswered); });
    };
    paint();
  }

  function confirmSubmit(unans) {
    const body = h('div', { style: 'text-align:center' });
    body.innerHTML = `<h2>Submit test?</h2>
      <p>${unans ? `You have <b>${unans}</b> unanswered question${unans > 1 ? 's' : ''}. ` : ''}After you submit, you cannot change your answers.</p>
      <div class="btn-row"><button type="button" id="s-no">Go back</button><button type="button" id="s-yes">Submit</button></div>`;
    const md = modal(body, { width: 440 });
    body.querySelector('#s-no').addEventListener('click', () => md.close());
    body.querySelector('#s-yes').addEventListener('click', () => {
      md.close();
      T.state.submitted = true;
      T.state.submittedAt = new Date().toISOString();
      save();
      location.hash = '#/results/' + T.id;
    });
  }

  function signOut() {
    const body = h('div', { style: 'text-align:center' });
    body.innerHTML = `<h2>Pause test?</h2><p>Your answers are saved on this Chromebook. You can come back and finish later.</p>
      <div class="btn-row"><button type="button" id="p-no">Keep working</button><button type="button" id="p-yes">Pause and sign out</button></div>`;
    const md = modal(body, { width: 420 });
    body.querySelector('#p-no').addEventListener('click', () => md.close());
    body.querySelector('#p-yes').addEventListener('click', () => { md.close(); save(); location.hash = '#/'; });
  }

  // ---------- results ----------
  async function showResults(id) {
    let cl;
    try { cl = await loadJSON(`clusters/${id}/cluster.json`); } catch (e) { location.hash = '#/'; return; }
    const st = store.get('state:' + id);
    if (!st || !st.submitted) { location.hash = '#/test/' + id; return; }
    document.title = 'Results: ' + cl.title;
    const showKey = cl.showKeyAfterSubmit !== false;
    const res = cl.items.map(it => ({ it, r: st.answers[it.n], s: ITEMS.score(it, st.answers[it.n]) }));
    // An item is self-scored only when every part the computer can check is
    // right and something is left for the student to judge (a written part).
    const needsSelf = it => it.type === 'multi' ? it.parts.some(needsSelf) : (it.type === 'cr' || it.scoring === 'self' || it.key == null);
    const auto = res.filter(x => x.s === 'correct' || x.s === 'incorrect' || (x.s === 'blank' && !needsSelf(x.it)));
    const selfItems = res.filter(x => x.s === 'self' || (x.s === 'blank' && needsSelf(x.it)));
    selfItems.filter(x => x.s === 'blank').forEach(x => { st.selfScores[x.it.n] = 0; });
    const totalPts = cl.items.reduce((a, it) => a + (it.points || 1), 0);

    app.innerHTML = '';
    const page = h('div', { class: 'results' });
    const wrap = h('div', { class: 'wrap' });
    page.append(wrap);
    app.append(page);

    let paintExtras = () => {};
    const paintScore = () => {
      const autoPts = auto.filter(x => x.s === 'correct').reduce((a, x) => a + (x.it.points || 1), 0);
      const selfPts = selfItems.reduce((a, x) => a + (+st.selfScores[x.it.n] || 0), 0);
      const scored = selfItems.filter(x => st.selfScores[x.it.n] != null).length;
      card.innerHTML = `<h2>${cl.title}: Grade ${cl.grade} Science</h2>
        <div class="meta">Submitted ${new Date(st.submittedAt || Date.now()).toLocaleString()}</div>
        ${showKey ? `<p class="score-big">${autoPts + selfPts} / ${totalPts} points</p>
        <p>${auto.length} question${auto.length === 1 ? ' was' : 's were'} scored automatically. ${selfItems.length ? `${selfItems.length} written or model question${selfItems.length === 1 ? '' : 's'} need${selfItems.length === 1 ? 's' : ''} you to check your work against the scoring guide below (${scored} of ${selfItems.length} checked).` : ''}</p>`
        : `<p>You answered ${res.filter(x => x.s !== 'blank').length} of ${cl.items.length} questions. Your teacher will go over the answers with you.</p>`}
        <div class="row no-print" style="display:flex;gap:8px;flex-wrap:wrap;margin-top:10px">
          <button type="button" class="btn-primary" id="r-home">Back to clusters</button>
          <button type="button" class="btn-plain" id="r-again">Try again</button>
          <button type="button" class="btn-plain" id="r-print">Print</button>
        </div>`;
      card.querySelector('#r-home').addEventListener('click', () => { location.hash = '#/'; });
      card.querySelector('#r-again').addEventListener('click', () => { if (confirm('Clear your answers and try this cluster again?')) { store.del('state:' + id); location.hash = '#/test/' + id; } });
      card.querySelector('#r-print').addEventListener('click', () => window.print());
      paintExtras();
    };
    const card = h('section', { class: 'score-card' });
    wrap.append(card);
    paintScore();

    // Skill-area feedback and the copy-your-results summary. Everything here is
    // computed in this browser from the student's own answers; nothing is sent.
    let siteIndex = [];
    try { siteIndex = (await loadJSON('clusters/index.json')).clusters || []; } catch (e) { }
    const evidence = (window.PE_FEEDBACK && PE_FEEDBACK[cl.grade]) || [];
    const itemPts = it => it.points || 1;
    // Points earned on an item, or null while a written answer still needs the student's own check.
    const earned = ({ it, s }) => s === 'correct' ? itemPts(it)
      : (s === 'self' || (s === 'blank' && needsSelf(it))) ? (st.selfScores[it.n] == null ? null : (+st.selfScores[it.n] || 0))
      : 0;
    const groups = [];
    res.forEach(x => {
      const ev = evidence.find(e => e.pes.includes(x.it.pe));
      const key = ev ? ev.text : 'other:' + x.it.pe;
      let g = groups.find(y => y.key === key);
      if (!g) { g = { key, ev, pes: [], items: [] }; groups.push(g); }
      if (!g.pes.includes(x.it.pe)) g.pes.push(x.it.pe);
      g.items.push(x);
    });
    const jump = n => { const t = document.getElementById('res-q' + n); if (t) t.scrollIntoView({ behavior: 'smooth', block: 'start' }); };

    const topics = h('section', { class: 'score-card topics' });
    const summary = h('section', { class: 'score-card send-card no-print' });
    card.after(topics); topics.after(summary);

    const paintTopics = () => {
      if (!showKey) { topics.style.display = 'none'; return; }
      topics.innerHTML = `<h2>How you did by skill area</h2>
        <p class="topic-lead">The state test groups questions by the skill they measure. Here is how your answers line up with those skills for Grade ${cl.grade}.</p>`;
      groups.forEach(g => {
        const pts = g.items.map(earned), pending = pts.some(p => p == null);
        const got = pts.reduce((a, p) => a + (p || 0), 0), max = g.items.reduce((a, x) => a + itemPts(x.it), 0);
        const state = pending ? ['wait', 'Check your written answer below'] : got === max ? ['ok', 'You got it'] : got === 0 ? ['no', 'Needs another look'] : ['part', 'Partly there'];
        const row = h('div', { class: 'topic' });
        row.innerHTML = `<div class="topic-head"><span class="topic-dom">${g.ev ? esc(g.ev.domain) : 'Other skills'}</span><span class="res-tag ${state[0] === 'part' ? 'self' : state[0] === 'wait' ? 'blank' : state[0]}">${state[1]}</span></div>
          <div class="topic-text">${g.ev ? esc(g.ev.text) : 'Questions on ' + esc(g.pes.join(', '))}</div>
          <div class="topic-meta">${pending ? '' : `${got} of ${max} point${max === 1 ? '' : 's'}. `}Question${g.items.length === 1 ? '' : 's'} <span class="qlinks"></span> <span class="topic-pe">${esc(g.pes.join(', '))}</span></div>`;
        const ql = row.querySelector('.qlinks');
        g.items.forEach((x, i) => {
          const b = h('button', { type: 'button', class: 'link-btn' }, String(x.it.n));
          b.addEventListener('click', () => jump(x.it.n));
          ql.append(b); if (i < g.items.length - 1) ql.append(', ');
        });
        if (!pending && got < max) {
          const more = siteIndex.filter(c => c.id !== id && c.grade === cl.grade && (c.pes || []).some(p => g.pes.includes(p))).slice(0, 3);
          const next = h('div', { class: 'topic-next' }, '<b>Next step:</b> reread the questions above and the scoring guide, then try this skill again.');
          if (more.length) {
            next.append(' More practice: ');
            more.forEach((c, i) => {
              const b = h('button', { type: 'button', class: 'link-btn' }, `${c.title} (${c.year})`);
              b.addEventListener('click', () => { location.hash = '#/test/' + c.id; });
              next.append(b); if (i < more.length - 1) next.append(', ');
            });
          }
          row.append(next);
        }
        topics.append(row);
      });
    };

    const buildSummary = () => {
      const flat = v => String(v == null ? '' : v).replace(/\s+/g, ' ').trim();
      const tot = res.reduce((a, x) => a + (earned(x) || 0), 0);
      const open = res.filter(x => earned(x) == null).length;
      const L = [];
      L.push('NYS SCIENCE PRACTICE RESULTS');
      L.push(`Cluster: ${cl.title} (Grade ${cl.grade}, ${cl.year} test, questions ${cl.items[0].n} to ${cl.items[cl.items.length - 1].n})`);
      L.push(`Completed: ${new Date(st.submittedAt || Date.now()).toLocaleString()}`);
      if (showKey) {
        L.push(`Score: ${tot} of ${totalPts} points` + (selfItems.length ? ` (written answers are scored by the student against the official scoring guide${open ? `; ${open} not checked yet` : ''})` : ''));
      }
      L.push('', 'QUESTIONS');
      res.forEach(x => {
        const e = earned(x);
        const outcome = !showKey ? (x.s === 'blank' ? 'not answered' : 'answered')
          : x.s === 'blank' && !needsSelf(x.it) ? 'not answered, 0 points'
          : e == null ? 'written answer, not scored yet' : `${e} of ${itemPts(x.it)} point${itemPts(x.it) === 1 ? '' : 's'}${x.s === 'self' || needsSelf(x.it) ? ' (self-scored)' : ''}`;
        L.push(`Q${x.it.n} (${x.it.pe}): ${outcome}`);
        const a = flat(ITEMS.describe(x.it, x.r));
        if (a) L.push(`   Answer: ${a}`);
      });
      if (showKey) {
        L.push('', 'SKILL AREAS');
        groups.forEach(g => {
          const pts = g.items.map(earned);
          const got = pts.reduce((a, p) => a + (p || 0), 0), max = g.items.reduce((a, x) => a + itemPts(x.it), 0);
          L.push(`${got} of ${max}: ${g.ev ? g.ev.text : 'Other skills'} [${g.pes.join(', ')}]`);
        });
      }
      return L.join('\n');
    };

    const paintSummary = () => {
      summary.innerHTML = `<h2>Turn in your results</h2>
        <p>This site does not send anything to your teacher. To turn in your results, copy the summary below and paste it into your teacher's Canvas assignment. It does not include your name; Canvas shows who turned it in.</p>
        <textarea class="send-text" readonly rows="9" aria-label="Results summary"></textarea>
        <div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:10px;align-items:center">
          <button type="button" class="btn-primary" id="r-copy">Copy my results</button>
          <button type="button" class="btn-plain" id="r-save">Save as a text file</button>
          <span class="send-status" role="status" id="r-copy-msg"></span>
        </div>`;
      const ta = summary.querySelector('textarea'), msg = summary.querySelector('#r-copy-msg');
      ta.value = buildSummary();
      summary.querySelector('#r-copy').addEventListener('click', async () => {
        ta.value = buildSummary();
        try { await navigator.clipboard.writeText(ta.value); msg.textContent = 'Copied. Paste it into your Canvas assignment.'; }
        catch (e) { ta.focus(); ta.select(); msg.textContent = document.execCommand && document.execCommand('copy') ? 'Copied. Paste it into your Canvas assignment.' : 'Press Ctrl+C to copy the selected text.'; }
      });
      summary.querySelector('#r-save').addEventListener('click', () => {
        const a = h('a', { download: `${id}-results.txt`, href: URL.createObjectURL(new Blob([buildSummary()], { type: 'text/plain' })) });
        document.body.append(a); a.click(); a.remove(); URL.revokeObjectURL(a.href);
        msg.textContent = 'Saved to your Downloads folder.';
      });
    };

    paintExtras = () => { paintTopics(); paintSummary(); };
    paintExtras();

    const TAG = { correct: ['ok', 'Correct'], incorrect: ['no', 'Incorrect'], self: ['self', 'Check with scoring guide'], blank: ['blank', 'Not answered'] };
    res.forEach(({ it, r, s }) => {
      const el = h('article', { class: 'res-item', id: 'res-q' + it.n });
      const tag = showKey ? TAG[s] : (s === 'blank' ? TAG.blank : ['blank', 'Answered']);
      // Plain-text stem for the results page: drop tables and pictures, and
      // keep spaces between blocks (innerText on a detached node runs them together).
      const stemTxt = h('div'); stemTxt.innerHTML = it.stem;
      stemTxt.querySelectorAll('table, img, figure, svg').forEach(n => n.remove());
      stemTxt.querySelectorAll('p, div, br, li').forEach(n => n.after(' '));
      el.innerHTML = `<header><h3>Question ${it.n}</h3><span class="res-tag ${tag[0]}">${tag[1]}</span></header>
        <div class="res-stem">${stemTxt.textContent.replace(/\s+/g, ' ').trim()}</div>`;
      if (it.type === 'cr') el.insertAdjacentHTML('beforeend', `<div class="res-row"><b>Your answer:</b></div><div class="res-student"></div>`);
      else el.insertAdjacentHTML('beforeend', `<div class="res-row"><b>Your answer:</b> <span class="ya"></span></div>`);
      const ya = el.querySelector('.res-student, .ya');
      ya.textContent = ITEMS.describe(it, r);
      if (showKey) {
        const k = ITEMS.describeKey(it);
        if (k && it.scoring !== 'self') el.insertAdjacentHTML('beforeend', `<div class="res-row"><b>Correct answer:</b> ${k}</div>`);
        if (it.rubric) el.insertAdjacentHTML('beforeend', `<div class="res-row"><b>Scoring guide:</b></div><ul class="res-rubric">${it.rubric.map(x => `<li>${x}</li>`).join('')}</ul>`);
        if (it.exemplar) el.insertAdjacentHTML('beforeend', `<div class="res-row"><b>Example answer:</b> ${it.exemplar}</div>`);
        if (it.exemplarImage) el.insertAdjacentHTML('beforeend', `<div class="res-row"><b>Example answer:</b><br><img src="clusters/${id}/${it.exemplarImage}" alt="Example correct response" style="max-width:100%;border:1px solid #ccc;margin-top:6px"></div>`);
        if (it.explanation) el.insertAdjacentHTML('beforeend', `<div class="res-row"><b>Why:</b> ${it.explanation}</div>`);
        if (s === 'self') {
          const ss = h('div', { class: 'self-score no-print' }, '<span>Score your answer:</span>');
          [[1, 'My answer has everything (1 point)'], [0, 'My answer is missing something (0 points)']].forEach(([v, lbl]) => {
            const b = h('button', { type: 'button', 'aria-pressed': st.selfScores[it.n] === v }, lbl);
            b.addEventListener('click', () => {
              st.selfScores[it.n] = v; store.set('state:' + id, st);
              ss.querySelectorAll('button').forEach(x => x.setAttribute('aria-pressed', x === b));
              paintScore();
            });
            ss.append(b);
          });
          el.append(ss);
        }
        if (it.pe) el.insertAdjacentHTML('beforeend', `<div class="res-row" style="font-size:12.5px;color:#5a6670;margin-top:8px">${it.pe}</div>`);
      }
      wrap.append(el);
    });
  }
})();
