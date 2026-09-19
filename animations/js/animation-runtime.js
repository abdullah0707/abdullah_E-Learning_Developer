// Shared runtime used by both the grid's auto-playing card previews and the
// modal's live preview - single implementation of "run this animation's code
// against these demo element ids" and "give a one-shot demo >=3s then reset
// it to its resting state so it can be watched again."
(function () {
  'use strict';

  function injectScript(code, ids) {
    var replaced = code;
    if (Array.isArray(ids)) {
      ids.forEach(function (id, i) { replaced = replaced.split('REPLACE_ELEMENT_ID_' + (i + 1)).join(id); });
    } else {
      replaced = replaced.split('REPLACE_ELEMENT_ID').join(ids);
    }
    var s = document.createElement('script');
    s.textContent = replaced;
    document.body.appendChild(s);
    document.body.removeChild(s);
  }

  function demoIdsFor(item, idPrefix) {
    var n = item.demoCount || 1;
    if (n === 1) return idPrefix;
    var arr = [];
    for (var i = 0; i < n; i++) arr.push(idPrefix + '-' + (i + 1));
    return arr;
  }

  // Single source of truth for "the DOM a demo/preview stage needs" - used
  // by both the grid card and the modal, so both always target the same
  // element shape the runtime looks for (data-model-id="<idPrefix[-n]>").
  function buildStageHtml(item, idPrefix, shapeClass) {
    var n = item.demoCount || 1;
    var cls = shapeClass + ' ' + (item.shape === 'text' ? 'text' : (item.shape === 'circle' || item.shape === 'dot' ? 'circle' : ''));
    var html = '';
    for (var i = 0; i < n; i++) {
      var demoId = n > 1 ? idPrefix + '-' + (i + 1) : idPrefix;
      var inner = item.shape === 'text' ? (item.label || 'Aa') : '';
      html += '<div class="' + cls + '" data-model-id="' + demoId + '" id="' + demoId + '">' + inner + '</div>';
    }
    return html;
  }

  // A one-shot animation's fill:'both' holds whatever it ends on - forever.
  // Correct for real Storyline use, but a showcase demo needs to reset so
  // replay always has something to show. Every "once" demo gets at least a
  // ~3s viewing window, then resets to its resting state.
  function scheduleReset(item, ids, durationMs) {
    if (item.type !== 'once') return;
    var targets = Array.isArray(ids) ? ids : [ids];
    var delay = Math.max(durationMs + 300, 3000);
    setTimeout(function () {
      targets.forEach(function (id) {
        var el = document.querySelector('[data-model-id="' + id + '"]');
        if (el && el.getAnimations) el.getAnimations().forEach(function (a) { a.cancel(); });
      });
    }, delay);
  }

  function play(item, idPrefix, code, durationMsOverride) {
    var ids = demoIdsFor(item, idPrefix);
    injectScript(code || item.code, ids);
    var duration = durationMsOverride !== undefined ? durationMsOverride : (item.params && item.params[0] ? item.params[0].default : 600);
    scheduleReset(item, ids, duration);
    return ids;
  }

  window.AnimLibRuntime = { injectScript: injectScript, demoIdsFor: demoIdsFor, buildStageHtml: buildStageHtml, scheduleReset: scheduleReset, play: play };
})();
