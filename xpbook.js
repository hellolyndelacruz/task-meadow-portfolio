/* The Task Meadow · experience brochures: each company group unfolds when it scrolls into view */
(function () {
  "use strict";
  var groups = Array.prototype.slice.call(document.querySelectorAll(".tl-group"));
  if (!groups.length) return;
  groups.forEach(function (g) { g.classList.add("xb"); });
  if (!("IntersectionObserver" in window)) { groups.forEach(function (g) { g.classList.add("open"); }); return; }
  var io = new IntersectionObserver(function (es) {
    es.forEach(function (e) { if (e.isIntersecting) { e.target.classList.add("open"); io.unobserve(e.target); } });
  }, { threshold: .12, rootMargin: "0px 0px -80px 0px" });
  groups.forEach(function (g) { io.observe(g); });
})();
