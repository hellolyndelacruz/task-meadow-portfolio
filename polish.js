/* The Task Meadow · polish: counters, spotlight, company role index, off-screen animation pausing */
(function () {
  "use strict";
  var $ = function (id) { return document.getElementById(id); };
  var $$ = function (sel, root) { return Array.prototype.slice.call((root || document).querySelectorAll(sel)); };
  var hasIO = "IntersectionObserver" in window;
  var fine = window.matchMedia && matchMedia("(hover: hover) and (pointer: fine)").matches;

  function once(els, cb, opts) {
    if (!hasIO) { els.forEach(cb); return; }
    var io = new IntersectionObserver(function (es) {
      es.forEach(function (e) { if (e.isIntersecting) { cb(e.target); io.unobserve(e.target); } });
    }, opts || { threshold: .25 });
    els.forEach(function (el) { io.observe(el); });
  }
  function count(b, delay) {
    var to = +b.getAttribute("data-count"), suf = b.getAttribute("data-suffix") || "";
    setTimeout(function () {
      var t0 = performance.now();
      (function f(t) { var k = Math.min(1, (t - t0) / 1200); b.textContent = Math.round(to * (1 - Math.pow(1 - k, 3))) + (k === 1 ? suf : ""); if (k < 1) requestAnimationFrame(f); })(t0);
    }, delay || 0);
  }

  // 1. About: counters on the profile card
  var prof = document.querySelector(".ab-profile");
  if (prof) once([prof], function () { $$("b[data-count]", prof).forEach(function (b, i) { count(b, 300 + i * 150); }); });

  // 2. Spotlight that follows the pointer (one listener per card, rAF-throttled)
  if (fine) $$(".ab-card, .ab-profile, .sv").forEach(function (c) {
    var raf = 0, x = 0, y = 0;
    c.addEventListener("pointermove", function (e) {
      x = e.clientX; y = e.clientY;
      if (raf) return;
      raf = requestAnimationFrame(function () {
        raf = 0; var b = c.getBoundingClientRect();
        c.style.setProperty("--mx", (x - b.left).toFixed(0) + "px"); c.style.setProperty("--my", (y - b.top).toFixed(0) + "px");
      });
    });
  });

  // 3. Company cards: role index opens and scrolls to the role; highlights the role you're reading
  $$(".tl-co-roles button").forEach(function (b) {
    b.addEventListener("click", function () {
      var id = b.getAttribute("data-target"), t = $(id); if (!t) return;
      if (window.__tlOpen) window.__tlOpen(id);
      window.scrollTo({ top: t.getBoundingClientRect().top + window.pageYOffset - window.innerHeight * .3, behavior: "smooth" });
    });
  });
  if (hasIO) {
    var idx = {};
    $$(".tl-co-roles button").forEach(function (b) { idx[b.getAttribute("data-target")] = b; });
    var mo = new MutationObserver(function (ms) {
      ms.forEach(function (m) { var b = idx[m.target.id]; if (b) b.classList.toggle("on", m.target.classList.contains("is-active")); });
    });
    $$(".tl-role").forEach(function (r) { mo.observe(r, { attributes: true, attributeFilter: ["class"] }); });
  }

  // 4. Count the big years on company cards
  $$(".tl-co-yrs b").forEach(function (b) {
    var m = b.textContent.match(/^(\d+)(\+?)$/); if (!m) return;
    b.setAttribute("data-count", m[1]); b.setAttribute("data-suffix", m[2]);
    once([b.closest(".tl-co-card")], function () { count(b, 350); });
  });

  // 5. Performance: pause looping animations in sections that are off-screen
  if (hasIO) {
    var secs = $$("main > section, main > footer");
    var io = new IntersectionObserver(function (es) {
      es.forEach(function (e) { e.target.classList.toggle("is-off", !e.isIntersecting); });
    }, { rootMargin: "200px 0px 200px 0px" });
    secs.forEach(function (s) { io.observe(s); });
  }
})();
