/* =========================================================
   Piiiep – Funktionen
   ========================================================= */
(function () {
  "use strict";

  var CONFIG = {
    // Kostenloser Schlüssel von https://web3forms.com (E-Mail des Kunden eintragen)
    // Web-App-URL deines Google-Apps-Scripts (Auftragsliste + Kalender), siehe auftragsverwaltung/EINRICHTUNG.md
    auftragsUrl: "HIER-WEB-APP-URL-EINTRAGEN",
    // Alternative ohne Kalender: nur E-Mail über https://web3forms.com
    web3formsKey: "HIER-WEB3FORMS-SCHLUESSEL-EINTRAGEN",
    // Einsatzzeiten der Techniker: [Start, Ende], null = kein Einsatz. 0 = Sonntag … 6 = Samstag
    hours: { 1: [8, 20], 2: [8, 20], 3: [8, 20], 4: [8, 20], 5: [8, 20], 6: [9, 18], 0: null },
    // Berliner PLZ-Bereich (plus optionale Extra-PLZ im Umland)
    plzExtra: ["14467", "14469", "14471", "14473", "14480", "14482", "15366", "15370", "16548", "16540"]
  };

  var P = window.PREISE;
  var reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var body = document.body;
  var euro = function (n) { return n.toLocaleString("de-DE") + " €"; };

  /* ---------- Herzmonitor im Hintergrund ----------
     Zwei Kurven laufen wie auf einem echten Monitor von links nach rechts:
     oben EKG (grün), unten SpO2-Pulskurve (cyan). Vor dem Schreibstrahl
     wird eine kleine Lücke gelöscht. 72 Schläge pro Minute. */
  (function monitor() {
    var cv = document.getElementById("monitor");
    if (!cv || !cv.getContext) return;
    var ctx = cv.getContext("2d");
    var css = getComputedStyle(document.documentElement);
    var GREEN = css.getPropertyValue("--accent").trim() || "#2bff88";
    var CYAN = css.getPropertyValue("--spo2").trim() || "#35d8ff";
    var BEAT = 60 / 72;                        // Sekunden pro Herzschlag
    function g(t, m, w) { return Math.exp(-Math.pow((t - m) / w, 2)); }
    function ekg(t) {                           // t = 0…1 innerhalb eines Schlags
      return 0.12 * g(t, 0.16, 0.035) - 0.14 * g(t, 0.355, 0.01) + 1.0 * g(t, 0.38, 0.012)
           - 0.28 * g(t, 0.405, 0.012) + 0.28 * g(t, 0.62, 0.06);
    }
    function pleth(t) {
      t = (t + 0.78) % 1;                       // Puls kommt etwas nach dem EKG-Zacken
      return 0.95 * g(t, 0.22, 0.09) + 0.35 * g(t, 0.47, 0.07);
    }
    var W, H, dpr, x, prev, speed, lanes;
    function setup() {
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      W = window.innerWidth; H = window.innerHeight;
      cv.width = W * dpr; cv.height = H * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.lineJoin = "round"; ctx.lineCap = "round";
      speed = W < 760 ? 110 : 170;               // Pixel pro Sekunde
      lanes = [
        { fn: ekg, y: H * 0.36, amp: Math.min(H * 0.16, 130), color: GREEN },
        { fn: pleth, y: H * 0.78, amp: Math.min(H * 0.08, 60), color: CYAN }
      ];
      x = 0; prev = null;
    }
    function yAt(l, time) { return l.y - l.fn((time / BEAT) % 1) * l.amp; }
    function stroke(l, x0, y0, x1, y1) {
      ctx.strokeStyle = l.color;
      ctx.globalAlpha = 0.18; ctx.lineWidth = 6;  // Leuchten
      ctx.beginPath(); ctx.moveTo(x0, y0); ctx.lineTo(x1, y1); ctx.stroke();
      ctx.globalAlpha = 1; ctx.lineWidth = 1.8;
      ctx.beginPath(); ctx.moveTo(x0, y0); ctx.lineTo(x1, y1); ctx.stroke();
    }
    setup();
    if (reduce) {                                 // ohne Bewegung: ein stehendes Bild
      lanes.forEach(function (l) {
        for (var px = 0; px < W; px += 2) stroke(l, px, yAt(l, px / speed), px + 2, yAt(l, (px + 2) / speed));
      });
      return;
    }
    var clock = 0, last = null;
    function frame(now) {
      if (last !== null) {
        var dt = Math.min(0.05, (now - last) / 1000);
        var steps = Math.max(1, Math.ceil(dt * speed / 2));
        for (var i = 0; i < steps; i++) {
          clock += dt / steps;
          var nx = x + (dt / steps) * speed;
          if (nx >= W) { nx = 0; prev = null; }
          ctx.clearRect(nx, 0, 28, H);             // Lücke vor dem Schreibstrahl
          var pts = lanes.map(function (l) { return yAt(l, clock); });
          if (prev) lanes.forEach(function (l, k) { stroke(l, x, prev[k], nx, pts[k]); });
          x = nx; prev = pts;
        }
      }
      last = now;
      requestAnimationFrame(frame);
    }
    requestAnimationFrame(frame);
    var rt;
    window.addEventListener("resize", function () {
      clearTimeout(rt);
      rt = setTimeout(function () { if (window.innerWidth !== W || Math.abs(window.innerHeight - H) > 120) setup(); }, 200);
    });
    document.addEventListener("visibilitychange", function () { last = null; });
  })();

  /* ---------- Navigation ---------- */
  var toggle = document.querySelector(".nav-toggle");
  var nav = document.getElementById("nav");
  function closeNav() { body.classList.remove("nav-open"); if (toggle) toggle.setAttribute("aria-expanded", "false"); }
  if (toggle && nav) {
    toggle.addEventListener("click", function () {
      var open = body.classList.toggle("nav-open");
      toggle.setAttribute("aria-expanded", open ? "true" : "false");
    });
    nav.addEventListener("click", function (e) { if (e.target.closest("a")) closeNav(); });
    document.addEventListener("keydown", function (e) { if (e.key === "Escape") closeNav(); });
  }

  /* ---------- Header, Fortschrittsbalken ---------- */
  var header = document.querySelector(".header");
  var bar = document.querySelector(".progress");
  function onScrollBasic() {
    var y = window.scrollY;
    if (header) header.classList.toggle("is-scrolled", y > 10);
    if (bar) {
      var max = document.documentElement.scrollHeight - window.innerHeight;
      bar.style.transform = "scaleX(" + (max > 0 ? y / max : 0) + ")";
    }
  }

  /* ---------- Einblend-Animationen ---------- */
  if (!reduce && "IntersectionObserver" in window) {
    document.documentElement.classList.add("js-anim");
    var rio = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (en.isIntersecting) { en.target.classList.add("in"); rio.unobserve(en.target); }
      });
    }, { threshold: 0.12, rootMargin: "0px 0px -6% 0px" });
    document.querySelectorAll(".reveal, .reveal-scale").forEach(function (el) { rio.observe(el); });
  }

  /* ---------- Aktiver Menüpunkt ---------- */
  var links = Array.prototype.slice.call(document.querySelectorAll('.nav ul a[href^="#"]'));
  if ("IntersectionObserver" in window) {
    var map = {};
    links.forEach(function (a) { map[a.getAttribute("href").slice(1)] = a; });
    var nio = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (en.isIntersecting && map[en.target.id]) {
          links.forEach(function (a) { a.classList.remove("is-active"); });
          map[en.target.id].classList.add("is-active");
        }
      });
    }, { rootMargin: "-45% 0px -50% 0px" });
    Object.keys(map).forEach(function (id) { var s = document.getElementById(id); if (s) nio.observe(s); });
  }

  /* ---------- Günstigster Preis pro Reparatur ---------- */
  function minPrice(repId) {
    var idx = P.reparaturen.findIndex(function (r) { return r.id === repId; });
    var min = Infinity;
    Object.keys(P.marken).forEach(function (b) {
      Object.keys(P.marken[b]).forEach(function (m) {
        var v = P.marken[b][m][idx];
        if (v != null && v < min) min = v;
      });
    });
    return min;
  }
  document.querySelectorAll("[data-min]").forEach(function (el) { el.textContent = "ab " + euro(minPrice(el.dataset.min)); });
  document.querySelectorAll("[data-garantie]").forEach(function (el) { el.textContent = P.garantie; });

  /* ---------- Explosionszeichnung ---------- */
  var explode = document.querySelector(".explode");
  var layers = explode ? explode.querySelectorAll(".layer") : [];
  var parts = explode ? explode.querySelectorAll(".parts li") : [];
  var stack = explode ? explode.querySelector(".stack") : null;
  function onScrollExplode() {
    if (!explode) return;
    var r = explode.getBoundingClientRect();
    var total = r.height - window.innerHeight;
    var p = Math.min(1, Math.max(0, -r.top / (total || 1)));
    var open = reduce ? 1 : Math.min(1, p / 0.35);
    var e = 1 - Math.pow(1 - open, 3);
    var spread = window.innerWidth < 900 ? 38 : 64;
    layers.forEach(function (l) {
      l.style.setProperty("--z", (parseFloat(l.dataset.i) * spread * e) + "px");
    });
    if (stack && !reduce) stack.style.transform = "rotateX(" + (58 - 8 * p) + "deg) rotateZ(" + (-38 + 20 * p) + "deg)";
    var active = p < 0.3 ? -1 : Math.min(parts.length - 1, Math.floor((p - 0.3) / 0.7 * parts.length));
    parts.forEach(function (li, i) { li.classList.toggle("on", i === active); });
    var target = active >= 0 ? parts[active].dataset.layer : "";
    layers.forEach(function (l) { l.classList.toggle("on", target && target.split(" ").indexOf(l.dataset.name) > -1); });
  }

  var ticking = false;
  window.addEventListener("scroll", function () {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(function () { onScrollBasic(); onScrollExplode(); ticking = false; });
  }, { passive: true });
  window.addEventListener("resize", onScrollExplode);
  onScrollBasic(); onScrollExplode();

  /* ---------- Preisrechner ---------- */
  var state = { brand: null, model: null, reps: [], express: false };
  var brandsEl = document.getElementById("brands");
  var modelSel = document.getElementById("model");
  var repsEl = document.getElementById("repairs");
  var expressEl = document.getElementById("express");
  var sumDevice = document.getElementById("sum-device");
  var sumLines = document.getElementById("sum-lines");
  var sumTotal = document.getElementById("sum-total");
  var sumTime = document.getElementById("sum-time");
  var bookBtn = document.getElementById("to-booking");
  var miniPrice = document.querySelector(".price-mini");
  var shown = 0;

  if (brandsEl) {
    Object.keys(P.marken).forEach(function (b) {
      var btn = document.createElement("button");
      btn.type = "button"; btn.className = "brand-btn"; btn.textContent = b;
      btn.setAttribute("aria-pressed", "false");
      btn.addEventListener("click", function () { selectBrand(b); });
      brandsEl.appendChild(btn);
    });
    document.getElementById("express-price").textContent = "+" + euro(P.express);
    var b0 = Object.keys(P.marken)[0];
    selectBrand(b0, P.marken[b0]["iPhone 15"] ? "iPhone 15" : undefined, ["display"]);
  }

  function selectBrand(b, model, reps) {
    state.brand = b;
    brandsEl.querySelectorAll(".brand-btn").forEach(function (x) { x.setAttribute("aria-pressed", x.textContent === b ? "true" : "false"); });
    modelSel.innerHTML = "";
    Object.keys(P.marken[b]).forEach(function (m) {
      var o = document.createElement("option"); o.value = m; o.textContent = m; modelSel.appendChild(o);
    });
    var o2 = document.createElement("option"); o2.value = "__other"; o2.textContent = "Anderes Modell – Preis auf Anfrage"; modelSel.appendChild(o2);
    modelSel.value = model || Object.keys(P.marken[b])[0];
    selectModel(modelSel.value, reps);
  }

  function selectModel(m, reps) {
    state.model = m;
    if (reps) state.reps = reps;
    renderRepairs();
    update();
  }

  if (modelSel) modelSel.addEventListener("change", function () { selectModel(modelSel.value); });
  if (expressEl) expressEl.addEventListener("change", function () { state.express = expressEl.checked; update(); });

  function priceRow() { return state.model && state.model !== "__other" ? P.marken[state.brand][state.model] : null; }

  function renderRepairs() {
    var row = priceRow();
    repsEl.innerHTML = "";
    if (!row) {
      state.reps = [];
      repsEl.innerHTML = '<p class="calc-empty">Für dieses Modell nennen wir Ihnen den Preis gern persönlich. Schreiben Sie uns kurz über das Formular unten oder per WhatsApp.</p>';
      return;
    }
    state.reps = state.reps.filter(function (id) { var i = P.reparaturen.findIndex(function (r) { return r.id === id; }); return row[i] != null; });
    P.reparaturen.forEach(function (r, i) {
      if (row[i] == null) return;
      var lab = document.createElement("label");
      lab.className = "repair";
      lab.innerHTML = '<input type="checkbox" value="' + r.id + '"' + (state.reps.indexOf(r.id) > -1 ? " checked" : "") + '>' +
        "<b>" + r.name + '</b><span class="p">' + euro(row[i]) + "</span><small>" + r.info + " · ca. " + r.dauer + " Min.</small>";
      lab.querySelector("input").addEventListener("change", function (e) {
        if (e.target.checked) state.reps.push(r.id);
        else state.reps = state.reps.filter(function (x) { return x !== r.id; });
        update();
      });
      repsEl.appendChild(lab);
    });
  }

  function calc() {
    var row = priceRow();
    var items = [];
    if (row) state.reps.forEach(function (id) {
      var i = P.reparaturen.findIndex(function (r) { return r.id === id; });
      items.push({ name: P.reparaturen[i].name, price: row[i], dauer: P.reparaturen[i].dauer });
    });
    var sub = items.reduce(function (s, x) { return s + x.price; }, 0);
    var disc = items.length >= 2 ? Math.round(sub * P.kombiRabatt) : 0;
    var exp = state.express && items.length ? P.express : 0;
    var mins = items.reduce(function (s, x) { return s + x.dauer; }, 0);
    return { items: items, sub: sub, disc: disc, exp: exp, total: sub - disc + exp, mins: mins };
  }

  function countTo(target) {
    if (reduce) { sumTotal.textContent = euro(target); shown = target; return; }
    var start = shown, t0 = performance.now(), dur = 500;
    function step(t) {
      var k = Math.min(1, (t - t0) / dur);
      var v = Math.round(start + (target - start) * (1 - Math.pow(1 - k, 3)));
      sumTotal.textContent = euro(v);
      if (k < 1) requestAnimationFrame(step); else shown = target;
    }
    requestAnimationFrame(step);
  }

  function update() {
    var c = calc();
    sumDevice.textContent = state.model === "__other" ? state.brand + " – anderes Modell" : state.model;
    var html = "";
    if (!c.items.length) html += '<li class="muted"><span>Noch keine Reparatur gewählt</span><span></span></li>';
    c.items.forEach(function (x) { html += "<li><span>" + x.name + "</span><span>" + euro(x.price) + "</span></li>"; });
    if (c.disc) html += '<li class="disc"><span>Kombi-Rabatt ' + Math.round(P.kombiRabatt * 100) + ' %</span><span>−' + euro(c.disc) + "</span></li>";
    if (c.exp) html += "<li><span>Express-Termin</span><span>" + euro(c.exp) + "</span></li>";
    html += '<li class="muted"><span>Anfahrt in Berlin</span><span>0 €</span></li>';
    sumLines.innerHTML = html;
    countTo(c.total);
    sumTime.textContent = c.mins ? "ca. " + c.mins + " Min. vor Ort" : "Dauer je nach Reparatur";
    bookBtn.disabled = !c.items.length;
    if (miniPrice) miniPrice.textContent = c.items.length ? euro(c.total) : "Preis";
  }

  /* Übernahme in das Buchungsformular */
  var booked = document.getElementById("booked");
  function fillBooking() {
    var c = calc();
    if (!c.items.length || !booked) return;
    var names = c.items.map(function (x) { return x.name; }).join(", ") + (c.exp ? " + Express" : "");
    booked.classList.remove("empty");
    booked.innerHTML = "<div><small>Ihr Auftrag</small><b>" + sumDevice.textContent + " · " + names + '</b></div><span class="mono">' + euro(c.total) + '</span><a href="#preise">ändern</a>';
    document.getElementById("f-geraet").value = sumDevice.textContent;
    document.getElementById("f-reparatur").value = names;
    document.getElementById("f-preis").value = euro(c.total);
  }
  if (bookBtn) bookBtn.addEventListener("click", function () {
    fillBooking();
    document.getElementById("buchen").scrollIntoView({ behavior: reduce ? "auto" : "smooth" });
    setTimeout(function () { var f = document.getElementById("f-name"); if (f) f.focus({ preventScroll: true }); }, 700);
  });

  /* ---------- PLZ-Check ---------- */
  function isBerlin(plz) {
    if (!/^\d{5}$/.test(plz)) return null;
    var n = +plz;
    return (n >= 10115 && n <= 14199) || CONFIG.plzExtra.indexOf(plz) > -1;
  }
  var plzIn = document.getElementById("plz");
  var plzMsg = document.getElementById("plz-msg");
  if (plzIn) plzIn.addEventListener("input", function () {
    plzIn.value = plzIn.value.replace(/\D/g, "").slice(0, 5);
    var r = isBerlin(plzIn.value);
    plzMsg.className = "plz-msg";
    if (r === null) { plzMsg.textContent = plzIn.value.length ? "Bitte 5-stellige PLZ eingeben" : ""; return; }
    if (r) { plzMsg.classList.add("ok"); plzMsg.textContent = "✓ " + plzIn.value + " liegt in unserem Einsatzgebiet. Anfahrt kostenlos."; }
    else { plzMsg.classList.add("no"); plzMsg.textContent = "Außerhalb unseres Gebiets. Fragen Sie trotzdem an, oft geht es gegen kleinen Aufpreis."; }
  });

  /* ---------- Einsatzzeiten-Status ---------- */
  var live = document.getElementById("live-state");
  if (live) {
    var now = new Date(), h = CONFIG.hours[now.getDay()], hr = now.getHours();
    if (h && hr >= h[0] && hr < h[1]) live.innerHTML = "Techniker heute bis <b>" + h[1] + ":00 Uhr</b> im Einsatz";
    else live.innerHTML = "Jetzt online buchen · <b>Termin ab morgen früh</b>";
  }

  /* ---------- Datum: frühestens heute ---------- */
  var dateIn = document.getElementById("f-date");
  if (dateIn) {
    var d = new Date(); d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
    dateIn.min = d.toISOString().slice(0, 10);
  }

  /* ---------- Jahr ---------- */
  document.querySelectorAll("[data-year]").forEach(function (el) { el.textContent = new Date().getFullYear(); });

  /* ---------- Buchungsformular (Web3Forms) ---------- */
  var form = document.getElementById("booking-form");
  if (form) {
    var status = form.querySelector(".form-status");
    var button = form.querySelector('button[type="submit"]');
    form.querySelector('input[name="access_key"]').value = CONFIG.web3formsKey;
    var fplz = document.getElementById("f-plz");
    fplz.addEventListener("input", function () {
      fplz.value = fplz.value.replace(/\D/g, "").slice(0, 5);
      fplz.setCustomValidity(fplz.value.length === 5 && isBerlin(fplz.value) === false ? "Diese PLZ liegt außerhalb Berlins. Bitte kurz anrufen." : "");
    });

    form.addEventListener("submit", function (e) {
      e.preventDefault();
      status.className = "form-status"; status.textContent = "";
      if (!form.checkValidity()) { form.reportValidity(); return; }
      if (form.querySelector('input[name="botcheck"]').checked) return;
      if (!document.getElementById("f-reparatur").value) fillBooking();

      var label = button.innerHTML;
      button.disabled = true; button.textContent = "Wird gesendet …";
      function done(ok, msg) {
        button.disabled = false; button.innerHTML = label;
        status.classList.add(ok ? "ok" : "err"); status.textContent = msg;
        if (ok) form.reset();
      }
      var data = Object.fromEntries(new FormData(form));
      delete data.botcheck;
      var okMsg = "Danke! Ihre Buchung ist da. Wir bestätigen den Termin in Kürze per Anruf oder SMS.";
      var errMsg = "Senden hat nicht geklappt. Bitte per WhatsApp oder Telefon buchen.";

      // 1) Eigene Auftragsliste + Kalender (Google Apps Script, siehe auftragsverwaltung/EINRICHTUNG.md)
      if (CONFIG.auftragsUrl && CONFIG.auftragsUrl.indexOf("HIER-") !== 0) {
        delete data.access_key;
        fetch(CONFIG.auftragsUrl, { method: "POST", body: new URLSearchParams(data) })
          .then(function (r) { return r.json(); })
          .then(function (res) {
            if (res.success) done(true, okMsg + (res.auftrag ? " Ihre Auftragsnummer: " + res.auftrag : ""));
            else if (res.ausgebucht) done(false, "Dieses Zeitfenster ist leider schon ausgebucht. Bitte wählen Sie ein anderes.");
            else done(false, errMsg);
          })
          .catch(function () { done(false, "Keine Verbindung. Bitte per WhatsApp oder Telefon buchen."); });
        return;
      }
      // 2) Nur E-Mail (Web3Forms)
      if (CONFIG.web3formsKey.indexOf("HIER-") !== 0) {
        fetch("https://api.web3forms.com/submit", {
          method: "POST",
          headers: { "Content-Type": "application/json", Accept: "application/json" },
          body: JSON.stringify(data)
        }).then(function (r) { return r.json(); }).then(function (res) {
          done(!!res.success, res.success ? okMsg : errMsg);
        }).catch(function () { done(false, "Keine Verbindung. Bitte per WhatsApp oder Telefon buchen."); });
        return;
      }
      // 3) Vorschau ohne Einrichtung
      setTimeout(function () { done(true, "Vorschau: Buchung funktioniert. Nach der Einrichtung landet sie in deiner Auftragsliste und im Kalender."); }, 700);
    });
  }
})();
