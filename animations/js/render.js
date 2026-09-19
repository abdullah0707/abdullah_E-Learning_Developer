// Builds the filter pills and the animation card grid from window.ANIMATIONS.
// Adding a new animation to the library is one entry in data/animations.config.js -
// nothing here needs to change. Filtering is always keyed by the item's real
// (Arabic) category value; only the displayed label is translated, so the
// active filter survives a language switch.
(function () {
  'use strict';

  var ALL = '__ALL__';

  function buildCard(item) {
    var i18n = window.AnimLibI18n;
    var card = document.createElement('button');
    card.type = 'button';
    card.className = 'card';
    card.dataset.category = item.category;
    card.setAttribute('aria-label', (i18n.get() === 'en' ? 'Open details for: ' : 'فتح تفاصيل أنيميشن: ') + i18n.itemName(item));

    card.innerHTML =
      '<div class="card__stage">' + window.AnimLibRuntime.buildStageHtml(item, 'demo-' + item.id, 'card__shape') + '</div>' +
      '<div class="card__body">' +
        '<div class="card__title-row">' +
          '<p class="card__title">' + i18n.itemName(item) + '</p>' +
          '<span class="type-pill ' + item.type + '">' + i18n.typeLabel(item.type) + '</span>' +
        '</div>' +
        '<p class="card__meta">' + i18n.itemCategory(item) + ' · ' + i18n.itemMeta(item) + '</p>' +
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

  function renderFilters(container, items, onChange) {
    var i18n = window.AnimLibI18n;
    var cats = [ALL];
    items.forEach(function (it) { if (cats.indexOf(it.category) === -1) cats.push(it.category); });

    var activeCat = container.dataset.active || ALL;

    container.innerHTML = '';
    cats.forEach(function (cat) {
      var count = cat === ALL ? items.length : items.filter(function (it) { return it.category === cat; }).length;
      var label = cat === ALL ? i18n.t('filterAll') : i18n.itemCategory({ category: cat });
      var btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'filter-pill' + (cat === activeCat ? ' is-active' : '');
      btn.textContent = label + ' (' + count + ')';
      btn.dataset.cat = cat;
      btn.addEventListener('click', function () {
        container.dataset.active = cat;
        container.querySelectorAll('.filter-pill').forEach(function (b) { b.classList.remove('is-active'); });
        btn.classList.add('is-active');
        onChange(cat === ALL ? null : cat);
      });
      container.appendChild(btn);
    });
  }

  function renderGrid(container, items, activeCat) {
    container.innerHTML = '';
    var frag = document.createDocumentFragment();
    items.forEach(function (item) {
      if (activeCat && item.category !== activeCat) return;
      frag.appendChild(buildCard(item));
    });
    container.appendChild(frag);
  }

  function renderStats(container, items) {
    var i18n = window.AnimLibI18n;
    var once = items.filter(function (i) { return i.type === 'once'; }).length;
    var loop = items.filter(function (i) { return i.type === 'loop'; }).length;
    var hover = items.filter(function (i) { return i.type === 'hover'; }).length;
    container.innerHTML =
      '<div class="hero__stat"><b>' + items.length + '</b><span>' + i18n.t('statTotal') + '</span></div>' +
      '<div class="hero__stat"><b>' + once + '</b><span>' + i18n.t('statOnce') + '</span></div>' +
      '<div class="hero__stat"><b>' + loop + '</b><span>' + i18n.t('statLoop') + '</span></div>' +
      '<div class="hero__stat"><b>' + hover + '</b><span>' + i18n.t('statHover') + '</span></div>';
  }

  window.AnimLibRender = {
    ALL: ALL,
    renderFilters: renderFilters,
    renderGrid: renderGrid,
    renderStats: renderStats
  };
})();
