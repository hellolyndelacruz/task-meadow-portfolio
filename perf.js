/* The Task Meadow · pause looping animations in sections that are off screen */
(function () {
  if (!("IntersectionObserver" in window)) return;
  var io = new IntersectionObserver(function (es) {
    es.forEach(function (e) { e.target.classList.toggle("anim-off", !e.isIntersecting); });
  }, { rootMargin: "150px 0px" });
  [].forEach.call(document.querySelectorAll("section[id], footer"), function (s) { io.observe(s); });
})();
