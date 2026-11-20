/* The Task Meadow · services brochure: starts folded like a 4-panel accordion, unfolds on view.
   Desktop only (≥1101px). Reversible: unwraps itself when the window gets narrower and
   folds back (with a fresh unfold) when it gets wide again. */
(function () {
  "use strict";
  var svx = document.querySelector(".svx"), list = svx && svx.querySelector(".svx-list");
  if (!list || !window.matchMedia) return;
  var rows = Array.prototype.slice.call(list.querySelectorAll(":scope > .svx-row"));
  if (rows.length < 2) return;
  var mq = matchMedia("(min-width: 1101px)"), root = null, seen = false, io = null;

  function open() { seen = true; svx.classList.add("fld-open"); }

  function fold() {
    if (root) return;
    var h = 0; rows.forEach(function (r) { h = Math.max(h, r.offsetHeight); });
    root = document.createElement("div"); root.className = "fld-root"; root.style.height = h + "px";
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
    if (seen) { // came back to desktop after a resize: replay the unfold
      svx.classList.remove("fld-open");
      requestAnimationFrame(function () { setTimeout(open, 120); });
    } else if ("IntersectionObserver" in window) {
      io = new IntersectionObserver(function (es) { if (es[0].isIntersecting) { io.disconnect(); io = null; setTimeout(open, 350); } }, { threshold: .35 });
      io.observe(list);
    } else open();
  }

  function unfold() {
    if (!root) return;
    if (io) { io.disconnect(); io = null; }
    rows.forEach(function (r, k) {
      r.classList.remove("fld-p" + k);
      var s = r.querySelector(":scope > .fld-shade"); if (s) s.remove();
      list.appendChild(r);
    });
    root.remove(); root = null;
    svx.classList.remove("fld", "fld-open");
  }

  function sync() { if (mq.matches) fold(); else unfold(); }
  sync();
  if (mq.addEventListener) mq.addEventListener("change", sync); else mq.addListener(sync);
})();
