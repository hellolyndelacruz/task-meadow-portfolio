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

    // A real sheet turns: front = the page's content, back = blank paper with the print showing through.
    // Forward: the current page lifts off its spine and turns to the left, revealing the next page underneath.
    // Backward: the previous page comes back from the left and lays down over the current one.
    function sheetFor(card, rect) {
      var s = document.createElement("div");
      s.className = "pg-sheet"; s.setAttribute("aria-hidden", "true");
      s.style.left = rect.left + "px"; s.style.top = rect.top + "px"; s.style.width = rect.width + "px"; s.style.height = rect.height + "px";
      var front = card.cloneNode(true);
      front.classList.add("pg-front");
      Array.prototype.forEach.call(front.querySelectorAll("[id]"), function (e) { e.removeAttribute("id"); });
      front.removeAttribute("id");
      var backFace = document.createElement("div"); backFace.className = "pg-back";
      backFace.innerHTML = "<i></i><i></i><i></i><i></i><i></i><i></i>";
      var shade = document.createElement("span"); shade.className = "pg-shade";
      front.appendChild(shade);
      s.appendChild(front); s.appendChild(backFace);
      return s;
    }
    function rectOf(role) {   // card position inside the box
      var c = role.querySelector(".tl-card");
      return { left: role.offsetLeft + c.offsetLeft, top: role.offsetTop + c.offsetTop, width: c.offsetWidth, height: c.offsetHeight };
    }
    var DUR = 1000;
    function go(to, instant) {
      if (to === cur || to < 0 || to >= n || busy) return;
      var back = to < cur, old = pages[cur], nu = pages[to];
      if (instant) { cur = to; paint(); return; }
      busy = true;
      var h0 = box.offsetHeight;
      var turning = back ? nu : old;          // the page that is the moving sheet
      var under = back ? old : nu;            // the page that stays flat underneath
      // measure the turning page where it sits
      if (back) { cur = to; paint(); }        // show the new (previous) page briefly to measure it
      var r = rectOf(turning);
      var sheet = sheetFor(turning.querySelector(".tl-card"), r);
      // show the page underneath, hide the turning one (the sheet stands in for it)
      pages.forEach(function (p) { p.classList.toggle("pg-cur", p === under); });
      if (!back) { cur = to; paint(); pages.forEach(function (p) { p.classList.toggle("pg-cur", p === under); }); }
      var h1 = box.offsetHeight;
      under.classList.add("pg-under"); if (back) under.classList.add("back");
      box.appendChild(sheet);
      sheet.classList.add(back ? "in" : "out");
      box.style.height = h0 + "px"; void box.offsetHeight;
      box.style.height = Math.max(h1, back ? r.top + r.height + 90 : h1) + "px";
      setTimeout(function () {
        sheet.remove();
        under.classList.remove("pg-under", "back");
        paint();                              // the page we turned to is now the flat, current page
        box.style.height = "";
        busy = false;
        if (window.__tmRemeasure) window.__tmRemeasure();
        window.dispatchEvent(new Event("scroll"));
      }, DUR + 30);
    }

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
