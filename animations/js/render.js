// Builds the filter pills, stats and card grid for one library tab: the
// animations (window.ANIMATIONS) or the function activities
// (window.ACTIVITIES). Adding an item is one entry in the matching data file -
// nothing here needs to change. Filtering is always keyed by a stable value
// (the animation's Arabic category, or the activity's group id); only the
// displayed label is translated, so the active filter survives a language
// switch.
(function () {
  'use strict';

  var ALL = '__ALL__';
  var NEW_FOR_DAYS = 60;

  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  // Activities don't carry a category of their own yet, so the group comes
  // from an explicit `group` field when the data has one, else from the id.
  function activityGroup(item) {
    if (item.group) return item.group;
    if (/match/.test(item.id)) return 'match';
    if (/reorder|swap/.test(item.id)) return 'reorder';
    if (/gauge|dial/.test(item.id)) return 'gauge';
    return 'other';
  }

  function filterKey(item) { return item.kind === 'activity' ? activityGroup(item) : item.category; }

  function filterLabel(key, kind) {
    var i18n = window.AnimLibI18n;
    if (key === ALL) return i18n.t('filterAll');
    if (kind === 'activity') return i18n.t('group' + key.charAt(0).toUpperCase() + key.slice(1)) || key;
    return i18n.itemCategory({ category: key });
  }

  function isNew(item) {
    var t = item.addedAt ? Date.parse(item.addedAt) : NaN;
    return !isNaN(t) && Date.now() - t < NEW_FOR_DAYS * 864e5;
  }

  function matches(item, q) {
    if (!q) return true;
    var i18n = window.AnimLibI18n;
    var hay = [i18n.itemName(item), item.name, item.nameAr, item.nameEn, item.id,
      filterLabel(filterKey(item), item.kind), item.category].join(' ').toLowerCase();
    return q.toLowerCase().split(/\s+/).every(function (w) { return !w || hay.indexOf(w) !== -1; });
  }

  function chipsHtml(item) {
    return isNew(item) ? '<span class="card__chip card__chip--new">' + esc(window.AnimLibI18n.t('newBadge')) + '</span>' : '';
  }

  // Static illustration per activity: a live widget per card would mean one
  // sandboxed iframe per card idling in the grid, so the card shows a drawing
  // of the activity and the live preview only runs inside the modal.
  // A new activity picks its drawing with a `poster` field in its entry. A new
  // drawing is 160x90 and uses the pv* classes: the colored parts (pva fills,
  // pvs lines, pvfill arcs) are what glow when the card is hovered.
  function posterKey(item) {
    if (item.poster && POSTERS[item.poster]) return item.poster;
    var g = activityGroup(item);
    if (g === 'reorder') return /vertical/.test(item.id) ? 'reorder-v' : 'reorder-h';
    if (g === 'gauge') return /linear/.test(item.id) ? 'gauge-linear' : 'gauge-dial';
    return g;
  }
  var POSTERS = {
    'match': '<rect class="pvi" x="16" y="16" width="42" height="14" rx="3"/><rect class="pvi" x="16" y="38" width="42" height="14" rx="3"/><rect class="pvi" x="16" y="60" width="42" height="14" rx="3"/><rect class="pvi" x="102" y="16" width="42" height="14" rx="3"/><rect class="pvi" x="102" y="38" width="42" height="14" rx="3"/><rect class="pvi" x="102" y="60" width="42" height="14" rx="3"/><path class="pvs" d="M58 23L102 45"/><path class="pvs" d="M58 45L102 67"/><path class="pvw" d="M58 67L102 23"/><circle class="pva" cx="58" cy="23" r="2"/><circle class="pva" cx="58" cy="45" r="2"/>',
    'reorder-h': '<rect class="pvi" x="14" y="36" width="28" height="18" rx="3"/><rect class="pvi" x="82" y="36" width="28" height="18" rx="3"/><rect class="pvi" x="116" y="36" width="28" height="18" rx="3"/><rect class="pva" x="46" y="26" width="28" height="18" rx="3" transform="rotate(-6 60 35)"/><path class="pvs" d="M44 64c10 8 22 8 30 0M70 62l4 2-2 4"/>',
    'reorder-v': '<rect class="pvi" x="58" y="8" width="44" height="14" rx="3"/><rect class="pvi" x="58" y="46" width="44" height="14" rx="3"/><rect class="pvi" x="58" y="66" width="44" height="14" rx="3"/><rect class="pva" x="66" y="26" width="44" height="14" rx="3" transform="rotate(4 88 33)"/><path class="pvs" d="M118 20c8 10 8 22 0 32M116 48l2 4 4-2"/>',
    'gauge-linear': '<rect class="pvt" x="20" y="48" width="120" height="6" rx="3"/><rect class="pva" x="20" y="48" width="78" height="6" rx="3"/><circle class="pvk" cx="98" cy="51" r="7"/><text class="pvx" x="98" y="36" text-anchor="middle">7</text>',
    'gauge-dial': '<path class="pvtrack" d="M40 70a40 40 0 0 1 80 0"/><path class="pvfill" d="M40 70a40 40 0 0 1 58.3-35.6"/><path class="pvneedle" d="M80 70L102 40"/><circle class="pvhub" cx="80" cy="70" r="5"/>'
  };
  function posterSvg(item) {
    var body = POSTERS[posterKey(item)] || POSTERS['match'];
    return '<svg class="card__poster" viewBox="0 0 160 90" aria-hidden="true"><rect class="pvb" width="160" height="90"/>' + body + '</svg>';
  }

  function buildActivityCard(item) {
    var i18n = window.AnimLibI18n;
    var card = document.createElement('button');
    card.type = 'button';
    card.className = 'card card--activity';
    card.dataset.category = filterKey(item);
    card.setAttribute('aria-label', (i18n.get() === 'en' ? 'Open details for: ' : 'فتح تفاصيل: ') + i18n.itemName(item));

    card.innerHTML =
      '<div class="card__stage card__stage--poster">' + posterSvg(item) + chipsHtml(item) + '</div>' +
      '<div class="card__body">' +
        '<div class="card__title-row">' +
          '<p class="card__title">' + esc(i18n.itemName(item)) + '</p>' +
          '<span class="type-pill activity">' + esc(filterLabel(filterKey(item), 'activity')) + '</span>' +
        '</div>' +
        '<p class="card__meta">' + esc(i18n.itemMeta(item)) + '</p>' +
      '</div>';

    card.addEventListener('click', function () { window.ActivityModal.open(item); });
    return card;
  }

  function buildCard(item) {
    if (item.kind === 'activity') return buildActivityCard(item);

    var i18n = window.AnimLibI18n;
    var card = document.createElement('button');
    card.type = 'button';
    card.className = 'card';
    card.dataset.category = item.category;
    card.setAttribute('aria-label', (i18n.get() === 'en' ? 'Open details for: ' : 'فتح تفاصيل أنيميشن: ') + i18n.itemName(item));

    card.innerHTML =
      '<div class="card__stage">' + window.AnimLibRuntime.buildStageHtml(item, 'demo-' + item.id, 'card__shape') + chipsHtml(item) + '</div>' +
      '<div class="card__body">' +
        '<div class="card__title-row">' +
          '<p class="card__title">' + esc(i18n.itemName(item)) + '</p>' +
          '<span class="type-pill ' + item.type + '">' + esc(i18n.typeLabel(item.type)) + '</span>' +
        '</div>' +
        '<p class="card__meta">' + esc(i18n.itemCategory(item)) + ' · ' + esc(i18n.itemMeta(item)) + '</p>' +
      '</div>';

    card.addEventListener('click', function () {
      window.AnimLibModal.open(item);
    });
    // Hovering a card previews its animation immediately, so browsing the
    // grid alone is often enough without opening the modal.
    card.addEventListener('mouseenter', function () {
      window.AnimLibRuntime.play(item, 'demo-' + item.id);
    });
    return card;
  }

  // Pills come from the whole tab (so a category never disappears while
  // searching); their counts come from the search results.
  function renderFilters(container, allItems, shownItems, activeKey, onChange) {
    var kind = allItems[0] && allItems[0].kind === 'activity' ? 'activity' : 'animation';
    var keys = [ALL];
    allItems.forEach(function (it) { var k = filterKey(it); if (keys.indexOf(k) === -1) keys.push(k); });

    container.innerHTML = '';
    keys.forEach(function (key) {
      var count = key === ALL ? shownItems.length : shownItems.filter(function (it) { return filterKey(it) === key; }).length;
      var btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'filter-pill' + (key === activeKey ? ' is-active' : '');
      btn.setAttribute('aria-pressed', String(key === activeKey));
      btn.textContent = filterLabel(key, kind) + ' (' + count + ')';
      btn.dataset.cat = key;
      btn.addEventListener('click', function () { onChange(key); });
      container.appendChild(btn);
    });
  }

  function renderGrid(container, items, activeKey) {
    container.innerHTML = '';
    var list = items.filter(function (item) { return activeKey === ALL || filterKey(item) === activeKey; });
    if (!list.length) {
      container.innerHTML = '<div class="lib-empty">' + esc(window.AnimLibI18n.t('noResults')) + '</div>';
      return;
    }
    var frag = document.createDocumentFragment();
    list.forEach(function (item) { frag.appendChild(buildCard(item)); });
    container.appendChild(frag);
  }

  function stat(n, label) { return '<div class="hero__stat"><b>' + n + '</b><span>' + esc(label) + '</span></div>'; }

  function renderStats(container, items) {
    var i18n = window.AnimLibI18n;
    var count = function (fn) { return items.filter(fn).length; };
    if (items[0] && items[0].kind === 'activity') {
      container.innerHTML =
        stat(items.length, i18n.t('statActs')) +
        stat(count(function (i) { var g = activityGroup(i); return g === 'match' || g === 'reorder'; }), i18n.t('statDrag')) +
        stat(count(function (i) { return activityGroup(i) === 'gauge'; }), i18n.t('statGauges'));
      return;
    }
    container.innerHTML =
      stat(items.length, i18n.t('statTotal')) +
      stat(count(function (i) { return i.type === 'once'; }), i18n.t('statOnce')) +
      stat(count(function (i) { return i.type === 'loop'; }), i18n.t('statLoop')) +
      stat(count(function (i) { return i.type === 'hover'; }), i18n.t('statHover'));
  }

  window.AnimLibRender = {
    ALL: ALL,
    matches: matches,
    renderFilters: renderFilters,
    renderGrid: renderGrid,
    renderStats: renderStats
  };
})();
