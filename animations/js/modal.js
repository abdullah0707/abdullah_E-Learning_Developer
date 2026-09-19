// Modal: live preview + editable controls (duration, delay, easing, infinite
// toggle, colors) + syntax-highlighted code that always matches the current
// control values exactly (one function builds both the preview and the
// copy-able text from the same edited code string - no parallel logic to
// keep in sync) + copy-to-clipboard + forced replay.
(function () {
  'use strict';

  var backdrop, modalTitle, modalMeta, modalStage, modalControls, modalCode, modalCopy, modalInstall, modalReplay;
  var currentItem = null;
  var currentValues = {};
  var lastFocused = null;

  function applyParamValues(code, params, values) {
    var out = code;
    params.forEach(function (p) {
      var val = values[p.key];
      if (val === undefined) return;

      if (p.key === 'EASING_OVERRIDE') {
        out = out.replace(/(duration: DURATION_MS,\s*\n\s*easing: ')[^']*(')/, function (m, pre, post) {
          return pre + val + post;
        });
        return;
      }
      if (p.key === 'DELAY_MS_OVERRIDE') {
        var n = Number(val);
        if (n > 0) {
          out = out.replace(/(duration: DURATION_MS,)(\r?\n)(\s*)easing:/, function (m, p1, nl, indent) {
            return p1 + nl + indent + 'delay: ' + n + ',' + nl + indent + 'easing:';
          });
        }
        return;
      }

      var re;
      if (p.type === 'color') {
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

  function buildControl(param) {
    var val = currentValues[param.key];
    var label = window.AnimLibI18n.paramLabel(param.label);
    var wrap = document.createElement('div');
    wrap.className = 'control' + (param.type === 'checkbox' ? ' control-check' : '');

    if (param.type === 'range') {
      wrap.innerHTML =
        '<label for="ctrl-' + param.key + '">' + label + '</label>' +
        '<input type="range" id="ctrl-' + param.key + '" min="' + param.min + '" max="' + param.max + '" step="' + param.step + '" value="' + val + '">' +
        '<span class="range-value">' + val + (param.unit || '') + '</span>';

      var input = wrap.querySelector('input');
      input.addEventListener('input', function () {
        currentValues[param.key] = Number(input.value);
        wrap.querySelector('.range-value').textContent = input.value + (param.unit || '');
        refreshModal();
      });
    } else if (param.type === 'checkbox') {
      wrap.innerHTML =
        '<input type="checkbox" id="ctrl-' + param.key + '"' + (val ? ' checked' : '') + '>' +
        '<label for="ctrl-' + param.key + '">' + label + '</label>';

      wrap.querySelector('input').addEventListener('input', function (e) {
        currentValues[param.key] = e.target.checked;
        refreshModal();
      });
    } else if (param.type === 'color') {
      wrap.innerHTML =
        '<label for="ctrl-' + param.key + '">' + label + '</label>' +
        '<input type="color" id="ctrl-' + param.key + '" value="' + val + '">';

      wrap.querySelector('input').addEventListener('input', function (e) {
        currentValues[param.key] = e.target.value;
        refreshModal();
      });
    } else if (param.type === 'select') {
      var labelEl = document.createElement('label');
      labelEl.setAttribute('for', 'ctrl-' + param.key);
      labelEl.textContent = label;
      wrap.appendChild(labelEl);

      var selectEl = window.AnimLibCustomSelect.create(param.options, val, function (newVal) {
        currentValues[param.key] = newVal;
        refreshModal();
      }, 'ctrl-' + param.key);
      wrap.appendChild(selectEl);
    }

    return wrap;
  }

  function refreshModal() {
    var item = currentItem;
    var idPrefix = 'demo-modal-' + item.id;

    modalStage.innerHTML = window.AnimLibRuntime.buildStageHtml(item, idPrefix, 'card__shape');

    var editedCode = applyParamValues(item.code, item.params, currentValues);
    modalCode.innerHTML = window.AnimLibHighlight.highlight(editedCode);

    var effectiveDuration = currentValues.DURATION_MS !== undefined ? currentValues.DURATION_MS : (item.params[0] ? item.params[0].default : 600);
    window.AnimLibRuntime.play(item, idPrefix, editedCode, effectiveDuration);
  }

  function renderModalChrome() {
    var item = currentItem;
    var i18n = window.AnimLibI18n;
    modalTitle.textContent = i18n.itemName(item);
    modalMeta.textContent = i18n.itemCategory(item) + ' · ' + i18n.itemMeta(item);

    modalControls.innerHTML = '';
    item.params.forEach(function (p) { modalControls.appendChild(buildControl(p)); });

    modalInstall.innerHTML =
      '<li>' + i18n.t('installStep1') + '</li>' +
      '<li>' + i18n.t('installStep2') + '</li>' +
      '<li>' + i18n.t('installStep3Pre') + '<code>REPLACE_ELEMENT_ID</code>' + i18n.t('installStep3Post') + '</li>' +
      '<li>' + i18n.itemTrigger(item) + '</li>';
  }

  function openModal(item) {
    currentItem = item;
    currentValues = {};
    item.params.forEach(function (p) { currentValues[p.key] = p.default; });

    renderModalChrome();

    lastFocused = document.activeElement;
    backdrop.hidden = false;
    requestAnimationFrame(function () { backdrop.classList.add('is-open'); });
    document.body.style.overflow = 'hidden';
    modalReplay.focus();

    refreshModal();
  }

  function closeModal() {
    backdrop.classList.remove('is-open');
    document.body.style.overflow = '';
    modalStage.innerHTML = '';
    setTimeout(function () { backdrop.hidden = true; }, 250);
    if (lastFocused && lastFocused.focus) lastFocused.focus();
    currentItem = null;
  }

  function showCopiedState() {
    var i18n = window.AnimLibI18n;
    modalCopy.classList.add('is-copied');
    modalCopy.textContent = i18n.t('modalCopied');
    setTimeout(function () {
      modalCopy.classList.remove('is-copied');
      modalCopy.textContent = i18n.t('modalCopy');
    }, 1800);
  }

  function fallbackCopy(text) {
    var ta = document.createElement('textarea');
    ta.value = text;
    ta.style.position = 'fixed';
    ta.style.opacity = '0';
    document.body.appendChild(ta);
    ta.select();
    try { document.execCommand('copy'); showCopiedState(); }
    catch (e) { modalCopy.textContent = window.AnimLibI18n.t('modalCopyFailed'); }
    document.body.removeChild(ta);
  }

  function copyCode() {
    var editedCode = applyParamValues(currentItem.code, currentItem.params, currentValues);
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(editedCode).then(showCopiedState, function () { fallbackCopy(editedCode); });
    } else {
      fallbackCopy(editedCode);
    }
  }

  function trapFocus(e) {
    if (e.key !== 'Tab') return;
    var focusables = modalEl().querySelectorAll('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])');
    if (!focusables.length) return;
    var first = focusables[0], last = focusables[focusables.length - 1];
    if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
    else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
  }
  function modalEl() { return backdrop.querySelector('.modal'); }

  function initModal() {
    backdrop = document.getElementById('modalBackdrop');
    modalTitle = document.getElementById('modalTitle');
    modalMeta = document.getElementById('modalMeta');
    modalStage = document.getElementById('modalStage');
    modalControls = document.getElementById('modalControls');
    modalCode = document.getElementById('modalCode');
    modalCopy = document.getElementById('modalCopy');
    modalInstall = document.getElementById('modalInstall');
    modalReplay = document.getElementById('modalReplay');

    document.getElementById('modalClose').addEventListener('click', closeModal);
    backdrop.addEventListener('click', function (e) { if (e.target === backdrop) closeModal(); });
    document.addEventListener('keydown', function (e) {
      if (backdrop.hidden) return;
      if (e.key === 'Escape') closeModal();
      trapFocus(e);
    });
    modalCopy.addEventListener('click', copyCode);
    modalReplay.addEventListener('click', refreshModal);

    document.addEventListener('animlib:langchange', function () {
      if (currentItem) renderModalChrome();
    });
  }

  window.AnimLibModal = { init: initModal, open: openModal };
})();
