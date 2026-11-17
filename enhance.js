/* The Task Meadow · enhancements (career climb, headline reveal, altimeter, tilt, magnetic buttons) */
(function () {
  "use strict";
  var $ = function (id) { return document.getElementById(id); };
  var $$ = function (sel, root) { return Array.prototype.slice.call((root || document).querySelectorAll(sel)); };
  var hasIO = "IntersectionObserver" in window;
  var finePointer = window.matchMedia && matchMedia("(hover: hover) and (pointer: fine)").matches;

  function onView(els, cb, opts) {
    if (!hasIO) { els.forEach(cb); return; }
    var io = new IntersectionObserver(function (es) {
      es.forEach(function (e) { if (e.isIntersecting) { cb(e.target); io.unobserve(e.target); } });
    }, opts || { threshold: .2, rootMargin: "0px 0px -60px 0px" });
    els.forEach(function (el) { io.observe(el); });
  }

  // 1. Headlines: split words so they rise out of a mask
  $$(".sec-head h2, .dream-card h2").forEach(function (h) {
    var w = 0;
    (function walk(node) {
      Array.prototype.slice.call(node.childNodes).forEach(function (c) {
        if (c.nodeType === 3) {
          var parts = c.textContent.split(/(\s+)/), frag = document.createDocumentFragment();
          parts.forEach(function (p) {
            if (!p) return;
            if (/^\s+$/.test(p)) { frag.appendChild(document.createTextNode(p)); return; }
            var o = document.createElement("span"), i = document.createElement("span");
            o.className = "w"; i.className = "wi"; i.style.setProperty("--w", w++); i.textContent = p;
            o.appendChild(i); frag.appendChild(o);
          });
          c.parentNode.replaceChild(frag, c);
        } else if (c.nodeType === 1) walk(c);
      });
    })(h);
    h.setAttribute("aria-label", h.textContent.replace(/\s+/g, " ").trim());
  });

  // 2. Career climb: stat rings + counters
  var stats = $("xpStats");
  if (stats) onView([stats], function () {
    stats.classList.add("in");
    $$("b[data-count]", stats).forEach(function (b, i) {
      var to = +b.getAttribute("data-count"), suf = b.getAttribute("data-suffix") || "";
      setTimeout(function () {
        var t0 = performance.now();
        (function f(t) { var k = Math.min(1, (t - t0) / 1300); b.textContent = Math.round(to * (1 - Math.pow(1 - k, 3))) + (k === 1 ? suf : ""); if (k < 1) requestAnimationFrame(f); })(t0);
      }, 300 + i * 160);
    });
  });

  // 3. Trail map: the mountain rises, the trail draws, the hiker climbs camp to camp
  (function () {
    var sc = $("xpScene"), trail = $("scTrail"), hiker = $("scHiker"), strip = $("scStrip");
    if (!sc || !trail || !hiker || !strip) return;
    var data = []; try { data = JSON.parse($("scData").textContent); } catch (e) {}
    var camps = $$(".sc-camp", sc), chips = $$(".sc-chip", strip);
    var panel = $("scPanel"), pK = $("scK"), pRole = $("scRole"), pOrg = $("scOrg"), pDur = $("scDur");
    var L = trail.getTotalLength(), last = camps.length - 1;
    // where each camp sits along the trail (nearest sampled point)
    var at = camps.map(function (c) {
      var x = parseFloat(c.style.getPropertyValue("--x")) * 10, y = parseFloat(c.style.getPropertyValue("--y")) * 3.6, best = 0, bd = 1e9;
      for (var s = 0; s <= L; s += 2) { var p = trail.getPointAtLength(s), d = (p.x - x) * (p.x - x) + (p.y - y) * (p.y - y); if (d < bd) { bd = d; best = s; } }
      return best;
    });
    var pos = 0, raf = 0, shown = -1, started = false;
    function put(len) {
      var p = trail.getPointAtLength(len), q = trail.getPointAtLength(Math.min(L, len + 4));
      hiker.style.left = (p.x / 10) + "%"; hiker.style.top = (p.y / 3.6) + "%";
      hiker.classList.toggle("back", q.x < p.x - .01);
      trail.style.strokeDashoffset = (1000 - len / L * 1000).toFixed(1);
      strip.style.setProperty("--prog", (len / L).toFixed(4));
    }
    function show(k, label) {
      if (k === shown && !label) return; shown = k;
      var d = data[k] || {};
      panel.classList.remove("swap"); void panel.offsetWidth; panel.classList.add("swap");
      pK.textContent = label || (k === last ? "Summit · next peak" : k === 0 ? "Trailhead · camp 1" : "Camp " + (k + 1) + " of " + (last + 1));
      pRole.textContent = d.role || ""; pOrg.textContent = (d.org || "") + (d.dates ? " · " + d.dates : "");
      pDur.innerHTML = '<i class="fa-regular fa-clock"></i> ' + (d.dur || "");
      camps.forEach(function (c, i) { c.classList.toggle("is-cur", i === k); });
      chips.forEach(function (c, i) { c.classList.toggle("is-cur", i === k); c.setAttribute("aria-current", i === k ? "step" : "false"); });
      if (label) shown = -1;
    }
    function reach(len) {
      at.forEach(function (a, i) {
        var hit = len >= a - 1;
        camps[i].classList.toggle("reached", hit); chips[i].classList.toggle("reached", hit);
      });
      var k = 0; at.forEach(function (a, i) { if (len >= a - 1) k = i; });
      return k;
    }
    function walk(to, ms, done) {
      cancelAnimationFrame(raf);
      var from = pos, t0 = performance.now();
      hiker.classList.add("walking");
      (function f(t) {
        var k = Math.min(1, (t - t0) / ms), e = k < .5 ? 2 * k * k : 1 - Math.pow(-2 * k + 2, 2) / 2;
        pos = from + (to - from) * e; put(pos); show(reach(pos));
        if (k < 1) raf = requestAnimationFrame(f);
        else { hiker.classList.remove("walking"); if (done) done(); }
      })(t0);
    }
    put(0);
    function summit() { sc.classList.add("summited"); }
    onView([sc], function () {
      sc.classList.add("in");
      setTimeout(function () { started = true; walk(L, 4200, summit); }, 1300);
    }, { threshold: .3 });
    function go(k) {
      if (!started) return;
      var to = at[k], ms = Math.max(500, Math.abs(to - pos) / L * 3200);
      walk(to, ms, function () { show(k); if (k === last) summit(); });
    }
    camps.concat(chips).forEach(function (b) {
      b.addEventListener("click", function () { go(+b.getAttribute("data-k")); });
      b.addEventListener("mouseenter", function () { if (started) show(+b.getAttribute("data-k"), "Preview"); });
      b.addEventListener("mouseleave", function () { if (started) show(reach(pos)); });
    });
    // double-click / Enter on a chip jumps to the full role on the trail below
    chips.forEach(function (c) {
      c.addEventListener("dblclick", function () { var t = $(c.getAttribute("data-target")); if (t) if (window.__tlOpen) window.__tlOpen(t.id); window.scrollTo({ top: t.getBoundingClientRect().top + window.pageYOffset - window.innerHeight * .25, behavior: "smooth" }); });
    });
    var link = document.createElement("a");
    link.className = "sc-more"; link.href = "#xp-nanox"; link.innerHTML = 'See the full role <i class="fa-solid fa-arrow-down"></i>';
    panel.appendChild(link);
    link.addEventListener("click", function (e) {
      var d = data[shown] || {}, t = $(d.target); if (!t) return; e.preventDefault();
      if (window.__tlOpen) window.__tlOpen(t.id); window.scrollTo({ top: t.getBoundingClientRect().top + window.pageYOffset - window.innerHeight * .25, behavior: "smooth" });
    });
  })();


  // 4. Trail: reveal, expandable role cards, spine progress, spotlight, and sync with the trail map
  (function () {
    var tl = $("xpTrail");
    if (!tl) return;
    var roles = $$(".tl-role", tl), groups = $$(".tl-group", tl), cos = $$(".tl-co-card", tl);
    onView(roles.concat(cos), function (el) { el.classList.add("in"); }, { threshold: .15, rootMargin: "0px 0px -60px 0px" });

    function setOpen(r, open) {
      r.classList.toggle("is-open", open);
      var b = r.querySelector(".tl-head"); if (b) b.setAttribute("aria-expanded", open ? "true" : "false");
    }
    roles.forEach(function (r) {
      var b = r.querySelector(".tl-head");
      b.addEventListener("click", function () { setOpen(r, !r.classList.contains("is-open")); });
    });
    window.__tlOpen = function (id) { var r = $(id); if (r && r.classList.contains("tl-role")) setOpen(r, true); };

    // spotlight that follows the pointer
    if (finePointer) $$(".tl-card, .tl-co-card", tl).forEach(function (c) {
      c.addEventListener("pointermove", function (e) {
        var b = c.getBoundingClientRect();
        c.style.setProperty("--mx", (e.clientX - b.left).toFixed(0) + "px");
        c.style.setProperty("--my", (e.clientY - b.top).toFixed(0) + "px");
      });
    });

    // spine fill per company + the role nearest the reading line lights up (and its chip on the map)
    var chipFor = {};
    $$(".sc-chip").forEach(function (f) { chipFor[f.getAttribute("data-target")] = f; });
    var watch = roles.concat([$("xp-summit")]).filter(Boolean), ticking = false;
    function update() {
      ticking = false;
      var mid = window.innerHeight * .5;
      groups.forEach(function (g) {
        var sp = g.querySelector(".tl-spine"); if (!sp) return;
        var r = sp.getBoundingClientRect();
        sp.style.setProperty("--p", Math.max(0, Math.min(1, (mid - r.top) / Math.max(1, r.height))).toFixed(4));
      });
      var best = null, bd = 1e9;
      watch.forEach(function (s) {
        var b = s.getBoundingClientRect(), c = b.top + Math.min(b.height, 140) / 2, d = Math.abs(c - mid);
        if (b.bottom > 0 && b.top < window.innerHeight && d < bd) { bd = d; best = s; }
      });
      watch.forEach(function (s) {
        var on = s === best; s.classList.toggle("is-active", on);
        var f = chipFor[s.id]; if (f) f.classList.toggle("on", on);
      });
    }
    window.addEventListener("scroll", function () { if (!ticking) { ticking = true; requestAnimationFrame(update); } }, { passive: true });
    window.addEventListener("resize", update);
    update();
  })();

  // 5. Ridges drift with scroll (parallax)
  var ridges = $$(".xp-ridges svg"), xp = $("experience");
  if (ridges.length && xp) {
    var rt = false;
    var drift = function () {
      rt = false;
      var top = xp.getBoundingClientRect().top;
      if (top > window.innerHeight || top < -400) return;
      var k = (window.innerHeight - top) / window.innerHeight;
      ridges[0].style.transform = "translateY(" + (k * 26).toFixed(1) + "px)";
      ridges[1].style.transform = "translateY(" + (k * 12).toFixed(1) + "px)";
    };
    window.addEventListener("scroll", function () { if (!rt) { rt = true; requestAnimationFrame(drift); } }, { passive: true });
    drift();
  }

  // 6. Pointer-only niceties
  if (finePointer) {
    // 7. Magnetic buttons
    $$(".btn, .links .nav-cta, .meet").forEach(function (b) {
      b.addEventListener("pointermove", function (e) {
        var r = b.getBoundingClientRect();
        var dx = e.clientX - (r.left + r.width / 2), dy = e.clientY - (r.top + r.height / 2);
        b.style.translate = (dx * .18).toFixed(1) + "px " + (dy * .3).toFixed(1) + "px";
      });
      b.addEventListener("pointerleave", function () { b.style.translate = ""; });
    });
  }

  // 8. Altimeter: a side gauge that climbs from the valley to the Matterhorn as you scroll
  (function () {
    var names = { home: "Home", intro: "About", defense: "Services", experience: "Experience", certificates: "Certificates", tools: "Tools", recommendations: "Reviews", dream: "Dream", contact: "Contact" };
    var secs = Object.keys(names).map($).filter(Boolean);
    if (!secs.length) return;
    var box = document.createElement("nav");
    box.className = "alti"; box.setAttribute("aria-label", "Page altitude");
    box.innerHTML = '<div class="alti-read"><b id="altiM">0 m</b><small id="altiN">Home</small></div><div class="alti-scale" id="altiScale">' +
      secs.map(function (s) { return '<a href="#' + s.id + '" aria-label="' + names[s.id] + '"><span>' + names[s.id] + "</span></a>"; }).join("") + "</div>";
    document.body.appendChild(box);
    var m = $("altiM"), nm = $("altiN"), scale = $("altiScale"), dots = $$("a", scale), at = false, TOP = 4478;
    var tick = function () {
      at = false;
      var max = document.documentElement.scrollHeight - window.innerHeight, y = window.pageYOffset, p = max > 0 ? Math.min(1, y / max) : 0;
      m.textContent = Math.round(p * TOP).toLocaleString("en-US") + " m";
      scale.style.setProperty("--ap", p.toFixed(4));
      var cur = 0;
      secs.forEach(function (s, i) { if (s.getBoundingClientRect().top < window.innerHeight * .45) cur = i; });
      nm.textContent = names[secs[cur].id];
      dots.forEach(function (d, i) { d.classList.toggle("is-cur", i === cur); d.classList.toggle("past", i < cur); });
      box.classList.toggle("show", y > window.innerHeight * .5);
    };
    window.addEventListener("scroll", function () { if (!at) { at = true; requestAnimationFrame(tick); } }, { passive: true });
    window.addEventListener("resize", tick);
    tick();
  })();
})();
