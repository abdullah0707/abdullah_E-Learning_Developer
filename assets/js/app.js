(function () {
  "use strict";

  var API_BASE = "https://portfolio-backend.abdullahelgammal25.workers.dev";

  /* ============================== view switching ============================== */
  var views = document.querySelectorAll(".view");
  // ":not(.view)" matters: the view containers themselves also carry [data-view]
  // (to say which view they are), so without this exclusion they'd be swept into
  // this "things that navigate" set too — and the nav-pill loop below would then
  // immediately clear the is-active class it had just set two lines earlier.
  var viewTriggers = document.querySelectorAll("[data-view]:not(.view)");

  function showView(name) {
    views.forEach(function (v) { v.classList.toggle("is-active", v.dataset.view === name); });
    viewTriggers.forEach(function (l) { l.classList.toggle("is-active", l.classList.contains("navlink") && l.dataset.view === name); });
    closeMobileNav();
    if (name === "work") loadProjects();
    if (name === "library") ensureLibraryLoaded();
    if (window.trackEvent) window.trackEvent("view_" + name);
    if (window.PortfolioFX) window.PortfolioFX.rescan();
    if (window.location.hash !== "#" + name) history.replaceState(null, "", "#" + name);
    requestAnimationFrame(updateScrollIndicator);
  }

  viewTriggers.forEach(function (link) {
    link.addEventListener("click", function () { showView(link.dataset.view); });
  });

  var initialView = (window.location.hash || "").replace("#", "") || "home";
  if (!document.querySelector('.view[data-view="' + initialView + '"]')) initialView = "home";
  showView(initialView);

  /* ============================== mobile nav ============================== */
  var menuBtn = document.getElementById("menuBtn");
  var mobileNav = document.getElementById("mobileNav");
  var mobileClose = document.getElementById("mobileNavClose");

  function openMobileNav() { if (mobileNav) mobileNav.classList.add("is-open"); }
  function closeMobileNav() { if (mobileNav) mobileNav.classList.remove("is-open"); }
  if (menuBtn) menuBtn.addEventListener("click", openMobileNav);
  if (mobileClose) mobileClose.addEventListener("click", closeMobileNav);

  /* ============================== site settings + partners ============================== */
  function setText(id, value) {
    if (!value) return;
    var el = document.getElementById(id);
    if (el) el.textContent = value;
  }
  function setHref(id, value) {
    if (!value) return;
    var el = document.getElementById(id);
    if (el) el.setAttribute("href", value);
  }

  // Site-settings text comes from the CMS as plain strings, so it can't be
  // covered by [data-i18n] like the static UI chrome — pick the field for
  // the current language (falling back to English, then to a natural
  // Arabic default) and re-run this on every language toggle, not just once
  // at load, otherwise switching to Arabic left the bio/tagline/welcome
  // line stuck in whatever the admin dashboard has for English.
  var lastSettings = null;
  function pickLang(settings, baseKey, dictDefaultKey) {
    var isAr = window.PortfolioI18N && window.PortfolioI18N.get() === "ar";
    if (isAr) {
      return settings[baseKey + "_ar"] || (dictDefaultKey && window.PortfolioI18N.t(dictDefaultKey)) || settings[baseKey];
    }
    return settings[baseKey] || "";
  }

  function applySiteSettings(settings) {
    lastSettings = settings;
    setText("hero-title", pickLang(settings, "hero_title"));
    setText("hero-tagline", pickLang(settings, "hero_tagline", "heroTaglineDefault"));
    setText("hero-welcome", pickLang(settings, "hero_welcome_text", "heroWelcomeDefault"));
    setText("about-bio-text", pickLang(settings, "about_bio", "aboutBioDefault"));
    setHref("cv-link", settings.cv_url);
    setHref("social-facebook", settings.social_facebook);
    setHref("social-linkedin", settings.social_linkedin);
    setHref("social-github", settings.social_github);
    setHref("social-phone", settings.social_phone ? "tel:" + settings.social_phone : null);

    if (settings.social_whatsapp_number) {
      var wa = document.getElementById("social-whatsapp");
      if (wa) wa.setAttribute("href", "https://wa.me/" + settings.social_whatsapp_number.replace(/[^0-9]/g, ""));
    }
    if (settings.social_email) {
      var mail = document.getElementById("social-email");
      if (mail) mail.setAttribute("href", "mailto:" + settings.social_email);
    }
    if (settings.about_photo_url) {
      var photo = document.getElementById("about-photo");
      if (photo) photo.src = API_BASE + settings.about_photo_url;
    }
  }

  function escapeHtml(str) {
    return String(str == null ? "" : str).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }

  // One logo "slot" is the fixed slide width plus the gap the CSS puts
  // between flex items — both have to be baked into the same distance the
  // JS tells the animation to travel, or the loop point lands mid-logo and
  // the restart reads as a visible jump/gap instead of a seamless wrap.
  var MARQUEE_SLIDE_W = 130;
  var MARQUEE_GAP = 36;
  var MARQUEE_STEP = MARQUEE_SLIDE_W + MARQUEE_GAP;

  function syncMarqueeVars(halfCount) {
    var root = document.documentElement.style;
    root.setProperty("--marquee-track-width", (halfCount * 2 * MARQUEE_STEP) + "px");
    root.setProperty("--marquee-scroll-distance", "-" + (halfCount * MARQUEE_STEP) + "px");
    root.setProperty("--marquee-duration", Math.max(18, Math.round((90 * halfCount) / 24)) + "s");
  }

  // The static seed markup in index.html is already "doubled" (same logos
  // twice) for the same reason renderPartners doubles real data below —
  // sync its distance too, otherwise it only gets the CSS's rough default
  // and the loop restart is visibly off.
  (function syncSeedMarquee() {
    var track = document.querySelector(".partners-band .slide-track");
    if (!track) return;
    var half = track.children.length / 2;
    if (half > 0) syncMarqueeVars(half);
  })();

  function renderPartners(partners) {
    if (!partners || partners.length === 0) return; // keep the static seed marquee
    var track = document.querySelector(".partners-band .slide-track");
    if (!track) return;
    var doubled = partners.concat(partners);
    track.innerHTML = doubled
      .map(function (p) {
        var img = p.logo_url ? API_BASE + p.logo_url : "";
        var content = '<img src="' + escapeHtml(img) + '" alt="' + escapeHtml(p.name || "") + '" />';
        if (p.link_url) content = '<a href="' + escapeHtml(p.link_url) + '" target="_blank" rel="noopener">' + content + "</a>";
        return '<div class="slide">' + content + "</div>";
      })
      .join("");
    syncMarqueeVars(partners.length);
  }

  if (window.Sharer) {
    document.querySelectorAll("[data-sharer]").forEach(function (el) {
      el.addEventListener("click", function (e) { e.preventDefault(); });
    });
  }

  Promise.all([
    fetch(API_BASE + "/api/site").then(function (r) { return r.ok ? r.json() : { settings: {} }; }),
    fetch(API_BASE + "/api/partners").then(function (r) { return r.ok ? r.json() : { partners: [] }; }),
  ])
    .then(function (results) {
      applySiteSettings(results[0].settings || {});
      renderPartners(results[1].partners || []);
    })
    .catch(function () {});

  document.addEventListener("portfolio:langchange", function () {
    if (lastSettings) applySiteSettings(lastSettings);
  });

  /* ============================== work grid (projects) ============================== */
  var CACHE_KEY = "portfolio_projects_v1";
  var CACHE_TTL_MS = 60 * 1000;
  var grid = document.getElementById("work-grid");
  var projectsLoaded = false;

  function buildCard(project) {
    var col = document.createElement("div");
    col.className = "work-card tilt magnetic";

    var badges = project.tags
      .map(function (t) { return '<span class="wc-tag">' + escapeHtml(t) + "</span>"; })
      .join("");

    var thumbnailAbsUrl = project.thumbnail_url ? API_BASE + project.thumbnail_url : "";
    var actionHtml = "";
    var openLabel = window.PortfolioI18N ? window.PortfolioI18N.t("openTemplateArrow") : "Open template ↗";
    if (project.sample_id || project.external_url || thumbnailAbsUrl) {
      actionHtml =
        '<button type="button" class="wc-open open-template-btn" data-sample-id="' +
        escapeHtml(project.sample_id || "") + '" data-external-url="' + escapeHtml(project.external_url || "") +
        '" data-thumbnail-url="' + escapeHtml(thumbnailAbsUrl) + '">' + escapeHtml(openLabel) + '</button>';
    }

    col.innerHTML =
      '<div class="work-thumb"><img src="' + escapeHtml(thumbnailAbsUrl) + '" loading="lazy" decoding="async" alt="' +
      escapeHtml(project.title || "") + '"></div>' +
      '<div class="work-body"><div class="wc-tags">' + badges + "</div>" + actionHtml + "</div>";
    return col;
  }

  function renderProjects(projects) {
    var seeds = grid.querySelectorAll(".work-card-seed");
    seeds.forEach(function (el) { el.remove(); });
    projects.forEach(function (project) { grid.appendChild(buildCard(project)); });
    bindOpenButtons();
    if (window.PortfolioFX) window.PortfolioFX.rescan();
    requestAnimationFrame(updateScrollIndicator);
  }

  function bindOpenButtons() {
    grid.querySelectorAll(".open-template-btn").forEach(function (btn) {
      if (btn.dataset.bound) return;
      btn.dataset.bound = "1";
      btn.addEventListener("click", function () {
        if (btn.dataset.sampleId) openTemplateModal({ type: "sample", sampleId: btn.dataset.sampleId });
        else if (btn.dataset.externalUrl) openTemplateModal({ type: "external", url: btn.dataset.externalUrl });
        else if (btn.dataset.thumbnailUrl) openTemplateModal({ type: "image", url: btn.dataset.thumbnailUrl });
      });
    });
  }
  bindOpenButtons();

  function loadProjects() {
    if (projectsLoaded || !grid) return;
    projectsLoaded = true;

    var cached = sessionStorage.getItem(CACHE_KEY);
    if (cached) {
      try {
        var parsed = JSON.parse(cached);
        if (Date.now() - parsed.ts < CACHE_TTL_MS) { renderProjects(parsed.projects); return; }
      } catch (e) { /* fall through to fetch */ }
    }

    fetch(API_BASE + "/api/projects")
      .then(function (res) { if (!res.ok) throw new Error("bad response"); return res.json(); })
      .then(function (data) {
        sessionStorage.setItem(CACHE_KEY, JSON.stringify({ ts: Date.now(), projects: data.projects }));
        renderProjects(data.projects);
      })
      .catch(function () { projectsLoaded = false; });
  }

  /* ---- scroll fade + direction arrow, reused by both the Work box and the
     Library box: same "gradient flips + arrow flips" behavior on each. ---- */
  var scrollIndicators = [];
  function wireScrollBox(wrapId, boxId, downId, upId) {
    var wrap = document.getElementById(wrapId);
    var box = document.getElementById(boxId);
    var down = document.getElementById(downId);
    var up = document.getElementById(upId);
    if (!wrap || !box) return null;

    function update() {
      var atTop = box.scrollTop <= 2;
      var atBottom = box.scrollTop + box.clientHeight >= box.scrollHeight - 2;
      var overflowing = box.scrollHeight > box.clientHeight + 2;
      wrap.classList.toggle("can-scroll-down", overflowing && !atBottom);
      wrap.classList.toggle("can-scroll-up", overflowing && atBottom && !atTop);
    }
    box.addEventListener("scroll", update);
    window.addEventListener("resize", update);
    if (down) down.addEventListener("click", function () { box.scrollBy({ top: box.clientHeight * 0.8, behavior: "smooth" }); });
    if (up) up.addEventListener("click", function () { box.scrollTo({ top: 0, behavior: "smooth" }); });
    scrollIndicators.push(update);
    return update;
  }
  function updateScrollIndicator() { scrollIndicators.forEach(function (fn) { fn(); }); }

  wireScrollBox("workScrollWrap", "workScroll", "scrollArrowDown", "scrollArrowUp");

  /* ============================== animation library (embedded, lazy-loaded) ==============================
     347 animations is a lot of DOM/JS to ship on every page load, so the
     engine (render/modal/runtime + the ~1.3MB data file) only loads the
     first time someone actually opens the Library view. Scripts are plain
     globals (window.AnimLib*), so they're injected in order with
     async=false, which guarantees execution order without a bundler. */
  var libEngineLoading = false;
  window.__libEngineReady = false;

  function loadScriptsInOrder(urls, done) {
    var remaining = urls.length;
    if (!remaining) { done(); return; }
    urls.forEach(function (src) {
      var s = document.createElement("script");
      s.src = src;
      s.async = false;
      s.onload = s.onerror = function () { if (--remaining === 0) done(); };
      document.body.appendChild(s);
    });
  }

  function libFilterLabel() {
    // AnimLibRender.ALL sentinel isn't known until the engine loads; read it then.
    return window.AnimLibRender ? window.AnimLibRender.ALL : null;
  }

  // "Function Activity" is a placeholder category with no real animations
  // yet (more are coming later) — render.js only ever builds pills for
  // categories that actually exist in window.ANIMATIONS, so this one is
  // layered on top by hand: a pill appended after the real ones, with its
  // own click handler that shows a "coming soon" state instead of a grid.
  var FUNCTION_ACTIVITY_CAT = "__FUNCTION_ACTIVITY__";

  function showComingSoonGrid() {
    var gridEl = document.getElementById("libGrid");
    var i18n = window.PortfolioI18N;
    gridEl.innerHTML = '<div class="lib-coming-soon">' + (i18n ? i18n.t("libComingSoon") : "Coming soon") + "</div>";
    requestAnimationFrame(updateScrollIndicator);
  }

  function appendFunctionActivityPill(filtersEl) {
    var i18n = window.PortfolioI18N;
    var pill = document.createElement("button");
    pill.type = "button";
    pill.className = "filter-pill filter-pill--soon" + (filtersEl.dataset.active === FUNCTION_ACTIVITY_CAT ? " is-active" : "");
    pill.textContent = i18n ? i18n.t("libFunctionActivity") : "Function Activity";
    pill.dataset.cat = FUNCTION_ACTIVITY_CAT;
    pill.addEventListener("click", function () {
      filtersEl.dataset.active = FUNCTION_ACTIVITY_CAT;
      filtersEl.querySelectorAll(".filter-pill").forEach(function (b) { b.classList.remove("is-active"); });
      pill.classList.add("is-active");
      showComingSoonGrid();
    });
    filtersEl.appendChild(pill);
  }

  function renderLibrary(activeCatOverride) {
    if (!window.ANIMATIONS || !window.AnimLibRender) return;
    var filtersEl = document.getElementById("libFilters");
    var gridEl = document.getElementById("libGrid");
    if (activeCatOverride !== undefined) filtersEl.dataset.active = activeCatOverride || libFilterLabel();
    var wasFunctionActivity = filtersEl.dataset.active === FUNCTION_ACTIVITY_CAT;

    // renderFilters only knows the real, data-backed categories — a value it
    // doesn't recognize falls back to ALL for its own bookkeeping, which is
    // fine here since our placeholder pill's active state is tracked and
    // restored separately below.
    if (wasFunctionActivity) filtersEl.dataset.active = libFilterLabel();
    window.AnimLibRender.renderFilters(filtersEl, window.ANIMATIONS, function (cat) {
      window.AnimLibRender.renderGrid(gridEl, window.ANIMATIONS, cat);
      if (window.PortfolioFX) window.PortfolioFX.rescan();
      requestAnimationFrame(updateScrollIndicator);
    });
    appendFunctionActivityPill(filtersEl);

    if (wasFunctionActivity) {
      filtersEl.dataset.active = FUNCTION_ACTIVITY_CAT;
      filtersEl.querySelectorAll(".filter-pill").forEach(function (b) { b.classList.toggle("is-active", b.dataset.cat === FUNCTION_ACTIVITY_CAT); });
      showComingSoonGrid();
    } else {
      var activeCat = filtersEl.dataset.active;
      window.AnimLibRender.renderGrid(gridEl, window.ANIMATIONS, activeCat && activeCat !== libFilterLabel() ? activeCat : null);
    }

    var statsRow = document.getElementById("libStatsRow");
    if (statsRow) window.AnimLibRender.renderStats(statsRow, window.ANIMATIONS);
    if (window.PortfolioFX) window.PortfolioFX.rescan();
    requestAnimationFrame(updateScrollIndicator);
  }

  window.__libRefreshAfterLangChange = function () { renderLibrary(); };

  function ensureLibraryLoaded() {
    if (window.__libEngineReady || libEngineLoading) return;
    libEngineLoading = true;

    loadScriptsInOrder(
      [
        "animations/js/i18n.js",
        "animations/js/animation-runtime.js",
        "animations/js/highlight.js",
        "animations/js/custom-select.js",
        "animations/js/render.js",
        "animations/js/modal.js",
        "animations/data/animations.config.js",
      ],
      function () {
        if (!window.AnimLibI18n || !window.AnimLibRender || !window.ANIMATIONS) return; // a script failed to load
        window.AnimLibI18n.set(window.PortfolioI18N ? window.PortfolioI18N.get() : "en");
        window.AnimLibModal.init();
        var loading = document.getElementById("libLoading");
        if (loading) loading.remove();
        renderLibrary(window.AnimLibRender.ALL);
        wireScrollBox("libScrollWrap", "libScroll", "libScrollArrowDown", "libScrollArrowUp");
        window.__libEngineReady = true;
        libEngineLoading = false;
      }
    );
  }

  /* ============================== preview modal (sample / external / image) ============================== */
  var activeModal = null;

  function injectModalStyles() {
    if (document.getElementById("preview-modal-styles")) return;
    var style = document.createElement("style");
    style.id = "preview-modal-styles";
    style.textContent =
      ".preview-modal-overlay{position:fixed;inset:0;background:rgba(10,10,14,0.94);z-index:9999;" +
      "display:flex;align-items:center;justify-content:center;padding:2vh 2vw;}" +
      ".preview-modal-box{position:relative;width:100%;height:100%;max-width:1500px;background:#000;" +
      "border-radius:10px;overflow:hidden;box-shadow:0 0 60px rgba(0,0,0,0.6);}" +
      ".preview-modal-box iframe{width:100%;height:100%;border:0;display:block;}" +
      ".preview-modal-box img{width:100%;height:100%;object-fit:contain;display:block;}" +
      ".preview-modal-close{position:absolute;top:14px;right:14px;z-index:3;width:34px;height:34px;" +
      "border:2px solid rgba(255,255,255,0.9);border-radius:50%;background:#D6FF3F;cursor:pointer;" +
      "box-shadow:0 2px 10px rgba(0,0,0,0.5);transition:transform 200ms linear;}" +
      ".preview-modal-close:hover{transform:rotate(90deg);}" +
      ".preview-modal-close::before,.preview-modal-close::after{content:'';position:absolute;left:50%;top:50%;" +
      "width:16px;height:2px;background:#0B0C10;border-radius:2px;}" +
      ".preview-modal-close::before{transform:translate(-50%,-50%) rotate(45deg);}" +
      ".preview-modal-close::after{transform:translate(-50%,-50%) rotate(-45deg);}" +
      ".preview-modal-loading{position:absolute;inset:0;display:flex;align-items:center;justify-content:center;" +
      "color:#9aa1b1;font-family:sans-serif;}" +
      ".preview-modal-error{position:absolute;inset:0;display:flex;align-items:center;justify-content:center;" +
      "color:#e5484d;font-family:sans-serif;text-align:center;padding:2rem;}" +
      ".preview-modal-watermark{position:absolute;bottom:8px;right:12px;color:rgba(255,255,255,0.35);" +
      "font-family:sans-serif;font-size:0.75rem;pointer-events:none;z-index:2;user-select:none;}";
    document.head.appendChild(style);
  }

  function openTemplateModal(target) {
    injectModalStyles();
    closeTemplateModal();

    var overlay = document.createElement("div");
    overlay.className = "preview-modal-overlay";
    overlay.innerHTML =
      '<div class="preview-modal-box">' +
      '<button type="button" class="preview-modal-close" aria-label="Close"></button>' +
      '<div class="preview-modal-loading">Loading…</div>' +
      (target.type === "sample" ? '<div class="preview-modal-watermark">Abdallah Portfolio — Preview</div>' : "") +
      "</div>";
    document.body.appendChild(overlay);
    activeModal = overlay;

    overlay.addEventListener("contextmenu", function (e) { e.preventDefault(); });
    overlay.querySelector(".preview-modal-close").addEventListener("click", closeTemplateModal);
    overlay.addEventListener("click", function (e) { if (e.target === overlay) closeTemplateModal(); });
    if (window.trackEvent) window.trackEvent("project_open");

    function mountIframe(src) {
      if (activeModal !== overlay) return;
      var box = overlay.querySelector(".preview-modal-box");
      var loading = overlay.querySelector(".preview-modal-loading");
      if (loading) loading.remove();
      var iframe = document.createElement("iframe");
      iframe.setAttribute("sandbox", "allow-scripts allow-same-origin allow-downloads");
      iframe.src = src;
      box.insertBefore(iframe, box.firstChild.nextSibling);
    }
    function showError() {
      if (activeModal !== overlay) return;
      var loading = overlay.querySelector(".preview-modal-loading");
      if (loading) { loading.className = "preview-modal-error"; loading.textContent = "Preview unavailable right now — try again shortly."; }
    }
    function mountImage(src) {
      if (activeModal !== overlay) return;
      var box = overlay.querySelector(".preview-modal-box");
      var loading = overlay.querySelector(".preview-modal-loading");
      if (loading) loading.remove();
      var img = document.createElement("img");
      img.src = src; img.alt = "";
      box.insertBefore(img, box.firstChild.nextSibling);
    }

    if (target.type === "external") { mountIframe(target.url); return; }
    if (target.type === "image") { mountImage(target.url); return; }

    fetch(API_BASE + "/api/preview-token/" + encodeURIComponent(target.sampleId), { method: "POST", credentials: "include" })
      .then(function (res) { if (!res.ok) throw new Error("preview unavailable"); return res.json(); })
      .then(function (data) { mountIframe(API_BASE + "/preview/" + encodeURIComponent(target.sampleId) + "/" + data.entryFile); })
      .catch(showError);
  }

  function closeTemplateModal() {
    if (activeModal) { activeModal.remove(); activeModal = null; }
  }
  document.addEventListener("keydown", function (e) { if (e.key === "Escape") closeTemplateModal(); });
  window.openTemplateModal = openTemplateModal;

  /* ============================== contact form ============================== */
  var contactForm = document.getElementById("contactform");
  if (contactForm) {
    contactForm.addEventListener("submit", function (e) {
      e.preventDefault();
      var formData = new FormData(this);
      fetch("https://formspree.io/f/maqyogjk", { method: "POST", body: formData, headers: { Accept: "application/json" } })
        .then(function (response) {
          if (response.ok) {
            contactForm.reset();
            if (window.Toastify) {
              Toastify({
                text: window.PortfolioI18N ? window.PortfolioI18N.t("toastSent") : "Your message has been sent",
                duration: 4000, close: true, gravity: "top", position: "center", stopOnFocus: true,
                style: { background: "#D6FF3F", color: "#0B0C10", "font-weight": 600 },
              }).showToast();
            }
          }
        })
        .catch(function () {});
    });
  }
})();
