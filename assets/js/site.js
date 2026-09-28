/* Mayco Energy — interactions du site (sans dépendance). */
(function () {
  "use strict";

  var lang = (document.documentElement.lang || "fr").slice(0, 2);
  var reduceMotion = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  var T = {
    fr: {
      price: "PRIX SPOT · €/MWh",
      power: "PUISSANCE FROID · kW élec",
      temp: "TEMPÉRATURE D'AIR · °C",
      band: "plage autorisée",
      hour: "h",
      vsFixed: "vs consigne fixe",
      money: function (v) { return v + " €"; },
      pct: " %",
      same: "référence",
      inBand: "dans la plage",
      copied: "Adresse copiée",
      copy: "Copier",
      required: "Champ requis.",
      email: "Adresse e-mail invalide.",
      status: "Votre messagerie s'ouvre avec la demande pré-remplie : il ne reste qu'à l'envoyer. Si rien ne s'ouvre, écrivez-nous directement à contact@maycoenergy.com.",
      subject: "Demande de chiffrage",
      labels: { name: "Nom", email: "E-mail", company: "Société", site: "Type de site", size: "Puissance ou facture", message: "Message" }
    },
    en: {
      price: "SPOT PRICE · €/MWh",
      power: "COOLING LOAD · kW elec",
      temp: "AIR TEMPERATURE · °C",
      band: "allowed band",
      hour: "h",
      vsFixed: "vs fixed setpoint",
      money: function (v) { return "€" + v; },
      pct: "%",
      same: "baseline",
      inBand: "within band",
      copied: "Address copied",
      copy: "Copy",
      required: "Required field.",
      email: "Invalid email address.",
      status: "Your email app opens with the request pre-filled: just hit send. If nothing opens, write to us directly at contact@maycoenergy.com.",
      subject: "Savings estimate request",
      labels: { name: "Name", email: "Email", company: "Company", site: "Site type", size: "Load or bill", message: "Message" }
    }
  }[lang === "en" ? "en" : "fr"];

  var nf0 = new Intl.NumberFormat(lang === "en" ? "en-GB" : "fr-FR", { maximumFractionDigits: 0 });
  var nf1 = new Intl.NumberFormat(lang === "en" ? "en-GB" : "fr-FR", { minimumFractionDigits: 1, maximumFractionDigits: 1 });

  /* ---------- En-tête : ombre au défilement + menu mobile ---------- */

  var header = document.querySelector(".site-header");
  if (header) {
    var onScroll = function () { header.classList.toggle("is-scrolled", window.scrollY > 8); };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
  }

  var menuBtn = document.querySelector(".menu-btn");
  var nav = document.getElementById("nav");
  if (menuBtn && nav) {
    var setMenu = function (open) {
      menuBtn.setAttribute("aria-expanded", String(open));
      nav.classList.toggle("is-open", open);
    };
    menuBtn.addEventListener("click", function () {
      setMenu(menuBtn.getAttribute("aria-expanded") !== "true");
    });
    nav.addEventListener("click", function (e) {
      if (e.target.closest("a")) setMenu(false);
    });
    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape") setMenu(false);
    });
  }

  /* ---------- CTA collant mobile : visible après le hero, masqué sur le formulaire ---------- */

  var mobileCta = document.querySelector("[data-mobile-cta]");
  var hero = document.querySelector(".hero");
  var contact = document.getElementById("contact");
  if (mobileCta && hero && "IntersectionObserver" in window) {
    var heroVisible = true, contactVisible = false;
    var update = function () { mobileCta.classList.toggle("is-visible", !heroVisible && !contactVisible); };
    new IntersectionObserver(function (e) { heroVisible = e[0].isIntersecting; update(); }, { threshold: 0 }).observe(hero);
    if (contact) new IntersectionObserver(function (e) { contactVisible = e[0].isIntersecting; update(); }, { threshold: 0 }).observe(contact);
  }

  /* ---------- Synoptique : une journée de pilotage ----------
     Données illustratives. Profil « Mayco » obtenu par optimisation linéaire
     du coût d'achat sous contrainte de plage de température (+1,4 à +4 °C),
     de rampe et de bilan énergétique (pertes de pré-refroidissement ~3 %). */

  var DAY = {
    price: [64, 60, 57, 55, 56, 62, 79, 96, 90, 72, 52, 36, 24, 18, 21, 33, 55, 84, 108, 116, 101, 88, 76, 69],
    fixed: [1250, 1220, 1180, 1120, 1100, 1150, 1200, 1120, 1000, 900, 850, 820, 800, 800, 820, 880, 980, 1150, 1300, 1380, 1400, 1380, 1340, 1300],
    mayco: [1500, 1500, 1500, 1500, 1450, 1100, 750, 400, 300, 650, 880, 1090, 1440, 1500, 1500, 1150, 1010, 1190, 840, 660, 1010, 1360, 1500, 1500],
    tFixed: [3.0, 3.05, 2.95, 3.0, 3.05, 2.95, 3.0, 3.1, 3.05, 2.95, 3.0, 2.95, 3.0, 3.05, 3.0, 2.95, 3.0, 3.1, 3.05, 3.0, 2.95, 3.0, 3.05, 3.0],
    tMayco: [2.77, 2.52, 2.21, 1.84, 1.51, 1.6, 2.12, 2.92, 3.7, 4.0, 4.0, 3.74, 3.08, 2.36, 1.66, 1.4, 1.4, 1.4, 1.93, 2.74, 3.21, 3.27, 3.15, 2.98],
    band: [1.4, 4.0],
    pMax: 1500,
    priceMax: 130,
    expensive: 85,
    cheap: 50
  };

  function tier(p) {
    if (p >= DAY.expensive) return "heat";
    if (p < DAY.cheap) return "cold";
    return "amber";
  }

  function stats(load, temp) {
    var cost = 0, total = 0, peak = 0;
    for (var i = 0; i < 24; i++) {
      cost += DAY.price[i] * load[i] / 1000;
      total += load[i];
      if (DAY.price[i] >= DAY.expensive) peak += load[i];
    }
    return {
      cost: cost,
      peakShare: peak / total,
      tMin: Math.min.apply(null, temp),
      tMax: Math.max.apply(null, temp)
    };
  }

  var SVGNS = "http://www.w3.org/2000/svg";
  function el(name, attrs, parent) {
    var n = document.createElementNS(SVGNS, name);
    for (var k in attrs) n.setAttribute(k, attrs[k]);
    if (parent) parent.appendChild(n);
    return n;
  }
  function fmtTemp(v) { return (v > 0 ? "+" : "") + nf1.format(v); }

  var chart = document.querySelector("[data-synoptic]");
  if (chart) initChart(chart);

  function initChart(root) {
    var plot = root.querySelector("[data-plot]");
    var buttons = root.querySelectorAll("[data-mode]");
    var out = {
      cost: root.querySelector("[data-out='cost']"),
      costD: root.querySelector("[data-out='cost-delta']"),
      peak: root.querySelector("[data-out='peak']"),
      peakD: root.querySelector("[data-out='peak-delta']"),
      temp: root.querySelector("[data-out='temp']"),
      tempD: root.querySelector("[data-out='temp-delta']")
    };
    var base = stats(DAY.fixed, DAY.tFixed);
    var state = { mode: "mayco", k: 1 }; // k : 0 = consigne fixe, 1 = Mayco
    var geo = null;
    var raf = null;

    function mix(a, b, k) {
      var r = new Array(a.length);
      for (var i = 0; i < a.length; i++) r[i] = a[i] + (b[i] - a[i]) * k;
      return r;
    }

    function build() {
      var w = Math.max(280, Math.round(plot.clientWidth - 12));
      var narrow = w < 560;
      var h = narrow ? 300 : 340;
      var m = { l: narrow ? 34 : 42, r: 10, t: 18, b: 24 };
      var iw = w - m.l - m.r;
      var ih = h - m.t - m.b;
      var gap = narrow ? 22 : 26;
      var hp = Math.round(ih * 0.27);
      var ht = Math.round(ih * 0.2);
      var hb = ih - hp - ht - gap * 2;
      var y0 = m.t, y1 = y0 + hp + gap, y2 = y1 + hb + gap;
      var bw = iw / 24;

      plot.textContent = "";
      var svg = el("svg", { viewBox: "0 0 " + w + " " + h, width: w, height: h, role: "presentation", focusable: "false" }, plot);

      var defs = el("defs", {}, svg);
      var grad = el("linearGradient", { id: "gPrice", x1: "0", y1: "0", x2: "0", y2: "1" }, defs);
      el("stop", { offset: "0", "stop-color": "#ff6b35", "stop-opacity": "0.34" }, grad);
      el("stop", { offset: "0.55", "stop-color": "#f5a524", "stop-opacity": "0.14" }, grad);
      el("stop", { offset: "1", "stop-color": "#3b7bf0", "stop-opacity": "0.06" }, grad);

      function x(i) { return m.l + i * bw; }
      function yPrice(v) { return y0 + hp - (v / DAY.priceMax) * hp; }
      function yPow(v) { return y1 + hb - (v / DAY.pMax) * hb; }
      var tLo = 0.5, tHi = 5;
      function yTemp(v) { return y2 + ht - ((v - tLo) / (tHi - tLo)) * ht; }

      // Titres de panneaux
      el("text", { x: m.l, y: y0 - 6, class: "ch-title" }, svg).textContent = T.price;
      el("text", { x: m.l, y: y1 - 8, class: "ch-title" }, svg).textContent = T.power;
      el("text", { x: m.l, y: y2 - 8, class: "ch-title" }, svg).textContent = T.temp;

      // Grilles + graduations
      [0, 60, 120].forEach(function (v) {
        var yy = yPrice(v);
        el("line", { x1: m.l, x2: m.l + iw, y1: yy, y2: yy, class: "ch-grid" }, svg);
        el("text", { x: m.l - 8, y: yy + 4, "text-anchor": "end", class: "ch-axis" }, svg).textContent = v;
      });
      [0, 750, 1500].forEach(function (v) {
        var yy = yPow(v);
        el("line", { x1: m.l, x2: m.l + iw, y1: yy, y2: yy, class: "ch-grid" }, svg);
        el("text", { x: m.l - 8, y: yy + 4, "text-anchor": "end", class: "ch-axis" }, svg).textContent = v === 1500 ? "1,5k" : (v === 750 ? "750" : "0");
      });

      // Prix : aire + courbe + points colorés
      var pPts = DAY.price.map(function (v, i) { return [x(i) + bw / 2, yPrice(v)]; });
      var d = "M" + pPts.map(function (p) { return p[0].toFixed(1) + " " + p[1].toFixed(1); }).join(" L");
      el("path", { d: d + " L" + pPts[23][0].toFixed(1) + " " + (y0 + hp) + " L" + pPts[0][0].toFixed(1) + " " + (y0 + hp) + " Z", class: "ch-price-area", fill: "url(#gPrice)" }, svg);
      el("path", { d: d, class: "ch-price-line" }, svg);
      pPts.forEach(function (p, i) {
        el("circle", { cx: p[0], cy: p[1], r: narrow ? 2.6 : 3.2, class: "ch-dot-" + tier(DAY.price[i]) }, svg);
      });

      // Bande de température
      var bandTop = yTemp(DAY.band[1]), bandBot = yTemp(DAY.band[0]);
      el("rect", { x: m.l, y: bandTop, width: iw, height: bandBot - bandTop, class: "ch-band" }, svg);
      el("line", { x1: m.l, x2: m.l + iw, y1: bandTop, y2: bandTop, class: "ch-band-edge" }, svg);
      el("line", { x1: m.l, x2: m.l + iw, y1: bandBot, y2: bandBot, class: "ch-band-edge" }, svg);
      el("text", { x: m.l - 8, y: bandTop + 4, "text-anchor": "end", class: "ch-axis" }, svg).textContent = "+4";
      el("text", { x: m.l - 8, y: bandBot + 4, "text-anchor": "end", class: "ch-axis" }, svg).textContent = fmtTemp(DAY.band[0]).replace(",0", "");
      el("text", { x: m.l + iw - 4, y: bandTop - 5, "text-anchor": "end", class: "ch-title" }, svg).textContent = T.band;

      // Axe horaire
      [0, 6, 12, 18, 24].forEach(function (hh) {
        var xx = m.l + hh * bw;
        el("line", { x1: xx, x2: xx, y1: y0 + hp, y2: y0 + hp + 4, class: "ch-grid" }, svg);
        el("text", { x: xx, y: h - 6, "text-anchor": hh === 0 ? "start" : (hh === 24 ? "end" : "middle"), class: "ch-axis" }, svg).textContent = hh + T.hour;
      });

      // Barres (mises à jour à chaque image) + fantômes
      var gGhost = el("g", {}, svg);
      var gBars = el("g", {}, svg);
      var bars = [], ghosts = [];
      var inner = Math.max(3, bw * 0.64);
      for (var i = 0; i < 24; i++) {
        ghosts.push(el("rect", { x: x(i) + (bw - inner) / 2, width: inner, class: "ch-ghost" }, gGhost));
        bars.push(el("rect", { x: x(i) + (bw - inner) / 2, width: inner, rx: 1.5, class: "ch-bar-" + tier(DAY.price[i]) }, gBars));
      }
      var tGhost = el("path", { class: "ch-temp-ghost" }, svg);
      var tLine = el("path", { class: "ch-temp" }, svg);

      geo = { bars: bars, ghosts: ghosts, tGhost: tGhost, tLine: tLine, x: x, bw: bw, yPow: yPow, yTemp: yTemp, base: y1 + hb };
      paint();
    }

    function tempPath(arr) {
      return "M" + arr.map(function (v, i) {
        return (geo.x(i) + geo.bw / 2).toFixed(1) + " " + geo.yTemp(v).toFixed(1);
      }).join(" L");
    }

    function paint() {
      if (!geo) return;
      var load = mix(DAY.fixed, DAY.mayco, state.k);
      var temp = mix(DAY.tFixed, DAY.tMayco, state.k);
      var ghost = state.mode === "mayco" ? DAY.fixed : DAY.mayco;
      var ghostT = state.mode === "mayco" ? DAY.tFixed : DAY.tMayco;
      for (var i = 0; i < 24; i++) {
        var yb = geo.yPow(load[i]);
        geo.bars[i].setAttribute("y", yb.toFixed(1));
        geo.bars[i].setAttribute("height", Math.max(0, geo.base - yb).toFixed(1));
        var yg = geo.yPow(ghost[i]);
        geo.ghosts[i].setAttribute("y", yg.toFixed(1));
        geo.ghosts[i].setAttribute("height", Math.max(0, geo.base - yg).toFixed(1));
      }
      geo.tLine.setAttribute("d", tempPath(temp));
      geo.tGhost.setAttribute("d", tempPath(ghostT));
    }

    function readouts() {
      var s = state.mode === "mayco" ? stats(DAY.mayco, DAY.tMayco) : base;
      out.cost.textContent = T.money(nf0.format(Math.round(s.cost / 10) * 10));
      out.peak.textContent = nf0.format(Math.round(s.peakShare * 100)) + T.pct;
      out.temp.textContent = fmtTemp(s.tMin) + " → " + fmtTemp(s.tMax) + " °C";
      if (state.mode === "mayco") {
        var dc = (s.cost / base.cost - 1) * 100;
        out.costD.textContent = "−" + nf0.format(Math.abs(Math.round(dc))) + T.pct + " " + T.vsFixed;
        out.peakD.textContent = "−" + nf0.format(Math.round((base.peakShare - s.peakShare) * 100)) + " pts " + T.vsFixed;
        out.tempD.textContent = T.inBand;
        out.costD.classList.remove("is-flat");
        out.peakD.classList.remove("is-flat");
        out.tempD.classList.remove("is-flat");
      } else {
        out.costD.textContent = T.same;
        out.peakD.textContent = T.same;
        out.tempD.textContent = T.inBand;
        out.costD.classList.add("is-flat");
        out.peakD.classList.add("is-flat");
        out.tempD.classList.add("is-flat");
      }
    }

    function animateTo(target, duration) {
      if (raf) cancelAnimationFrame(raf);
      var from = state.k;
      if (reduceMotion || !duration) { state.k = target; paint(); return; }
      var t0 = null;
      function step(ts) {
        if (t0 === null) t0 = ts;
        var p = Math.min(1, (ts - t0) / duration);
        var e = p < 0.5 ? 4 * p * p * p : 1 - Math.pow(-2 * p + 2, 3) / 2;
        state.k = from + (target - from) * e;
        paint();
        if (p < 1) raf = requestAnimationFrame(step);
      }
      raf = requestAnimationFrame(step);
    }

    function setMode(mode, animate) {
      state.mode = mode;
      buttons.forEach(function (b) { b.setAttribute("aria-pressed", String(b.getAttribute("data-mode") === mode)); });
      readouts();
      animateTo(mode === "mayco" ? 1 : 0, animate ? 900 : 0);
    }

    buttons.forEach(function (b) {
      b.addEventListener("click", function () { setMode(b.getAttribute("data-mode"), true); });
    });

    build();
    setMode("mayco", false);

    // Un seul moment animé : à l'arrivée du graphique à l'écran, la consommation
    // glisse de la consigne fixe vers les heures bon marché.
    if (!reduceMotion && "IntersectionObserver" in window) {
      var played = false;
      var io = new IntersectionObserver(function (entries) {
        entries.forEach(function (en) {
          if (en.isIntersecting && !played) {
            played = true;
            io.disconnect();
            state.k = 0; paint();
            setTimeout(function () { if (state.mode === "mayco") animateTo(1, 1400); }, 250);
          }
        });
      }, { threshold: 0.45 });
      io.observe(plot);
    }

    var lastW = plot.clientWidth;
    var ro = "ResizeObserver" in window ? new ResizeObserver(function () {
      if (Math.abs(plot.clientWidth - lastW) > 2) { lastW = plot.clientWidth; build(); }
    }) : null;
    if (ro) ro.observe(plot); else window.addEventListener("resize", build);
  }

  /* ---------- Copier l'adresse ---------- */

  document.querySelectorAll("[data-copy]").forEach(function (btn) {
    btn.addEventListener("click", function () {
      var text = btn.getAttribute("data-copy");
      var label = btn.querySelector("span");
      var done = function () {
        if (label) { label.textContent = T.copied; setTimeout(function () { label.textContent = T.copy; }, 2200); }
      };
      var fallback = function () {
        var a = document.querySelector("[data-mail]");
        if (!a) return;
        var r = document.createRange();
        r.selectNodeContents(a);
        var s = window.getSelection();
        s.removeAllRanges();
        s.addRange(r);
      };
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(text).then(done, fallback);
      } else {
        fallback();
      }
    });
  });

  /* ---------- Formulaire : compose un e-mail pré-rempli ---------- */

  var form = document.querySelector("[data-contact-form]");
  if (form) {
    var status = form.querySelector("[data-status]");
    var isEmail = function (v) { return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v); };

    var setError = function (input, msg) {
      var err = document.getElementById(input.id + "-err");
      input.setAttribute("aria-invalid", msg ? "true" : "false");
      if (err) err.textContent = msg || "";
    };

    form.addEventListener("submit", function (e) {
      e.preventDefault();
      var ok = true, firstBad = null;
      form.querySelectorAll("[required]").forEach(function (input) {
        var v = input.value.trim();
        var msg = "";
        if (!v) msg = T.required;
        else if (input.type === "email" && !isEmail(v)) msg = T.email;
        setError(input, msg);
        if (msg) { ok = false; if (!firstBad) firstBad = input; }
      });
      if (!ok) { firstBad.focus(); return; }

      var get = function (id) { var n = document.getElementById(id); return n ? n.value.trim() : ""; };
      var siteSel = document.getElementById("f-site");
      var siteLabel = siteSel && siteSel.value ? siteSel.options[siteSel.selectedIndex].text : "";
      var L = T.labels;
      var lines = [
        L.name + " : " + get("f-name"),
        L.email + " : " + get("f-email"),
        L.company + " : " + get("f-company"),
        L.site + " : " + (siteLabel || "-"),
        L.size + " : " + (get("f-size") || "-"),
        "",
        get("f-message")
      ];
      var subject = T.subject + " · " + get("f-company");
      var href = "mailto:contact@maycoenergy.com?subject=" + encodeURIComponent(subject) + "&body=" + encodeURIComponent(lines.join("\n"));
      if (status) { status.textContent = T.status; status.hidden = false; }
      window.location.href = href;
    });

    form.querySelectorAll("input, select, textarea").forEach(function (input) {
      input.addEventListener("input", function () {
        if (input.getAttribute("aria-invalid") === "true") setError(input, "");
      });
    });
  }
})();
