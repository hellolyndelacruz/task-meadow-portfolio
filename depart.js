/* Task Meadow Express · departures board (hero itinerary) */
(function () {
  var b = document.getElementById("depBoard"); if (!b) return;
  var rows = [].slice.call(b.querySelectorAll(".dep-list a")), tick = document.getElementById("depTicker");
  var still = window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches;
  var cur = 0, hold = false, started = false;

  // split each time into flap cells
  rows.forEach(function (a) {
    var t = a.querySelector(".dep-time"), s = t.dataset.t;
    t.setAttribute("aria-label", s);
    t.innerHTML = s.split("").map(function (c) { return c === ":" ? '<span class="c" aria-hidden="true">:</span>' : '<span aria-hidden="true" data-c="' + c + '">' + c + "</span>"; }).join("");
  });

  function flip(a) {
    if (still) return;
    [].forEach.call(a.querySelectorAll(".dep-time span[data-c]"), function (el, k) {
      var n = 0, max = 3 + k * 2;
      clearTimeout(el._t);
      (function step() {
        el.classList.remove("fl"); void el.offsetWidth; el.classList.add("fl");
        el.textContent = ++n >= max ? el.dataset.c : String(Math.floor(Math.random() * 10));
        if (n < max) el._t = setTimeout(step, 60);
      })();
    });
  }

  function set(i) {
    cur = i;
    rows.forEach(function (a, j) {
      a.classList.toggle("on", j === i); a.classList.toggle("gone", j < i);
      a.querySelector(".dep-st").textContent = j === i ? "Boarding" : j < i ? "Departed" : "On time";
    });
    if (tick) {
      var a = rows[i], line = "Now boarding · Platform " + a.querySelector(".dep-pl").textContent + " · " + a.querySelector(".dep-dest b").textContent.trim() + " · Please mind the gap between tasks and deadlines · ";
      tick.textContent = line + line;
    }
  }

  function cycle() { if (hold || document.hidden) return; set((cur + 1) % rows.length); flip(rows[cur]); }

  rows.forEach(function (a, i) {
    function pick() { hold = true; if (cur !== i) { set(i); flip(a); } }
    a.addEventListener("mouseenter", pick); a.addEventListener("focus", pick);
  });
  b.addEventListener("mouseleave", function () { hold = false; });
  b.addEventListener("focusout", function (e) { if (!b.contains(e.relatedTarget)) hold = false; });

  function start() {
    if (started) return; started = true;
    set(0);
    rows.forEach(function (a, i) { setTimeout(function () { flip(a); }, 300 + i * 90); });
    if (!still) setInterval(cycle, 3800);
  }
  set(0);
  if (b.classList.contains("in")) start();
  else { var mo = new MutationObserver(function () { if (b.classList.contains("in")) { mo.disconnect(); start(); } }); mo.observe(b, { attributes: true, attributeFilter: ["class"] }); }
})();
