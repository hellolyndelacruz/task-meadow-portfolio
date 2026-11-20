/* The Task Meadow · pause looping animations in sections that are off screen */
(function () {
  if (!("IntersectionObserver" in window)) return;
  var io = new IntersectionObserver(function (es) {
    es.forEach(function (e) { e.target.classList.toggle("anim-off", !e.isIntersecting); });
  }, { rootMargin: "150px 0px" });
  [].forEach.call(document.querySelectorAll("section[id], footer"), function (s) { io.observe(s); });
})();

/* Resizing: freeze transitions/animations while the window is being dragged (no jank),
   then let the visible sections settle in with a soft rise once it stops. Width changes only,
   so the mobile address bar showing/hiding never triggers it. */
(function () {
  var root = document.documentElement, w = innerWidth, t = 0;
  var still = window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches;
  addEventListener("resize", function () {
    if (innerWidth === w) return;
    w = innerWidth;
    root.classList.add("rs");
    clearTimeout(t);
    t = setTimeout(function () {
      root.classList.remove("rs");
      if (still || !document.body.animate) return;
      [].forEach.call(document.querySelectorAll("section[id]:not(.anim-off) > .wrap, section[id]:not(.anim-off) > .hero-inner, .hero-inner"), function (el, i) {
        var r = el.getBoundingClientRect(); if (r.bottom < 0 || r.top > innerHeight) return;
        el.animate([{ opacity: .25, transform: "translateY(14px) scale(.985)", filter: "blur(3px)" }, { opacity: 1, transform: "none", filter: "blur(0)" }],
          { duration: 520, delay: i * 40, easing: "cubic-bezier(.2,.8,.2,1)" });
      });
    }, 180);
  });
})();
