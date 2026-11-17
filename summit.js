/* The Task Meadow · summit book: opens on view, then the hiker walks the trail and plants the flag */
(function () {
  "use strict";
  var card = document.getElementById("xp-summit");
  if (!card || !card.classList.contains("smt")) return;
  var art = card.querySelector(".smt-art"), svg = art && art.querySelector("svg"), trail = art && art.querySelector(".smt-trail");
  var hiker = art && art.querySelector(".smt-hiker"), flag = art && art.querySelector(".smt-flag");
  var isBook = card.classList.contains("bk"), replay = card.querySelector(".bk-replay");
  var phone = window.matchMedia && matchMedia("(max-width: 760px)").matches;
  var L = trail ? trail.getTotalLength() : 0, k = 0, timers = [], raf = 0;

  // SVG units -> pixels inside .smt-art; measured with the art's own size so 3D page transforms don't matter
  function toArt(x, y) {
    var vb = svg.viewBox.baseVal, w = art.clientWidth, hgt = art.clientHeight;
    var s = Math.max(w / vb.width, hgt / vb.height);          // preserveAspectRatio "xMidYMax slice"
    var ox = (w - vb.width * s) / 2, oy = hgt - vb.height * s;
    return { x: ox + x * s, y: oy + y * s };
  }
  function put(el, p) { el.style.left = p.x.toFixed(1) + "px"; el.style.top = p.y.toFixed(1) + "px"; }
  function placeFlag() { if (flag) put(flag, toArt(222, 58)); }
  function placeHiker() { if (hiker && trail) { var p = trail.getPointAtLength(L * k); put(hiker, toArt(p.x, p.y)); } }
  window.addEventListener("resize", function () { placeFlag(); placeHiker(); });

  function walk() {
    if (!hiker || !trail) { card.classList.add("flagged"); return; }
    placeFlag(); hiker.style.opacity = 1;
    var t0 = performance.now(), D = 2400;
    (function f(t) {
      var p = Math.min(1, (t - t0) / D);
      k = p < .5 ? 2 * p * p : 1 - Math.pow(-2 * p + 2, 2) / 2;
      placeHiker();
      hiker.style.marginTop = (-24 - Math.abs(Math.sin(p * Math.PI * 8)) * 3).toFixed(1) + "px";
      if (p < 1) raf = requestAnimationFrame(f);
      else { hiker.style.marginTop = ""; card.classList.add("flagged"); }
    })(t0);
  }
  function later(fn, ms) { timers.push(setTimeout(fn, ms)); }
  function play() {
    if (isBook) {
      card.classList.add("open");
      later(function () { card.classList.add("in"); placeFlag(); placeHiker(); }, phone ? 900 : 1500);
      later(walk, phone ? 2000 : 2600);
    } else { card.classList.add("in"); later(walk, 1100); }
  }
  function reset() {
    timers.forEach(clearTimeout); timers = []; cancelAnimationFrame(raf);
    card.classList.remove("open", "in", "flagged");
    k = 0; if (hiker) { hiker.style.opacity = 0; placeHiker(); }
  }
  placeFlag(); placeHiker();

  if ("IntersectionObserver" in window) {
    var io = new IntersectionObserver(function (es) {
      if (es[0].isIntersecting) { io.disconnect(); play(); }
    }, { threshold: .45 });
    io.observe(card);
  } else play();

  if (replay) replay.addEventListener("click", function () { reset(); setTimeout(play, 1400); });
})();
