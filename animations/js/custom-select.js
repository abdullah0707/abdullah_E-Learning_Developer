// Small, dependency-free custom dropdown (button + listbox pattern) so the
// Easing control matches the "Glass Glow" design in both themes instead of
// the browser's own unstyled native <select> popup.
(function () {
  'use strict';

  var openInstance = null;

  function closeOpen() {
    if (openInstance) { openInstance.close(); openInstance = null; }
  }
  document.addEventListener('click', function (e) {
    if (openInstance && !openInstance.root.contains(e.target)) closeOpen();
  });
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && openInstance) closeOpen();
  });

  // options: [{value, label}], onChange(value)
  function createCustomSelect(options, value, onChange, idBase) {
    var root = document.createElement('div');
    root.className = 'custom-select';

    var current = options.find(function (o) { return o.value === value; }) || options[0];

    var trigger = document.createElement('button');
    trigger.type = 'button';
    trigger.className = 'custom-select__trigger';
    trigger.id = idBase;
    trigger.setAttribute('aria-haspopup', 'listbox');
    trigger.setAttribute('aria-expanded', 'false');
    trigger.innerHTML =
      '<span class="custom-select__label"></span>' +
      '<svg class="chevron" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 9l6 6 6-6"/></svg>';

    var list = document.createElement('div');
    list.className = 'custom-select__list';
    list.setAttribute('role', 'listbox');
    list.tabIndex = -1;

    function renderOptions() {
      list.innerHTML = '';
      options.forEach(function (o) {
        var opt = document.createElement('div');
        opt.className = 'custom-select__option';
        opt.setAttribute('role', 'option');
        opt.setAttribute('aria-selected', String(o.value === current.value));
        opt.textContent = o.label;
        opt.addEventListener('click', function () {
          current = o;
          trigger.querySelector('.custom-select__label').textContent = o.label;
          renderOptions();
          close();
          onChange(o.value);
        });
        list.appendChild(opt);
      });
    }

    function open() {
      closeOpen();
      root.classList.add('is-open');
      trigger.setAttribute('aria-expanded', 'true');
      openInstance = { root: root, close: close };
    }
    function close() {
      root.classList.remove('is-open');
      trigger.setAttribute('aria-expanded', 'false');
      if (openInstance && openInstance.root === root) openInstance = null;
    }

    trigger.addEventListener('click', function () {
      if (root.classList.contains('is-open')) close(); else open();
    });
    trigger.addEventListener('keydown', function (e) {
      var idx = options.findIndex(function (o) { return o.value === current.value; });
      if (e.key === 'ArrowDown') { e.preventDefault(); if (!root.classList.contains('is-open')) open(); idx = Math.min(idx + 1, options.length - 1); selectIndex(idx); }
      else if (e.key === 'ArrowUp') { e.preventDefault(); if (!root.classList.contains('is-open')) open(); idx = Math.max(idx - 1, 0); selectIndex(idx); }
      else if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); if (root.classList.contains('is-open')) close(); else open(); }
    });
    function selectIndex(idx) {
      var o = options[idx];
      current = o;
      trigger.querySelector('.custom-select__label').textContent = o.label;
      renderOptions();
      onChange(o.value);
    }

    trigger.querySelector('.custom-select__label').textContent = current.label;
    renderOptions();
    root.appendChild(trigger);
    root.appendChild(list);
    return root;
  }

  window.AnimLibCustomSelect = { create: createCustomSelect };
})();
