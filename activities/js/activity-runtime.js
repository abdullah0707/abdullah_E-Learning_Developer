// Runtime for "Function Activity" items (full interactive Storyline
// widgets, e.g. drag-and-drop, scoring, state machines) - fundamentally
// different from AnimLibRuntime, which just replays a stateless WAAPI
// animation against a demo div.
//
// Why an iframe instead of AnimLibRuntime's injectScript-into-the-page
// approach: every one of these widgets keeps its own state in a
// `window.__xyzState` singleton (so revisiting a Storyline slide restores
// where the learner left off) and wires real event listeners (click/drag).
// Re-running the same script in the SAME page after a control value
// changes would hit the singleton guard and silently keep the OLD state,
// and repeated runs would pile up duplicate event listeners. An iframe
// with a fresh `srcdoc` on every change is a clean, fully isolated JS
// realm each time - no manual "delete window.__state" bookkeeping, and no
// risk of two different activities' globals colliding if more than one
// has ever been previewed on the same page.
(function () {
  'use strict';

  // A tiny stand-in for Storyline's own GetPlayer(), so the widget's real
  // GetVar/SetVar calls work unmodified inside the sandbox - and so you can
  // actually see the variables it drives, via the log strip under the
  // preview, exactly like watching it in Storyline's own variable inspector.
  // `seedVars` (item.previewSeedVars) pre-populates variables a real course
  // would already have set on an earlier slide (e.g. a learner's name, or
  // slider positions) - without it, GetVar() on an unset variable returns
  // undefined and some widgets have nothing meaningful to render at first.
  function buildHarnessScript(seedVars) {
    return ''
      + '<script>'
      + 'window.__vars = ' + JSON.stringify(seedVars || {}) + ';'
      + 'window.GetPlayer = function () {'
      + '  return {'
      + '    SetVar: function (name, val) {'
      + '      window.__vars[name] = val;'
      + '      var log = document.getElementById("__log");'
      + '      if (log) { log.textContent += name + " = " + val + "\\n"; log.scrollTop = log.scrollHeight; }'
      + '    },'
      + '    GetVar: function (name) { return window.__vars[name]; }'
      + '  };'
      + '};'
      + '<\/script>';
  }

  var SANDBOX_STYLE = ''
    + 'html,body{margin:0;padding:0;background:#eef1f3;font-family:sans-serif;}'
    + '#__stageWrap{position:relative;min-height:var(--stage-min-h,420px);padding:18px;box-sizing:border-box;}'
    + '.__container{position:relative;width:100%;height:var(--container-h,520px);}'
    + '.__multi-row{display:flex;gap:18px;align-items:stretch;}'
    + '.__multi-row .__container{flex:1;min-width:0;}'
    + '.__node-graph{display:flex;justify-content:space-between;gap:60px;min-height:var(--container-h,320px);}'
    + '.__node-col{display:flex;flex-direction:column;justify-content:space-around;gap:14px;}'
    + '.__node{width:150px;height:44px;background:#fff;border:2px solid #9cc3ec;border-radius:8px;'
    + 'display:flex;align-items:center;justify-content:center;font-size:13px;color:#37474F;box-sizing:border-box;padding:0 8px;text-align:center;}'
    + '#__log{direction:ltr;font-family:"IBM Plex Mono",monospace;font-size:11px;line-height:1.6;color:#555;'
    + 'background:#fff;border:1px solid #dde2e5;border-radius:8px;padding:8px 10px;margin:14px 18px 18px;'
    + 'max-height:90px;overflow:auto;white-space:pre-wrap;}'
    + '#__log:empty::before{content:"Storyline SetVar() calls will appear here as you interact \\2192";color:#9aa1a8;}'
    + '.__no-container-note{margin:18px;padding:14px 16px;background:#fff;border:1px dashed #c9d0d6;border-radius:10px;'
    + 'font-size:13px;line-height:1.6;color:#55606a;}';

  // Every widget looks up its target via [data-model-id="..."], the exact
  // same lookup it uses for the real Storyline object - these sentinels are
  // what we give that lookup here, regardless of whatever the visitor typed
  // into the "Object ID" control(s) (those values only matter for the code
  // they copy). PREVIEW_CONTAINER_ID covers the common single-container
  // case; multi-container widgets (e.g. 3 separate gauge shapes) get one
  // sentinel per slot instead, via previewContainerIdMap below.
  var PREVIEW_CONTAINER_ID = 'PREVIEW_CONTAINER';

  function stageHtml(item, noContainerNote) {
    if (item.previewMode === 'no-container') {
      return '<div class="__no-container-note">' + (noContainerNote || 'This function has no visual container - it runs immediately and produces its result directly (e.g. a file download).') + '</div>';
    }
    if (item.previewMode === 'multi-container' && item.previewContainerIdMap) {
      var ids = Object.keys(item.previewContainerIdMap).map(function (k) { return item.previewContainerIdMap[k]; });
      return '<div class="__multi-row">' + ids.map(function (id) {
        return '<div class="__container" data-model-id="' + id + '"></div>';
      }).join('') + '</div>';
    }
    // 'node-graph': for widgets that connect/route lines between several
    // pre-existing named shapes rather than drawing into one container
    // (the matching game, feedback-connections) - previewNodeColumns is
    // [[realId, ...], [realId, ...]] and each real id is looked up in
    // previewContainerIdMap for its assigned preview sentinel, laid out
    // as two labeled columns with real horizontal space between them for
    // the widget's own line-routing to draw into.
    if (item.previewMode === 'node-graph' && item.previewNodeColumns && item.previewContainerIdMap) {
      var labels = item.previewNodeLabels || [];
      return '<div class="__node-graph">' + item.previewNodeColumns.map(function (col, colIdx) {
        return '<div class="__node-col">' + col.map(function (realId, i) {
          var previewId = item.previewContainerIdMap[realId];
          var label = (labels[colIdx] && labels[colIdx][i]) || previewId;
          return '<div class="__node" data-model-id="' + previewId + '">' + label + '</div>';
        }).join('') + '</div>';
      }).join('') + '</div>';
    }
    return '<div class="__container" data-model-id="' + PREVIEW_CONTAINER_ID + '"></div>';
  }

  // Sample text can't be selected, copied, dragged out or reached through the
  // right-click menu. Only the sample is guarded - the code panel outside it
  // stays copyable on purpose. Form fields inside a sample keep working.
  var SAMPLE_GUARD =
    '<style>html,body,*{-webkit-user-select:none!important;user-select:none!important;-webkit-touch-callout:none!important;}' +
    'input,textarea{-webkit-user-select:text!important;user-select:text!important;}</style>' +
    '<script>["copy","cut","selectstart","dragstart","contextmenu"].forEach(function(t){' +
    'document.addEventListener(t,function(e){var n=e.target;if(n&&n.closest&&n.closest("input,textarea"))return;e.preventDefault();},true);});<\/script>';

  function buildSrcdoc(code, item, noContainerNote) {
    // A few widgets (the full-slide-overlay style ones: coloring tools,
    // feedback-connections, the matching game) don't look up their target
    // via [data-model-id="..."] alone - they first find Storyline's own
    // slide-root wrapper (document.querySelector('.slide-layer.v-visible')
    // || '.slide-container' || '#preso') and only then search inside it.
    // None of those exist in a generic sandbox, so without this they'd
    // silently retry forever (a setTimeout loop, no error, nothing
    // rendered). Tagging our own stage wrapper with all three matches is
    // harmless for every other widget, which never looks for them.
    return '<!doctype html><html><head><meta charset="utf-8">' +
      '<style>' + SANDBOX_STYLE + '</style>' + SAMPLE_GUARD + '</head><body ' +
      'style="--container-h:' + (item.previewContainerHeight || 520) + 'px;--stage-min-h:' + (item.previewStageMinHeight || 420) + 'px;">' +
      '<div id="__stageWrap" class="slide-layer slide-container v-visible">' + stageHtml(item, noContainerNote) + '</div>' +
      '<div id="__log"></div>' +
      buildHarnessScript(item.previewSeedVars) +
      '<script>' + code.replace(/<\/script>/g, '<\\/script>') + '<\/script>' +
      '</body></html>';
  }

  // `editedCode` is the SAME string the code panel displays and the copy
  // button copies (built once by modal.js's applyParamValues) - this just
  // additionally swaps container id(s) for the fixed preview sentinel(s),
  // so "what you see" and "what you copy" never drift apart except for
  // that one intentional substitution. For a multi-container item,
  // item.previewContainerIdMap ({realId: previewId}) drives the swap
  // directly from the item's own known defaults rather than a single
  // control value, since those items don't expose per-slot id controls.
  function play(iframeEl, item, editedCode, currentContainerIdValue, noContainerNote) {
    var codeForPreview = editedCode;
    if ((item.previewMode === 'multi-container' || item.previewMode === 'node-graph') && item.previewContainerIdMap) {
      Object.keys(item.previewContainerIdMap).forEach(function (realId) {
        codeForPreview = codeForPreview.split(realId).join(item.previewContainerIdMap[realId]);
      });
    } else if (item.previewMode !== 'no-container') {
      codeForPreview = codeForPreview.split(currentContainerIdValue || 'REPLACE_ELEMENT_ID').join(PREVIEW_CONTAINER_ID);
    }
    iframeEl.srcdoc = buildSrcdoc(codeForPreview, item, noContainerNote);
  }

  window.ActivityRuntime = { play: play, PREVIEW_CONTAINER_ID: PREVIEW_CONTAINER_ID };
})();
