/* Lyn Dela Cruz · The Task Meadow portfolio */
(function () {
  "use strict";
  var $ = function (id) { return document.getElementById(id); };
  var $$ = function (sel, root) { return Array.prototype.slice.call((root || document).querySelectorAll(sel)); };
  var reduce = false; // animations always play (requested by the site owner)

  // 0. Split the Task Meadow wordmark into letters for the build-up animation
  $$(".tm-word").forEach(function (word) {
    var i = 0;
    $$(".tm-split", word).forEach(function (part) {
      var txt = part.textContent; part.textContent = ""; part.setAttribute("aria-hidden", "true");
      txt.split("").forEach(function (c) {
        var s = document.createElement("span"); s.className = "ch"; s.textContent = c;
        s.style.setProperty("--i", i++); part.appendChild(s);
      });
    });
  });

  // 0a. Loading intro: a 3D flight around the globe, Manila → Zürich (9 s)
  //     timeline (s): spin to Manila 0–1.8 · flight 1.8–6.3 · arrival 6.3 · zoom into Switzerland 7.3–8.4 · fade 8.5–9
  (function () {
    var root = document.documentElement, loader = $("loader");
    if (!loader || !root.classList.contains("loading")) return;
    var cvs = $("globe"), km = $("flKm"), pc = $("flPct"), status = $("flStatus");
    var labM = $("labM"), labZ = $("labZ");
    var t0 = typeof window.__t0 === "number" ? window.__t0 : performance.now(), raf = 0, timers = [];
    var D2R = Math.PI / 180, DIST = 10453;
    var dark = root.getAttribute("data-theme") === "dark";
    var ease = function (t) { return t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2; };
    var clamp = function (t) { return Math.max(0, Math.min(1, t)); };
    // 5-second timeline (clock runs 1.2x): spin 0–1.2 · flight 1.2–4.2 · arrival 4.2 · zoom 4.9–5.6 · fade 5.5–6.0
    var FLY0 = 1.2, FLY = 3.0, ZOOM0 = 4.9, ZOOM = .7;
    function flightAt(s) { return ease(clamp((s - FLY0) / FLY)); }
    function counters(tf) { km.textContent = Math.round(DIST * tf).toLocaleString("en-US"); pc.textContent = Math.round(tf * 100) + "%"; }
    [[0, "Boarding in Manila"], [1200, "Taking off from Manila"], [1900, "Cruising over Asia"], [2900, "Crossing into Europe"], [3700, "Descending into Zürich"], [4300, "Welcome to Switzerland!"]].forEach(function (m) {
      var at = Math.max(0, m[0] / 1.2 - (performance.now() - t0));
      timers.push(setTimeout(function () { status.textContent = m[1]; status.classList.remove("swap"); void status.offsetWidth; status.classList.add("swap"); }, at));
    });
    function stop() { cancelAnimationFrame(raf); timers.forEach(clearTimeout); }
    $("ldSkip").addEventListener("click", function () {
      stop(); loader.classList.add("leaving");
      setTimeout(function () { if (window.__endIntro) window.__endIntro(); else root.classList.remove("loading"); }, 600);
    });
    function label(el, x, y, show) { if (!el) return; el.style.transform = "translate(" + Math.round(x) + "px," + Math.round(y) + "px)"; el.style.opacity = show ? 1 : 0; }

    // ---------- 3D (WebGL + 4K Earth texture) ----------
    function start3D() {
      var T = window.THREE;
      var renderer = new T.WebGLRenderer({ canvas: cvs, antialias: true, alpha: true, powerPreference: "high-performance" });
      renderer.setPixelRatio(Math.min(2, window.devicePixelRatio || 1));
      renderer.outputEncoding = T.sRGBEncoding;
      var scene = new T.Scene(), camera = new T.PerspectiveCamera(35, 1, .01, 100);
      var globe = new T.Group(); globe.rotation.order = "XYZ"; scene.add(globe);
      function ll2v(lon, lat, r) { var phi = (90 - lat) * D2R, th = (lon + 180) * D2R; return new T.Vector3(-r * Math.sin(phi) * Math.cos(th), r * Math.cos(phi), r * Math.sin(phi) * Math.sin(th)); }
      // Earth
      var tex = new T.TextureLoader().load(dark ? "assets/earth-night-4k.jpg" : "assets/earth-4k.jpg", function () { mat.color.set(0xffffff); mat.needsUpdate = true; });
      tex.encoding = T.sRGBEncoding; tex.anisotropy = renderer.capabilities.getMaxAnisotropy();
      var mat = new T.MeshPhongMaterial({ map: tex, color: dark ? 0x1a2c4a : 0x5d8fc6, shininess: dark ? 4 : 28, specular: new T.Color(dark ? 0x111111 : 0x0c1218) });
      globe.add(new T.Mesh(new T.SphereGeometry(1, 128, 128), mat));
      // atmosphere glow
      var atm = new T.Mesh(new T.SphereGeometry(1.14, 64, 64), new T.ShaderMaterial({
        uniforms: { c: { value: new T.Color(dark ? 0x4f8dff : 0x4f97e8) } },
        vertexShader: "varying vec3 vN; void main(){ vN = normalize(normalMatrix * normal); gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }",
        fragmentShader: "uniform vec3 c; varying vec3 vN; void main(){ float i = pow(0.66 - dot(vN, vec3(0.0, 0.0, 1.0)), 3.2); gl_FragColor = vec4(c, 1.0) * i * " + (dark ? "1.1" : "0.75") + "; }",
        side: T.BackSide, blending: T.AdditiveBlending, transparent: true, depthWrite: false
      }));
      scene.add(atm);
      scene.add(new T.AmbientLight(0xffffff, dark ? 1.6 : .7));
      var sun = new T.DirectionalLight(0xffffff, dark ? .1 : .8); sun.position.set(-4, 2.5, 2.5); scene.add(sun);
      // stars
      if (dark) {
        var sg = new T.BufferGeometry(), sp = [];
        for (var i = 0; i < 900; i++) { var v = new T.Vector3().randomDirection ? new T.Vector3().randomDirection() : new T.Vector3(Math.random() - .5, Math.random() - .5, Math.random() - .5).normalize(); v.multiplyScalar(30 + Math.random() * 20); sp.push(v.x, v.y, v.z); }
        sg.setAttribute("position", new T.Float32BufferAttribute(sp, 3));
        scene.add(new T.Points(sg, new T.PointsMaterial({ color: 0xffffff, size: .09, transparent: true, opacity: .85 })));
      }
      // route Manila → Zürich along the great circle, lifted above the surface
      var vM = ll2v(120.98, 14.6, 1), vZ = ll2v(8.54, 47.37, 1);
      var qEnd = new T.Quaternion().setFromUnitVectors(vM, vZ), qI = new T.Quaternion();
      function routeAt(u, lift) { var q = new T.Quaternion().slerp ? qI.clone().slerp(qEnd, u) : qI; return vM.clone().applyQuaternion(q).multiplyScalar(1 + (lift === false ? 0 : .13 * Math.sin(Math.PI * u))); }
      var N = 260, rp = []; for (i = 0; i <= N; i++) rp.push(routeAt(i / N));
      var curve = new T.CatmullRomCurve3(rp), RAD = 8;
      var tube = new T.TubeGeometry(curve, N, .0065, RAD, false);
      tube.setDrawRange(0, 0);
      var routeMat = new T.MeshBasicMaterial({ color: 0xff3b2f, transparent: true, opacity: 1 });
      globe.add(new T.Mesh(tube, routeMat));
      var glowTube = new T.TubeGeometry(curve, N, .016, RAD, false); glowTube.setDrawRange(0, 0);
      var glowMat = new T.MeshBasicMaterial({ color: 0xff6b5f, transparent: true, opacity: .28, depthWrite: false });
      globe.add(new T.Mesh(glowTube, glowMat));
      var ghostGeo = new T.BufferGeometry().setFromPoints(rp);
      var ghost = new T.Line(ghostGeo, new T.LineDashedMaterial({ color: dark ? 0xffffff : 0xffffff, dashSize: .02, gapSize: .018, transparent: true, opacity: .75 }));
      ghost.computeLineDistances(); globe.add(ghost);
      // city markers + pulse rings
      function marker(v, col) {
        var g = new T.Group(); g.position.copy(v.clone().multiplyScalar(1.003)); g.lookAt(v.clone().multiplyScalar(2));
        var dot = new T.Mesh(new T.CircleGeometry(.014, 24), new T.MeshBasicMaterial({ color: col }));
        var rim = new T.Mesh(new T.RingGeometry(.014, .02, 32), new T.MeshBasicMaterial({ color: 0xffffff }));
        var ring = new T.Mesh(new T.RingGeometry(.02, .026, 40), new T.MeshBasicMaterial({ color: col, transparent: true, opacity: 0, depthWrite: false }));
        g.add(dot, rim, ring); globe.add(g); g.userData.ring = ring; return g;
      }
      var markM = marker(vM, 0x3b82f6), markZ = marker(vZ, 0xd52b1e), ringM = markM.userData.ring, ringZ = markZ.userData.ring;
      // the plane: a sprite drawn on a small canvas
      var pc2 = document.createElement("canvas"); pc2.width = pc2.height = 128; var c2 = pc2.getContext("2d");
      c2.translate(64, 64); c2.scale(3.2, 3.2); c2.beginPath();
      c2.moveTo(14, 0); c2.lineTo(-4, -3); c2.lineTo(-9, -12); c2.lineTo(-12, -12); c2.lineTo(-8, -2.5); c2.lineTo(-14, -2); c2.lineTo(-16, -6); c2.lineTo(-18, -6); c2.lineTo(-17, 0); c2.lineTo(-18, 6); c2.lineTo(-16, 6); c2.lineTo(-14, 2); c2.lineTo(-8, 2.5); c2.lineTo(-12, 12); c2.lineTo(-9, 12); c2.lineTo(-4, 3); c2.closePath();
      c2.shadowColor = "rgba(0,0,0,.45)"; c2.shadowBlur = 4; c2.fillStyle = "#ffffff"; c2.fill(); c2.lineWidth = .8; c2.strokeStyle = "#d52b1e"; c2.stroke();
      var ptex = new T.CanvasTexture(pc2); ptex.encoding = T.sRGBEncoding;
      var plane = new T.Sprite(new T.SpriteMaterial({ map: ptex, transparent: true, depthWrite: false }));
      plane.scale.set(.12, .12, 1); plane.visible = false; globe.add(plane);
      // camera aiming: rotate the globe so a lon/lat faces the camera, north kept up
      function aim(v) { var r = Math.sqrt(v.x * v.x + v.z * v.z); globe.rotation.set(Math.atan2(v.y, r), Math.atan2(-v.x, v.z), 0); }
      var startDir = ll2v(205, 8, 1);
      var qSpin = new T.Quaternion().setFromUnitVectors(startDir, vM);
      var W = 0, H = 0, CAMZ = 5.4;
      function size() {
        W = cvs.clientWidth; H = cvs.clientHeight;
        renderer.setSize(W, H, false); camera.aspect = W / H;
        CAMZ = 2 / (.62 * .6306 * Math.min(1, camera.aspect));
        camera.updateProjectionMatrix();
      }
      size(); addEventListener("resize", size);
      var tmp = new T.Vector3(), tmp2 = new T.Vector3(), camDir = new T.Vector3();
      function screenOf(v3) { tmp.copy(v3).applyMatrix4(globe.matrixWorld); var n = tmp.clone().project(camera); return { x: (n.x + 1) / 2 * W, y: (1 - n.y) / 2 * H, nx: n.x, ny: n.y, w: tmp }; }
      function facing(v) { tmp2.copy(v).applyMatrix4(globe.matrixWorld); camDir.copy(camera.position).sub(tmp2); return tmp2.normalize().dot(camDir.normalize()) > .08; }
      function frame(now) {
        if (!root.classList.contains("loading")) { renderer.dispose(); return; }
        var s = (now - t0) / 1000 * 1.2, tf = flightAt(s);
        // where the camera looks
        var look;
        if (s < FLY0) look = startDir.clone().applyQuaternion(qI.clone().slerp(qSpin, ease(clamp(s / FLY0))));
        else look = routeAt(tf, false);
        // look slightly south of the target so the route arcs above centre; centre exactly on Zürich while zooming
        var zk = ease(clamp((s - ZOOM0) / ZOOM));
        var ll = [Math.atan2(look.z, -look.x) / D2R - 180, 90 - Math.acos(look.y / look.length()) / D2R];
        var aimV = ll2v(ll[0], ll[1] - 9 * (1 - zk), 1);
        aim(aimV);
        var intro = 1 - Math.pow(1 - clamp(s / 1), 3);
        globe.scale.setScalar(.72 + .28 * intro); atm.scale.setScalar(.72 + .28 * intro);
        camera.position.set(0, 0, CAMZ + (2.05 - CAMZ) * Math.pow(zk, 1.4));
        // markers and route shrink away while we fly in towards Switzerland
        var fade = 1 - zk;
        markZ.scale.setScalar(.35 + .65 * fade); markM.scale.setScalar(.35 + .65 * fade);
        routeMat.opacity = .25 + .75 * fade; glowMat.opacity = .28 * fade; ghost.material.opacity = .75 * fade;
        camera.lookAt(0, 0, 0);
        globe.updateMatrixWorld(true);
        // route reveal
        var segs = Math.floor(N * tf); tube.setDrawRange(0, segs * RAD * 6); glowTube.setDrawRange(0, segs * RAD * 6);
        // plane
        plane.visible = s > FLY0 - .1 && s < ZOOM0;
        if (plane.visible) {
          var p = routeAt(tf), p2 = routeAt(Math.min(1, tf + .01)), p0 = routeAt(Math.max(0, tf - .01));
          plane.position.copy(p).multiplyScalar(1.004);
          var a = screenOf(tf < .99 ? p : p0), b = screenOf(tf < .99 ? p2 : p);
          plane.material.rotation = Math.atan2(b.ny - a.ny, b.nx - a.nx);
          plane.scale.setScalar(.11 + .03 * Math.sin(Math.PI * tf));
        }
        // pulses
        var pm = s > .5 && s < FLY0 + .5 ? ((s - .5) % .7) / .7 : -1, pz = s > FLY0 + FLY - .1 && s < ZOOM0 ? ((s - FLY0 - FLY + .1) % 1) : -1;
        ringM.scale.setScalar(pm < 0 ? 1 : 1 + pm * 2.6); ringM.material.opacity = pm < 0 ? 0 : 1 - pm;
        ringZ.scale.setScalar(pz < 0 ? 1 : 1 + pz * 2.6); ringZ.material.opacity = pz < 0 ? 0 : 1 - pz;
        // labels
        var sm = screenOf(vM), sz = screenOf(vZ);
        label(labM, sm.x, sm.y, facing(vM) && s < ZOOM0);
        label(labZ, sz.x, sz.y, facing(vZ) && s > 1 && s < ZOOM0 + .3);
        counters(tf);
        renderer.render(scene, camera);
        raf = requestAnimationFrame(frame);
      }
      raf = requestAnimationFrame(frame);
    }

    // ---------- fallback: the dotted 2D globe ----------
    function start2D() {
      var ctx = cvs.getContext("2d");
      var C = dark
        ? { o1: "#1d3a63", o2: "#0a1528", glow: "rgba(120,170,255,.22)", land: "#9fe0b0", rim: "rgba(170,210,255,.35)", route: "#ff6b5f", ghost: "rgba(255,255,255,.28)" }
        : { o1: "#e8f4ff", o2: "#9cc6ee", glow: "rgba(110,170,235,.28)", land: "#2f6b3a", rim: "rgba(255,255,255,.9)", route: "#d52b1e", ghost: "rgba(29,39,51,.28)" };
      function vec(lon, lat) { lon *= D2R; lat *= D2R; return [Math.cos(lat) * Math.cos(lon), Math.cos(lat) * Math.sin(lon), Math.sin(lat)]; }
      function toLL(v) { return [Math.atan2(v[1], v[0]) / D2R, Math.asin(Math.max(-1, Math.min(1, v[2]))) / D2R]; }
      function slerp(a, b, t) { var d = Math.acos(Math.max(-1, Math.min(1, a[0] * b[0] + a[1] * b[1] + a[2] * b[2]))), s = Math.sin(d); if (s < 1e-6) return a; var k1 = Math.sin((1 - t) * d) / s, k2 = Math.sin(t * d) / s; return [a[0] * k1 + b[0] * k2, a[1] * k1 + b[1] * k2, a[2] * k1 + b[2] * k2]; }
      function project(v, lon0, lat0) { var cl = Math.cos(-lon0 * D2R), sl = Math.sin(-lon0 * D2R); var x = v[0] * cl - v[1] * sl, y = v[0] * sl + v[1] * cl, z = v[2]; var cp = Math.cos(lat0 * D2R), sp = Math.sin(lat0 * D2R); return [y, -(-x * sp + z * cp), x * cp + z * sp]; }
      var vM = vec(120.98, 14.6), vZ = vec(8.54, 47.37), startCam = vec(205, 5), dots = window.GLOBE_DOTS || [], pts = [];
      for (var i = 0; i < dots.length; i += 2) pts.push(vec(dots[i] / 10, dots[i + 1] / 10));
      var dpr = 1;
      function size() { dpr = Math.min(2, window.devicePixelRatio || 1); cvs.width = Math.round(cvs.clientWidth * dpr); cvs.height = Math.round(cvs.clientHeight * dpr); }
      size(); addEventListener("resize", size);
      function frame(now) {
        if (!root.classList.contains("loading")) return;
        var s = (now - t0) / 1000 * 1.2, tf = flightAt(s);
        var cam = s < FLY0 ? slerp(startCam, vM, ease(clamp(s / FLY0))) : slerp(vM, vZ, tf);
        var ll = toLL(cam), lon0 = ll[0], lat0 = ll[1] - 6;
        var R = Math.min(cvs.width, cvs.height) * .3 * (.7 + .3 * (1 - Math.pow(1 - clamp(s / .9), 3))) * (1 + 6 * Math.pow(clamp((s - ZOOM0) / ZOOM), 2.2));
        var cx = cvs.width / 2, cy = cvs.height * .52;
        ctx.clearRect(0, 0, cvs.width, cvs.height);
        var o = ctx.createRadialGradient(cx - R * .35, cy - R * .35, R * .1, cx, cy, R); o.addColorStop(0, C.o1); o.addColorStop(1, C.o2);
        ctx.fillStyle = o; ctx.beginPath(); ctx.arc(cx, cy, R, 0, 6.283); ctx.fill();
        ctx.fillStyle = C.land; var dsz = Math.max(1.7 * dpr, R / 105);
        for (var k = 0; k < pts.length; k++) { var p = project(pts[k], lon0, lat0); if (p[2] <= .02) continue; ctx.globalAlpha = .25 + .75 * p[2]; var d = dsz * (.55 + .45 * p[2]); ctx.fillRect(cx + p[0] * R - d / 2, cy + p[1] * R - d / 2, d, d); }
        ctx.globalAlpha = 1; ctx.beginPath(); ctx.arc(cx, cy, R, 0, 6.283); ctx.lineWidth = 2 * dpr; ctx.strokeStyle = C.rim; ctx.stroke();
        ctx.strokeStyle = C.route; ctx.lineWidth = 3.5 * dpr; ctx.beginPath(); var first = true;
        for (k = 0; k <= 80 * tf; k++) { var v = slerp(vM, vZ, k / 80), lift = 1 + .14 * Math.sin(Math.PI * k / 80), q = project(v, lon0, lat0); var X = cx + q[0] * R * lift, Y = cy + q[1] * R * lift; if (first) { ctx.moveTo(X, Y); first = false; } else ctx.lineTo(X, Y); }
        ctx.stroke();
        var pm = project(vM, lon0, lat0), pz = project(vZ, lon0, lat0);
        label(labM, (cx + pm[0] * R) / dpr, (cy + pm[1] * R) / dpr, pm[2] > 0 && s < ZOOM0);
        label(labZ, (cx + pz[0] * R) / dpr, (cy + pz[1] * R) / dpr, pz[2] > 0 && s > 1 && s < ZOOM0 + .3);
        counters(tf);
        raf = requestAnimationFrame(frame);
      }
      raf = requestAnimationFrame(frame);
    }

    var ok3D = false;
    try { if (window.THREE && window.WebGLRenderingContext) { start3D(); ok3D = true; } } catch (e) { ok3D = false; }
    if (!ok3D) { try { start2D(); } catch (e) {} }
  })();

  // 0b. Themes: Alpine (light) · Meadow · Night (dark), chosen from a small picker
  (function () {
    var root = document.documentElement, btn = $("themeBtn"), meta = document.querySelector('meta[name="theme-color"]');
    var THEMES = [
      { id: "meadow", name: "Meadow", desc: "Olive, sage, poppy, peach", sw: ["#6b8a4e", "#d4dfa6", "#d14b4b", "#f7e3c3"], color: "#6b8a4e" },
      { id: "light", name: "Alpine", desc: "Pine green on cream", sw: ["#2f5d3a", "#a9bd94", "#e2b33c", "#f6efdf"], color: "#1f4a2c" },
      { id: "picnic", name: "Cozy Picnic", desc: "Olive, oat, terracotta", sw: ["#536344", "#fbf5e9", "#e8d8be", "#bf765e", "#382e28"], color: "#536344", isNew: true },
      { id: "lakeside", name: "Lakeside Meadow", desc: "Pine, lake blue, soft sage", sw: ["#264f46", "#f5f8f4", "#a9cbcd", "#b6c5a4", "#273b39"], color: "#264f46", isNew: true },
      { id: "dark", name: "Night", desc: "Moss under the stars", sw: ["#5e9a6c", "#3a4840", "#e8c25a", "#2e3a33"], color: "#0e1a13" }
    ];
    function cur() { var t = root.getAttribute("data-theme"); return THEMES.some(function (x) { return x.id === t; }) ? t : "meadow"; }
    var pop = document.createElement("div");
    pop.className = "tpick"; pop.id = "tpick"; pop.setAttribute("role", "radiogroup"); pop.setAttribute("aria-label", "Choose a theme");
    pop.innerHTML = '<p class="tpick-t">Choose a theme</p>' + THEMES.map(function (t) {
      return '<button type="button" role="radio" data-t="' + t.id + '"><span class="tp-sw" aria-hidden="true">' + t.sw.map(function (c) { return '<i style="background:' + c + '"></i>'; }).join("") +
        '</span><span class="tp-txt"><b>' + t.name + (t.isNew ? '<span class="tp-new">NEW</span>' : "") + '</b><small>' + t.desc + '</small></span><i class="fa-solid fa-check tp-check" aria-hidden="true"></i></button>';
    }).join("");
    document.body.appendChild(pop);
    var opts = Array.prototype.slice.call(pop.querySelectorAll("button[data-t]"));
    function sync() {
      var t = cur(), th = THEMES.filter(function (x) { return x.id === t; })[0];
      opts.forEach(function (o) { var on = o.getAttribute("data-t") === t; o.setAttribute("aria-checked", on ? "true" : "false"); o.tabIndex = on ? 0 : -1; });
      btn.setAttribute("aria-label", "Theme: " + th.name + ". Choose a theme");
      btn.setAttribute("title", "Theme: " + th.name);
      if (meta) meta.setAttribute("content", th.color);
    }
    function place() {
      var r = btn.getBoundingClientRect();
      pop.style.top = (r.bottom + 10) + "px";
      pop.style.right = Math.max(10, window.innerWidth - r.right - 6) + "px";
    }
    function open() { place(); pop.classList.add("open"); btn.setAttribute("aria-expanded", "true"); var c = pop.querySelector('[aria-checked="true"]'); if (c) c.focus(); }
    function close(focusBtn) { if (!pop.classList.contains("open")) return; pop.classList.remove("open"); btn.setAttribute("aria-expanded", "false"); if (focusBtn) btn.focus(); }
    function set(t) {
      root.setAttribute("data-theme", t);
      try { localStorage.setItem("swiss-theme", t); } catch (e) {}
      sync();
    }
    btn.setAttribute("aria-haspopup", "true"); btn.setAttribute("aria-expanded", "false"); btn.setAttribute("aria-controls", "tpick");
    btn.addEventListener("click", function (e) { e.stopPropagation(); if (pop.classList.contains("open")) close(); else open(); });
    opts.forEach(function (o, i) {
      o.addEventListener("click", function () { set(o.getAttribute("data-t")); setTimeout(function () { close(true); }, 180); });
      o.addEventListener("keydown", function (e) {
        var k = e.key === "ArrowDown" || e.key === "ArrowRight" ? 1 : e.key === "ArrowUp" || e.key === "ArrowLeft" ? -1 : 0;
        if (k) { e.preventDefault(); var n = opts[(i + k + opts.length) % opts.length]; n.focus(); }
      });
    });
    document.addEventListener("click", function (e) { if (!pop.contains(e.target)) close(); });
    document.addEventListener("keydown", function (e) { if (e.key === "Escape") close(true); });
    window.addEventListener("resize", function () { if (pop.classList.contains("open")) place(); });
    window.addEventListener("scroll", function () { if (pop.classList.contains("open")) place(); }, { passive: true });
    sync();
  })();

  // 1. Year
  if ($("year")) $("year").textContent = new Date().getFullYear();

  // 2. Mobile menu
  var burger = $("burger"), links = $("links");
  function closeMenu() { links.classList.remove("open"); burger.setAttribute("aria-expanded", "false"); burger.innerHTML = '<i class="fa-solid fa-bars"></i>'; }
  burger.addEventListener("click", function () {
    var open = links.classList.toggle("open");
    burger.setAttribute("aria-expanded", open ? "true" : "false");
    burger.innerHTML = open ? '<i class="fa-solid fa-xmark"></i>' : '<i class="fa-solid fa-bars"></i>';
  });
  $$("a", links).forEach(function (a) { a.addEventListener("click", closeMenu); });

  // 3. Train progress rail + nav state (one update per frame, transforms only)
  var fill = $("railFill"), train = $("railTrain"), nav = $("nav"), ticking = false, maxScroll = 1, scrolled = null;
  function measure() { maxScroll = Math.max(1, document.documentElement.scrollHeight - innerHeight); }
  function paint() {
    ticking = false;
    var p = Math.min(1, Math.max(0, scrollY / maxScroll));
    fill.style.transform = "scaleX(" + p + ")";
    train.style.transform = "translateX(" + (p * (innerWidth - 20) + 10) + "px) translateX(-50%)";
    var s = scrollY > 30;
    if (s !== scrolled) { scrolled = s; nav.classList.toggle("scrolled", s); }
  }
  function onScroll() { if (!ticking) { ticking = true; requestAnimationFrame(paint); } }
  addEventListener("scroll", onScroll, { passive: true });
  addEventListener("resize", function () { measure(); onScroll(); });
  addEventListener("load", function () { measure(); onScroll(); });
  measure(); paint();

  // 4. Active link while scrolling
  var navLinks = $$(".links a");
  var sections = navLinks.map(function (a) { return document.querySelector(a.getAttribute("href")); }).filter(Boolean);
  if ("IntersectionObserver" in window) {
    var spy = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (!e.isIntersecting) return;
        navLinks.forEach(function (a) { a.classList.toggle("active", a.getAttribute("href") === "#" + e.target.id); });
      });
    }, { rootMargin: "-45% 0px -50% 0px" });
    sections.forEach(function (s) { spy.observe(s); });
  }

  // 5. Clock on the cable-car itinerary (Zürich time)
  var clock = $("clock");
  function tick() {
    try {
      clock.textContent = "ZRH " + new Date().toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit", timeZone: "Europe/Zurich" });
    } catch (e) { clock.textContent = ""; }
  }
  if (clock) { tick(); setInterval(tick, 30000); }

  // 5b. Cable-car itinerary: each gondola rides down the cable from the summit station.
  // A straight translate back to the cable's start keeps the grip on the rope the whole way.
  (function () {
    var rw = $("ropeway");
    if (!rw) return;
    var cabs = $$(".cab", rw), done = false;
    function ride() {
      if (done) return; done = true;
      rw.classList.add("go");
      if (!rw.animate) return;
      cabs.forEach(function (c, i) {
        c.animate([{ transform: "translate(" + -c.offsetLeft + "px," + -c.offsetTop + "px)", opacity: 0 }, { opacity: 1, offset: .12 }, { transform: "none", opacity: 1 }],
          { duration: 1500 + i * 160, delay: 250 + i * 220, easing: "cubic-bezier(.35,.1,.2,1)", fill: "backwards" });
      });
    }
    // wait for the intro overlay to finish, then ride in once the ropeway is on screen
    function arm() {
      if (!("IntersectionObserver" in window)) return ride();
      var io = new IntersectionObserver(function (es) { if (es[0].isIntersecting) { io.disconnect(); ride(); } }, { threshold: .2 });
      io.observe(rw);
    }
    if (document.documentElement.classList.contains("loading")) {
      var mo = new MutationObserver(function () { if (!document.documentElement.classList.contains("loading")) { mo.disconnect(); arm(); } });
      mo.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] });
    } else arm();
  })();

  // 5c. Intro stats: count up once the letter has written itself in
  (function () {
    var box = document.getElementById("introStats"), letter = document.getElementById("introLetter");
    if (!box || !letter) return;
    var started = false;
    function run() {
      if (started) return; started = true;
      Array.prototype.forEach.call(box.querySelectorAll("b[data-to]"), function (b, i) {
        var to = +b.getAttribute("data-to"), suf = b.getAttribute("data-suffix") || "";
        setTimeout(function () {
          var t0 = performance.now();
          (function f(t) { var k = Math.min(1, (t - t0) / 1100); b.textContent = Math.round(to * (1 - Math.pow(1 - k, 3))) + (k === 1 ? suf : ""); if (k < 1) requestAnimationFrame(f); })(t0);
        }, 4700 + i * 150);
      });
    }
    if (!("MutationObserver" in window)) return run();
    var mo = new MutationObserver(function () { if (letter.classList.contains("in")) { mo.disconnect(); run(); } });
    mo.observe(letter, { attributes: true, attributeFilter: ["class"] });
    if (letter.classList.contains("in")) run();
  })();

  // 6b. Services basket: hover (mouse) or tap / Enter (touch, keyboard) unpacks a jar
  $$(".jar").forEach(function (jar) {
    function toggle() { var on = !jar.classList.contains("open"); $$(".jar.open").forEach(function (o) { o.classList.remove("open"); }); jar.classList.toggle("open", on); }
    jar.addEventListener("click", toggle);
    jar.addEventListener("keydown", function (e) { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); toggle(); } });
  });

  // 6c. Tools kiosk: pockets and an auto-demo finger
  (function () {
    var stage = $("kioskStage"), kiosk = $("kiosk"), screen = $("ksScreen");
    if (!kiosk) return;
    var cats = $$(".ks-cat"), tiles = $$(".ks-tile"), grid = $("ksGrid"), nav = document.querySelector(".ks-cats");
    var title = $("ksTitle"), kicker = $("ksKicker"), count = $("ksCount"), finger = $("ksFinger"), prog = $("ksProg"), clock = $("ksClock");
    function tick() { try { clock.textContent = new Date().toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit", timeZone: "Europe/Zurich" }) + " ZRH"; } catch (e) {} }
    tick(); setInterval(tick, 30000);
    var current = 0, num = 26, head = document.querySelector(".ks-panel-head"), ease = "cubic-bezier(.2,.8,.2,1)";
    var anim = function (el, frames, ms) { if (el && el.animate) el.animate(frames, { duration: ms, easing: ease }); };
    function countTo(n) {
      var from = num, t0 = performance.now(); num = n;
      (function f(t) { var k = Math.min(1, (t - t0) / 450); count.textContent = Math.round(from + (n - from) * (1 - Math.pow(1 - k, 3))); if (k < 1) requestAnimationFrame(f); })(t0);
    }
    // No tiles are hidden or moved in the layout: a category only flips classes, and CSS
    // lifts the matching tiles forward in 3D (transform + opacity, composited on the GPU).
    function select(i) {
      if (i === current && grid.dataset.f) return;
      current = i;
      var btn = cats[i], f = btn.dataset.f, all = f === "all", e = 0, n = 0;
      grid.dataset.f = f;
      cats.forEach(function (c, k) { c.classList.toggle("on", k === i); c.setAttribute("aria-pressed", k === i ? "true" : "false"); });
      tiles.forEach(function (t) {
        var hit = !all && t.dataset.cat === f;
        t.classList.toggle("hit", hit);
        t.style.setProperty("--e", hit ? e++ : 0);
        if (all || hit) n++;
      });
      grid.classList.toggle("filtering", !all);
      title.textContent = all ? "All tools" : btn.dataset.name;
      kicker.textContent = all ? "Welcome, traveller" : "Pocket 0" + i;
      anim(head, [{ opacity: 0, transform: "translate3d(0,8px,0)" }, { opacity: 1, transform: "none" }], 420);
      countTo(n);
      if (nav.scrollWidth > nav.clientWidth + 4) nav.scrollTo({ left: btn.offsetLeft - 12, behavior: "smooth" });
    }
    cats.forEach(function (c, i) { c.addEventListener("click", function () { select(i); pause(); }); });
    // where an element sits inside the (3D-transformed) screen, in the screen's own pixels
    function within(el) { var x = 0, y = 0; while (el && el !== screen) { x += el.offsetLeft; y += el.offsetTop; el = el.offsetParent; } return { x: x, y: y }; }
    var auto = true, visible = false, timer = 0, resume = 0, progAnim = null;
    function runProg() {
      if (progAnim) progAnim.cancel();
      if (prog.animate) progAnim = prog.animate([{ transform: "scaleX(0)" }, { transform: "scaleX(1)" }], { duration: 3350, easing: "linear", fill: "forwards" });
    }
    function step() {
      clearTimeout(timer);
      if (!auto || !visible) return;
      var next = (current + 1) % cats.length, btn = cats[next], mobile = window.innerWidth < 760;
      if (!mobile) {
        var p = within(btn);
        finger.classList.add("show");
        finger.style.transform = "translate3d(" + (p.x - (nav.scrollLeft || 0) + btn.offsetWidth * .55) + "px," + (p.y + btn.offsetHeight * .45) + "px,0)";
      }
      timer = setTimeout(function () {
        if (!auto) return;
        anim(finger.firstElementChild, [{ transform: "none" }, { transform: "scale(.85) translate3d(0,3px,0)", offset: .45 }, { transform: "none" }], 350);
        anim(btn, [{ scale: 1 }, { scale: .96, offset: .4 }, { scale: 1 }], 350);
        select(next);
        runProg();
        timer = setTimeout(step, 2600);
      }, mobile ? 300 : 750);
    }
    function pause() { auto = false; clearTimeout(timer); clearTimeout(resume); finger.classList.remove("show"); if (progAnim) progAnim.cancel(); resume = setTimeout(function () { auto = true; step(); }, 7000); }
    kiosk.addEventListener("pointerenter", function (e) { if (e.pointerType === "mouse") pause(); });
    if ("IntersectionObserver" in window) {
      new IntersectionObserver(function (es) {
        var was = visible; visible = es[0].isIntersecting;
        stage.classList.toggle("live", visible); // looping effects only run while on screen
        if (visible && !was) { clearTimeout(timer); timer = setTimeout(step, 1200); }
        if (!visible) { clearTimeout(timer); finger.classList.remove("show"); }
      }, { threshold: .2 }).observe(stage);
    } else { visible = true; stage.classList.add("live"); }
  })();

  // 6d. Skills railway: the train only runs while the section is on screen
  (function () {
    var flow = $("flow");
    if (!flow) return;
    if (!("IntersectionObserver" in window)) { flow.classList.add("live"); return; }
    new IntersectionObserver(function (es) { flow.classList.toggle("live", es[0].isIntersecting); }).observe(flow);
  })();

  // 7. Typing test: pink mechanical keyboard + a little desktop with today's tasks
  (function () {
    var box = $("typer"), kb = $("kb");
    if (!box || !kb) return;
    // TKL board in white & mint (matches the sample): [id, label, width-in-units, extra class]
    // ids keep the old names so the typing animation can find keys; "|" = gap, "_" = half gap
    var G = "green", rows = [
      [["esc", "Esc"], "|", ["f1", "F1"], ["f2", "F2"], ["f3", "F3"], ["f4", "F4"], "_", ["f5", "F5"], ["f6", "F6"], ["f7", "F7"], ["f8", "F8"], "_", ["f9", "F9"], ["f10", "F10"], ["f11", "F11"], ["f12", "F12"], "_", ["prt", "Print"], ["scr", "Scroll"], ["pau", "Pause"]],
      [["`", "~<br>`"], ["1", "!<br>1"], ["2", "@<br>2"], ["3", "#<br>3"], ["4", "$<br>4"], ["5", "%<br>5"], ["6", "^<br>6"], ["7", "&amp;<br>7"], ["8", "*<br>8", 1, G], ["9", "(<br>9", 1, G], ["0", ")<br>0"], ["-", "_<br>-", 1, G], ["=", "+<br>=", 1, G], ["⌫", "Backspace", 2], "_", ["ins", "Insert"], ["hom", "Home"], ["pgu", "PgUp"]],
      [["⇥", "Tab", 1.5], ["q", "Q"], ["w", "W"], ["e", "E"], ["r", "R"], ["t", "T"], ["y", "Y"], ["u", "U", 1, G], ["i", "I", 1, G], ["o", "O", 1, G], ["p", "P", 1, G], ["[", "{<br>[", 1, G], ["]", "}<br>]", 1, G], ["\\", "|<br>\\", 1.5], "_", ["del", "Delete"], ["end", "End"], ["pgd", "PgDn"]],
      [["⇪", "Caps Lock", 1.75], ["a", "A"], ["s", "S"], ["d", "D"], ["f", "F"], ["g", "G"], ["h", "H"], ["j", "J"], ["k", "K", 1, G], ["l", "L", 1, G], [";", ":<br>;", 1, G], ["'", "♥♥", 1, G], ["⏎", "Enter", 2.25], "_", ["_x1", "", 3, "ghost"]],
      [["⇧", "⇧ Shift", 2.25], ["z", "Z"], ["x", "X"], ["c", "C"], ["v", "V"], ["b", "B"], ["n", "N"], ["m", "M"], [",", "&lt;<br>,"], [".", "&gt;<br>.", 1, G], ["/", "?<br>/"], ["⇧r", "⇧ Shift ♥♥♥", 2.75], "_", ["_x2", "", 1, "ghost"], ["↑", "♥"], ["_x3", "", 1, "ghost"]],
      [["ctrl", "Control", 1.25], ["sys", "System", 1.25], ["⌥", "Alt", 1.25], [" ", "", 6.25, "space"], ["♥", "♥", 1.25], ["⌥r", "Alt", 1.25], ["fn", "Fn", 1.25], ["ctrlr", "Control", 1.25], "_", ["←", "♥"], ["↓", "♥"], ["→", "♥"]]
    ];
    var keys = {}, mk = kb.parentNode;
    if (mk) mk.classList.add("tkl");
    rows.forEach(function (r, ri) {
      var row = document.createElement("div"); row.className = "kr tk-row tk-row" + ri;
      r.forEach(function (k) {
        var el = document.createElement("span");
        if (k === "|" || k === "_") { el.className = "tk-gap" + (k === "|" ? " big" : ""); row.appendChild(el); return; }
        var id = k[0], w = k[2] || 1, cls = k[3] || "";
        el.className = "tk" + (cls ? " " + cls : "") + (k[1].length > 3 && k[1].indexOf("<br>") < 0 ? " word" : "");
        el.style.setProperty("--w", w);
        if (cls !== "ghost") el.innerHTML = "<i>" + k[1] + "</i>";
        if (!keys[id]) keys[id] = el;
        row.appendChild(el);
      });
      kb.appendChild(row);
    });
    var shiftKey = keys["⇧"];
    var lines = [
      "Inbox sorted: urgent emails flagged and replies drafted.",
      "Calendar booked: client calls confirmed for next week.",
      "Tracker updated: the spreadsheet is clean and sorted.",
      "Content calendar ready: posts scheduled with captions.",
      "Lead list verified: prospects ready for outreach."
    ];
    var text = $("tyText"), wpmEl = $("tyWpm"), accEl = $("tyAcc"), wpmBar = $("tyWpmBar"), accBar = $("tyAccBar"), timeEl = $("tyTime"), badge = $("tyBadge");
    var items = $$("#taList li"), dock = $$(".dock span"), count = $("taCount"), bar = $("taBar"), clock = $("osClock");
    function tickClock() { try { clock.textContent = new Date().toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit", timeZone: "Europe/Zurich" }); } catch (e) {} }
    tickClock(); setInterval(tickClock, 30000);
    var neighbors = "qwertyuiopasdfghjklzxcvbnm", li = 0, running = false, started = false, done = 0;
    function press(ch) {
      var base = ch === "!" ? "1" : ch === ":" ? ";" : ch.toLowerCase();
      var k = keys[base] || (ch === " " ? keys[" "] : null);
      var shifted = ch !== ch.toLowerCase() || "!:".indexOf(ch) > -1;
      [k, shifted ? shiftKey : null].forEach(function (el) { if (!el) return; el.classList.remove("down"); void el.offsetWidth; el.classList.add("down"); });
    }
    function stats(p, typos) {
      var wpm = Math.round(55 * (1 - Math.pow(1 - p, 2)) + (p > 0 && p < 1 ? Math.random() * 4 - 2 : 0));
      var acc = Math.max(97, 100 - typos * 3);
      if (p >= 1) { wpm = 55; acc = 97; }
      wpmEl.textContent = Math.max(0, wpm); accEl.textContent = acc + "%";
      wpmBar.style.transform = "scaleX(" + Math.min(1, Math.max(0, wpm) / 70) + ")";
      accBar.style.transform = "scaleX(" + acc / 100 + ")";
      var secs = Math.round(p * 12); timeEl.textContent = "0:" + (secs < 10 ? "0" : "") + secs;
    }
    function progress() { count.textContent = done + "/" + items.length; bar.style.transform = "scaleX(" + done / items.length + ")"; }
    function resetTasks() { done = 0; items.forEach(function (x) { x.classList.remove("done", "active"); }); badge.classList.remove("show"); progress(); }
    function finishTask(i) {
      items[i].classList.remove("active"); items[i].classList.add("done");
      if (dock[i]) { dock[i].classList.remove("hop"); void dock[i].offsetWidth; dock[i].classList.add("hop"); }
      done++; progress();
    }
    function typeLine() {
      var idx = li % lines.length, line = lines[idx], i = 0, typos = 0, typoAt = 12 + Math.floor(Math.random() * 25);
      if (idx === 0) resetTasks();
      items[idx].classList.add("active");
      text.textContent = ""; box.classList.remove("finished");
      stats(0, 0);
      function next() {
        if (!running) { setTimeout(next, 300); return; }
        if (i >= line.length) {
          stats(1, typos); box.classList.add("finished"); finishTask(idx);
          if (idx === lines.length - 1) badge.classList.add("show");
          li++; setTimeout(typeLine, idx === lines.length - 1 ? 3200 : 1500); return;
        }
        var ch = line[i];
        if (i === typoAt && /[a-z]/.test(ch)) {
          var wrong = neighbors[(neighbors.indexOf(ch) + 1) % neighbors.length];
          var bad = document.createElement("span"); bad.className = "bad"; bad.textContent = wrong;
          text.appendChild(bad); press(wrong); typos++; typoAt = -1; stats(i / line.length, typos);
          setTimeout(function () { press("⌫"); bad.remove(); setTimeout(next, 150); }, 380);
          return;
        }
        var ok = document.createElement("span"); ok.className = "ok"; ok.textContent = ch;
        text.appendChild(ok); press(ch); i++; stats(i / line.length, typos);
        var d = 55 + Math.random() * 65; if (ch === " ") d += 35; if (/[,.:]/.test(ch)) d += 150;
        setTimeout(next, d);
      }
      setTimeout(next, 450);
    }
    if (reduce) { text.textContent = lines[0]; stats(1, 1); items.forEach(function (x) { x.classList.add("done"); }); done = items.length; progress(); badge.classList.add("show"); return; }
    progress();
    if ("IntersectionObserver" in window) {
      new IntersectionObserver(function (es) {
        running = es[0].isIntersecting;
        if (running && !started) { started = true; typeLine(); }
      }, { threshold: .3 }).observe(box);
    } else { running = true; started = true; typeLine(); }
  })();

  // 7a. Rate passes: a shufflable deck, or all passes side by side
  (function () {
    var wrap = document.getElementById("passes"), nav = document.getElementById("pvNav"), bar = document.getElementById("pvBar");
    if (!wrap || !nav || !bar) return;
    var cards = Array.prototype.slice.call(wrap.querySelectorAll(".pass"));
    var dots = Array.prototype.slice.call(nav.querySelectorAll(".pv-dots i"));
    var order = cards.map(function (c, i) { return i; }), busy = false;
    function paint() {
      order.forEach(function (ci, pos) { cards[ci].style.setProperty("--pos", pos); cards[ci].style.setProperty("--side", pos % 2 ? 1 : -1); cards[ci].setAttribute("aria-hidden", wrap.classList.contains("deck") && pos ? "true" : "false"); });
      dots.forEach(function (d, i) { d.classList.toggle("on", i === order[0]); });
    }
    function step(dir) {
      if (busy || !wrap.classList.contains("deck")) return;
      busy = true;
      if (dir > 0) {
        var top = cards[order[0]];
        top.classList.add("fly");
        setTimeout(function () { order.push(order.shift()); paint(); top.classList.remove("fly"); setTimeout(function () { busy = false; }, 420); }, 300);
      } else {
        order.unshift(order.pop()); var nu = cards[order[0]];
        nu.classList.add("fly-in"); paint();
        requestAnimationFrame(function () { requestAnimationFrame(function () { nu.classList.remove("fly-in"); }); });
        setTimeout(function () { busy = false; }, 560);
      }
    }
    function shuffle() {
      if (busy || !wrap.classList.contains("deck")) return;
      busy = true; wrap.classList.add("riffle");
      setTimeout(function () {
        var a = order.slice(), n = a.length;
        do { for (var i = n - 1; i > 0; i--) { var k = Math.floor(Math.random() * (i + 1)), t = a[i]; a[i] = a[k]; a[k] = t; } } while (a[0] === order[0]);
        order = a; paint();
      }, 380);
      setTimeout(function () { wrap.classList.remove("riffle"); busy = false; }, 900);
    }
    nav.addEventListener("click", function (e) {
      var b = e.target.closest("button"); if (!b) return;
      var g = b.getAttribute("data-go"); if (g === "shuffle") shuffle(); else step(+g);
    });
    dots.forEach(function (d, i) { d.addEventListener("click", function () { if (busy || order[0] === i) return; while (order[0] !== i) order.push(order.shift()); paint(); }); });
    wrap.addEventListener("click", function (e) { if (!wrap.classList.contains("deck")) return; var c = e.target.closest(".pass"); if (c && c === cards[order[0]]) step(1); });
    var sx = null;
    wrap.addEventListener("pointerdown", function (e) { sx = e.clientX; });
    wrap.addEventListener("pointerup", function (e) { if (sx === null) return; var dx = e.clientX - sx; sx = null; if (Math.abs(dx) > 40) step(dx < 0 ? 1 : -1); });
    wrap.addEventListener("keydown", function (e) { if (e.key === "ArrowRight") step(1); if (e.key === "ArrowLeft") step(-1); });
    wrap.tabIndex = 0;
    bar.addEventListener("click", function (e) {
      var b = e.target.closest("button[data-v]"); if (!b) return;
      var deck = b.getAttribute("data-v") === "deck";
      Array.prototype.forEach.call(bar.querySelectorAll("button[data-v]"), function (x) { x.classList.toggle("on", x === b); x.setAttribute("aria-pressed", x === b ? "true" : "false"); });
      wrap.classList.add("morph"); wrap.classList.toggle("deck", deck); nav.classList.toggle("hide", !deck); paint();
      setTimeout(function () { wrap.classList.remove("morph"); }, 700);
    });
    paint();
  })();

  // 7d. Home button: appears once you leave the hero, glides back to the top
  (function () {
    var btn = document.getElementById("homeBtn"), hero = document.getElementById("home");
    if (!btn) return;
    btn.addEventListener("click", function (e) { e.preventDefault(); window.scrollTo({ top: 0, behavior: "smooth" }); if (history.replaceState) history.replaceState(null, "", location.pathname + location.search); });
    if ("IntersectionObserver" in window && hero) {
      new IntersectionObserver(function (es) { btn.classList.toggle("show", !es[0].isIntersecting); }, { threshold: .15 }).observe(hero);
    } else btn.classList.add("show");
  })();

  // 7e. Nav: a pill that glides to the active section's link
  (function () {
    var nav = document.getElementById("links"), pill = nav && nav.querySelector(".nl-pill");
    if (!pill) return;
    var cur = null;
    function place(a) {
      if (!a || window.innerWidth <= 980) { pill.style.opacity = 0; return; }
      pill.style.opacity = 1;
      pill.style.width = a.offsetWidth + "px";
      pill.style.transform = "translateX(" + a.offsetLeft + "px)";
    }
    function sync() { var a = nav.querySelector("a.active:not(.nav-cta)"); if (a !== cur) { cur = a; place(a); } }
    new MutationObserver(sync).observe(nav, { subtree: true, attributes: true, attributeFilter: ["class"] });
    window.addEventListener("resize", function () { place(cur); });
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(function () { place(cur); });
    sync();
  })();

  // 7b. Smoothness: pause every looping animation in sections that are off screen
  (function () {
    if (!("IntersectionObserver" in window)) return;
    var secs = Array.prototype.slice.call(document.querySelectorAll("main > section, #home"));
    var io = new IntersectionObserver(function (es) { es.forEach(function (e) { e.target.classList.toggle("offscreen", !e.isIntersecting); }); }, { rootMargin: "200px 0px" });
    secs.forEach(function (s) { io.observe(s); });
    // and pause everything while the tab is hidden
    document.addEventListener("visibilitychange", function () { document.documentElement.classList.toggle("tab-hidden", document.hidden); });
  })();

  // 7c. Golden glint: replays every time an element scrolls into view, up or down
  (function () {
    if (!("IntersectionObserver" in window)) return;
    var sel = ".stop, .h-sec.on-cloth, .hp-title, #training .sec-head, .hp-label, .cert-img, .pl-photo, .jar-glass, .stag-card, .ks-screen, .cab-box, .pass, .cm-card, .boarding, .napkin, .mail, .fcol .fnode, .career .cr-pin, .typer";
    var els = Array.prototype.slice.call(document.querySelectorAll(sel));
    els.forEach(function (el) {
      if (getComputedStyle(el).position === "static") el.style.position = "relative";
      var g = document.createElement("span"); g.className = "glint"; g.setAttribute("aria-hidden", "true");
      el.appendChild(g);
    });
    var io = new IntersectionObserver(function (es) {
      var k = 0;
      es.forEach(function (e) {
        if (e.isIntersecting) { e.target.style.setProperty("--gd", (k++ * 0.12).toFixed(2) + "s"); e.target.classList.add("glint-on"); }
        else e.target.classList.remove("glint-on");
      });
    }, { threshold: 0.35, rootMargin: "-6% 0px -6% 0px" });
    els.forEach(function (el) { io.observe(el); });
  })();

  // 8. Reveal on scroll
  var reveals = $$(".reveal, #flow, #hamper");
  function shown(el) {
    el.classList.add("in");
  }
  if ("IntersectionObserver" in window && !reduce) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) { if (e.isIntersecting) { shown(e.target); io.unobserve(e.target); } });
    }, { threshold: .15, rootMargin: "0px 0px -40px 0px" });
    reveals.forEach(function (el) { io.observe(el); });
  } else {
    reveals.forEach(shown);
  }

  // 9. Toast + copy
  var toast = $("toast"), tt;
  function say(msg) { toast.textContent = msg; toast.classList.add("show"); clearTimeout(tt); tt = setTimeout(function () { toast.classList.remove("show"); }, 2200); }
  function copy(text, label) {
    function ok() { say((label || "Copied") + " copied to clipboard"); }
    if (navigator.clipboard && window.isSecureContext) navigator.clipboard.writeText(text).then(ok, function () { say(text); });
    else {
      var ta = document.createElement("textarea"); ta.value = text; ta.style.position = "fixed"; ta.style.opacity = "0";
      document.body.appendChild(ta); ta.select();
      try { document.execCommand("copy"); ok(); } catch (e) { say(text); }
      ta.remove();
    }
  }
  $$("[data-copy]").forEach(function (b) { b.addEventListener("click", function () { copy(b.dataset.copy, "Discord username"); }); });

  // 10. Contact form (Web3Forms; if it fails, offer Gmail instead)
  (function () {
    var f = $("contactForm");
    if (!f) return;
    var st = $("formStatus"), btn = f.querySelector(".send"), el = f.elements, to = f.dataset.email, enc = encodeURIComponent;
    function fallback(name, mail, msg) {
      var subj = "Portfolio inquiry from " + name, body = msg + "\n\n- " + name + " (" + mail + ")";
      st.className = "form-status err";
      st.innerHTML = "Couldn’t send automatically. Send it with " +
        '<a target="_blank" rel="noopener" href="https://mail.google.com/mail/?view=cm&fs=1&to=' + enc(to) + "&su=" + enc(subj) + "&body=" + enc(body) + '">Gmail</a>, or email me at <b>' + to + "</b>.";
    }
    f.addEventListener("submit", function (e) {
      e.preventDefault();
      var name = el.name.value.trim(), mail = el.email.value.trim(), msg = el.message.value.trim();
      var ok = { name: !!name, email: /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(mail), message: !!msg };
      ["name", "email", "message"].forEach(function (k) { el[k].closest(".field").classList.toggle("invalid", !ok[k]); });
      if (!ok.name || !ok.email || !ok.message) {
        st.className = "form-status err";
        st.textContent = "Please add your name, a valid email, and your message.";
        return;
      }
      var label = btn.innerHTML;
      btn.disabled = true; btn.textContent = "Boarding…";
      st.className = "form-status"; st.textContent = "";
      var fd = new FormData();
      fd.append("access_key", (f.dataset.w3fKey || "").trim());
      fd.append("subject", "Portfolio inquiry from " + name);
      fd.append("from_name", "Task Meadow by Lyn");
      fd.append("name", name); fd.append("email", mail); fd.append("message", msg);
      fd.append("botcheck", el.botcheck.checked ? "true" : "");
      fetch("https://api.web3forms.com/submit", { method: "POST", headers: { Accept: "application/json" }, body: fd })
        .then(function (r) { return r.json().catch(function () { return null; }).then(function (d) { return r.ok && d && (d.success === true || d.success === "true"); }); })
        .catch(function () { return false; })
        .then(function (sent) {
          if (sent) {
            st.className = "form-status ok";
            st.textContent = "Thank you! Your message has taken off. I’ll get back to you soon. ✈";
            f.reset();
          } else {
            fallback(name, mail, msg);
          }
          btn.innerHTML = label; btn.disabled = false;
        });
    });
  })();

  // 11. Contact modal: phone / email / book a meeting
  (function () {
    var dlg = $("cm");
    if (!dlg || typeof dlg.showModal !== "function") return;
    var PHONE = "+63 976 079 5952", PHONE_RAW = "639760795952", EMAIL = "hello.lyndelacruz@gmail.com";
    var CAL = "https://calendly.com/hello-lyndelacruz/30min";
    var isPhone = window.matchMedia && window.matchMedia("(pointer: coarse)").matches;
    var gmail = "https://mail.google.com/mail/?view=cm&fs=1&to=" + encodeURIComponent(EMAIL) + "&su=" + encodeURIComponent("Inquiry from your Task Meadow by Lyn portfolio");
    var MODALS = {
      phone: {
        ico: "fa-solid fa-phone", title: "Phone Number", value: PHONE, desc: "Available for calls, SMS, and WhatsApp.",
        actions: isPhone
          ? [{ label: "Call Now", icon: "fa-solid fa-phone", href: "tel:+" + PHONE_RAW, solid: true },
             { label: "WhatsApp", icon: "fa-brands fa-whatsapp", href: "https://wa.me/" + PHONE_RAW, blank: true }]
          : [{ label: "WhatsApp", icon: "fa-brands fa-whatsapp", href: "https://wa.me/" + PHONE_RAW, blank: true, solid: true },
             { label: "Copy number", icon: "fa-regular fa-copy", copy: PHONE, what: "Phone number" }]
      },
      email: {
        ico: "fa-solid fa-envelope", title: "E-mail", value: EMAIL, desc: "Send job offers or inquiries directly.",
        actions: [{ label: "Open Gmail", icon: "fa-solid fa-envelope-open-text", href: gmail, blank: true, solid: true },
                  { label: "Copy email", icon: "fa-regular fa-copy", copy: EMAIL, what: "Email" }]
      },
      meeting: {
        ico: "fa-regular fa-calendar-check", title: "Book a Meeting", value: "", desc: "Pick a time that works for you. 30 minutes, over a virtual picnic.",
        embed: CAL + "?hide_gdpr_banner=1",
        actions: [{ label: "Open in Calendly", icon: "fa-solid fa-arrow-up-right-from-square", href: CAL, blank: true, solid: true }]
      }
    };
    function open(kind) {
      var m = MODALS[kind]; if (!m) return;
      dlg.dataset.kind = kind;
      $("cmIco").className = m.ico;
      $("cmTitle").textContent = m.title;
      $("cmValue").textContent = m.value; $("cmValue").hidden = !m.value;
      $("cmDesc").textContent = m.desc;
      var emb = $("cmEmbed");
      if (m.embed && !isPhone) { emb.innerHTML = '<iframe title="Calendly booking" loading="lazy" src="' + m.embed + '"></iframe>'; emb.hidden = false; }
      else { emb.innerHTML = ""; emb.hidden = true; }
      var box = $("cmActions"); box.innerHTML = "";
      m.actions.forEach(function (a) {
        var el;
        if (a.copy) { el = document.createElement("button"); el.type = "button"; el.addEventListener("click", function () { copy(a.copy, a.what); }); }
        else { el = document.createElement("a"); el.href = a.href; if (a.blank) { el.target = "_blank"; el.rel = "noopener"; } }
        el.className = "btn " + (a.solid ? "btn-red" : "btn-ghost");
        el.innerHTML = '<i class="' + a.icon + '"></i> ' + a.label;
        box.appendChild(el);
      });
      dlg.showModal();
    }
    $$("[data-modal]").forEach(function (a) {
      a.addEventListener("click", function (e) { e.preventDefault(); open(a.dataset.modal); });
    });
    dlg.addEventListener("click", function (e) { if (e.target === dlg || e.target.closest("[data-close]")) dlg.close(); });
    dlg.addEventListener("close", function () { $("cmEmbed").innerHTML = ""; });
  })();
})();
