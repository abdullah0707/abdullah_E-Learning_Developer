(function () {
  "use strict";

  var API_BASE = "https://portfolio-backend.abdullahelgammal25.workers.dev";

  var FONT_MAP = {
    poppins: { family: "Poppins", href: null }, // already statically imported in style.css
    inter: { family: "Inter", href: "https://fonts.googleapis.com/css2?family=Inter:wght@100..900&display=swap" },
    montserrat: {
      family: "Montserrat",
      href: "https://fonts.googleapis.com/css2?family=Montserrat:ital,wght@0,100..900;1,100..900&display=swap",
    },
    roboto: {
      family: "Roboto",
      href: "https://fonts.googleapis.com/css2?family=Roboto:ital,wght@0,100;0,300;0,400;0,500;0,700;0,900;1,100;1,300;1,400;1,500;1,700;1,900&display=swap",
    },
    cairo: { family: "Cairo", href: "https://fonts.googleapis.com/css2?family=Cairo:wght@200..1000&display=swap" },
    tajawal: {
      family: "Tajawal",
      href: "https://fonts.googleapis.com/css2?family=Tajawal:wght@200;300;400;500;700;800;900&display=swap",
    },
  };

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

  function applyFont(choice) {
    var entry = FONT_MAP[choice];
    if (!entry) return;
    if (entry.href && !document.getElementById("dynamic-font-link")) {
      var link = document.createElement("link");
      link.id = "dynamic-font-link";
      link.rel = "stylesheet";
      link.href = entry.href;
      document.head.appendChild(link);
    }
    document.documentElement.style.setProperty("--site-font", '"' + entry.family + '"');
  }

  function applySiteSettings(settings) {
    setText("hero-title", settings.hero_title);
    setText("hero-tagline", settings.hero_tagline);
    setText("hero-welcome", settings.hero_welcome_text);
    setText("about-bio-text", settings.about_bio);
    setHref("cv-link", settings.cv_url);
    setHref("social-facebook", settings.social_facebook);
    setHref("social-linkedin", settings.social_linkedin);
    setHref("social-github", settings.social_github);
    setHref("social-phone", settings.social_phone ? "tel:" + settings.social_phone : null);

    if (settings.social_whatsapp_number) {
      var wa = document.getElementById("social-whatsapp");
      if (wa) wa.setAttribute("data-to", settings.social_whatsapp_number);
    }
    if (settings.social_email) {
      var mail = document.getElementById("social-email");
      if (mail) {
        mail.setAttribute("href", "mailto:" + settings.social_email);
        mail.setAttribute("data-to", settings.social_email);
      }
    }
    if (settings.about_photo_url) {
      var photo = document.getElementById("about-photo");
      if (photo) photo.src = API_BASE + settings.about_photo_url;
    }
    if (settings.font_choice) applyFont(settings.font_choice);
  }

  function escapeHtml(str) {
    return String(str == null ? "" : str).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }

  function renderPartners(partners) {
    if (!partners || partners.length === 0) return; // keep the static fallback marquee
    var track = document.querySelector(".slider .slide-track");
    if (!track) return;

    // Duplicate the list once so the loop wraps seamlessly, same technique as
    // the original static markup (N unique logos -> 2N slides in the DOM).
    var doubled = partners.concat(partners);
    track.innerHTML = doubled
      .map(function (p) {
        var img = p.logo_url ? API_BASE + p.logo_url : "";
        // object-fit:contain on an explicitly full-size box keeps every logo fully
        // inside its 250x100 slot regardless of its own aspect ratio (wide, tall,
        // or square) — no per-logo tuning needed, so newly-added logos never
        // overflow into their neighbours' slots the way the old fixed Bootstrap
        // sizing classes required per image.
        var content =
          '<img src="' +
          escapeHtml(img) +
          '" alt="' +
          escapeHtml(p.name || "") +
          '" style="width:100%;height:100%;object-fit:contain;padding:0 0.75rem;box-sizing:border-box;" />';
        if (p.link_url) {
          content = '<a href="' + escapeHtml(p.link_url) + '" target="_blank" rel="noopener">' + content + "</a>";
        }
        return '<div class="slide" style="width: 250px; height: 100px;">' + content + "</div>";
      })
      .join("");

    var n = partners.length;
    var root = document.documentElement.style;
    root.setProperty("--marquee-track-width", "calc(250px * " + n * 2 + ")");
    root.setProperty("--marquee-scroll-distance", "calc(-250px * " + n + ")");
    root.setProperty("--marquee-duration", Math.max(20, Math.round((110 * n) / 24)) + "s");
  }

  Promise.all([
    fetch(API_BASE + "/api/site").then(function (r) {
      return r.ok ? r.json() : { settings: {} };
    }),
    fetch(API_BASE + "/api/partners").then(function (r) {
      return r.ok ? r.json() : { partners: [] };
    }),
  ])
    .then(function (results) {
      applySiteSettings(results[0].settings || {});
      renderPartners(results[1].partners || []);
    })
    .catch(function () {
      /* network error: static HTML defaults stay as-is */
    });
})();
