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

  // 2. Career climb: stats counters
  var stats = $("xpStats");
  if (stats) onView([stats], function () {
    $$("b[data-count]", stats).forEach(function (b, i) {
      var to = +b.getAttribute("data-count"), suf = b.getAttribute("data-suffix") || "";
      setTimeout(function () {
        var t0 = performance.now();
        (function f(t) { var k = Math.min(1, (t - t0) / 1300); b.textContent = Math.round(to * (1 - Math.pow(1 - k, 3))) + (k === 1 ? suf : ""); if (k < 1) requestAnimationFrame(f); })(t0);
      }, 250 + i * 140);
    });
  });

  // 3. Elevation profile: hiker walks the line while it draws
  var map = $("xpMap"), line = $("xpLine"), hiker = $("xpHiker");
  if (map && line && hiker) {
    var place = function (k) {
      var L = line.getTotalLength(), p = line.getPointAtLength(L * k);
      hiker.style.left = (p.x / 10) + "%"; hiker.style.top = (p.y / 260 * 100) + "%";
    };
    place(0);
    onView([map], function () {
      map.classList.add("in");
      var t0 = performance.now() + 300, D = 2900;
      (function f(t) {
        var k = Math.max(0, Math.min(1, (t - t0) / D));
        var e = k < .5 ? 2 * k * k : 1 - Math.pow(-2 * k + 2, 2) / 2; // ease in-out, close to the stroke's curve
        place(e);
        if (k < 1) requestAnimationFrame(f); else hiker.classList.add("done");
      })(performance.now());
    }, { threshold: .35 });
    // flags jump to their stop on the trail
    $$(".xp-flag", map).forEach(function (a) {
      a.addEventListener("click", function (e) {
        var t = $(a.getAttribute("data-target")); if (!t) return;
        e.preventDefault();
        var y = t.getBoundingClientRect().top + window.pageYOffset - window.innerHeight * .28;
        window.scrollTo({ top: y, behavior: "smooth" });
      });
    });
  }

  // 4. Trail: stops and signs animate in; rope fills with scroll; active stop syncs with its flag
  var trail = $("xpTrail");
  if (trail) {
    onView($$(".xp-stop, .xp-sign", trail), function (el) { el.classList.add("in"); }, { threshold: .18, rootMargin: "0px 0px -80px 0px" });
    var rope = trail.querySelector(".xp-rope"), stops = $$(".xp-stop, .xp-summit", trail), ticking = false;
    var flagFor = {};
    $$(".xp-flag").forEach(function (f) { flagFor[f.getAttribute("data-target")] = f; });
    var update = function () {
      ticking = false;
      var r = rope.getBoundingClientRect(), mid = window.innerHeight * .55;
      var p = Math.max(0, Math.min(1, (mid - r.top) / r.height));
      rope.style.setProperty("--p", p.toFixed(4));
      var best = null, bd = 1e9;
      stops.forEach(function (s) {
        var b = s.getBoundingClientRect(), c = b.top + Math.min(b.height, 160) / 2, d = Math.abs(c - mid);
        if (b.bottom > 0 && b.top < window.innerHeight && d < bd) { bd = d; best = s; }
      });
      stops.forEach(function (s) {
        var on = s === best; s.classList.toggle("on", on);
        var f = flagFor[s.id]; if (f) f.classList.toggle("on", on);
      });
    };
    window.addEventListener("scroll", function () { if (!ticking) { ticking = true; requestAnimationFrame(update); } }, { passive: true });
    window.addEventListener("resize", update);
    update();
  }

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

  // 6. Tilt + glare on experience cards
  if (finePointer) {
    $$(".xp-card").forEach(function (c) {
      c.addEventListener("pointermove", function (e) {
        var b = c.getBoundingClientRect(), x = (e.clientX - b.left) / b.width, y = (e.clientY - b.top) / b.height;
        c.style.setProperty("--ry", ((x - .5) * 7).toFixed(2) + "deg");
        c.style.setProperty("--rx", ((.5 - y) * 6).toFixed(2) + "deg");
        c.style.setProperty("--gx", (x * 100).toFixed(1) + "%");
        c.style.setProperty("--gy", (y * 100).toFixed(1) + "%");
        c.classList.add("tilting");
      });
      c.addEventListener("pointerleave", function () { c.classList.remove("tilting"); });
    });

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
      dots.forEach(function (d, i) { d.classList.toggle("cur", i === cur); d.classList.toggle("past", i < cur); });
      box.classList.toggle("show", y > window.innerHeight * .5);
    };
    window.addEventListener("scroll", function () { if (!at) { at = true; requestAnimationFrame(tick); } }, { passive: true });
    window.addEventListener("resize", tick);
    tick();
  })();
})();
