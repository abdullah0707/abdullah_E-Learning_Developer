/* Portfolio-wide light/dark toggle. Independent of the embedded animation
   library — the library's cards/modal are styled by our own tokens (see
   engine.css), so a single [data-theme] on <html> covers everything. */
(function () {
  "use strict";

  var STORAGE_KEY = "portfolio-theme";
  var SUN = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/></svg>';
  var MOON = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>';

  function getStored() {
    try { return localStorage.getItem(STORAGE_KEY); } catch (e) { return null; }
  }
  function setStored(v) {
    try { localStorage.setItem(STORAGE_KEY, v); } catch (e) { /* ignore */ }
  }

  function current() {
    return document.documentElement.getAttribute("data-theme") || "dark";
  }

  function updateIcons(theme) {
    var isLight = theme === "light";
    var i18n = window.PortfolioI18N;
    var label = i18n ? (isLight ? i18n.t("themeToggleAriaLight") : i18n.t("themeToggleAria")) : (isLight ? "Switch to dark mode" : "Switch to light mode");
    document.querySelectorAll("#themeToggle, #themeToggleMobile").forEach(function (btn) {
      btn.innerHTML = isLight ? MOON : SUN;
      btn.setAttribute("aria-label", label);
    });
  }

  function apply(theme) {
    document.documentElement.setAttribute("data-theme", theme === "light" ? "light" : "dark");
    updateIcons(theme);
  }

  function toggle() {
    var next = current() === "dark" ? "light" : "dark";
    setStored(next);
    apply(next);
  }

  function init() {
    apply(getStored() || "dark");
    document.querySelectorAll("#themeToggle, #themeToggleMobile").forEach(function (btn) {
      btn.addEventListener("click", toggle);
    });
  }

  document.addEventListener("DOMContentLoaded", init);
  window.PortfolioTheme = { toggle: toggle, get: current };
})();
