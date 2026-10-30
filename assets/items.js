// Item renderers and scoring. Each renderer returns a DOM element for the
// right-hand pane and writes student responses into ctx.state.
const ITEMS = (() => {
  const LETTERS = 'ABCDEFGH';
  const h = (tag, attrs = {}, html) => {
    const el = document.createElement(tag);
    for (const [k, v] of Object.entries(attrs)) {
      if (k === 'class') el.className = v;
      else if (k.startsWith('on')) el.addEventListener(k.slice(2), v);
      else if (v !== false && v != null) el.setAttribute(k, v === true ? '' : v);
    }
    if (html != null) el.innerHTML = html;
    return el;
  };

  // ---------- shared stem ----------
  function stem(item) {
    return h('div', { class: 'stem', 'data-read': '1' }, item.stem || '');
  }

  // ---------- multiple choice / multi-select ----------
  function choiceItem(item, ctx, multi) {
    const wrap = h('div');
    wrap.append(stem(item));
    // optionsLayout "grid": two columns (picture or table choices printed 2x2).
    // letters: false hides A-D in the boxes (unlettered check lists on paper).
    const list = h('div', { class: 'choices' + (item.optionsLayout === 'grid' ? ' grid' : '') + (item.letters === false ? ' no-letters' : ''), role: multi ? 'group' : 'radiogroup', 'aria-label': 'Answer choices' });
    const elim = ctx.state.elim[item.n] || (ctx.state.elim[item.n] = []);
    const masked = ctx.state.masked[item.n] || (ctx.state.masked[item.n] = []);

    const current = () => {
      const r = ctx.state.answers[item.n];
      return multi ? (Array.isArray(r) ? r : []) : r;
    };
    const paint = () => {
      const cur = current();
      list.querySelectorAll('.choice').forEach(c => {
        const L = c.dataset.letter;
        const on = multi ? cur.includes(L) : cur === L;
        c.classList.toggle('selected', on);
        c.classList.toggle('eliminated', elim.includes(L));
        c.classList.toggle('masked', masked.includes(L));
        c.setAttribute('aria-checked', on ? 'true' : 'false');
        const mb = c.querySelector('.mask-btn');
        if (mb) mb.innerHTML = masked.includes(L) ? ICON.eyeOff : ICON.eye;
      });
    };

    item.options.forEach((opt, i) => {
      const L = LETTERS[i];
      const row = h('div', { class: 'choice' + (multi ? ' multi' : ''), 'data-letter': L, role: multi ? 'checkbox' : 'radio', tabindex: '0', 'aria-label': 'Choice ' + L });
      if (ctx.accom.masking) {
        const mb = h('button', { class: 'mask-btn', type: 'button', 'aria-label': 'Hide or show choice ' + L, title: 'Answer masking' });
        mb.addEventListener('click', e => {
          e.stopPropagation();
          const k = masked.indexOf(L);
          k >= 0 ? masked.splice(k, 1) : masked.push(L);
          paint(); ctx.onChange();
        });
        row.append(mb);
      }
      row.append(h('span', { class: 'bubble' }, item.letters === false ? '' : L));
      const optHtml = typeof opt === 'string' ? opt : (opt.img ? `<img src="${ctx.base + opt.img}" alt="${opt.alt || ''}" style="width:${opt.width || 180}px" draggable="false">` : '') + (opt.html || '');
      row.append(h('div', { class: 'choice-body' }, `<div data-read="1">${optHtml}</div>`));
      const act = e => {
        if (ctx.mode() === 'highlighter') return;
        if (masked.includes(L)) return;
        if (ctx.mode() === 'eliminator') {
          const k = elim.indexOf(L);
          if (k >= 0) elim.splice(k, 1);
          else {
            elim.push(L);
            if (multi) { const cur = current(); const j = cur.indexOf(L); if (j >= 0) { cur.splice(j, 1); ctx.state.answers[item.n] = cur; } }
            else if (current() === L) delete ctx.state.answers[item.n];
          }
        } else {
          const k = elim.indexOf(L);
          if (k >= 0) elim.splice(k, 1);
          if (multi) {
            const cur = current().slice();
            const j = cur.indexOf(L);
            j >= 0 ? cur.splice(j, 1) : cur.push(L);
            cur.sort();
            if (cur.length) ctx.state.answers[item.n] = cur; else delete ctx.state.answers[item.n];
          } else {
            ctx.state.answers[item.n] = L;
          }
        }
        paint(); ctx.onChange();
      };
      row.addEventListener('click', e => { if (window.getSelection().toString() && ctx.mode() !== 'eliminator') return; act(e); });
      row.addEventListener('keydown', e => { if (e.key === ' ' || e.key === 'Enter') { e.preventDefault(); act(e); } });
      list.append(row);
    });
    wrap.append(list);
    paint();
    return wrap;
  }

  // ---------- drag and drop ----------
  // Pointer events (not HTML5 drag) so it works with Chromebook touchpads
  // and touch screens. A tap on a chip then a tap on a box also works.
  let armed = null;
  function dragItem(item, ctx) {
    const wrap = h('div');
    wrap.append(stem(item));
    const resp = () => ctx.state.answers[item.n] || {};
    const setResp = r => {
      if (Object.keys(r).length) ctx.state.answers[item.n] = r; else delete ctx.state.answers[item.n];
      ctx.onChange(); paint();
    };
    const choiceById = id => item.choices.find(c => c.id === id);

    if (item.bankTitle) wrap.append(h('div', { class: 'dd-title' }, item.bankTitle));
    const bank = h('div', { class: 'dd-bank' + (item.bankColumns ? ' cols' : ''), 'data-bank': '1', style: item.bankColumns ? `grid-template-columns:repeat(${item.bankColumns},max-content)` : null });
    wrap.append(bank);

    let targetEl;
    const zones = [];
    const t = item.target;
    if (t.src) {
      if (t.title) wrap.append(h('div', { class: 'dd-title' }, t.title));
      targetEl = h('div', { class: 'dd-target', style: `max-width:${t.width || 460}px` });
      targetEl.append(h('img', { src: ctx.base + t.src, alt: t.alt || '', draggable: 'false' }));
      t.zones.forEach(z => {
        const ze = h('div', { class: 'dd-zone', 'data-zone': z.id, style: `left:${z.x}%;top:${z.y}%;width:${z.w}%;height:${z.h}%`, 'aria-label': 'Answer box ' + z.id });
        targetEl.append(ze); zones.push(ze);
      });
    } else if (t.grid) {
      if (t.title) wrap.append(h('div', { class: 'dd-title' }, t.title));
      targetEl = h('div', { class: 'dd-grid', style: `grid-template-columns:repeat(${t.grid.cols},52px)` });
      for (let r = 1; r <= t.grid.rows; r++) for (let c = 1; c <= t.grid.cols; c++) {
        const ze = h('div', { class: 'dd-slot', 'data-zone': `r${r}c${c}`, 'aria-label': `Row ${r} column ${c}` });
        targetEl.append(ze); zones.push(ze);
      }
    } else if (t.html) {
      if (t.title) wrap.append(h('div', { class: 'dd-title' }, t.title));
      targetEl = h('div', { 'data-read': '1' }, t.html.replace(/\[\[(\w+)\]\]/g, (m, id) => `<span class="dd-slot" data-zone="${id}" aria-label="Answer box">${t.slotLabels && t.slotLabels[id] ? `<span class="ph">${t.slotLabels[id]}</span>` : ''}</span>`));
      zones.push(...targetEl.querySelectorAll('[data-zone]'));
    }
    wrap.append(targetEl);

    const makeChip = (choice, fromZone) => {
      const inner = choice.img ? `<img src="${ctx.base + choice.img}" alt="" draggable="false" style="width:${choice.width || 90}px;display:block;margin:0 auto">${choice.text ? `<span class="chip-cap">${choice.text}</span>` : ''}` : (choice.html || choice.text);
      const chip = h('div', { class: 'dd-chip' + (choice.img ? ' img-chip' : ''), 'data-choice': choice.id, tabindex: '0', role: 'button', 'aria-label': (choice.alt || choice.text) + (fromZone ? ' (placed)' : '') }, inner);
      bindDrag(chip, choice.id, fromZone);
      return chip;
    };

    const place = (choiceId, zoneId, fromZone) => {
      const r = { ...resp() };
      if (fromZone) delete r[fromZone];
      if (zoneId) {
        const prev = r[zoneId];
        r[zoneId] = choiceId;
        if (prev && fromZone && prev !== choiceId && item.swap !== false) r[fromZone] = prev;
      }
      setResp(r);
    };

    function bindDrag(chip, choiceId, fromZone) {
      let start = null, ghost = null, overZone = null;
      chip.addEventListener('pointerdown', e => {
        if (ctx.mode() === 'highlighter') return;
        e.preventDefault();
        start = { x: e.clientX, y: e.clientY, id: e.pointerId };
        chip.setPointerCapture(e.pointerId);
      });
      chip.addEventListener('pointermove', e => {
        if (!start) return;
        if (!ghost && Math.hypot(e.clientX - start.x, e.clientY - start.y) > 5) {
          const r = chip.getBoundingClientRect();
          ghost = chip.cloneNode(true);
          ghost.classList.add('dd-ghost');
          ghost.style.width = r.width + 'px';
          ghost.style.height = r.height + 'px';
          ghost.dataset.dx = e.clientX - r.left; ghost.dataset.dy = e.clientY - r.top;
          document.body.append(ghost);
        }
        if (ghost) {
          ghost.style.left = (e.clientX - ghost.dataset.dx) + 'px';
          ghost.style.top = (e.clientY - ghost.dataset.dy) + 'px';
          const under = document.elementFromPoint(e.clientX, e.clientY);
          const z = under && under.closest('[data-zone]');
          if (overZone && overZone !== z) overZone.classList.remove('over');
          if (z && wrap.contains(z)) { z.classList.add('over'); overZone = z; } else overZone = null;
        }
      });
      const end = e => {
        if (!start) return;
        const moved = !!ghost;
        if (ghost) ghost.remove();
        if (overZone) overZone.classList.remove('over');
        start = null; ghost = null;
        if (moved) {
          const under = document.elementFromPoint(e.clientX, e.clientY);
          const z = under && under.closest('[data-zone]');
          if (z && wrap.contains(z)) place(choiceId, z.dataset.zone, fromZone);
          else if (fromZone) place(choiceId, null, fromZone);
          overZone = null;
        } else tapArm();
      };
      // tap: arm this chip, then tap a box to place it
      const tapArm = () => {
        if (armed && armed.chip === chip) { disarm(); return; }
        disarm();
        armed = { chip, choiceId, fromZone, wrap };
        chip.classList.add('armed');
        zones.forEach(z => z.classList.add('ready'));
      };
      chip.addEventListener('pointerup', end);
      chip.addEventListener('pointercancel', () => { if (ghost) ghost.remove(); ghost = null; start = null; });
      chip.addEventListener('keydown', e => {
        if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); tapArm(); }
        if ((e.key === 'Delete' || e.key === 'Backspace') && fromZone) place(choiceId, null, fromZone);
      });
    }
    function disarm() {
      if (!armed) return;
      armed.chip.classList.remove('armed');
      armed.wrap.querySelectorAll('.ready').forEach(z => z.classList.remove('ready'));
      armed = null;
    }
    zones.forEach(z => {
      z.addEventListener('click', e => {
        if (!armed || armed.wrap !== wrap) return;
        if (e.target.closest('.dd-chip') && e.target.closest('.dd-chip') === armed.chip) return;
        const a = armed; disarm();
        place(a.choiceId, z.dataset.zone, a.fromZone);
      });
    });
    bank.addEventListener('click', e => {
      if (armed && armed.wrap === wrap && armed.fromZone && !e.target.closest('.dd-chip')) { const a = armed; disarm(); place(a.choiceId, null, a.fromZone); }
    });

    function paint() {
      const r = resp();
      const used = new Set(Object.values(r));
      bank.innerHTML = '';
      item.choices.forEach(c => {
        const chip = makeChip(c, null);
        if (!item.reuse && used.has(c.id)) chip.classList.add('used');
        bank.append(chip);
      });
      zones.forEach(z => {
        z.querySelectorAll('.dd-chip').forEach(n => n.remove());
        const ph = z.querySelector('.ph');
        const cid = r[z.dataset.zone];
        if (ph) ph.style.display = cid ? 'none' : '';
        if (cid && choiceById(cid)) z.append(makeChip(choiceById(cid), z.dataset.zone));
      });
    }
    paint();
    return wrap;
  }

  // ---------- inline choice (drop-down menus in text) ----------
  function inlineItem(item, ctx) {
    const wrap = h('div');
    wrap.append(stem(item));
    const body = h('div', { class: 'stem', 'data-read': '1' });
    body.innerHTML = item.text.replace(/\[\[(\w+)\]\]/g, (m, id) => {
      const opts = (item.menus[id] || []).map(o => `<option>${o}</option>`).join('');
      return `<select class="inline-sel" data-menu="${id}" aria-label="Choose an answer"><option value="">Select</option>${opts}</select>`;
    });
    const r = ctx.state.answers[item.n] || {};
    body.querySelectorAll('select').forEach(sel => {
      if (r[sel.dataset.menu]) sel.value = r[sel.dataset.menu];
      sel.addEventListener('change', () => {
        const cur = { ...(ctx.state.answers[item.n] || {}) };
        if (sel.value) cur[sel.dataset.menu] = sel.value; else delete cur[sel.dataset.menu];
        if (Object.keys(cur).length) ctx.state.answers[item.n] = cur; else delete ctx.state.answers[item.n];
        ctx.onChange();
      });
    });
    wrap.append(body);
    return wrap;
  }

  // ---------- constructed response ----------
  function editor(initial, onInput, max = 5000, label = 'Response') {
    const box = h('div', { class: 'cr-box' });
    const tools = h('div', { class: 'cr-tools' });
    const ed = h('div', { class: 'cr-edit', contenteditable: 'true', role: 'textbox', 'aria-multiline': 'true', 'aria-label': label, spellcheck: 'false' });
    ed.innerHTML = initial || '';
    const count = h('div', { class: 'cr-count' });
    const upd = () => {
      const n = ed.innerText.replace(/\n$/, '').length;
      count.textContent = `Characters: ${n} / ${max}`;
    };
    const cmd = (c, ico, lbl) => {
      const b = h('button', { type: 'button', title: lbl, 'aria-label': lbl }, ico);
      b.addEventListener('mousedown', e => e.preventDefault());
      b.addEventListener('click', () => { ed.focus(); document.execCommand(c); onInput(ed.innerHTML, ed.innerText); upd(); });
      return b;
    };
    tools.append(cmd('undo', ICON.undo, 'Undo'), cmd('redo', ICON.redo, 'Redo'), h('span', { class: 'sep' }),
      cmd('bold', '<b>B</b>', 'Bold'), cmd('italic', '<i>I</i>', 'Italic'), cmd('underline', '<u>U</u>', 'Underline'));
    ed.addEventListener('input', () => {
      if (ed.innerText.length > max) { document.execCommand('undo'); }
      onInput(ed.innerHTML, ed.innerText); upd();
    });
    ed.addEventListener('paste', e => {
      e.preventDefault();
      document.execCommand('insertText', false, (e.clipboardData || window.clipboardData).getData('text'));
    });
    box.append(tools, ed, count);
    upd();
    return box;
  }
  function crItem(item, ctx) {
    const wrap = h('div');
    wrap.append(stem(item));
    const saved = ctx.state.answers[item.n];
    if (item.parts) {
      // Labeled response areas, e.g. "Beaker number:" and "Evidence in model:"
      const vals = (saved && saved.parts) ? { ...saved.parts } : {};
      const commit = () => {
        const filled = Object.values(vals).some(v => v && v.text);
        if (filled) ctx.state.answers[item.n] = { parts: { ...vals }, text: item.parts.map((p, i) => `${p.label} ${(vals[i] && vals[i].text) || ''}`).join('\n') };
        else delete ctx.state.answers[item.n];
        ctx.onChange();
      };
      item.parts.forEach((p, i) => {
        wrap.append(h('p', { class: 'stem', style: 'margin:14px 0 6px', 'data-read': '1' }, p.label));
        const ed = editor(vals[i] ? vals[i].html : '', (html, text) => {
          vals[i] = text.trim() ? { html, text: text.trim() } : null;
          commit();
        }, p.maxChars || 2000, `Question ${item.n} ${p.label}`);
        if (p.short) ed.querySelector('.cr-edit').style.minHeight = '44px';
        wrap.append(ed);
      });
      return wrap;
    }
    wrap.append(editor(saved ? saved.html : '', (html, text) => {
      if (text.trim()) ctx.state.answers[item.n] = { html, text: text.trim() };
      else delete ctx.state.answers[item.n];
      ctx.onChange();
    }, item.maxChars || 5000, 'Question ' + item.n + ' response'));
    return wrap;
  }

  // ---------- table (type into cells, or check a cell) ----------
  // cells are plain HTML strings, {"in": id} text-entry cells, or
  // {"check": id, "group": g} checkmark cells (one check per group).
  function tableItem(item, ctx) {
    const wrap = h('div');
    wrap.append(stem(item));
    const t = item.table;
    const cur = () => ctx.state.answers[item.n] || {};
    const set = (id, v) => {
      const r = { ...cur() };
      if (v === '' || v == null || v === false) delete r[id]; else r[id] = v;
      if (Object.keys(r).length) ctx.state.answers[item.n] = r; else delete ctx.state.answers[item.n];
      ctx.onChange();
    };
    const tbl = h('table', { class: 'stim-table entry-table' });
    if (t.caption) tbl.append(h('caption', { class: 'fig-cap' }, t.caption));
    const checks = [];
    t.rows.forEach((row, ri) => {
      const tr = h('tr');
      row.forEach(cell => {
        const head = ri === 0 && t.header !== false;
        const td = h(head ? 'th' : 'td');
        if (cell && typeof cell === 'object' && cell.in) {
          const inp = h('input', { class: 'cell-in', type: 'text', autocomplete: 'off', spellcheck: 'false', 'aria-label': cell.label || (t.labels && t.labels[cell.in]) || 'Answer ' + cell.in, maxlength: cell.max || 80, style: `width:${cell.width || 9}em` });
          inp.value = cur()[cell.in] || '';
          inp.addEventListener('input', () => set(cell.in, inp.value.trim() ? inp.value : ''));
          td.append(inp); td.classList.add('cell-entry');
        } else if (cell && typeof cell === 'object' && cell.check) {
          const b = h('button', { type: 'button', class: 'cell-check', 'aria-label': cell.label || (t.labels && t.labels[cell.check]) || 'Check ' + cell.check, 'data-check': cell.check, 'data-group': cell.group || '' });
          b.addEventListener('click', () => {
            if (ctx.mode() === 'highlighter') return;
            const on = !cur()[cell.check];
            if (on && cell.group) checks.filter(c => c.dataset.group === cell.group && c !== b).forEach(c => { const r = { ...cur() }; delete r[c.dataset.check]; ctx.state.answers[item.n] = r; });
            set(cell.check, on ? true : '');
            paint();
          });
          checks.push(b); td.append(b); td.classList.add('cell-entry');
        } else if (cell && typeof cell === 'object') {
          // fixed cell with formatting, e.g. {"html":"Mineral","th":true,"style":"background:#ddd"}
          td.innerHTML = cell.html || '';
          if (cell.style) td.setAttribute('style', cell.style);
          if (cell.th) td.style.fontWeight = '700';
          if (cell.rowspan) td.rowSpan = cell.rowspan;
          if (cell.colspan) td.colSpan = cell.colspan;
        } else td.innerHTML = cell == null ? '' : String(cell);
        tr.append(td);
      });
      tbl.append(tr);
    });
    const paint = () => checks.forEach(b => { const on = !!cur()[b.dataset.check]; b.setAttribute('aria-pressed', on); b.textContent = on ? '\u2713' : ''; });
    paint();
    wrap.append(tbl);
    if (item.after) wrap.append(h('div', { class: 'stem', 'data-read': '1', style: 'margin-top:14px' }, item.after));
    return wrap;
  }

  // ---------- multi-part (e.g. drag a model, then explain it) ----------
  // Each part is rendered like its own item; the student must complete every
  // part correctly for credit, as NYS scoring policy requires.
  function partN(item, i) { return item.n + '_' + i; }
  function multiItem(item, ctx) {
    const wrap = h('div');
    wrap.append(stem(item));
    const collect = () => {
      const parts = {};
      item.parts.forEach((p, i) => { const r = ctx.state.answers[partN(item, i)]; if (r != null) parts[i] = r; });
      if (Object.keys(parts).length) ctx.state.answers[item.n] = { parts }; else delete ctx.state.answers[item.n];
    };
    item.parts.forEach((p, i) => {
      const sub = { ...p, n: partN(item, i), stem: p.label || p.stem || '' };
      const holder = h('div', { class: 'part' });
      holder.append(render(sub, { ...ctx, onChange: () => { collect(); ctx.onChange(); } }));
      wrap.append(holder);
    });
    collect();
    return wrap;
  }

  const renderers = {
    mc: (i, c) => choiceItem(i, c, false),
    ms: (i, c) => choiceItem(i, c, true),
    dragdrop: dragItem,
    inline: inlineItem,
    cr: crItem,
    table: tableItem,
    multi: multiItem
  };

  function render(item, ctx) {
    const r = renderers[item.type];
    if (!r) return h('div', {}, `<p>Unsupported item type: ${item.type}</p>`);
    return r(item, ctx);
  }

  function isAnswered(item, resp) {
    if (resp == null) return false;
    if (item.type === 'multi') return !!resp.parts && Object.keys(resp.parts).length > 0;
    if (item.type === 'dragdrop' || item.type === 'inline' || item.type === 'table') return Object.keys(resp).length > 0;
    if (item.type === 'ms') return resp.length > 0;
    return true;
  }

  // Returns 'correct' | 'incorrect' | 'self' (needs self-scoring) | 'blank'
  function score(item, resp) {
    if (!isAnswered(item, resp)) return 'blank';
    if (item.type === 'multi') {
      const ss = item.parts.map((p, i) => score(p, resp.parts[i]));
      if (ss.includes('incorrect') || ss.includes('blank')) return 'incorrect';
      return ss.includes('self') ? 'self' : 'correct';
    }
    if (item.type === 'cr' || item.scoring === 'self' || item.key == null) return 'self';
    if (item.type === 'table') {
      const norm = v => String(v).toLowerCase().replace(/\s+/g, ' ').replace(/[.]$/, '').trim();
      const keyOk = Object.entries(item.key).every(([id, v]) => v === true ? resp[id] === true : [].concat(v).map(norm).includes(norm(resp[id] || '')));
      const extraCheck = Object.entries(resp).some(([id, v]) => v === true && item.key[id] !== true);
      if (keyOk && !extraCheck) return 'correct';
      // lenient: the guide accepts other wordings, so a typed answer the key
      // does not list goes to self-checking instead of being marked wrong.
      return item.lenient && !extraCheck ? 'self' : 'incorrect';
    }
    const ok = v => Array.isArray(v) ? v : [v];
    if (item.type === 'mc') return resp === item.key ? 'correct' : 'incorrect';
    if (item.type === 'ms') {
      const a = [...resp].sort().join(), b = [...item.key].sort().join();
      return a === b ? 'correct' : 'incorrect';
    }
    if (item.type === 'dragdrop' || item.type === 'inline') {
      const keyZones = Object.keys(item.key);
      const all = keyZones.every(z => ok(item.key[z]).includes(resp[z]));
      const extra = Object.keys(resp).some(z => !(z in item.key));
      return all && !extra ? 'correct' : 'incorrect';
    }
    return 'self';
  }

  function describe(item, resp) {
    if (resp == null) return '(no answer)';
    const txt = id => { const c = (item.choices || []).find(c => c.id === id); return c ? (c.text || c.alt || id) : id; };
    if (item.type === 'mc') return resp;
    if (item.type === 'ms') return resp.join(', ');
    if (item.type === 'cr') return resp.text;
    if (item.type === 'multi') return item.parts.map((p, i) => `${stripTags(p.label || 'Part ' + (i + 1))} ${describe(p, resp.parts[i])}`).join('\n');
    if (item.type === 'table') return Object.entries(resp).map(([k, v]) => `${cellName(item, k)}: ${v === true ? '\u2713' : v}`).join('; ');
    if (item.type === 'inline') return Object.entries(resp).map(([k, v]) => `${k}: ${v}`).join('; ');
    if (item.type === 'dragdrop') return Object.entries(resp).map(([k, v]) => `${zoneName(item, k)}: ${txt(v)}`).join('; ');
    return JSON.stringify(resp);
  }
  function stripTags(t) { return String(t).replace(/<[^>]+>/g, '').trim(); }
  function cellName(item, id) { return (item.table && item.table.labels && item.table.labels[id]) || id; }
  function zoneName(item, z) {
    const zs = item.target && item.target.zoneNames;
    return (zs && zs[z]) || ('Box ' + z.replace(/^z/i, ''));
  }
  function describeKey(item) {
    if (item.type === 'multi') {
      const ks = item.parts.map((p, i) => { const k = describeKey(p); return k ? `${stripTags(p.label || 'Part ' + (i + 1))} ${k}` : null; }).filter(Boolean);
      return ks.length ? ks.join('; ') : null;
    }
    if (item.key == null) return null;
    if (item.type === 'table') return Object.entries(item.key).map(([k, v]) => `${cellName(item, k)}: ${v === true ? '\u2713' : [].concat(v)[0]}`).join('; ') + (Object.values(item.key).some(v => Array.isArray(v) && v.length > 1) ? ' (other correct wordings also accepted)' : '');
    const txt = id => { const c = (item.choices || []).find(c => c.id === id); return c ? (c.text || c.alt || id) : id; };
    if (item.type === 'mc') return item.key;
    if (item.type === 'ms') return item.key.join(', ');
    if (item.type === 'inline') return Object.entries(item.key).map(([k, v]) => `${k}: ${[].concat(v).join(' or ')}`).join('; ');
    if (item.type === 'dragdrop') return Object.entries(item.key).map(([k, v]) => `${zoneName(item, k)}: ${[].concat(v).map(txt).join(' or ')}`).join('; ');
    return null;
  }

  return { render, isAnswered, score, describe, describeKey, editor, h };
})();
