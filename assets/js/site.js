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
      labels: { name: "Nom", email: "E-mail", company: "Société", site: "Type de site", size: "Puissance ou facture", message: "Message" },
      hourRange: function (i) { return i + "h – " + (i + 1) + "h"; },
      clock: function (h, m) { return (h < 10 ? "0" : "") + h + ":" + (m < 10 ? "0" : "") + m; },
      tierWord: { cold: "Prix bas", amber: "Prix moyen", heat: "Prix élevé" },
      action: { charge: "on produit plus et on stocke le froid", draw: "on puise dans le stockage", follow: "on suit le besoin" },
      mwh: "/MWh",
      bigMoney: function (m, k) { return m ? m + " M€" : k + " k€"; },
      perYear: "/an",
      gwh: " GWh/an"
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
      labels: { name: "Name", email: "Email", company: "Company", site: "Site type", size: "Load or bill", message: "Message" },
      hourRange: function (i) { return (i < 10 ? "0" : "") + i + ":00 – " + (i + 1 < 10 ? "0" : "") + (i + 1) + ":00"; },
      clock: function (h, m) { return (h < 10 ? "0" : "") + h + ":" + (m < 10 ? "0" : "") + m; },
      tierWord: { cold: "Low price", amber: "Mid price", heat: "High price" },
      action: { charge: "producing more and storing cold", draw: "drawing on storage", follow: "following demand" },
      mwh: "/MWh",
      bigMoney: function (m, k) { return m ? "€" + m + "M" : "€" + k + "k"; },
      perYear: "/yr",
      gwh: " GWh/yr"
    }
  }[lang === "en" ? "en" : "fr"];

  var nf0 = new Intl.NumberFormat(lang === "en" ? "en-GB" : "fr-FR", { maximumFractionDigits: 0 });
  var nf1 = new Intl.NumberFormat(lang === "en" ? "en-GB" : "fr-FR", { minimumFractionDigits: 1, maximumFractionDigits: 1 });
  var nfAuto = new Intl.NumberFormat(lang === "en" ? "en-GB" : "fr-FR", { maximumFractionDigits: 2 });

  function bigMoney(v) {
    if (v >= 1e6) return T.bigMoney(nfAuto.format(Math.round(v / 1e4) / 100), null);
    return T.bigMoney(null, nf0.format(Math.round(v / 1e3)));
  }
  function clamp(v, a, b) { return v < a ? a : (v > b ? b : v); }

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
    var tip = plot.querySelector("[data-tip]");
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
    var state = { mode: "mayco", k: 1, hour: null }; // k : 0 = consigne fixe, 1 = Mayco
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

      var old = plot.querySelector("svg");
      if (old) plot.removeChild(old);
      var svg = el("svg", { viewBox: "0 0 " + w + " " + h, width: w, height: h, "aria-hidden": "true", focusable: "false" });
      plot.insertBefore(svg, tip);

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
      var cursor = el("line", { x1: 0, x2: 0, y1: y0 - 4, y2: y2 + ht + 2, class: "ch-cursor", opacity: 0 }, svg);

      geo = { svg: svg, bars: bars, ghosts: ghosts, tGhost: tGhost, tLine: tLine, cursor: cursor, x: x, bw: bw, ml: m.l, iw: iw, yPow: yPow, yTemp: yTemp, base: y1 + hb };
      paint();
    }

    // Lecture heure par heure : survol, toucher ou flèches du clavier
    function updateTip(load, temp) {
      var i = state.hour;
      if (i === null) {
        geo.cursor.setAttribute("opacity", "0");
        tip.hidden = true;
        return;
      }
      var cx = geo.x(i) + geo.bw / 2;
      geo.cursor.setAttribute("x1", cx.toFixed(1));
      geo.cursor.setAttribute("x2", cx.toFixed(1));
      geo.cursor.setAttribute("opacity", "0.85");
      var p = DAY.price[i];
      var rows = [
        ["tip-h", T.hourRange(i)],
        ["tip-p is-" + tier(p), T.money(nf0.format(p)) + T.mwh],
        ["", nf0.format(Math.round(load[i] / 10) * 10) + " kW · " + fmtTemp(Math.round(temp[i] * 10) / 10) + " °C"]
      ];
      tip.textContent = "";
      rows.forEach(function (r) {
        var s = document.createElement("span");
        if (r[0]) s.className = r[0];
        s.textContent = r[1];
        tip.appendChild(s);
      });
      var offset = geo.svg.getBoundingClientRect().left - plot.getBoundingClientRect().left;
      tip.style.left = clamp(offset + cx, 78, plot.clientWidth - 78) + "px";
      tip.hidden = false;
    }

    function hourFromX(clientX) {
      if (!geo) return null;
      var x = clientX - geo.svg.getBoundingClientRect().left - geo.ml;
      if (x < 0 || x > geo.iw) return null;
      return clamp(Math.floor(x / geo.bw), 0, 23);
    }

    function setHour(i) {
      if (i === state.hour) return;
      state.hour = i;
      paint();
    }

    plot.addEventListener("pointermove", function (e) { setHour(hourFromX(e.clientX)); });
    plot.addEventListener("pointerdown", function (e) { setHour(hourFromX(e.clientX)); });
    plot.addEventListener("pointerleave", function (e) { if (e.pointerType === "mouse") setHour(null); });
    plot.addEventListener("blur", function () { setHour(null); });
    plot.addEventListener("keydown", function (e) {
      if (e.key === "ArrowRight" || e.key === "ArrowLeft") {
        e.preventDefault();
        var step = e.key === "ArrowRight" ? 1 : -1;
        setHour(state.hour === null ? 12 : clamp(state.hour + step, 0, 23));
      } else if (e.key === "Escape") {
        setHour(null);
      }
    });

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
        geo.bars[i].style.opacity = state.hour === null || state.hour === i ? "" : "0.35";
      }
      geo.tLine.setAttribute("d", tempPath(temp));
      geo.tGhost.setAttribute("d", tempPath(ghostT));
      updateTip(load, temp);
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

  /* ---------- Champ thermique du hero ----------
     Une grille de points colorés comme une image thermique : chaud en haut,
     froid en bas (la stratification d'un ballon), et le curseur réchauffe. */

  var field = document.querySelector("[data-field]");
  if (field && hero && field.getContext) initField(field, hero);

  function initField(canvas, host) {
    var ctx = canvas.getContext("2d");
    if (!ctx) return;
    var W = 0, H = 0, gap = 24;
    var mouse = { x: -1e4, y: -1e4, tx: -1e4, ty: -1e4, heat: 0, target: 0 };
    var running = false, rafId = null, lastT = 0;
    var COLS = [[59, 123, 240], [245, 165, 36], [255, 107, 53]];

    function smooth(a, b, v) {
      var t = clamp((v - a) / (b - a), 0, 1);
      return t * t * (3 - 2 * t);
    }

    function resize() {
      var dpr = Math.min(2, window.devicePixelRatio || 1);
      W = host.clientWidth;
      H = host.clientHeight;
      canvas.width = Math.round(W * dpr);
      canvas.height = Math.round(H * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      gap = W < 700 ? 20 : 24;
    }

    function draw(time) {
      var t = time * 0.00016;
      mouse.x += (mouse.tx - mouse.x) * 0.14;
      mouse.y += (mouse.ty - mouse.y) * 0.14;
      mouse.heat += (mouse.target - mouse.heat) * 0.06;
      ctx.clearRect(0, 0, W, H);
      var narrow = W < 700;
      for (var y = gap * 0.6; y < H; y += gap) {
        var vy = y / H;
        var my = 1 - smooth(narrow ? 0.1 : 0.26, narrow ? 0.28 : 0.5, vy);
        for (var x = gap * 0.6; x < W; x += gap) {
          var dx = x - mouse.x, dy = y - mouse.y;
          var h = mouse.heat * Math.exp(-(dx * dx + dy * dy) / 16000);
          var m = Math.max(my * (narrow ? 0.45 : smooth(0.38, 0.82, x / W)), h * 0.85);
          if (m < 0.03) continue;
          var f = 0.5 + 0.2 * Math.sin(x * 0.0042 + t * 1.3) * Math.cos(y * 0.0065 - t) +
            0.16 * Math.sin((x - y) * 0.0031 + t * 0.7) + (0.35 - vy) * 0.5 + h * 0.55;
          f = clamp(f, 0, 1);
          var a = f < 0.5 ? COLS[0] : COLS[1];
          var b = f < 0.5 ? COLS[1] : COLS[2];
          var k = f < 0.5 ? f / 0.5 : (f - 0.5) / 0.5;
          ctx.fillStyle = "rgba(" + ((a[0] + (b[0] - a[0]) * k) | 0) + "," + ((a[1] + (b[1] - a[1]) * k) | 0) + "," +
            ((a[2] + (b[2] - a[2]) * k) | 0) + "," + (0.05 + 0.32 * m).toFixed(3) + ")";
          ctx.beginPath();
          ctx.arc(x, y, 1.1 + 1.3 * Math.min(1, h + Math.abs(f - 0.5) * 0.6), 0, 6.2832);
          ctx.fill();
        }
      }
    }

    function loop(ts) {
      if (!running) return;
      if (ts - lastT > 32) { lastT = ts; draw(ts); }
      rafId = requestAnimationFrame(loop);
    }
    function start() {
      if (running || reduceMotion || document.hidden) return;
      running = true;
      rafId = requestAnimationFrame(loop);
    }
    function stop() {
      running = false;
      if (rafId) cancelAnimationFrame(rafId);
    }

    resize();
    draw(4000);
    window.addEventListener("resize", function () { resize(); draw(performance.now()); });
    if (reduceMotion) return;

    host.addEventListener("pointermove", function (e) {
      var r = host.getBoundingClientRect();
      mouse.tx = e.clientX - r.left;
      mouse.ty = e.clientY - r.top;
      if (mouse.x < -1000) { mouse.x = mouse.tx; mouse.y = mouse.ty; }
      mouse.target = 1;
    }, { passive: true });
    host.addEventListener("pointerleave", function () { mouse.target = 0; });

    var onScreen = true;
    if ("IntersectionObserver" in window) {
      new IntersectionObserver(function (e) {
        onScreen = e[0].isIntersecting;
        if (onScreen) start(); else stop();
      }).observe(host);
    }
    document.addEventListener("visibilitychange", function () {
      if (document.hidden) stop(); else if (onScreen) start();
    });
    start();
  }

  /* ---------- Solution : la journée type défile ----------
     Mêmes données que le graphique du hero. Une journée en 20 secondes :
     prix de l'heure, décision de pilotage, ventilateur du groupe froid,
     niveau de froid stocké dans l'entrepôt. */

  var daybar = document.querySelector("[data-daybar]");
  if (daybar) initDay(daybar.closest("section"));

  function initDay(root) {
    var el$ = function (s) { return root.querySelector(s); };
    var timeEl = el$("[data-day-time]"), head = el$("[data-day-head]");
    var stateEl = el$("[data-day-state]"), dot = el$("[data-day-dot]");
    var pill = el$("[data-day-price]"), rotor = el$("[data-rotor]"), fill = el$("[data-fill]");
    var tiers = root.querySelectorAll("[data-tier]");
    var links = root.querySelectorAll("[data-link]");
    var PERIOD = 20000;
    var hour = 13, angle = 0, last = null, running = false, rafId = null;
    var shown = { i: -1, act: "" };

    function render(h, dt) {
      var i = Math.floor(h) % 24, j = (i + 1) % 24, f = h - Math.floor(h);
      if (timeEl) timeEl.textContent = T.clock(i, Math.floor(f * 4) * 15);
      if (head) head.style.left = (h / 24 * 100).toFixed(2) + "%";

      var load = DAY.mayco[i] + (DAY.mayco[j] - DAY.mayco[i]) * f;
      angle = (angle + dt * 0.42 * load / DAY.pMax) % 360;
      if (rotor) rotor.setAttribute("transform", "rotate(" + angle.toFixed(1) + " 23 30)");

      var temp = DAY.tMayco[i] + (DAY.tMayco[j] - DAY.tMayco[i]) * f;
      var level = clamp((DAY.band[1] - temp) / (DAY.band[1] - DAY.band[0]), 0.08, 1);
      if (fill) {
        fill.setAttribute("height", (20 * level).toFixed(2));
        fill.setAttribute("y", (54 - 20 * level).toFixed(2));
      }

      if (i === shown.i) return;
      shown.i = i;
      var p = DAY.price[i], tr = tier(p);
      var diff = DAY.mayco[i] - DAY.fixed[i];
      var act = diff > 150 ? "charge" : (diff < -150 ? "draw" : "follow");
      if (stateEl) stateEl.textContent = T.tierWord[tr] + " · " + T.action[act];
      if (dot) dot.className = "daybar-dot is-" + tr;
      if (pill) {
        pill.textContent = T.money(nf0.format(p)) + T.mwh;
        pill.className = "live-pill is-" + tr;
      }
      tiers.forEach(function (n) { n.style.opacity = n.getAttribute("data-tier") === tr ? "1" : "0.3"; });
      if (links[2]) {
        links[2].classList.toggle("is-fast", act === "charge");
        links[2].classList.toggle("is-slow", act === "draw");
      }
      if (links[1]) links[1].classList.toggle("is-slow", act === "draw");
    }

    function loop(ts) {
      if (!running) return;
      var dt = last === null ? 16 : Math.min(64, ts - last);
      last = ts;
      hour = (hour + dt / PERIOD * 24) % 24;
      render(hour, dt);
      rafId = requestAnimationFrame(loop);
    }
    function start() {
      if (running || reduceMotion || document.hidden) return;
      running = true;
      last = null;
      rafId = requestAnimationFrame(loop);
    }
    function stop() {
      running = false;
      if (rafId) cancelAnimationFrame(rafId);
    }

    render(hour, 0);
    if (reduceMotion || !("IntersectionObserver" in window)) return;
    var onScreen = false;
    new IntersectionObserver(function (e) {
      onScreen = e[0].isIntersecting;
      if (onScreen) start(); else stop();
    }, { threshold: 0.15 }).observe(root);
    document.addEventListener("visibilitychange", function () {
      if (document.hidden) stop(); else if (onScreen) start();
    });
  }

  /* ---------- Économies : simulateur ---------- */

  var est = document.querySelector("[data-estimator]");
  if (est) initEstimator(est);

  function initEstimator(root) {
    var gwh = root.querySelector("#est-gwh"), price = root.querySelector("#est-price");
    var out = function (k) { return root.querySelector("[data-est-out='" + k + "']"); };
    var oG = out("gwh"), oP = out("price"), oS = out("save"), oB = out("bill");
    if (!gwh || !price) return;

    function fill(input) {
      var min = +input.min, max = +input.max;
      input.style.setProperty("--p", ((+input.value - min) / (max - min) * 100).toFixed(2) + "%");
    }
    function update() {
      var g = +gwh.value, p = +price.value;
      var bill = g * 1000 * p;
      oG.textContent = nfAuto.format(g) + T.gwh;
      oP.textContent = T.money(nf0.format(p)) + T.mwh;
      oS.textContent = bigMoney(bill * 0.2) + T.perYear;
      oB.textContent = bigMoney(bill);
      fill(gwh);
      fill(price);
    }
    gwh.addEventListener("input", update);
    price.addEventListener("input", update);
    update();
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
