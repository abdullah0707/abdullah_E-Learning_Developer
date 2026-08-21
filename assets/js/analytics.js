(function () {
  "use strict";

  var API_BASE = "https://portfolio-backend.abdullahelgammal25.workers.dev";

  function getVisitorId() {
    try {
      var id = localStorage.getItem("_visitor_id");
      if (!id) {
        id = crypto.randomUUID();
        localStorage.setItem("_visitor_id", id);
      }
      return id;
    } catch (e) {
      return "anonymous";
    }
  }

  function send(eventType, label) {
    fetch(API_BASE + "/api/track", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        visitorId: getVisitorId(),
        eventType: eventType,
        path: window.location.pathname,
        referrer: document.referrer,
        label: label || "",
      }),
      keepalive: true,
    }).catch(function () {});
  }

  window.trackEvent = function (label) {
    send("click", label);
  };

  send("pageview");

  // Track a few key interactions once the DOM is ready.
  document.addEventListener("DOMContentLoaded", function () {
    document.querySelectorAll('a[href*="drive.google.com"]').forEach(function (el) {
      if (/cv/i.test(el.textContent || "")) {
        el.addEventListener("click", function () {
          window.trackEvent("cv_download");
        });
      }
    });

    var contactForm = document.getElementById("contactform");
    if (contactForm) {
      contactForm.addEventListener("submit", function () {
        window.trackEvent("contact_submit");
      });
    }

    document.addEventListener("click", function (e) {
      var btn = e.target.closest(".open-template-btn");
      if (btn) window.trackEvent("project_open");
    });
  });
})();
