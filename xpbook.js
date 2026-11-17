/* The Task Meadow · experience brochures
   1. each company group unfolds when it scrolls into view
   2. the inside panel reads like a book: one role per page, turn with Prev / Next, dots, swipe or arrow keys */
(function () {
  "use strict";
  var groups = Array.prototype.slice.call(document.querySelectorAll(".tl-group"));
  if (!groups.length) return;
  groups.forEach(function (g) { g.classList.add("xb"); });

  // ---------- 1. unfold ----------
  if (!("IntersectionObserver" in window)) groups.forEach(function (g) { g.classList.add("open"); });
  else {
    var io = new IntersectionObserver(function (es) {
      es.forEach(function (e) { if (e.isIntersecting) { e.target.classList.add("open"); io.unobserve(e.target); } });
    }, { threshold: .12, rootMargin: "0px 0px -80px 0px" });
    groups.forEach(function (g) { io.observe(g); });
  }

  // ---------- 2. pages ----------
  var books = {};   // role id -> go(index) for that book
  function openRole(r) {
    r.classList.add("is-open");
    var b = r.querySelector(".tl-head"); if (b) b.setAttribute("aria-expanded", "true");
  }

  groups.forEach(function (g) {
    var box = g.querySelector(".tl-roles"); if (!box) return;
    var pages = Array.prototype.slice.call(box.querySelectorAll(".tl-role")).reverse();   // oldest role first, like reading forward in time
    pages.forEach(function (p) { openRole(p); p.classList.add("in"); });   // each role has its own page; hidden pages never get the scroll reveal, so mark them shown
    if (pages.length < 2) return;

    box.classList.add("paged");
    var cur = 0, busy = false, n = pages.length;

    // page footer: prev · "Page x of n" + dots · next
    var nav = document.createElement("div");
    nav.className = "pg-nav";
    nav.innerHTML = '<button type="button" class="pg-btn" data-go="-1" aria-label="Previous page"><i class="fa-solid fa-chevron-left"></i><span>Prev</span></button>' +
      '<div class="pg-mid"><span class="pg-count" aria-live="polite"></span><span class="pg-dots">' +
      pages.map(function (p, i) { return '<button type="button" data-i="' + i + '" aria-label="Page ' + (i + 1) + '"></button>'; }).join("") + "</span></div>" +
      '<button type="button" class="pg-btn" data-go="1" aria-label="Next page"><span>Next</span><i class="fa-solid fa-chevron-right"></i></button>';
    box.appendChild(nav);
    var count = nav.querySelector(".pg-count"), dots = Array.prototype.slice.call(nav.querySelectorAll(".pg-dots button"));
    var prevB = nav.querySelector('[data-go="-1"]'), nextB = nav.querySelector('[data-go="1"]');

    // page curl on each page: click to turn
    pages.forEach(function (p, i) {
      var c = document.createElement("button");
      c.type = "button"; c.className = "pg-curl"; c.setAttribute("aria-label", "Turn the page");
      c.innerHTML = "<span>" + (i + 1) + "</span>";
      c.addEventListener("click", function (e) { e.stopPropagation(); go(i + 1 < n ? i + 1 : 0); });
      p.querySelector(".tl-card").appendChild(c);
    });

    function paint() {
      pages.forEach(function (p, i) { p.classList.toggle("pg-cur", i === cur); p.setAttribute("aria-hidden", i === cur ? "false" : "true"); });
      dots.forEach(function (d, i) { d.classList.toggle("on", i === cur); });
      count.textContent = "Page " + (cur + 1) + " of " + n;
      prevB.disabled = cur === 0; nextB.disabled = cur === n - 1;
    }

    // ---- corner-curl page turn -------------------------------------------------
    // The page peels from its bottom-right corner along a moving fold line.
    // front = the page being turned (clipped to the part not yet folded)
    // flap  = the folded-over part, mirrored across the fold, showing the paper's back
    function clone(card) {
      var c = card.cloneNode(true);
      Array.prototype.forEach.call(c.querySelectorAll("[id]"), function (e) { e.removeAttribute("id"); });
      c.removeAttribute("id"); c.classList.add("pc-front");
      return c;
    }
    function clipHalf(W, H, M, n, keepC) {      // polygon of the page on one side of the fold line
      var pts = [[0, 0], [W, 0], [W, H], [0, H]], out = [];
      function side(p) { var s = (p[0] - M[0]) * n[0] + (p[1] - M[1]) * n[1]; return keepC ? s : -s; }
      for (var i = 0; i < 4; i++) {
        var a = pts[i], b = pts[(i + 1) % 4], sa = side(a), sb = side(b);
        if (sa >= 0) out.push(a);
        if ((sa >= 0) !== (sb >= 0)) { var t = sa / (sa - sb); out.push([a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t]); }
      }
      if (out.length < 3) return "polygon(0 0, 0 0, 0 0)";
      return "polygon(" + out.map(function (p) { return p[0].toFixed(1) + "px " + p[1].toFixed(1) + "px"; }).join(",") + ")";
    }
    function gradPos(W, H, n, Q) {               // where point Q falls along a CSS linear-gradient in direction n
      var L = Math.abs(W * n[0]) + Math.abs(H * n[1]);
      var sx = W / 2 - n[0] * L / 2, sy = H / 2 - n[1] * L / 2;
      return ((Q[0] - sx) * n[0] + (Q[1] - sy) * n[1]) / L * 100;
    }
    function curl(turning, under, backwards, done) {
      var card = turning.querySelector(".tl-card"), r = rectOf(turning);
      var W = r.width, H = r.height;
      var stage = document.createElement("div");
      stage.className = "pc-stage"; stage.setAttribute("aria-hidden", "true");
      stage.style.cssText = "left:" + r.left + "px;top:" + r.top + "px;width:" + W + "px;height:" + H + "px";
      var front = clone(card), flapWrap = document.createElement("div"), flap = document.createElement("div"), shade = document.createElement("div"), cast = document.createElement("div");
      flapWrap.className = "pc-flapwrap"; flap.className = "pc-flap"; shade.className = "pc-fshade"; cast.className = "pc-cast";
      flap.innerHTML = "<i></i><i></i><i></i><i></i><i></i><i></i>";
      front.appendChild(shade); flapWrap.appendChild(flap);
      stage.appendChild(cast); stage.appendChild(front); stage.appendChild(flapWrap);
      box.appendChild(stage);
      under.classList.add("pg-under");
      var C = [W, H], E = [-W * 1.1, -H * .35], D = 1150, t0 = performance.now();
      function frame(now) {
        var k = Math.min(1, (now - t0) / D);
        var e = k < .5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2;   // easeInOutCubic
        if (backwards) e = 1 - e;
        // the corner travels toward the top-left with a slight upward lift
        var lift = Math.sin(e * Math.PI) * H * .14;
        var P = [C[0] + (E[0] - C[0]) * e, C[1] + (E[1] - C[1]) * e - lift];
        var dx = C[0] - P[0], dy = C[1] - P[1], len = Math.hypot(dx, dy) || 1;
        var n = [dx / len, dy / len], M = [(C[0] + P[0]) / 2, (C[1] + P[1]) / 2];
        front.style.clipPath = clipHalf(W, H, M, n, false);
        var cut = clipHalf(W, H, M, n, true);
        flap.style.clipPath = cut;
        // reflection across the fold line (direction u = perpendicular to n)
        var ux = -n[1], uy = n[0], a = ux * ux - uy * uy, b = 2 * ux * uy, d = uy * uy - ux * ux;
        var tx = M[0] - (a * M[0] + b * M[1]), ty = M[1] - (b * M[0] + d * M[1]);
        flap.style.transform = "matrix(" + a + "," + b + "," + b + "," + d + "," + tx + "," + ty + ")";
        // paper shading: crease is darker, the curl catches light, the edge falls into shadow
        var deg = Math.atan2(n[0], -n[1]) * 180 / Math.PI, f = gradPos(W, H, n, M), c = gradPos(W, H, n, C);
        var span = Math.max(1, c - f);
        flap.style.background = "linear-gradient(" + deg + "deg, #c9c3b6 " + f + "%, #f4f0e6 " + (f + span * .18) + "%, #fffdf7 " + (f + span * .45) + "%, #e6e0d2 " + c + "%)";
        shade.style.background = "linear-gradient(" + deg + "deg, transparent " + (f - 9) + "%, rgba(0,0,0,.16) " + (f - .5) + "%, transparent " + f + "%)";
        cast.style.clipPath = cut;
        cast.style.background = "linear-gradient(" + deg + "deg, rgba(0,0,0,.30) " + f + "%, rgba(0,0,0,.08) " + (f + 12) + "%, transparent " + (f + 26) + "%)";
        flapWrap.style.opacity = e > .82 ? Math.max(0, (1 - e) / .18).toFixed(3) : 1;
        if (k < 1) requestAnimationFrame(frame);
        else { stage.remove(); under.classList.remove("pg-under"); done(); }
      }
      requestAnimationFrame(frame);
    }
    function rectOf(role) {
      var c = role.querySelector(".tl-card");
      return { left: role.offsetLeft + c.offsetLeft, top: role.offsetTop + c.offsetTop, width: c.offsetWidth, height: c.offsetHeight };
    }
    function go(to, instant) {
      if (to === cur || to < 0 || to >= n || busy) return;
      var back = to < cur, old = pages[cur], nu = pages[to];
      if (instant) { cur = to; paint(); return; }
      busy = true;
      // forward: the current page curls away revealing the next one underneath
      // backward: the previous page curls back down over the current one
      var turning = back ? nu : old, under = back ? old : nu;
      cur = to; paint();
      pages.forEach(function (p) { p.classList.toggle("pg-cur", p === under); });
      turning.classList.add("pg-cur", "pg-ghost");      // laid out exactly where the page underneath sits, but invisible
      turning.style.top = under.offsetTop + "px"; turning.style.left = under.offsetLeft + "px"; turning.style.width = under.offsetWidth + "px";
      curl(turning, under, back, function () {
        turning.classList.remove("pg-ghost"); turning.style.top = turning.style.left = turning.style.width = "";
        paint(); busy = false;
        if (window.__tmRemeasure) window.__tmRemeasure();
        window.dispatchEvent(new Event("scroll"));
      });
    }

    // every page gets the same height (the tallest page), so the book never jumps
    function equalize() {
      box.classList.add("pg-measure"); box.style.setProperty("--pg-h", "0px");
      var m = 0; pages.forEach(function (p) { m = Math.max(m, p.querySelector(".tl-card").offsetHeight); });
      box.classList.remove("pg-measure"); box.style.setProperty("--pg-h", m + "px");
    }
    equalize();
    window.addEventListener("resize", function () { if (!busy) equalize(); });
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(function () { if (!busy) equalize(); });

    nav.addEventListener("click", function (e) {
      var b = e.target.closest("button"); if (!b || b.disabled) return;
      if (b.hasAttribute("data-go")) go(cur + +b.getAttribute("data-go"));
      else if (b.hasAttribute("data-i")) go(+b.getAttribute("data-i"));
    });
    box.addEventListener("keydown", function (e) {
      if (e.target.closest("input, textarea")) return;
      if (e.key === "ArrowRight") { go(cur + 1); }
      if (e.key === "ArrowLeft") { go(cur - 1); }
    });
    // swipe
    var sx = null, sy = 0;
    box.addEventListener("pointerdown", function (e) { if (e.pointerType !== "mouse") { sx = e.clientX; sy = e.clientY; } });
    box.addEventListener("pointerup", function (e) {
      if (sx === null) return;
      var dx = e.clientX - sx, dy = e.clientY - sy; sx = null;
      if (Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(dy) * 1.4) go(cur + (dx < 0 ? 1 : -1));
    });

    pages.forEach(function (p, i) { books[p.id] = function () { go(i, true); }; });
    paint();
  });

  // links from the company role list, trail-map chips and "See the full role" turn to the right page first
  var prevOpen = window.__tlOpen;
  window.__tlOpen = function (id) {
    if (books[id]) books[id]();
    if (prevOpen) prevOpen(id);
  };
})();
