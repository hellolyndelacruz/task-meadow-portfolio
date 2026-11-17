/* The Task Meadow · services brochure: starts folded like a 4-panel accordion, unfolds on view */
(function () {
  "use strict";
  var svx = document.querySelector(".svx"), list = svx && svx.querySelector(".svx-list");
  if (!list || !window.matchMedia || !matchMedia("(min-width: 1101px)").matches) return;
  var rows = Array.prototype.slice.call(list.querySelectorAll(":scope > .svx-row"));
  if (rows.length < 2) return;
  var h = 0; rows.forEach(function (r) { h = Math.max(h, r.offsetHeight); });

  // nest the panels: each hinge sits on the right edge of the previous panel
  var root = document.createElement("div"); root.className = "fld-root"; root.style.height = h + "px";
  list.appendChild(root);
  var parent = root;
  rows.forEach(function (r, k) {
    r.classList.add("fld-p" + k);
    var shade = document.createElement("span"); shade.className = "fld-shade"; shade.setAttribute("aria-hidden", "true"); r.appendChild(shade);
    if (k === 0) { root.appendChild(r); return; }
    var hinge = document.createElement("div"); hinge.className = "fld-hinge fld-h" + k;
    var back = document.createElement("div"); back.className = "fld-back"; back.setAttribute("aria-hidden", "true");
    hinge.appendChild(r); hinge.appendChild(back);
    parent.appendChild(hinge); parent = hinge;
  });
  svx.classList.add("fld");

  function open() { svx.classList.add("fld-open"); }
  if ("IntersectionObserver" in window) {
    var io = new IntersectionObserver(function (es) { if (es[0].isIntersecting) { io.disconnect(); setTimeout(open, 350); } }, { threshold: .35 });
    io.observe(list);
  } else open();
})();
