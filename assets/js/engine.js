/* Living-canvas + magnetic hover + tilt + custom cursor. No dependencies.
   Skips itself gracefully on touch devices / reduced-motion. */
window.PortfolioFX = (function () {
  "use strict";
  var raf, canvas, ctx, particles = [], W = 0, H = 0;
  var mouse = { x: 0, y: 0 };
  var cursorEl, handlers = [], resizeBound = false;
  var reduceMotion = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var fineHover = window.matchMedia && window.matchMedia("(hover:hover) and (pointer:fine)").matches;

  function rand(a, b) { return a + Math.random() * (b - a); }

  function makeParticles(n) {
    particles = [];
    for (var i = 0; i < n; i++) {
      particles.push({
        x: Math.random() * W, y: Math.random() * H,
        r: rand(0.6, 2.1), vx: rand(-0.05, 0.05), vy: rand(-0.085, -0.02),
        a: rand(0.12, 0.5)
      });
    }
  }

  function resize() {
    var slot = document.getElementById("fxCanvas");
    if (!slot || !canvas) return;
    W = slot.clientWidth; H = slot.clientHeight;
    canvas.width = W; canvas.height = H;
  }

  function draw() {
    if (ctx) {
      ctx.clearRect(0, 0, W, H);
      var dx = (mouse.x - W / 2) * 0.018;
      var dy = (mouse.y - H / 2) * 0.018;
      for (var i = 0; i < particles.length; i++) {
        var p = particles[i];
        p.x += p.vx; p.y += p.vy;
        if (p.y < -10) { p.y = H + 10; p.x = Math.random() * W; }
        if (p.x < -10) p.x = W + 10;
        if (p.x > W + 10) p.x = -10;
        ctx.beginPath();
        ctx.arc(p.x + dx, p.y + dy, p.r, 0, Math.PI * 2);
        ctx.fillStyle = "rgba(214,255,63," + p.a + ")";
        ctx.fill();
      }
      if (mouse.x || mouse.y) {
        var g = ctx.createRadialGradient(mouse.x, mouse.y, 0, mouse.x, mouse.y, 240);
        g.addColorStop(0, "rgba(214,255,63,0.05)");
        g.addColorStop(1, "rgba(214,255,63,0)");
        ctx.fillStyle = g;
        ctx.fillRect(0, 0, W, H);
      }
    }
    raf = requestAnimationFrame(draw);
  }

  function onMove(e) {
    mouse.x = e.clientX; mouse.y = e.clientY;
    if (cursorEl) cursorEl.style.transform = "translate(" + (e.clientX - 8) + "px," + (e.clientY - 8) + "px)";
  }

  function setupCursor() {
    if (!fineHover || cursorEl) return;
    cursorEl = document.createElement("div");
    cursorEl.className = "fx-cursor";
    document.body.appendChild(cursorEl);
  }

  function bind(el, evt, fn) { el.addEventListener(evt, fn); handlers.push({ el: el, evt: evt, fn: fn }); }

  // Delegated hover-grow for content the page builds dynamically (filter
  // pills, dropdowns, buttons) — these aren't ".magnetic" (no pull, they
  // have their own hover interaction) but should still grow the cursor like
  // every other clickable thing, without re-binding per element.
  // ".card" is deliberately excluded: it's a library animation card, and the
  // whole point of hovering it is to see the small demo shape play inside
  // it — a 46px cursor ring with mix-blend-mode:difference sitting right on
  // top of a 38px shape would visually mash into it and read as "nothing is
  // happening" even while the animation plays correctly underneath.
  var HOVER_GROW_SELECTOR = ".filter-pill, .custom-select__trigger, .custom-select__option, .btn, .type-pill";
  function setupDelegatedHoverCursor() {
    if (!fineHover) return;
    bind(document, "mouseover", function (e) {
      if (cursorEl && e.target.closest && e.target.closest(HOVER_GROW_SELECTOR)) cursorEl.classList.add("is-hover");
    });
    bind(document, "mouseout", function (e) {
      if (cursorEl && e.target.closest && e.target.closest(HOVER_GROW_SELECTOR) && !(e.relatedTarget && e.relatedTarget.closest && e.relatedTarget.closest(HOVER_GROW_SELECTOR))) {
        cursorEl.classList.remove("is-hover");
      }
    });
  }

  function setupMagnetic() {
    if (!fineHover) return;
    var els = document.querySelectorAll(".magnetic:not([data-fx-bound])");
    for (var i = 0; i < els.length; i++) {
      (function (el) {
        el.setAttribute("data-fx-bound", "1");
        bind(el, "mousemove", function (e) {
          var r = el.getBoundingClientRect();
          var mx = e.clientX - (r.left + r.width / 2);
          var my = e.clientY - (r.top + r.height / 2);
          el.style.transform = "translate(" + (mx * 0.26) + "px," + (my * 0.26) + "px)";
          if (cursorEl) cursorEl.classList.add("is-hover");
        });
        bind(el, "mouseleave", function () {
          el.style.transform = "";
          if (cursorEl) cursorEl.classList.remove("is-hover");
        });
      })(els[i]);
    }
  }

  function setupTilt() {
    if (!fineHover) return;
    var els = document.querySelectorAll(".tilt:not([data-fx-bound])");
    for (var i = 0; i < els.length; i++) {
      (function (el) {
        el.setAttribute("data-fx-bound", "1");
        bind(el, "mousemove", function (e) {
          var r = el.getBoundingClientRect();
          var px = (e.clientX - r.left) / r.width - 0.5;
          var py = (e.clientY - r.top) / r.height - 0.5;
          el.style.transform = "perspective(700px) rotateX(" + (py * -8) + "deg) rotateY(" + (px * 8) + "deg)";
        });
        bind(el, "mouseleave", function () {
          el.style.transform = "perspective(700px) rotateX(0deg) rotateY(0deg)";
        });
      })(els[i]);
    }
  }

  function init() {
    var slot = document.getElementById("fxCanvas");
    if (slot && !canvas && !reduceMotion) {
      canvas = document.createElement("canvas");
      canvas.style.cssText = "display:block;width:100%;height:100%;";
      slot.appendChild(canvas);
      ctx = canvas.getContext("2d");
      resize();
      makeParticles(56);
      if (!resizeBound) { window.addEventListener("resize", resize); resizeBound = true; }
      raf = requestAnimationFrame(draw);
    }
    setupCursor();
    if (fineHover) bind(window, "mousemove", onMove);
    setupMagnetic();
    setupTilt();
    setupDelegatedHoverCursor();
  }

  function rescan() {
    // Re-bind magnetic/tilt for elements added after a view switch, without
    // duplicating the canvas/cursor/global mousemove listener.
    setupMagnetic();
    setupTilt();
  }

  function destroy() {
    if (raf) cancelAnimationFrame(raf);
    for (var i = 0; i < handlers.length; i++) handlers[i].el.removeEventListener(handlers[i].evt, handlers[i].fn);
    handlers = [];
    if (cursorEl && cursorEl.parentNode) cursorEl.parentNode.removeChild(cursorEl);
    cursorEl = null;
    if (canvas && canvas.parentNode) canvas.parentNode.removeChild(canvas);
    canvas = null; ctx = null; particles = [];
  }

  return { init: init, destroy: destroy, rescan: rescan };
})();

document.addEventListener("DOMContentLoaded", function () { window.PortfolioFX.init(); });
