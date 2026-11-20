/* Task Meadow Express · interactive rail-ticket booking (contact CTA) */
(function () {
  var card = document.getElementById("tkt"); if (!card) return;
  var wrap = card.parentNode;
  var $ = function (id) { return document.getElementById(id); };
  var days = $("cbkDays"), slots = $("cbkSlots"), txt = $("cbkBtnTxt"), mon = $("cbkMonth"), st = $("ctaStatus");
  var btn = card.querySelector(".stub-book");
  var CAL = "https://calendly.com/hello-lyndelacruz/30min";
  var TIMES = [{ t: "09:00", l: "Morning call" }, { t: "13:30", l: "Afternoon call" }, { t: "16:00", l: "Late call" }];
  var still = window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches;

  function phNow() { return new Date(new Date().toLocaleString("en-US", { timeZone: "Asia/Manila" })); }
  function pad(n) { return (n < 10 ? "0" : "") + n; }
  function iso(d) { return d.getFullYear() + "-" + pad(d.getMonth() + 1) + "-" + pad(d.getDate()); }

  // next 5 weekdays (PH time), starting tomorrow
  var list = [], d = phNow(); d.setHours(0, 0, 0, 0);
  while (list.length < 5) { d.setDate(d.getDate() + 1); var w = d.getDay(); if (w > 0 && w < 6) list.push(new Date(d)); }
  var sel = { d: 0, t: 0 };

  days.innerHTML = list.map(function (x) {
    return '<button type="button" role="radio"><small>' + x.toLocaleDateString("en-US", { weekday: "short" }) + "</small><b>" + x.getDate() + "</b></button>";
  }).join("");
  slots.innerHTML = TIMES.map(function (x) {
    return '<button type="button" role="radio"><span class="t">' + x.t + "</span><span>" + x.l + '</span><span class="s"></span></button>';
  }).join("");

  function mark(box, idx) {
    [].forEach.call(box.children, function (b, i) { b.classList.toggle("on", i === idx); b.setAttribute("aria-checked", i === idx); b.tabIndex = i === idx ? 0 : -1; });
  }
  function render() {
    mark(days, sel.d); mark(slots, sel.t);
    [].forEach.call(slots.children, function (b, i) { b.querySelector(".s").textContent = i === sel.t ? "BOARDING" : "ON TIME"; });
    var x = list[sel.d];
    mon.textContent = x.toLocaleDateString("en-US", { month: "long", year: "numeric" });
    txt.textContent = "Book " + x.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" }) + " · ~" + TIMES[sel.t].t;
    var url = CAL + "?month=" + iso(x).slice(0, 7) + "&date=" + iso(x);
    btn.href = url; btn.dataset.cal = url + "&hide_gdpr_banner=1";
  }
  function wire(box, key) {
    box.addEventListener("click", function (e) { var b = e.target.closest("button"); if (!b) return; sel[key] = [].indexOf.call(box.children, b); render(); });
    box.addEventListener("keydown", function (e) {
      var k = e.key, n = box.children.length, dir = (k === "ArrowRight" || k === "ArrowDown") ? 1 : (k === "ArrowLeft" || k === "ArrowUp") ? -1 : 0;
      if (!dir) return; e.preventDefault(); sel[key] = (sel[key] + dir + n) % n; render(); box.children[sel[key]].focus();
    });
  }
  wire(days, "d"); wire(slots, "t"); render();

  // live PH clock + availability
  function tick() {
    var n = phNow(), h = n.getHours(), on = h >= 8 && h < 23;
    card.classList.toggle("is-away", !on);
    st.textContent = (on ? "Online now" : "Away, replies within 24h") + " · " + n.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" }) + " PH";
  }
  tick(); setInterval(tick, 30000);
  function railW() { card.querySelector(".tkt-rail").style.setProperty("--rw", card.offsetWidth + "px"); }
  railW(); addEventListener("resize", railW);

  // split-flap word
  var flap = card.querySelector(".flap"), word = flap ? flap.dataset.text : "";
  if (flap) {
    flap.setAttribute("aria-label", word);
    flap.innerHTML = word.split("").map(function (c) { return '<span aria-hidden="true">' + c + "</span>"; }).join("");
  }
  function scramble() {
    if (!flap || still) return;
    var A = "ABCDEFGHIJKLMNOPQRSTUVWXYZ?#", cells = flap.children;
    [].forEach.call(cells, function (el, i) {
      var n = 0, max = 6 + i * 2;
      (function step() {
        el.classList.remove("flip"); void el.offsetWidth; el.classList.add("flip");
        el.textContent = ++n >= max ? word[i] : A[Math.floor(Math.random() * A.length)].toLowerCase();
        if (n < max) setTimeout(step, 70);
      })();
    });
  }

  // count-up board numbers
  function count() {
    if (still) return;
    [].forEach.call(card.querySelectorAll("[data-count]"), function (b) {
      var n = +b.dataset.count, s = b.dataset.suf || "", t0 = performance.now();
      (function f(t) { var p = Math.min(1, (t - t0) / 1300); p = 1 - Math.pow(1 - p, 3); b.textContent = Math.round(n * p) + s; if (p < 1) requestAnimationFrame(f); })(t0);
    });
  }
  function go() { setTimeout(scramble, 250); count(); }
  if (wrap.classList.contains("in")) go();
  else { var mo = new MutationObserver(function () { if (wrap.classList.contains("in")) { mo.disconnect(); go(); } }); mo.observe(wrap, { attributes: true, attributeFilter: ["class"] }); }
  if (flap) flap.addEventListener("mouseenter", scramble);
})();
