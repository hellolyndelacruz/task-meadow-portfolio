/* The Task Meadow · summit card: the hiker walks the trail, then plants the flag */
(function () {
  "use strict";
  var card = document.getElementById("xp-summit");
  if (!card || !card.classList.contains("smt")) return;
  var art = card.querySelector(".smt-art"), svg = art.querySelector("svg"), trail = art.querySelector(".smt-trail");
  var hiker = art.querySelector(".smt-hiker"), flag = art.querySelector(".smt-flag");
  if (!svg || !trail || !hiker || !flag) return;
  var L = trail.getTotalLength();

  // SVG user units -> pixels inside .smt-art (handles preserveAspectRatio "slice")
  function toArt(pt) {
    var m = svg.getScreenCTM(), r = art.getBoundingClientRect();
    if (!m) return { x: 0, y: 0 };
    return { x: m.a * pt.x + m.c * pt.y + m.e - r.left, y: m.b * pt.x + m.d * pt.y + m.f - r.top };
  }
  function put(el, p) { el.style.left = p.x.toFixed(1) + "px"; el.style.top = p.y.toFixed(1) + "px"; }
  function placeFlag() { put(flag, toArt(svg.createSVGPoint ? (function () { var p = svg.createSVGPoint(); p.x = 222; p.y = 58; return p; })() : { x: 222, y: 58 })); }
  var k = 0;
  function placeHiker() { put(hiker, toArt(trail.getPointAtLength(L * k))); }
  placeFlag(); placeHiker();
  window.addEventListener("resize", function () { placeFlag(); placeHiker(); });

  function walk() {
    hiker.style.opacity = 1;
    var t0 = performance.now(), D = 2400;
    (function f(t) {
      var p = Math.min(1, (t - t0) / D);
      k = p < .5 ? 2 * p * p : 1 - Math.pow(-2 * p + 2, 2) / 2;
      placeHiker();
      hiker.style.marginTop = (-24 - Math.abs(Math.sin(p * Math.PI * 8)) * 3).toFixed(1) + "px";
      if (p < 1) requestAnimationFrame(f);
      else { hiker.style.marginTop = ""; card.classList.add("flagged"); }
    })(t0);
  }
  if ("IntersectionObserver" in window) {
    var io = new IntersectionObserver(function (es) {
      if (es[0].isIntersecting) { io.disconnect(); setTimeout(walk, 1100); }
    }, { threshold: .4 });
    io.observe(card);
  } else walk();
})();
