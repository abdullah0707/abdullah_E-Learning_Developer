(function () {
  "use strict";

  var API_BASE = "https://portfolio-backend.abdullahelgammal25.workers.dev";
  var CACHE_KEY = "portfolio_projects_v1";
  var grid = document.getElementById("projects-row");
  var loaded = false;

  function escapeHtml(str) {
    return String(str == null ? "" : str).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }

  function renderSkeleton() {
    var seeds = grid.querySelectorAll(".projects-card-seed");
    seeds.forEach(function (el, i) {
      if (i >= 3) el.style.display = "none";
      else el.style.opacity = "0.35";
    });
  }

  function buildCard(project) {
    var col = document.createElement("div");
    col.className = "col-md-6 col-lg-4 p-2 projects-card-dynamic";

    var badges = project.tags
      .map(function (t) {
        return '<span class="badge rounded-pill text-bg-warning mx-1">' + escapeHtml(t) + "</span>";
      })
      .join("");

    var actionHtml;
    if (project.sample_id) {
      actionHtml =
        '<button type="button" class="button pulse-grow btn btn-danger preview-sample-btn" data-sample-id="' +
        escapeHtml(project.sample_id) +
        '" style="--bs-btn-padding-y: .25rem; --bs-btn-padding-x: .5rem; --bs-btn-font-size: .75rem;">Preview</button>';
    } else if (project.external_url) {
      actionHtml =
        '<a rel="pulse-grow" href="' +
        escapeHtml(project.external_url) +
        '" target="_blank" class="button pulse-grow btn btn-danger" style="--bs-btn-padding-y: .25rem; --bs-btn-padding-x: .5rem; --bs-btn-font-size: .75rem;">Open Template</a>';
    } else {
      actionHtml = "";
    }

    col.innerHTML =
      '<div class="card text-bg-dark rounded-top-4">' +
      '<img class="m-0" style="height: 230px !important;" src="' +
      escapeHtml(project.thumbnail_url ? API_BASE + project.thumbnail_url : "") +
      '" loading="lazy" decoding="async" alt="">' +
      '<div class="card-img-overlay rounded-0">' +
      badges +
      "</div>" +
      '<div class="position-absolute bottom-0 m-2">' +
      actionHtml +
      "</div>" +
      "</div>";
    return col;
  }

  function renderProjects(projects) {
    var seeds = grid.querySelectorAll(".projects-card-seed");
    seeds.forEach(function (el) {
      el.remove();
    });
    projects.forEach(function (project) {
      grid.appendChild(buildCard(project));
    });
    grid.querySelectorAll(".preview-sample-btn").forEach(function (btn) {
      btn.addEventListener("click", function () {
        openPreviewModal(btn.dataset.sampleId);
      });
    });
  }

  function loadProjects() {
    if (loaded || !grid) return;
    loaded = true;

    var cached = sessionStorage.getItem(CACHE_KEY);
    if (cached) {
      try {
        renderProjects(JSON.parse(cached));
        return;
      } catch (e) {
        /* fall through to fetch */
      }
    }

    renderSkeleton();
    fetch(API_BASE + "/api/projects")
      .then(function (res) {
        if (!res.ok) throw new Error("bad response");
        return res.json();
      })
      .then(function (data) {
        sessionStorage.setItem(CACHE_KEY, JSON.stringify(data.projects));
        renderProjects(data.projects);
      })
      .catch(function () {
        // Fetch failed: leave the seeded static cards in place (they were only
        // dimmed/hidden by renderSkeleton, never removed) rather than showing a gap.
        var seeds = grid.querySelectorAll(".projects-card-seed");
        seeds.forEach(function (el) {
          el.style.display = "";
          el.style.opacity = "";
        });
        loaded = false;
      });
  }

  if (window.jQuery) {
    jQuery(".wildlife").on("click", loadProjects);
  } else {
    document.querySelectorAll(".wildlife").forEach(function (el) {
      el.addEventListener("click", loadProjects);
    });
  }

  // ---------------- Protected sample preview modal ----------------
  var activeModal = null;

  function injectModalStyles() {
    if (document.getElementById("preview-modal-styles")) return;
    var style = document.createElement("style");
    style.id = "preview-modal-styles";
    style.textContent =
      ".preview-modal-overlay{position:fixed;inset:0;background:rgba(0,0,0,0.92);z-index:9999;" +
      "display:flex;align-items:center;justify-content:center;padding:2vh 2vw;}" +
      ".preview-modal-box{position:relative;width:100%;height:100%;max-width:1400px;background:#000;" +
      "border-radius:8px;overflow:hidden;box-shadow:0 0 60px rgba(0,0,0,0.6);}" +
      ".preview-modal-box iframe{width:100%;height:100%;border:0;display:block;}" +
      ".preview-modal-close{position:absolute;top:10px;left:10px;z-index:2;background:#e5484d;color:#fff;" +
      "border:none;border-radius:999px;width:36px;height:36px;font-size:1.1rem;cursor:pointer;}" +
      ".preview-modal-loading{position:absolute;inset:0;display:flex;align-items:center;justify-content:center;" +
      "color:#9aa1b1;font-family:sans-serif;}" +
      ".preview-modal-error{position:absolute;inset:0;display:flex;align-items:center;justify-content:center;" +
      "color:#e5484d;font-family:sans-serif;text-align:center;padding:2rem;}" +
      ".preview-modal-watermark{position:absolute;bottom:8px;right:12px;color:rgba(255,255,255,0.35);" +
      "font-family:sans-serif;font-size:0.75rem;pointer-events:none;z-index:2;user-select:none;}";
    document.head.appendChild(style);
  }

  function openPreviewModal(sampleId) {
    injectModalStyles();
    closePreviewModal();

    var overlay = document.createElement("div");
    overlay.className = "preview-modal-overlay";
    overlay.innerHTML =
      '<div class="preview-modal-box">' +
      '<button type="button" class="preview-modal-close" aria-label="Close">✕</button>' +
      '<div class="preview-modal-loading">جاري التحميل...</div>' +
      '<div class="preview-modal-watermark">Abdullah Portfolio — Preview</div>' +
      "</div>";
    document.body.appendChild(overlay);
    activeModal = overlay;

    overlay.addEventListener("contextmenu", function (e) {
      e.preventDefault();
    });
    overlay.querySelector(".preview-modal-close").addEventListener("click", closePreviewModal);
    overlay.addEventListener("click", function (e) {
      if (e.target === overlay) closePreviewModal();
    });

    fetch(API_BASE + "/api/preview-token/" + encodeURIComponent(sampleId), {
      method: "POST",
      credentials: "include",
    })
      .then(function (res) {
        if (!res.ok) throw new Error("preview unavailable");
        return res.json();
      })
      .then(function (data) {
        if (activeModal !== overlay) return; // closed before token arrived
        var box = overlay.querySelector(".preview-modal-box");
        var loading = overlay.querySelector(".preview-modal-loading");
        if (loading) loading.remove();
        var iframe = document.createElement("iframe");
        iframe.setAttribute("sandbox", "allow-scripts allow-same-origin");
        iframe.src = API_BASE + "/preview/" + encodeURIComponent(sampleId) + "/" + data.entryFile;
        box.insertBefore(iframe, box.firstChild.nextSibling);
      })
      .catch(function () {
        if (activeModal !== overlay) return;
        var loading = overlay.querySelector(".preview-modal-loading");
        if (loading) {
          loading.className = "preview-modal-error";
          loading.textContent = "معذرة، مفيش وصول للمعاينة دلوقتي. جرب تاني بعد شوية.";
        }
      });
  }

  function closePreviewModal() {
    if (activeModal) {
      activeModal.remove();
      activeModal = null;
    }
  }

  document.addEventListener("keydown", function (e) {
    if (e.key === "Escape") closePreviewModal();
  });
})();
