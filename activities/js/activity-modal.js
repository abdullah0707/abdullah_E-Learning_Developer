// The Function Activity popup: 95% of the screen, the live sample on one side
// and a panel (Settings / Try it / Code) on the other. The settings editors,
// presets, simulated course buttons and player-scale preview follow the
// Showcase Lab's tested implementation (tools/showcase-build/lab_template.html
// in the Storyline project), in both languages and the site's own look.
(function () {
  'use strict';

  var STR = {
    ar: {
      close: 'إغلاق', width: 'عرض الشاشة', full: 'كامل', tablet: 'تابلت', phone: 'موبايل',
      scale: 'حجم المشغّل', replay: '↻ إعادة تشغيل العينة', frameTitle: 'عينة الفانكشن',
      tabSettings: 'الإعدادات', tabTry: 'جرّبها', tabCode: 'الكود والتركيب',
      preset: 'مثال جاهز', reset: 'استعادة الافتراضي',
      actions: 'أزرار الكورس (محاكاة)', actionsNote: 'بتعمل نفس اللي زرار Storyline هيعمله في الكورس الحقيقي.',
      toggles: 'مفاتيح من Storyline', togglesNote: 'فاريبولات True/False بتتعمل في الكورس نفسه وبتشغّل أو تقفل مزايا في الفانكشن.',
      log: 'اللي اتبعت لـ Storyline', logEmpty: 'لسه مفيش — اتفاعل مع العينة أو دوس على زرار.', clearLog: 'مسح',
      code: 'الكود الجاهز', copy: 'نسخ الكود', copied: 'اتنسخ الكود', copyFail: 'النسخ مش متاح — حدد الكود يدويًا',
      download: 'تحميل .js', install: 'خطوات التركيب في Storyline',
      addItem: '+ إضافة عنصر', itemName: 'اسم العنصر', removeItem: 'حذف العنصر', itemSvg: 'شكل العنصر (SVG)',
      noPartner: '— بدون شريك —', partnerOf: 'شريك', shuffle: 'خلط', moveUp: 'تحريك لفوق', moveDown: 'تحريك لتحت',
      tryExample: 'جرّب مثال', clear: 'مسح', addColor: 'إضافة لون', removeColor: 'حذف اللون', color: 'لون',
      scaleNote: 'مقياس', open: 'فتح تفاصيل: '
    },
    en: {
      close: 'Close', width: 'Screen width', full: 'Full', tablet: 'Tablet', phone: 'Phone',
      scale: 'Player size', replay: '↻ Replay sample', frameTitle: 'Function sample',
      tabSettings: 'Settings', tabTry: 'Try it', tabCode: 'Code & install',
      preset: 'Ready example', reset: 'Reset to defaults',
      actions: 'Course buttons (simulated)', actionsNote: 'They do exactly what the Storyline button will do in the real course.',
      toggles: 'Switches from Storyline', togglesNote: 'True/False variables you create in the course itself; they turn features of the function on or off.',
      log: 'Sent to Storyline', logEmpty: 'Nothing yet — interact with the sample or press a button.', clearLog: 'Clear',
      code: 'Ready-to-use code', copy: 'Copy code', copied: 'Code copied', copyFail: 'Copying isn\'t available — select the code manually',
      download: 'Download .js', install: 'Installing it in Storyline',
      addItem: '+ Add item', itemName: 'Item name', removeItem: 'Remove item', itemSvg: 'Item shape (SVG)',
      noPartner: '— no match —', partnerOf: 'Match for', shuffle: 'Shuffle', moveUp: 'Move up', moveDown: 'Move down',
      tryExample: 'Try an example', clear: 'Clear', addColor: 'Add color', removeColor: 'Remove color', color: 'Color',
      scaleNote: 'scale', open: 'Open details for: '
    }
  };
  function lang() { return window.AnimLibI18n && window.AnimLibI18n.get() === 'en' ? 'en' : 'ar'; }
  function L(k) { return STR[lang()][k]; }
  function pick(obj, base) {
    var ar = obj[base + 'Ar'], en = obj[base + 'En'];
    return lang() === 'en' ? (en || ar || '') : (ar || en || '');
  }
  function paramLabel(p) { return lang() === 'en' ? (p.labelEn || p.labelAr || p.label || p.key) : (p.labelAr || p.label || p.labelEn || p.key); }
  function optionLabel(o) { return lang() === 'en' ? (o.labelEn || o.label || o.value) : (o.labelAr || o.label || o.value); }
  function track(label) { if (window.trackEvent) window.trackEvent(label); }

  function clone(v) { return v === undefined ? v : JSON.parse(JSON.stringify(v)); }
  function el(tag, cls, text) { var n = document.createElement(tag); if (cls) n.className = cls; if (text != null) n.textContent = text; return n; }
  var $ = function (id) { return document.getElementById(id); };

  /* ---------------- code editing (same rules as the Lab and modal.js) ---------------- */
  var LIST_TYPES = ['item-list', 'pairs', 'color-list', 'order'];
  function jsStringLiteral(s) { return String(s).replace(/\\/g, '\\\\').replace(/'/g, "\\'").replace(/\r?\n/g, '\\n'); }
  function commentSafe(s) { return String(s).replace(/[\r\n]+/g, ' '); }

  // List params are rewritten as a whole `var KEY = [ ... ];` block. The
  // source always puts the closing "];" on its own line, so the match ends
  // there even if a label happens to contain "];".
  function serializeList(p, vals, params) {
    var v = vals[p.key] || [];
    var byKey = function (k) { return params.filter(function (q) { return q.key === k; })[0]; };
    if (p.type === 'item-list') {
      var fields = p.fields || ['id', 'label'];
      return '[\n' + v.map(function (it, i) {
        return "    { key: '" + p.keyPrefix + (i + 1) + "'" +
          fields.map(function (f) { return ', ' + f + ": '" + jsStringLiteral(it[f] || '') + "'"; }).join('') + ' }';
      }).join(',\n') + '\n  ]';
    }
    if (p.type === 'order') {
      var list = byKey(p.listParam);
      return '[\n    ' + v.map(function (i) { return "'" + list.keyPrefix + (i + 1) + "'"; }).join(', ') + '\n  ]';
    }
    if (p.type === 'color-list') return '[\n    ' + v.map(function (c) { return "'" + c + "'"; }).join(', ') + '\n  ]';
    if (p.type === 'pairs') {
      var Lp = byKey(p.leftParam), Rp = byKey(p.rightParam);
      var lv = vals[p.leftParam] || [], rv = vals[p.rightParam] || [];
      var rows = v.filter(function (pr) { return lv[pr[0]] && rv[pr[1]]; });
      return '[\n' + rows.map(function (pr, i) {
        return "    ['" + Lp.keyPrefix + (pr[0] + 1) + "', '" + Rp.keyPrefix + (pr[1] + 1) + "']" + (i < rows.length - 1 ? ',' : '') +
          ' // ' + commentSafe(lv[pr[0]].label) + ' ↔ ' + commentSafe(rv[pr[1]].label);
      }).join('\n') + '\n  ]';
    }
    return '[]';
  }

  function applyParamValues(code, params, vals) {
    var out = code;
    params.forEach(function (p) {
      var val = vals[p.key];
      if (val === undefined) return;
      if (LIST_TYPES.indexOf(p.type) !== -1) {
        var reList = new RegExp('(var ' + p.key + ' = )\\[[\\s\\S]*?\\n[ \\t]*\\];');
        out = out.replace(reList, function (m, pre) { return pre + serializeList(p, vals, params) + ';'; });
        return;
      }
      // Dotted keys ("config.lineWidth") point at a property inside an
      // object literal rather than a top-level `var` declaration.
      if (p.key.indexOf('.') !== -1) {
        var propName = p.key.slice(p.key.lastIndexOf('.') + 1);
        var reProp = new RegExp('(\\b' + propName + ':\\s*)[^,\\n}]+([,}])');
        var rendered = (p.type === 'color' || p.type === 'text' || p.type === 'textarea') ? "'" + jsStringLiteral(val) + "'" : String(val);
        out = out.replace(reProp, function (m, pre, post) { return pre + rendered + post; });
        return;
      }
      if (p.type === 'text' || p.type === 'textarea') {
        var reText = new RegExp("(var " + p.key + " = )'[\\s\\S]*?'(;)");
        out = out.replace(reText, function (m, pre, post) { return pre + "'" + jsStringLiteral(val) + "'" + post; });
        return;
      }
      var re;
      if (p.type === 'color' || p.type === 'select') {
        re = new RegExp("(var " + p.key + " = )'[^']*'(;)");
        out = out.replace(re, "$1'" + val + "'$2");
      } else if (p.type === 'checkbox') {
        re = new RegExp("(var " + p.key + " = )(true|false)(;)");
        out = out.replace(re, '$1' + val + '$3');
      } else {
        re = new RegExp("(var " + p.key + " = )[^;]+(;)");
        out = out.replace(re, '$1' + val + '$2');
      }
    });
    return out;
  }

  /* ---------------- state ---------------- */
  var current = null, values = {}, toggles = {}, width = 0, scale = 1, timer = null;
  var refreshers = {}, stateMap = null, openSvg = {}, lastFocus = null, pollTimer = null, lastLog = '', tab = 'settings', group = null;
  function paramByKey(k) { return current.params.filter(function (p) { return p.key === k; })[0]; }
  function editedCode() { return applyParamValues(current.code, current.params, values); }

  /* ---------------- markup (built once, on first open) ---------------- */
  var built = false;
  function ensureDom() {
    if (built) return;
    built = true;
    var root = el('div', 'act-backdrop');
    root.id = 'actModal';
    root.hidden = true;
    root.innerHTML =
      '<div class="act-modal" role="dialog" aria-modal="true" aria-labelledby="actTitle">' +
        '<header class="act-head">' +
          '<div class="act-head__text"><h3 id="actTitle"></h3><p id="actMeta"></p></div>' +
          '<div class="act-head__badges" id="actBadges"></div>' +
          '<button type="button" class="btn btn-icon act-close" id="actClose">&#10005;</button>' +
        '</header>' +
        '<div class="act-body">' +
          '<section class="act-stage">' +
            '<div class="act-toolbar">' +
              '<div class="act-tool"><span class="act-tool__label" data-s="width"></span>' +
                '<div class="act-seg" id="actWidthSeg">' +
                  '<button type="button" data-w="0" aria-pressed="true" data-s="full"></button>' +
                  '<button type="button" data-w="1024">1024</button>' +
                  '<button type="button" data-w="768"><span data-s="tablet"></span> 768</button>' +
                  '<button type="button" data-w="390"><span data-s="phone"></span> 390</button>' +
                '</div></div>' +
              '<div class="act-tool"><span class="act-tool__label" data-s="scale"></span>' +
                '<div class="act-seg" id="actScaleSeg">' +
                  '<button type="button" data-sc="0.75">75%</button>' +
                  '<button type="button" data-sc="1" aria-pressed="true">100%</button>' +
                  '<button type="button" data-sc="1.25">125%</button>' +
                '</div></div>' +
              '<button type="button" class="act-btn act-btn--primary" id="actReplay" data-s="replay"></button>' +
            '</div>' +
            '<p class="act-hint" id="actHint" hidden></p>' +
            '<div class="act-frame-outer"><div class="act-frame-shell" id="actFrameShell"><iframe id="actFrame"></iframe></div></div>' +
            '<div class="act-frame-meta"><span id="actFrameSize"></span></div>' +
          '</section>' +
          '<aside class="act-panel">' +
            '<p class="act-desc" id="actDesc" role="button" tabindex="0" aria-expanded="false"></p>' +
            '<div class="act-tabs" role="tablist">' +
              '<button type="button" role="tab" data-tab="settings" data-s="tabSettings"></button>' +
              '<button type="button" role="tab" data-tab="try"><span data-s="tabTry"></span><b class="act-tabs__count" id="actLogCount"></b></button>' +
              '<button type="button" role="tab" data-tab="code" data-s="tabCode"></button>' +
            '</div>' +
            '<div class="act-pane" data-pane="settings">' +
              '<div class="act-preset-row" id="actPresetRow"><label for="actPresetSel" data-s="preset"></label><select id="actPresetSel"></select>' +
                '<button type="button" class="act-btn" id="actReset" data-s="reset"></button></div>' +
              '<div id="actControls"></div>' +
            '</div>' +
            '<div class="act-pane" data-pane="try" hidden>' +
              '<section class="act-section" id="actActionsBox"><h4 data-s="actions"></h4><p class="act-note" data-s="actionsNote"></p><div class="act-action-btns" id="actActions"></div></section>' +
              '<section class="act-section" id="actTogglesBox"><h4 data-s="toggles"></h4><p class="act-note" data-s="togglesNote"></p><div class="act-toggles" id="actToggles"></div></section>' +
              '<section class="act-section"><div class="act-section__head"><h4 data-s="log"></h4><button type="button" class="act-link" id="actClearLog" data-s="clearLog"></button></div>' +
                '<pre class="act-log" id="actLog"></pre></section>' +
            '</div>' +
            '<div class="act-pane" data-pane="code" hidden>' +
              '<section class="act-section"><div class="act-section__head"><h4 data-s="code"></h4>' +
                '<div class="act-code-actions"><button type="button" class="act-btn" id="actDownload" data-s="download"></button>' +
                '<button type="button" class="act-btn act-btn--primary" id="actCopy" data-s="copy"></button></div></div>' +
                '<pre class="act-code" id="actCode"></pre></section>' +
              '<section class="act-section"><h4 data-s="install"></h4><ol class="act-install" id="actInstall"></ol></section>' +
            '</div>' +
          '</aside>' +
        '</div>' +
      '</div>' +
      '<div class="act-toast" id="actToast" role="status" aria-live="polite"></div>';
    document.body.appendChild(root);

    root.addEventListener('click', function (e) { if (e.target === root) close(); });
    $('actClose').addEventListener('click', close);
    document.addEventListener('keydown', function (e) {
      if (root.hidden) return;
      if (e.key === 'Escape') { e.preventDefault(); close(); return; }
      if (e.key === 'Tab') trapFocus(e);
    });

    $('actWidthSeg').addEventListener('click', function (e) {
      var b = e.target.closest('button'); if (!b) return;
      width = Number(b.dataset.w); pressGroup(this, b);
      $('actFrameShell').style.maxWidth = width ? width + 'px' : '';
      setTimeout(function () { updateSize(); play(); }, 280);
    });
    $('actScaleSeg').addEventListener('click', function (e) {
      var b = e.target.closest('button'); if (!b) return;
      scale = Number(b.dataset.sc); pressGroup(this, b); play(); updateSize();
    });
    $('actReplay').addEventListener('click', function () { play(); track('activity_replay'); });
    $('actReset').addEventListener('click', function () { resetValues(); renderSettings(); play(); });
    $('actPresetSel').addEventListener('change', function () {
      var pr = (current.previewPresets || [])[Number(this.value)];
      if (pr) { applyPreset(pr); track('activity_preset'); }
    });
    root.querySelector('.act-tabs').addEventListener('click', function (e) {
      var b = e.target.closest('[data-tab]'); if (b) setTab(b.dataset.tab);
    });
    $('actClearLog').addEventListener('click', function () {
      var w = $('actFrame').contentWindow, log = w && w.document && w.document.getElementById('__log');
      if (log) log.textContent = '';
      syncLog(true);
    });
    // The description shows two lines; clicking it shows the rest.
    function toggleDesc() { var d = $('actDesc'); d.setAttribute('aria-expanded', String(d.getAttribute('aria-expanded') !== 'true')); }
    $('actDesc').addEventListener('click', toggleDesc);
    $('actDesc').addEventListener('keydown', function (e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); toggleDesc(); } });
    $('actCopy').addEventListener('click', copyCode);
    $('actDownload').addEventListener('click', downloadCode);
    window.addEventListener('resize', updateSize);
    document.addEventListener('portfolio:langchange', function () { if (!root.hidden) relabel(); });
  }

  function trapFocus(e) {
    var f = $('actModal').querySelectorAll('button:not([disabled]), [href], input, select, textarea, [tabindex]:not([tabindex="-1"])');
    f = Array.prototype.filter.call(f, function (n) { return n.offsetParent !== null; });
    if (!f.length) return;
    var first = f[0], last = f[f.length - 1];
    if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
    else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
  }

  function pressGroup(seg, btn) {
    Array.prototype.forEach.call(seg.querySelectorAll('button'), function (b) { b.setAttribute('aria-pressed', b === btn ? 'true' : 'false'); });
  }
  function updateSize() {
    var f = $('actFrame'); if (!f || $('actModal').hidden) return;
    $('actFrameSize').textContent = Math.round(f.clientWidth) + ' × ' + Math.round(f.clientHeight) + ' px' + (scale !== 1 ? '  ·  ' + L('scaleNote') + ' ' + scale : '');
  }

  function setTab(name) {
    tab = name;
    Array.prototype.forEach.call($('actModal').querySelectorAll('[data-tab]'), function (b) { b.setAttribute('aria-selected', String(b.dataset.tab === name)); });
    Array.prototype.forEach.call($('actModal').querySelectorAll('[data-pane]'), function (p) { p.hidden = p.dataset.pane !== name; });
    if (name === 'code') $('actCode').textContent = editedCode();
  }

  /* ---------------- preview ---------------- */
  // For entries whose items come from item-list params, the preview builds
  // its node graph from the current items and gives each one a fixed preview
  // id - so blank or duplicate Object IDs typed by the visitor never break
  // the preview (they only matter in the copied code).
  function previewSetup() {
    var seed = Object.assign({}, current.previewSeedVars, toggles);
    var pf = current.previewItemsFromParams;
    if (!pf) {
      stateMap = current.previewNodeStateVars || null;
      return { item: Object.assign({}, current, { previewSeedVars: seed }), code: editedCode(), containerId: values.CONTAINER_ID };
    }
    var pv = clone(values), cols = [[], []], labels = [[], []], idMap = {};
    stateMap = {};
    [[pf.left, 'PREVIEW_L', 0], [pf.right, 'PREVIEW_R', 1]].forEach(function (s) {
      var p = paramByKey(s[0]);
      pv[s[0]] = (pv[s[0]] || []).map(function (it, i) {
        var pid = s[1] + (i + 1);
        cols[s[2]].push(pid);
        labels[s[2]].push(it.label || (p.keyPrefix + (i + 1)));
        idMap[pid] = pid;
        stateMap[p.keyPrefix + (i + 1)] = pid;
        return { label: it.label, id: pid };
      });
    });
    var item = Object.assign({}, current, {
      previewSeedVars: seed, previewMode: 'node-graph',
      previewNodeColumns: cols, previewNodeLabels: labels, previewContainerIdMap: idMap
    });
    return { item: item, code: applyParamValues(current.code, current.params, pv), containerId: null };
  }

  // The course log is shown in the panel's "Try it" tab, so the in-sample
  // copy is hidden to give the sample itself the whole frame.
  var HIDE_INNER_LOG = '<style>#__log{display:none!important}</style>';

  function play() {
    var holder = { srcdoc: '' };
    var s = previewSetup();
    var note = pick(current, 'previewNoContainerNote');
    window.ActivityRuntime.play(holder, s.item, s.code, s.containerId, note);
    var doc = holder.srcdoc.replace('</head>', HIDE_INNER_LOG + '</head>');
    // Same way Storyline scales its player: a CSS transform on the stage.
    if (scale !== 1) {
      doc = doc.replace('<div id="__stageWrap"',
        '<div id="__stageWrap" style="transform:scale(' + scale + ');transform-origin:0 0;width:' + (100 / scale) + '%;"');
    }
    $('actFrame').srcdoc = doc;
    lastLog = '';
    syncLog(true);
    if (tab === 'code') $('actCode').textContent = editedCode();
  }
  function schedule() { clearTimeout(timer); timer = setTimeout(play, 250); }

  var STATE_STYLE = {
    Right: { border: '#1FB89F', bg: 'rgba(52,225,200,.18)' },
    Wrong: { border: '#E0707A', bg: 'rgba(247,181,181,.35)' }
  };
  // Mirrors the sample's SetVar log into the panel, and Right/Wrong state
  // variables onto their preview nodes the way a real course switches each
  // shape's state from those variables.
  function syncLog(force) {
    var w = $('actFrame').contentWindow;
    var log = w && w.document && w.document.getElementById('__log');
    var text = log ? log.textContent : '';
    if (!force && text === lastLog) return;
    lastLog = text;
    var lines = text.split('\n').filter(Boolean);
    $('actLog').textContent = lines.length ? lines.slice(-80).join('\n') : L('logEmpty');
    $('actLog').classList.toggle('is-empty', !lines.length);
    $('actLogCount').textContent = lines.length ? String(lines.length) : '';
    $('actLog').scrollTop = $('actLog').scrollHeight;
  }
  function poll() {
    syncLog(false);
    var map = stateMap, w = $('actFrame').contentWindow;
    if (!map || !w || !w.__vars || !w.document) return;
    Object.keys(map).forEach(function (varName) {
      var node = w.document.querySelector('[data-model-id="' + map[varName] + '"]');
      if (!node) return;
      var st = STATE_STYLE[w.__vars[varName]];
      node.style.borderColor = st ? st.border : '';
      node.style.background = st ? st.bg : '';
    });
  }

  // Does what the real Storyline button would: set the trigger variable
  // (read from the param, so a renamed variable still works) and let the
  // widget's own GetVar polling pick it up - or run one of the widget's own
  // window functions (e.g. MG_hide), the way an "Execute JavaScript" trigger
  // in the course would.
  function pressAction(a) {
    var w = $('actFrame').contentWindow;
    if (!w || !w.__vars) return;
    var log = w.document.getElementById('__log');
    if (a.call) {
      if (typeof w[a.call] === 'function') w[a.call]();
      if (log) log.textContent += '▶ ' + a.call + '()\n';
    } else {
      var name = values[a.varParam] || a.varParam;
      w.__vars[name] = a.value;
      if (log) log.textContent += '▶ ' + (a.labelEn || a.labelAr) + ': ' + name + ' = ' + a.value + '\n';
    }
    syncLog(false);
    track('activity_action');
  }

  /* ---------------- settings editors ---------------- */
  function makeLabel(text, forId) { var l = el('label', null, text); if (forId) l.htmlFor = forId; return l; }
  function miniBtn(text, title, onClick) {
    var b = el('button', 'act-mini', text);
    b.type = 'button'; b.title = title; b.setAttribute('aria-label', title);
    b.addEventListener('click', onClick);
    return b;
  }
  function listHead(wrap, text) {
    var head = el('div', 'act-list-head'), count = el('span', 'act-count');
    head.appendChild(makeLabel(text)); head.appendChild(count); wrap.appendChild(head);
    return count;
  }
  function refreshDependents(listKey) {
    current.params.forEach(function (q) {
      var dep = (q.type === 'pairs' && (q.leftParam === listKey || q.rightParam === listKey)) || (q.type === 'order' && q.listParam === listKey);
      if (dep && refreshers[q.key]) refreshers[q.key]();
    });
  }
  // Pairs and orders are stored by item position, so removing an item drops
  // its entries and shifts every later position down by one.
  function fixAfterRemove(listKey, idx) {
    current.params.forEach(function (q) {
      if (q.type === 'order' && q.listParam === listKey) {
        values[q.key] = values[q.key].filter(function (i) { return i !== idx; }).map(function (i) { return i > idx ? i - 1 : i; });
        return;
      }
      if (q.type !== 'pairs') return;
      var col = q.leftParam === listKey ? 0 : (q.rightParam === listKey ? 1 : -1);
      if (col < 0) return;
      values[q.key] = values[q.key].filter(function (pr) { return pr[col] !== idx; })
        .map(function (pr) { var n = pr.slice(); if (n[col] > idx) n[col]--; return n; });
    });
  }
  function fixOrdersAfterAdd(listKey, idx) {
    current.params.forEach(function (q) { if (q.type === 'order' && q.listParam === listKey) values[q.key].push(idx); });
  }
  // A start order of 0..n-1 where no item begins in its correct place.
  function scrambled(n) { var o = []; for (var i = 0; i < n; i++) o.push((i + 1) % n); return o; }

  function buildItemList(p, wrap) {
    var count = listHead(wrap, paramLabel(p));
    var rows = el('div', 'act-rows'); wrap.appendChild(rows);
    var add = el('button', 'act-btn act-add', L('addItem')); add.type = 'button'; wrap.appendChild(add);
    var fields = p.fields || ['id', 'label'];
    function render() {
      var list = values[p.key];
      rows.innerHTML = '';
      count.textContent = list.length + ' / ' + p.max;
      list.forEach(function (it, i) {
        var row = el('div', 'act-item-row');
        row.style.gridTemplateColumns = 'auto minmax(0,1fr)' + (fields.indexOf('id') !== -1 ? ' minmax(0,1fr)' : '') +
          (fields.indexOf('svg') !== -1 ? ' auto' : '') + ' auto';
        row.appendChild(el('span', 'act-item-key', p.keyPrefix + (i + 1)));
        var name = el('input', 'act-in act-in--name'); name.type = 'text'; name.value = it.label;
        name.placeholder = L('itemName'); name.setAttribute('aria-label', L('itemName') + ' ' + (i + 1));
        name.addEventListener('input', function () { it.label = name.value; refreshDependents(p.key); schedule(); });
        row.appendChild(name);
        if (fields.indexOf('id') !== -1) {
          var idIn = el('input', 'act-in act-in--id'); idIn.type = 'text'; idIn.value = it.id;
          idIn.placeholder = 'Object ID'; idIn.spellcheck = false; idIn.setAttribute('aria-label', 'Object ID ' + (i + 1));
          idIn.addEventListener('input', function () { it.id = idIn.value.trim(); schedule(); });
          row.appendChild(idIn);
        }
        var svgBox = null;
        if (fields.indexOf('svg') !== -1) {
          var key = p.key + ':' + i;
          var svgBtn = miniBtn('◇', L('itemSvg'), function () { openSvg[key] = !openSvg[key]; render(); });
          svgBtn.classList.toggle('has-svg', !!it.svg);
          svgBtn.setAttribute('aria-expanded', openSvg[key] ? 'true' : 'false');
          row.appendChild(svgBtn);
          if (openSvg[key]) {
            svgBox = el('textarea', 'act-item-svg'); svgBox.value = it.svg || '';
            svgBox.placeholder = '<svg viewBox="0 0 100 100">…</svg>'; svgBox.spellcheck = false;
            svgBox.setAttribute('aria-label', L('itemSvg') + ' ' + (i + 1));
            svgBox.addEventListener('input', function () { it.svg = svgBox.value; svgBtn.classList.toggle('has-svg', !!it.svg.trim()); schedule(); });
          }
        }
        var del = miniBtn('×', L('removeItem'), function () {
          list.splice(i, 1); openSvg = {}; fixAfterRemove(p.key, i); render(); refreshDependents(p.key); schedule();
        });
        del.disabled = list.length <= p.min;
        row.appendChild(del);
        rows.appendChild(row);
        if (svgBox) rows.appendChild(svgBox);
      });
      add.disabled = list.length >= p.max;
    }
    add.addEventListener('click', function () {
      var list = values[p.key];
      if (list.length >= p.max) return;
      var item = { label: '' };
      if (fields.indexOf('id') !== -1) {
        var n = list.length + 1, newId = p.idPrefix + n;
        while (list.some(function (it) { return it.id === newId; })) newId = p.idPrefix + (++n);
        item.id = newId;
      }
      if (fields.indexOf('svg') !== -1) item.svg = '';
      list.push(item);
      fixOrdersAfterAdd(p.key, list.length - 1);
      render(); refreshDependents(p.key); schedule();
      var names = rows.querySelectorAll('.act-in--name');
      if (names.length) names[names.length - 1].focus();
    });
    refreshers[p.key] = render;
    render();
  }

  function buildPairs(p, wrap) {
    wrap.appendChild(makeLabel(paramLabel(p)));
    var rows = el('div', 'act-rows'); wrap.appendChild(rows);
    function nameOf(it, i, prefix) { return it.label || (prefix + (i + 1)); }
    function render() {
      var Lp = paramByKey(p.leftParam), Rp = paramByKey(p.rightParam);
      var lv = values[p.leftParam], rv = values[p.rightParam];
      rows.innerHTML = '';
      lv.forEach(function (it, li) {
        var row = el('div', 'act-pair-row');
        row.appendChild(el('span', 'act-chip-text', nameOf(it, li, Lp.keyPrefix)));
        row.appendChild(el('span', 'act-pair-arrow', '↔'));
        var sel = el('select', 'act-in'); sel.setAttribute('aria-label', L('partnerOf') + ' ' + nameOf(it, li, Lp.keyPrefix));
        var none = el('option', null, L('noPartner')); none.value = ''; sel.appendChild(none);
        var cur = values[p.key].filter(function (pr) { return pr[0] === li; })[0];
        rv.forEach(function (r, ri) {
          var o = el('option', null, nameOf(r, ri, Rp.keyPrefix)); o.value = String(ri);
          if (cur && cur[1] === ri) o.selected = true;
          sel.appendChild(o);
        });
        sel.addEventListener('change', function () {
          values[p.key] = values[p.key].filter(function (pr) { return pr[0] !== li; });
          if (sel.value !== '') values[p.key].push([li, Number(sel.value)]);
          values[p.key].sort(function (a, b) { return a[0] - b[0]; });
          schedule();
        });
        row.appendChild(sel);
        rows.appendChild(row);
      });
    }
    refreshers[p.key] = render;
    render();
  }

  // Start order: the item list in the order the learner will first see it,
  // rearranged with ↑/↓ or shuffled in one click.
  function buildOrder(p, wrap) {
    wrap.appendChild(makeLabel(paramLabel(p)));
    var rows = el('div', 'act-rows'); wrap.appendChild(rows);
    var mix = el('button', 'act-btn act-add', L('shuffle')); mix.type = 'button'; wrap.appendChild(mix);
    function render() {
      var list = paramByKey(p.listParam), items = values[p.listParam], order = values[p.key];
      rows.innerHTML = '';
      order.forEach(function (idx, pos) {
        var row = el('div', 'act-order-row');
        row.appendChild(el('span', 'act-item-key', String(pos + 1)));
        row.appendChild(el('span', 'act-chip-text', (items[idx] && items[idx].label) || (list.keyPrefix + (idx + 1))));
        var up = miniBtn('↑', L('moveUp'), function () { order.splice(pos - 1, 0, order.splice(pos, 1)[0]); render(); schedule(); });
        var down = miniBtn('↓', L('moveDown'), function () { order.splice(pos + 1, 0, order.splice(pos, 1)[0]); render(); schedule(); });
        up.disabled = pos === 0; down.disabled = pos === order.length - 1;
        row.appendChild(up); row.appendChild(down);
        rows.appendChild(row);
      });
    }
    mix.addEventListener('click', function () {
      var o = values[p.key], solved;
      do {
        for (var i = o.length - 1; i > 0; i--) { var j = Math.floor(Math.random() * (i + 1)); var t = o[i]; o[i] = o[j]; o[j] = t; }
        solved = o.every(function (v, k) { return v === k; });
      } while (solved && o.length > 1);
      render(); schedule();
    });
    refreshers[p.key] = render;
    render();
  }

  var EXTRA_COLORS = ['#7A5C99', '#2F8F9D', '#B8860B', '#D1495B', '#4F6D7A', '#8C6A5D'];
  function buildColorList(p, wrap) {
    var count = listHead(wrap, paramLabel(p));
    var box = el('div', 'act-swatches'); wrap.appendChild(box);
    function render() {
      var list = values[p.key];
      box.innerHTML = '';
      count.textContent = list.length + ' / ' + p.max;
      list.forEach(function (c, i) {
        var sw = el('div', 'act-swatch');
        var inp = el('input'); inp.type = 'color'; inp.value = c; inp.setAttribute('aria-label', L('color') + ' ' + (i + 1));
        inp.addEventListener('input', function () { list[i] = inp.value; schedule(); });
        sw.appendChild(inp);
        if (list.length > p.min) {
          var x = el('button', 'act-swatch__x', '×'); x.type = 'button'; x.setAttribute('aria-label', L('removeColor') + ' ' + (i + 1));
          x.addEventListener('click', function () { list.splice(i, 1); render(); schedule(); });
          sw.appendChild(x);
        }
        box.appendChild(sw);
      });
      if (list.length < p.max) box.appendChild(miniBtn('+', L('addColor'), function () { list.push(EXTRA_COLORS[list.length % EXTRA_COLORS.length]); render(); schedule(); }));
    }
    render();
  }

  function updateVisibility() {
    Array.prototype.forEach.call(document.querySelectorAll('#actControls [data-show-key]'), function (w) {
      w.hidden = String(values[w.dataset.showKey]) !== w.dataset.showVal;
    });
  }

  function buildControl(p) {
    var wrap = el('div', 'act-control');
    if (['textarea', 'item-list', 'pairs', 'color-list', 'order'].indexOf(p.type) !== -1) wrap.classList.add('act-control--wide');
    if (p.showIf) { wrap.dataset.showKey = p.showIf.key; wrap.dataset.showVal = String(p.showIf.value); }
    if (p.type === 'item-list') { buildItemList(p, wrap); return wrap; }
    if (p.type === 'order') { buildOrder(p, wrap); return wrap; }
    if (p.type === 'pairs') { buildPairs(p, wrap); return wrap; }
    if (p.type === 'color-list') { buildColorList(p, wrap); return wrap; }
    var id = 'act_' + p.key.replace(/\W/g, '_');
    var label = makeLabel(paramLabel(p), id);
    wrap.appendChild(label);
    var v = values[p.key];

    if (p.type === 'range') {
      var row = el('div', 'act-range');
      var inp = el('input'); inp.type = 'range'; inp.id = id; inp.min = p.min; inp.max = p.max; inp.step = p.step || 1; inp.value = v;
      var out = el('output', null, v + (p.unit || ''));
      inp.addEventListener('input', function () { values[p.key] = Number(inp.value); out.textContent = inp.value + (p.unit || ''); schedule(); });
      row.appendChild(inp); row.appendChild(out); wrap.appendChild(row);
    } else if (p.type === 'color') {
      var crow = el('div', 'act-color');
      var cin = el('input'); cin.type = 'color'; cin.id = id; cin.value = v;
      var hex = el('code', null, v);
      cin.addEventListener('input', function () { values[p.key] = cin.value; hex.textContent = cin.value; schedule(); });
      crow.appendChild(cin); crow.appendChild(hex); wrap.appendChild(crow);
    } else if (p.type === 'select') {
      var sel = el('select', 'act-in'); sel.id = id;
      (p.options || []).forEach(function (o) {
        var opt = el('option', null, optionLabel(o)); opt.value = o.value; if (o.value === v) opt.selected = true; sel.appendChild(opt);
      });
      sel.addEventListener('change', function () { values[p.key] = sel.value; updateVisibility(); schedule(); });
      wrap.appendChild(sel);
    } else if (p.type === 'checkbox') {
      wrap.removeChild(label);
      var chk = el('label', 'act-check');
      var cb = el('input'); cb.type = 'checkbox'; cb.id = id; cb.checked = !!v;
      cb.addEventListener('change', function () { values[p.key] = cb.checked; updateVisibility(); schedule(); });
      chk.appendChild(cb); chk.appendChild(document.createTextNode(paramLabel(p)));
      wrap.appendChild(chk);
    } else if (p.type === 'textarea') {
      var ta = el('textarea', 'act-in act-in--code'); ta.id = id; ta.value = v; ta.spellcheck = false; ta.placeholder = p.placeholder || '';
      ta.addEventListener('input', function () { values[p.key] = ta.value; schedule(); });
      wrap.appendChild(ta);
      var tools = el('div', 'act-ta-tools');
      if (p.exampleValue) {
        var ex = el('button', 'act-btn', L('tryExample')); ex.type = 'button';
        ex.addEventListener('click', function () { ta.value = p.exampleValue; values[p.key] = ta.value; play(); });
        tools.appendChild(ex);
      }
      var clr = el('button', 'act-btn', L('clear')); clr.type = 'button';
      clr.addEventListener('click', function () { ta.value = ''; values[p.key] = ''; play(); });
      tools.appendChild(clr);
      wrap.appendChild(tools);
    } else {
      var tIn = el('input', 'act-in act-in--mono'); tIn.type = 'text'; tIn.id = id; tIn.value = v; tIn.spellcheck = false;
      tIn.addEventListener('input', function () { values[p.key] = tIn.value; schedule(); });
      wrap.appendChild(tIn);
    }
    return wrap;
  }

  // Params are shown in the entry's titled sections (paramGroups), one section
  // at a time behind a row of small tabs, so the panel never turns into one
  // long form; an entry without sections gets one plain grid. Hidden params
  // still go into the copied code (at their default) but get no control.
  function renderControls() {
    refreshers = {};
    var box = $('actControls'); box.innerHTML = '';
    var visible = current.params.filter(function (p) { return !p.hidden; });
    var groups = (current.paramGroups || []).filter(function (g) {
      return visible.some(function (p) { return p.group === g.id; });
    });
    if (!groups.length) {
      var grid0 = el('div', 'act-controls');
      visible.forEach(function (p) { grid0.appendChild(buildControl(p)); });
      box.appendChild(grid0);
      updateVisibility();
      return;
    }
    if (!groups.some(function (g) { return g.id === group; })) group = groups[0].id;
    var nav = el('div', 'act-groupnav');
    nav.setAttribute('role', 'tablist');
    groups.forEach(function (g) {
      var b = el('button', null, pick(g, 'label'));
      b.type = 'button';
      b.setAttribute('role', 'tab');
      b.dataset.group = g.id;
      b.setAttribute('aria-selected', String(g.id === group));
      nav.appendChild(b);

      var sec = el('section', 'act-group');
      sec.dataset.group = g.id;
      sec.setAttribute('role', 'tabpanel');
      sec.hidden = g.id !== group;
      var note = pick(g, 'note');
      if (note) sec.appendChild(el('p', 'act-group__note', note));
      var grid = el('div', 'act-controls');
      visible.filter(function (p) { return p.group === g.id; }).forEach(function (p) { grid.appendChild(buildControl(p)); });
      sec.appendChild(grid);
      box.appendChild(sec);
    });
    nav.addEventListener('click', function (e) {
      var b = e.target.closest('[data-group]'); if (!b) return;
      group = b.dataset.group;
      Array.prototype.forEach.call(nav.children, function (n) { n.setAttribute('aria-selected', String(n === b)); });
      Array.prototype.forEach.call(box.querySelectorAll('.act-group'), function (s) { s.hidden = s.dataset.group !== group; });
    });
    box.insertBefore(nav, box.firstChild);
    updateVisibility();
  }

  function renderPresets() {
    var ps = current.previewPresets || [];
    var sel = $('actPresetSel');
    sel.innerHTML = '';
    sel.hidden = !ps.length;
    $('actPresetRow').querySelector('label').hidden = !ps.length;
    $('actPresetRow').classList.toggle('is-bare', !ps.length);
    ps.forEach(function (pr, i) { var o = el('option', null, pick(pr, 'label')); o.value = String(i); sel.appendChild(o); });
  }

  function resetValues() {
    values = {};
    current.params.forEach(function (p) { values[p.key] = clone(p.default); });
    openSvg = {};
  }

  // Each example starts from the defaults so picking one after another never
  // stacks their settings; Object IDs already typed are carried over.
  function applyPreset(pr) {
    var prev = values;
    resetValues();
    current.params.forEach(function (p) {
      if (p.type === 'item-list' && prev[p.key] && (p.fields || ['id', 'label']).indexOf('id') !== -1) {
        values[p.key].forEach(function (it, i) { if (prev[p.key][i]) it.id = prev[p.key][i].id; });
      }
      if (p.type === 'text' && /_ID$/.test(p.key)) values[p.key] = prev[p.key];
    });
    Object.keys(pr.values).forEach(function (k) {
      var p = paramByKey(k);
      if (!p) return;
      if (p.type === 'item-list') {
        var old = prev[k] || [], fields = p.fields || ['id', 'label'];
        values[k] = pr.values[k].map(function (v, i) {
          var src = typeof v === 'string' ? { label: v } : v, item = { label: src.label || '' };
          if (fields.indexOf('id') !== -1) item.id = old[i] ? old[i].id : p.idPrefix + (i + 1);
          if (fields.indexOf('svg') !== -1) item.svg = src.svg || '';
          return item;
        });
        current.params.forEach(function (q) {
          if (q.type === 'order' && q.listParam === k && !(q.key in pr.values)) values[q.key] = scrambled(values[k].length);
        });
      } else {
        values[k] = clone(pr.values[k]);
      }
    });
    renderControls();
    play();
  }

  function renderSettings() {
    renderPresets();
    renderControls();
  }

  function renderTry() {
    var acts = current.previewActions || [];
    var box = $('actActions'); box.innerHTML = '';
    $('actActionsBox').hidden = !acts.length;
    acts.forEach(function (a) {
      var b = el('button', 'act-btn', pick(a, 'label')); b.type = 'button';
      b.addEventListener('click', function () { pressAction(a); });
      box.appendChild(b);
    });
    var tg = current.previewVarToggles || [];
    var tbox = $('actToggles'); tbox.innerHTML = '';
    $('actTogglesBox').hidden = !tg.length;
    tg.forEach(function (t) {
      var row = el('label', 'act-check');
      var cb = el('input'); cb.type = 'checkbox'; cb.checked = !!toggles[t.name];
      cb.addEventListener('change', function () { toggles[t.name] = cb.checked; play(); });
      row.appendChild(cb); row.appendChild(document.createTextNode(pick(t, 'label') || t.name)); row.appendChild(el('code', null, t.name));
      tbox.appendChild(row);
    });
    syncLog(true);
  }

  function renderCodePane() {
    var ol = $('actInstall'); ol.innerHTML = '';
    var steps = lang() === 'en' ? (current.installStepsEn || current.installStepsAr) : (current.installStepsAr || current.installStepsEn);
    (steps || []).forEach(function (s) {
      ol.appendChild(el('li', null, s));
    });
    if (tab === 'code') $('actCode').textContent = editedCode();
  }

  function renderChrome() {
    var root = $('actModal');
    Array.prototype.forEach.call(root.querySelectorAll('[data-s]'), function (n) { n.textContent = L(n.dataset.s); });
    $('actClose').setAttribute('aria-label', L('close'));
    $('actFrame').setAttribute('title', L('frameTitle'));
    $('actTitle').textContent = pick(current, 'name');
    $('actMeta').textContent = pick(current, 'meta');
    $('actDesc').textContent = pick(current, 'desc');
    var hint = pick(current, 'previewHint');
    $('actHint').hidden = !hint;
    $('actHint').textContent = hint;
    root.querySelector('.act-modal').setAttribute('dir', lang() === 'en' ? 'ltr' : 'rtl');
  }

  // Language switched while the popup is open: relabel everything, keep
  // every value the visitor has set.
  function relabel() {
    renderChrome();
    renderSettings();
    renderTry();
    renderCodePane();
  }

  /* ---------------- copy / download ---------------- */
  var toastTimer;
  function toast(msg) {
    var t = $('actToast'); t.textContent = msg; t.classList.add('show');
    clearTimeout(toastTimer); toastTimer = setTimeout(function () { t.classList.remove('show'); }, 1800);
  }
  function copyCode() {
    var text = editedCode();
    var done = function () { toast(L('copied')); track('activity_copy'); };
    function fallback() {
      var ta = document.createElement('textarea'); ta.value = text; ta.style.position = 'fixed'; ta.style.opacity = '0';
      document.body.appendChild(ta); ta.select();
      try { document.execCommand('copy'); done(); } catch (err) { toast(L('copyFail')); }
      document.body.removeChild(ta);
    }
    if (navigator.clipboard && window.isSecureContext) navigator.clipboard.writeText(text).then(done, fallback);
    else fallback();
  }
  function downloadCode() {
    var blob = new Blob([editedCode()], { type: 'text/javascript' });
    var a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = current.id + '.js';
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(function () { URL.revokeObjectURL(a.href); }, 1000);
    track('activity_download');
  }

  /* ---------------- open / close ---------------- */
  function open(item) {
    ensureDom();
    lastFocus = document.activeElement;
    current = item;
    group = null;
    $('actDesc').setAttribute('aria-expanded', 'false');
    resetValues();
    toggles = {};
    (current.previewVarToggles || []).forEach(function (t) { toggles[t.name] = t.default; });
    width = 0; scale = 1;
    pressGroup($('actWidthSeg'), $('actWidthSeg').querySelector('[data-w="0"]'));
    pressGroup($('actScaleSeg'), $('actScaleSeg').querySelector('[data-sc="1"]'));
    $('actFrameShell').style.maxWidth = '';
    renderChrome();
    renderSettings();
    renderTry();
    renderCodePane();
    setTab('settings');
    $('actModal').hidden = false;
    document.documentElement.classList.add('act-open');
    play();
    clearInterval(pollTimer);
    pollTimer = setInterval(poll, 300);
    requestAnimationFrame(function () { updateSize(); $('actClose').focus(); });
    track('activity_open');
  }

  function close() {
    var root = $('actModal');
    if (!root || root.hidden) return;
    root.hidden = true;
    document.documentElement.classList.remove('act-open');
    clearInterval(pollTimer);
    clearTimeout(timer);
    $('actFrame').srcdoc = '';
    if (lastFocus && lastFocus.focus) lastFocus.focus();
  }

  window.ActivityModal = { open: open, close: close };
})();
