// Minimal, dependency-free JS syntax highlighter tailored to this project's
// own generated animation code style (comments, strings, numbers, a small
// keyword set). Deliberately not a full tokenizer / no external library -
// this is display-only highlighting for a known, narrow code shape.
(function () {
  'use strict';

  var KEYWORDS = ['var', 'function', 'if', 'else', 'return', 'new', 'typeof',
    'true', 'false', 'null', 'undefined', 'this', 'window', 'document', 'Infinity'];

  var TOKEN_RE = new RegExp(
    '(/\\*[\\s\\S]*?\\*/)' +                       // 1: block comment
    '|(//[^\\n]*)' +                                // 2: line comment
    '|(\'(?:\\\\.|[^\'\\\\])*\'|"(?:\\\\.|[^"\\\\])*")' + // 3: string
    '|(\\b\\d+\\.?\\d*\\b)' +                       // 4: number
    '|(\\b(?:' + KEYWORDS.join('|') + ')\\b)' +     // 5: keyword
    '|([a-zA-Z_$][\\w$]*)(?=\\()',                  // 6: function/method call name
    'g'
  );

  function escapeHtml(s) {
    return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }

  function highlight(code) {
    var out = '';
    var lastIndex = 0;
    var m;
    TOKEN_RE.lastIndex = 0;
    while ((m = TOKEN_RE.exec(code)) !== null) {
      if (m.index > lastIndex) out += escapeHtml(code.slice(lastIndex, m.index));
      if (m[1] || m[2]) out += '<span class="tok-com">' + escapeHtml(m[1] || m[2]) + '</span>';
      else if (m[3]) out += '<span class="tok-str">' + escapeHtml(m[3]) + '</span>';
      else if (m[4]) out += '<span class="tok-num">' + escapeHtml(m[4]) + '</span>';
      else if (m[5]) out += '<span class="tok-kw">' + escapeHtml(m[5]) + '</span>';
      else if (m[6]) out += '<span class="tok-fn">' + escapeHtml(m[6]) + '</span>';
      lastIndex = TOKEN_RE.lastIndex;
    }
    out += escapeHtml(code.slice(lastIndex));
    return out;
  }

  window.AnimLibHighlight = { highlight: highlight };
})();
