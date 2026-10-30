// Test tools: highlighter, note, color choices, calculator, ruler,
// protractor, line reader, text-to-speech. All overlays are plain DOM so
// they behave the same on Chromebooks with touchpads or touch screens.
const TOOLS = (() => {
  const h = (...a) => ITEMS.h(...a);

  // ---------- drag helper (pointer events) ----------
  function draggable(el, handle, opts = {}) {
    let s = null;
    handle.addEventListener('pointerdown', e => {
      if (e.target.closest('button') && e.target.closest('button') !== handle) return;
      if (e.button !== undefined && e.button !== 0) return;
      const r = el.getBoundingClientRect();
      s = { x: e.clientX, y: e.clientY, l: r.left, t: r.top };
      handle.setPointerCapture(e.pointerId);
      e.preventDefault();
    });
    handle.addEventListener('pointermove', e => {
      if (!s) return;
      let l = s.l + e.clientX - s.x, t = s.t + e.clientY - s.y;
      if (!opts.free) {
        l = Math.max(-el.offsetWidth + 60, Math.min(window.innerWidth - 60, l));
        t = Math.max(0, Math.min(window.innerHeight - 40, t));
      }
      el.style.left = l + 'px'; el.style.top = t + 'px';
      el.style.right = 'auto'; el.style.bottom = 'auto';
    });
    const end = () => { s = null; };
    handle.addEventListener('pointerup', end);
    handle.addEventListener('pointercancel', end);
  }

  function panel(title, bodyEl, { x = 20, y = 120, width = 330, onClose, cls = '' } = {}) {
    const p = h('div', { class: 'panel ' + cls, role: 'dialog', 'aria-label': title, style: `left:${x}px;top:${y}px;width:${width}px` });
    const head = h('div', { class: 'panel-head' }, `<span>${title}</span>`);
    const x_ = h('button', { type: 'button', 'aria-label': 'Close ' + title }, ICON.close);
    x_.addEventListener('click', () => onClose && onClose());
    head.append(x_);
    p.append(head, bodyEl);
    draggable(p, head);
    document.body.append(p);
    return p;
  }

  // ---------- highlighter ----------
  function highlightSelection(root) {
    const sel = window.getSelection();
    if (!sel.rangeCount || sel.isCollapsed) return false;
    const range = sel.getRangeAt(0);
    if (!root.contains(range.commonAncestorContainer)) return false;
    const walker = document.createTreeWalker(range.commonAncestorContainer.nodeType === 3 ? range.commonAncestorContainer.parentNode : range.commonAncestorContainer, NodeFilter.SHOW_TEXT);
    const nodes = [];
    while (walker.nextNode()) {
      const n = walker.currentNode;
      if (!range.intersectsNode(n) || !n.nodeValue.trim()) continue;
      if (n.parentElement.closest('.cr-edit, select, .dd-chip, .bubble, .mask-btn, mark.hl')) continue;
      nodes.push(n);
    }
    nodes.forEach(n => {
      let start = 0, end = n.nodeValue.length;
      if (n === range.startContainer) start = range.startOffset;
      if (n === range.endContainer) end = range.endOffset;
      if (end <= start) return;
      const mid = n.splitText(start);
      mid.splitText(end - start);
      const m = document.createElement('mark');
      m.className = 'hl';
      mid.parentNode.insertBefore(m, mid);
      m.append(mid);
    });
    sel.removeAllRanges();
    return nodes.length > 0;
  }
  function unhighlight(mark) {
    const p = mark.parentNode;
    while (mark.firstChild) p.insertBefore(mark.firstChild, mark);
    p.removeChild(mark);
    p.normalize();
  }

  // ---------- color choices ----------
  const SCHEMES = [
    ['white', 'Black text on white', '#fff', '#000'],
    ['blue', 'Black text on blue', '#99d9ed', '#000'],
    ['green', 'Black text on green', '#b8f1cb', '#000'],
    ['pink', 'Black text on pink', '#ffd0ff', '#000'],
    ['yellow', 'Black text on yellow', '#ffffcc', '#000'],
    ['reverse', 'Reverse contrast (white text on black)', '#000', '#fff']
  ];
  function colorPanel(current, onPick, onClose) {
    const body = h('div', { class: 'color-list', role: 'radiogroup' });
    SCHEMES.forEach(([id, label, bg, fg]) => {
      const lab = h('label');
      const inp = h('input', { type: 'radio', name: 'scheme', value: id });
      if (id === current) inp.checked = true;
      inp.addEventListener('change', () => onPick(id));
      lab.append(inp, h('span', { class: 'swatch', style: `background:${bg};color:${fg}` }, 'abc'), h('span', {}, label));
      body.append(lab);
    });
    const tb = document.querySelector('.tool[data-tool="color"]').getBoundingClientRect();
    return panel('Color choices', body, { x: Math.max(8, tb.left - 20), y: Math.max(60, tb.top - 300), width: 300, onClose });
  }

  // ---------- note ----------
  function notePanel(n, initial, onSave, onClose) {
    const body = h('div', { class: 'note-body' });
    body.append(ITEMS.editor(initial || '', (html, text) => onSave(text.trim() ? html : ''), 10000, 'Note for question ' + n));
    const p = panel('Notes', body, { x: 12, y: 116, width: 330, onClose });
    setTimeout(() => p.querySelector('.cr-edit').focus(), 30);
    return p;
  }

  // ---------- calculator ----------
  function calculator(onClose, mode = 'scientific') {
    const basic = mode === 'basic';
    let expr = '', ans = 0, shown = '0', justEval = false;
    const body = h('div');
    const screen = h('div', { class: 'calc-screen', 'aria-live': 'polite' });
    const keys = h('div', { class: 'calc-keys' });
    const layout = basic ? [
      ['7', '7', 'num'], ['8', '8', 'num'], ['9', '9', 'num'], ['÷', '÷', 'op'],
      ['4', '4', 'num'], ['5', '5', 'num'], ['6', '6', 'num'], ['×', '×', 'op'],
      ['1', '1', 'num'], ['2', '2', 'num'], ['3', '3', 'num'], ['−', '−', 'op'],
      ['0', '0', 'num'], ['.', '.', 'num'], ['DEL', 'del', 'op'], ['+', '+', 'op'],
      ['CLR', 'clr', 'op'], ['=', '=', 'eq']
    ] : [
      ['sin', 'sin(', ''], ['cos', 'cos(', ''], ['tan', 'tan(', ''], ['π', 'π', ''], ['DEL', 'del', 'op'],
      ['x²', '²', ''], ['√', '√(', ''], ['xʸ', '^', ''], ['(', '(', ''], [')', ')', ''],
      ['7', '7', 'num'], ['8', '8', 'num'], ['9', '9', 'num'], ['÷', '÷', 'op'], ['CLR', 'clr', 'op'],
      ['4', '4', 'num'], ['5', '5', 'num'], ['6', '6', 'num'], ['×', '×', 'op'], ['ans', 'ans', ''],
      ['1', '1', 'num'], ['2', '2', 'num'], ['3', '3', 'num'], ['−', '−', 'op'], ['×10ⁿ', 'E', ''],
      ['0', '0', 'num'], ['.', '.', 'num'], ['(−)', '(−)', 'num'], ['+', '+', 'op'], ['=', '=', 'eq']
    ];
    const paint = () => {
      screen.innerHTML = `${basic ? '' : '<div class="calc-mode">DEG</div>'}<div class="calc-expr">${expr.replace(/</g, '&lt;') || '&nbsp;'}</div><div class="calc-out">${shown}</div>`;
    };
    const fmt = v => {
      if (!isFinite(v)) return 'Error';
      if (Math.abs(v) >= 1e10 || (Math.abs(v) < 1e-6 && v !== 0)) return v.toExponential(6).replace(/\.?0+e/, 'e').replace('e', '×10^');
      return String(+v.toPrecision(10));
    };
    const press = k => {
      if (k === 'clr') { expr = ''; shown = '0'; }
      else if (k === 'del') { expr = expr.replace(/(sin\(|cos\(|tan\(|√\(|ans|\(−\)|.)$/, ''); }
      else if (k === '=') {
        try { const v = evaluate(expr, ans); ans = v; shown = fmt(v); justEval = true; }
        catch (e) { shown = 'Syntax error'; }
        paint(); return;
      } else {
        if (justEval && /^[0-9.π(√sct]|^\(−\)/.test(k)) expr = '';
        else if (justEval && /^[+−×÷^²E]/.test(k) && expr) expr = 'ans';
        expr += k;
      }
      justEval = false;
      paint();
    };
    layout.forEach(([lbl, k, cls]) => {
      const b = h('button', { type: 'button', class: cls, 'aria-label': lbl }, lbl);
      b.addEventListener('click', () => press(k));
      keys.append(b);
    });
    body.append(screen, keys);
    paint();
    const p = panel(basic ? 'Four-function calculator' : 'Scientific calculator', body, { x: 20, y: 90, width: 250, onClose, cls: 'calc' + (basic ? ' calc-basic' : '') });
    p.addEventListener('keydown', e => {
      const map = { Enter: '=', '=': '=', Backspace: 'del', Escape: 'clr', '*': '×', '/': '÷', '-': '−', '+': '+', '.': '.' };
      if (!basic) Object.assign(map, { '^': '^', '(': '(', ')': ')' });
      if (/^[0-9]$/.test(e.key)) press(e.key);
      else if (map[e.key]) { e.preventDefault(); press(map[e.key]); }
    });
    p.tabIndex = -1; p.focus();
    return p;
  }

  // Recursive-descent evaluator (no eval). Degrees for trig.
  function evaluate(src, ans) {
    const toks = [];
    let i = 0;
    const s = src.replace(/\(−\)/g, '~');
    while (i < s.length) {
      const c = s[i];
      if (/[0-9.]/.test(c)) { let j = i; while (j < s.length && /[0-9.]/.test(s[j])) j++; toks.push({ t: 'n', v: parseFloat(s.slice(i, j)) }); i = j; continue; }
      if (s.startsWith('sin(', i) || s.startsWith('cos(', i) || s.startsWith('tan(', i)) { toks.push({ t: 'f', v: s.slice(i, i + 3) }); toks.push({ t: '(' }); i += 4; continue; }
      if (s.startsWith('√(', i)) { toks.push({ t: 'f', v: 'sqrt' }); toks.push({ t: '(' }); i += 2; continue; }
      if (s.startsWith('ans', i)) { toks.push({ t: 'n', v: ans }); i += 3; continue; }
      if (c === 'π') { toks.push({ t: 'n', v: Math.PI }); i++; continue; }
      if ('+−×÷^²()E~'.includes(c)) { toks.push({ t: c }); i++; continue; }
      throw new Error('bad');
    }
    // implicit multiplication: 2π, 2(3), )(, π2
    const out = [];
    toks.forEach((tk, k) => {
      const prev = out[out.length - 1];
      if (prev && (prev.t === 'n' || prev.t === ')' || prev.t === '²') && (tk.t === 'n' || tk.t === '(' || tk.t === 'f' || tk.t === '~')) out.push({ t: '×' });
      out.push(tk);
    });
    let p = 0;
    const peek = () => out[p], eat = t => { if (!out[p] || out[p].t !== t) throw new Error('expect ' + t); p++; };
    const rad = d => d * Math.PI / 180;
    function expr() { let v = term(); while (peek() && (peek().t === '+' || peek().t === '−')) { const o = out[p++].t; const r = term(); v = o === '+' ? v + r : v - r; } return v; }
    function term() { let v = sci(); while (peek() && (peek().t === '×' || peek().t === '÷')) { const o = out[p++].t; const r = sci(); v = o === '×' ? v * r : v / r; } return v; }
    function sci() { let v = unary(); while (peek() && peek().t === 'E') { p++; v = v * Math.pow(10, unary()); } return v; }
    function unary() { if (peek() && (peek().t === '~' || peek().t === '−')) { p++; return -unary(); } return power(); }
    function power() { let v = post(); if (peek() && peek().t === '^') { p++; v = Math.pow(v, unary()); } return v; }
    function post() { let v = prim(); while (peek() && peek().t === '²') { p++; v = v * v; } return v; }
    function prim() {
      const tk = out[p++];
      if (!tk) throw new Error('end');
      if (tk.t === 'n') return tk.v;
      if (tk.t === '(') { const v = expr(); if (peek() && peek().t === ')') p++; return v; }
      if (tk.t === 'f') {
        eat('('); const a = expr(); if (peek() && peek().t === ')') p++;
        if (tk.v === 'sqrt') return Math.sqrt(a);
        const r = Math[tk.v](rad(a));
        return Math.abs(r) < 1e-12 ? 0 : r;
      }
      throw new Error('unexpected');
    }
    const v = expr();
    if (p < out.length) throw new Error('trailing');
    return v;
  }

  // ---------- ruler and protractor ----------
  const PX_CM = 37.8; // CSS px per cm at 100% zoom
  function rulerSVG() {
    const cm = 15, w = Math.round(cm * PX_CM) + 24, hgt = 78;
    let t = `<svg width="${w}" height="${hgt}" viewBox="0 0 ${w} ${hgt}"><rect x="0.5" y="0.5" width="${w - 1}" height="${hgt - 1}" rx="3" fill="rgba(255,250,215,.92)" stroke="#333"/>`;
    for (let mm = 0; mm <= cm * 10; mm++) {
      const x = 12 + mm * PX_CM / 10;
      const L = mm % 10 === 0 ? 18 : mm % 5 === 0 ? 12 : 7;
      t += `<line x1="${x}" y1="0" x2="${x}" y2="${L}" stroke="#000" stroke-width="${mm % 10 ? .7 : 1.1}"/>`;
      if (mm % 10 === 0) t += `<text x="${x}" y="30" font-size="11" text-anchor="middle" font-family="Arial">${mm / 10}</text>`;
    }
    const pxIn = PX_CM * 2.54;
    const inches = Math.floor((w - 24) / pxIn * 16);
    for (let s = 0; s <= inches; s++) {
      const x = 12 + s * pxIn / 16;
      const L = s % 16 === 0 ? 18 : s % 8 === 0 ? 14 : s % 4 === 0 ? 10 : s % 2 === 0 ? 7 : 4;
      t += `<line x1="${x}" y1="${hgt}" x2="${x}" y2="${hgt - L}" stroke="#000" stroke-width="${s % 16 ? .7 : 1.1}"/>`;
      if (s % 16 === 0) t += `<text x="${x}" y="${hgt - 22}" font-size="11" text-anchor="middle" font-family="Arial">${s / 16}</text>`;
    }
    t += `<text x="${w / 2}" y="44" font-size="9" text-anchor="middle" font-family="Arial" fill="#555">CENTIMETERS  /  INCHES</text></svg>`;
    return t;
  }
  function protractorSVG() {
    const R = 150, w = R * 2 + 20, hgt = R + 26, cx = w / 2, cy = R + 10;
    let t = `<svg width="${w}" height="${hgt}" viewBox="0 0 ${w} ${hgt}"><path d="M${cx - R} ${cy} A${R} ${R} 0 0 1 ${cx + R} ${cy} L${cx + R} ${cy + 14} L${cx - R} ${cy + 14} Z" fill="rgba(215,235,255,.9)" stroke="#333"/>`;
    for (let d = 0; d <= 180; d++) {
      const a = Math.PI - d * Math.PI / 180;
      const L = d % 10 === 0 ? 16 : d % 5 === 0 ? 11 : 6;
      const x1 = cx + R * Math.cos(a), y1 = cy - R * Math.sin(a);
      const x2 = cx + (R - L) * Math.cos(a), y2 = cy - (R - L) * Math.sin(a);
      t += `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="#000" stroke-width="${d % 10 ? .6 : 1}"/>`;
      if (d % 10 === 0) {
        const xo = cx + (R - 27) * Math.cos(a), yo = cy - (R - 27) * Math.sin(a);
        const xi = cx + (R - 45) * Math.cos(a), yi = cy - (R - 45) * Math.sin(a);
        t += `<text x="${xo}" y="${yo + 4}" font-size="10" text-anchor="middle" font-family="Arial">${d}</text>`;
        t += `<text x="${xi}" y="${yi + 4}" font-size="9" text-anchor="middle" font-family="Arial" fill="#1c4f8c">${180 - d}</text>`;
      }
    }
    t += `<line x1="${cx - R}" y1="${cy}" x2="${cx + R}" y2="${cy}" stroke="#000"/><circle cx="${cx}" cy="${cy}" r="3" fill="none" stroke="#c00" stroke-width="1.5"/><line x1="${cx}" y1="${cy - 8}" x2="${cx}" y2="${cy + 8}" stroke="#c00"/></svg>`;
    return { svg: t, pivot: [cx, cy] };
  }
  function measureTool(kind, onClose) {
    const el = h('div', { class: 'measure', role: 'img', 'aria-label': kind === 'ruler' ? 'Ruler, drag to move, use the round handle to rotate' : 'Protractor, drag to move, use the round handle to rotate' });
    let angle = 0, pivot;
    if (kind === 'ruler') { el.innerHTML = rulerSVG(); pivot = [12, 0]; }
    else { const p = protractorSVG(); el.innerHTML = p.svg; pivot = p.pivot; }
    el.style.left = kind === 'ruler' ? '120px' : '260px';
    el.style.top = kind === 'ruler' ? '180px' : '200px';
    el.style.transformOrigin = `${pivot[0]}px ${pivot[1]}px`;
    const rot = h('button', { class: 'rot', type: 'button', 'aria-label': 'Rotate (arrow keys also rotate)', title: 'Rotate' }, ICON.rotate);
    document.body.append(el);
    const svg = el.querySelector('svg');
    rot.style.left = (svg.getAttribute('width') - 14) + 'px';
    rot.style.top = (kind === 'ruler' ? 25 : +svg.getAttribute('height') - 30) + 'px';
    el.append(rot);
    draggable(el, el, { free: true });
    let rs = null;
    rot.addEventListener('pointerdown', e => {
      e.stopPropagation(); e.preventDefault();
      const r = el.getBoundingClientRect();
      const o = el.style.transform; el.style.transform = '';
      const base = el.getBoundingClientRect();
      el.style.transform = o;
      rs = { cx: base.left + pivot[0], cy: base.top + pivot[1] };
      rot.setPointerCapture(e.pointerId);
    });
    rot.addEventListener('pointermove', e => {
      if (!rs) return;
      const hx = +rot.style.left.replace('px', '') + 14 - pivot[0];
      const hy = +rot.style.top.replace('px', '') + 14 - pivot[1];
      const a0 = Math.atan2(hy, hx);
      const a1 = Math.atan2(e.clientY - rs.cy, e.clientX - rs.cx);
      angle = (a1 - a0) * 180 / Math.PI;
      el.style.transform = `rotate(${angle}deg)`;
    });
    rot.addEventListener('pointerup', () => { rs = null; });
    el.tabIndex = 0;
    el.addEventListener('keydown', e => {
      const step = e.shiftKey ? 10 : 1;
      const l = parseFloat(el.style.left), t = parseFloat(el.style.top);
      if (e.key === 'ArrowLeft') { el.style.left = (l - step) + 'px'; }
      else if (e.key === 'ArrowRight') { el.style.left = (l + step) + 'px'; }
      else if (e.key === 'ArrowUp') { el.style.top = (t - step) + 'px'; }
      else if (e.key === 'ArrowDown') { el.style.top = (t + step) + 'px'; }
      else if (e.key === '[' || e.key === ']') { angle += e.key === ']' ? step : -step; el.style.transform = `rotate(${angle}deg)`; }
      else if (e.key === 'Escape') { onClose(); }
      else return;
      e.preventDefault();
    });
    return el;
  }

  // ---------- line reader ----------
  function lineReader(area, onClose) {
    const box = area.getBoundingClientRect();
    let top = box.top + 60, height = 44;
    const root = h('div', { class: 'line-reader', 'aria-hidden': 'true' });
    const above = h('div', { class: 'shade mover' }), below = h('div', { class: 'shade mover' });
    const slot = h('div', { class: 'slot' });
    const gTop = h('div', { class: 'grip top', title: 'Drag to resize' }, '═');
    const gBot = h('div', { class: 'grip', title: 'Drag to resize' }, '═');
    root.append(above, below, slot, gTop, gBot);
    document.body.append(root);
    const paint = () => {
      const b = area.getBoundingClientRect();
      top = Math.max(b.top, Math.min(b.bottom - height, top));
      above.style.top = b.top + 'px'; above.style.height = (top - b.top) + 'px';
      below.style.top = (top + height) + 'px'; below.style.height = Math.max(0, b.bottom - top - height) + 'px';
      slot.style.top = top + 'px'; slot.style.height = height + 'px';
      gTop.style.top = (top - 18) + 'px'; gBot.style.top = (top + height) + 'px';
    };
    const drag = (el, fn) => {
      let s = null;
      el.addEventListener('pointerdown', e => { s = { y: e.clientY, top, height }; el.setPointerCapture(e.pointerId); e.preventDefault(); });
      el.addEventListener('pointermove', e => { if (s) { fn(e.clientY - s.y, s); paint(); } });
      el.addEventListener('pointerup', () => { s = null; });
    };
    drag(above, (dy, s) => { top = s.top + dy; });
    drag(below, (dy, s) => { top = s.top + dy; });
    drag(gTop, (dy, s) => { const nh = Math.max(20, s.height - dy); top = s.top + (s.height - nh); height = nh; });
    drag(gBot, (dy, s) => { height = Math.max(20, s.height + dy); });
    const key = e => {
      if (e.target.closest('.cr-edit, input, select')) return;
      if (e.key === 'ArrowDown' && e.altKey) { top += 20; paint(); e.preventDefault(); }
      if (e.key === 'ArrowUp' && e.altKey) { top -= 20; paint(); e.preventDefault(); }
    };
    window.addEventListener('keydown', key);
    window.addEventListener('resize', paint);
    paint();
    return { el: root, remove() { window.removeEventListener('keydown', key); window.removeEventListener('resize', paint); root.remove(); } };
  }

  // ---------- text to speech ----------
  function ttsBar(getQuestion, getPassage, onClose) {
    const bar = h('div', { class: 'tts-bar', role: 'toolbar', 'aria-label': 'Text to speech' });
    const say = t => {
      if (!('speechSynthesis' in window)) { alert('Text-to-speech is not available on this device.'); return; }
      speechSynthesis.cancel();
      const u = new SpeechSynthesisUtterance(t.replace(/\s+/g, ' ').trim());
      u.rate = 0.95;
      speechSynthesis.speak(u);
    };
    const btn = (label, fn) => { const b = h('button', { type: 'button' }, label); b.addEventListener('click', fn); bar.append(b); };
    btn('Read question', () => say(getQuestion()));
    btn('Read passage', () => say(getPassage()));
    btn('Read selection', () => { const s = window.getSelection().toString(); if (s) say(s); });
    btn('Pause', () => speechSynthesis.paused ? speechSynthesis.resume() : speechSynthesis.pause());
    btn('Stop', () => speechSynthesis.cancel());
    document.body.append(bar);
    return { el: bar, remove() { if ('speechSynthesis' in window) speechSynthesis.cancel(); bar.remove(); } };
  }

  return { highlightSelection, unhighlight, colorPanel, notePanel, calculator, measureTool, lineReader, ttsBar, evaluate, SCHEMES };
})();
