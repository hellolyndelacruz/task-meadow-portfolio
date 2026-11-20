/* The Task Meadow · interactive booking card (contact CTA) */
(function () {
  var card = document.querySelector(".cta-card"); if (!card) return;
  var $ = function (id) { return document.getElementById(id); };
  var days = $("cbkDays"), slots = $("cbkSlots"), txt = $("cbkBtnTxt"), mon = $("cbkMonth"), st = $("ctaStatus");
  var btn = card.querySelector(".cta-btn.main");
  var CAL = "https://calendly.com/hello-lyndelacruz/30min";
  var TIMES = ["9:00 AM", "1:30 PM", "4:00 PM"];
  var still = window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches;

  function phNow() { return new Date(new Date().toLocaleString("en-US", { timeZone: "Asia/Manila" })); }
  function pad(n) { return (n < 10 ? "0" : "") + n; }
  function iso(d) { return d.getFullYear() + "-" + pad(d.getMonth() + 1) + "-" + pad(d.getDate()); }

  // next 5 weekdays (PH time), starting tomorrow
  var list = [], d = phNow(); d.setHours(0, 0, 0, 0);
  while (list.length < 5) { d.setDate(d.getDate() + 1); var w = d.getDay(); if (w > 0 && w < 6) list.push(new Date(d)); }
  var sel = { d: 0, t: 0 };

  if (days && slots) {
    days.innerHTML = list.map(function (x, i) {
      return '<button type="button" role="radio" style="--i:' + i + '"><small>' + x.toLocaleDateString("en-US", { weekday: "short" }) + "</small><b>" + x.getDate() + "</b><i></i></button>";
    }).join("");
    slots.innerHTML = TIMES.map(function (t, i) { return '<button type="button" role="radio" style="--i:' + i + '">' + t + "</button>"; }).join("");
    function mark(box, idx) {
      [].forEach.call(box.children, function (b, i) { b.classList.toggle("on", i === idx); b.setAttribute("aria-checked", i === idx); b.tabIndex = i === idx ? 0 : -1; });
    }
    function render() {
      mark(days, sel.d); mark(slots, sel.t);
      var x = list[sel.d];
      if (mon) mon.textContent = x.toLocaleDateString("en-US", { month: "long", year: "numeric" });
      if (txt) txt.textContent = "Book " + x.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" }) + " · ~" + TIMES[sel.t];
      var url = CAL + "?month=" + iso(x).slice(0, 7) + "&date=" + iso(x);
      if (btn) { btn.href = url; btn.dataset.cal = url + "&hide_gdpr_banner=1"; }
    }
    function wire(box, key) {
      box.addEventListener("click", function (e) { var b = e.target.closest("button"); if (!b) return; sel[key] = [].indexOf.call(box.children, b); render(); });
      box.addEventListener("keydown", function (e) {
        var k = e.key, n = box.children.length, dir = (k === "ArrowRight" || k === "ArrowDown") ? 1 : (k === "ArrowLeft" || k === "ArrowUp") ? -1 : 0;
        if (!dir) return; e.preventDefault(); sel[key] = (sel[key] + dir + n) % n; render(); box.children[sel[key]].focus();
      });
    }
    wire(days, "d"); wire(slots, "t"); render();
  }

  // live PH clock + availability
  function tick() {
    if (!st) return;
    var n = phNow(), h = n.getHours(), on = h >= 8 && h < 23;
    card.classList.toggle("is-away", !on);
    st.textContent = (on ? "Online now" : "Away, replies within 24h") + " · " + n.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" }) + " in PH";
  }
  tick(); setInterval(tick, 30000);

  // cursor spotlight
  if (!still) card.addEventListener("pointermove", function (e) {
    var r = card.getBoundingClientRect();
    card.style.setProperty("--mx", (e.clientX - r.left) + "px"); card.style.setProperty("--my", (e.clientY - r.top) + "px");
  });

  // count-up metrics once the card is revealed
  function count() {
    if (still) return;
    [].forEach.call(card.querySelectorAll("[data-count]"), function (b) {
      var n = +b.dataset.count, s = b.dataset.suf || "", t0 = performance.now();
      (function f(t) { var p = Math.min(1, (t - t0) / 1300); p = 1 - Math.pow(1 - p, 3); b.textContent = Math.round(n * p) + s; if (p < 1) requestAnimationFrame(f); })(t0);
    });
  }
  if (card.classList.contains("in")) count();
  else { var mo = new MutationObserver(function () { if (card.classList.contains("in")) { mo.disconnect(); count(); } }); mo.observe(card, { attributes: true, attributeFilter: ["class"] }); }
})();
