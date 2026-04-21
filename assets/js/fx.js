/* ============================================================
   RouteBy — FX Layer JS
   Playful & Bold interactions, gated by <html data-fx="on">
   Tweaks panel reads/writes a config block.
   ============================================================ */
(function () {
  "use strict";
  const $  = (s, p = document) => p.querySelector(s);
  const $$ = (s, p = document) => [...p.querySelectorAll(s)];
  const html = document.documentElement;

  /* ---------- Config / persistence ---------- */
  const STORE_KEY = "routeby_fx";
  const DEFAULTS = /*EDITMODE-BEGIN*/{
    "fx": true,
    "cursor": true,
    "rail": true,
    "progress": true,
    "tilt": true,
    "magnetic": true,
    "heroHub": true,
    "historyDots": true
  }/*EDITMODE-END*/;

  const config = (() => {
    try {
      const saved = JSON.parse(localStorage.getItem(STORE_KEY) || "{}");
      return Object.assign({}, DEFAULTS, saved);
    } catch (e) { return Object.assign({}, DEFAULTS); }
  })();

  function saveConfig() {
    try { localStorage.setItem(STORE_KEY, JSON.stringify(config)); } catch (e) {}
  }

  function applyConfig() {
    html.setAttribute("data-fx", config.fx ? "on" : "off");
    html.setAttribute("data-fx-cursor", (config.fx && config.cursor) ? "on" : "off");
    if (cursorEl) cursorEl.style.display = (config.fx && config.cursor) ? "block" : "none";
    if (ringEl)   ringEl.style.display   = (config.fx && config.cursor) ? "block" : "none";
    if (railEl)   railEl.style.display   = (config.fx && config.rail) ? "flex" : "none";
    if (progEl)   progEl.style.display   = (config.fx && config.progress) ? "block" : "none";
  }

  /* ---------- Custom cursor ---------- */
  let cursorEl, ringEl;
  function initCursor() {
    if (matchMedia("(hover: none)").matches) return;
    cursorEl = document.createElement("div");
    cursorEl.className = "fx-cursor";
    ringEl = document.createElement("div");
    ringEl.className = "fx-cursor__ring";
    document.body.appendChild(cursorEl);
    document.body.appendChild(ringEl);

    let mx = window.innerWidth / 2, my = window.innerHeight / 2;
    let rx = mx, ry = my;
    document.addEventListener("mousemove", (e) => {
      mx = e.clientX; my = e.clientY;
      cursorEl.style.transform = `translate(${mx}px, ${my}px) translate(-50%, -50%)`;
    });
    (function loop() {
      rx += (mx - rx) * 0.18;
      ry += (my - ry) * 0.18;
      ringEl.style.transform = `translate(${rx}px, ${ry}px) translate(-50%, -50%)`;
      requestAnimationFrame(loop);
    })();

    const hoverSel = "a, button, [role='button'], .channel, .bento__cell, .brand-cell, .ticker, .history-v3__row, .fx-rail__dot, .fx-switch";
    document.addEventListener("mouseover", (e) => {
      if (e.target.closest(hoverSel)) {
        cursorEl.classList.add("is-hover");
        ringEl.classList.add("is-hover");
      }
    });
    document.addEventListener("mouseout", (e) => {
      if (e.target.closest(hoverSel)) {
        cursorEl.classList.remove("is-hover");
        ringEl.classList.remove("is-hover");
      }
    });
    document.addEventListener("mousedown", () => {
      cursorEl.classList.add("is-down");
      ringEl.classList.add("is-down");
    });
    document.addEventListener("mouseup", () => {
      cursorEl.classList.remove("is-down");
      ringEl.classList.remove("is-down");
    });
  }

  /* ---------- Scroll progress ---------- */
  let progEl, progBar;
  function initProgress() {
    progEl = document.createElement("div");
    progEl.className = "fx-progress";
    progBar = document.createElement("div");
    progBar.className = "fx-progress__bar";
    progEl.appendChild(progBar);
    document.body.appendChild(progEl);

    function update() {
      const scroll = window.scrollY;
      const max = document.documentElement.scrollHeight - window.innerHeight;
      const pct = max > 0 ? (scroll / max) * 100 : 0;
      progBar.style.width = pct + "%";
    }
    window.addEventListener("scroll", update, { passive: true });
    update();
  }

  /* ---------- Side rail (section dots) ---------- */
  let railEl;
  function initRail() {
    // Detect main sections on index.html
    const sections = [];
    const find = (sel, label) => {
      const el = $(sel);
      if (el) sections.push({ el, label });
    };
    find(".hero, .page-header", "TOP");
    find(".section:not(.section--cream):not(.section--dark):has(.bento)", "ABOUT");
    // Fallback by class chain
    $$(".section, .section--cream, .section--dark, .cta-block").forEach((el, i) => {
      // pick up history/brands/channels/cta by first eyebrow text
      const eyebrow = el.querySelector(".eyebrow");
      let label = "";
      if (eyebrow) {
        const t = eyebrow.textContent.trim();
        const m = t.match(/—\s*(\S+)/);
        if (m) label = m[1].toUpperCase();
      }
      if (el.classList.contains("cta-block")) label = "CONTACT";
      if (!label) return;
      // avoid duplicates
      if (sections.find(s => s.el === el)) return;
      sections.push({ el, label });
    });
    if (sections.length < 2) return;

    railEl = document.createElement("div");
    railEl.className = "fx-rail";
    sections.forEach(({ el, label }, i) => {
      const dot = document.createElement("button");
      dot.className = "fx-rail__dot";
      dot.setAttribute("data-label", label);
      dot.addEventListener("click", () => {
        window.scrollTo({ top: el.getBoundingClientRect().top + window.scrollY - 80, behavior: "smooth" });
      });
      railEl.appendChild(dot);
    });
    document.body.appendChild(railEl);

    const dots = [...railEl.children];
    const io = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          const idx = sections.findIndex(s => s.el === entry.target);
          dots.forEach((d, i) => d.classList.toggle("is-active", i === idx));
        }
      });
    }, { threshold: 0.4 });
    sections.forEach(s => io.observe(s.el));
  }

  /* ---------- Magnetic buttons ---------- */
  function initMagnetic() {
    $$(".btn, .channel__arrow, .scroll-top, .fx-rail__dot").forEach((btn) => {
      btn.addEventListener("mousemove", (e) => {
        if (!config.magnetic || !config.fx) return;
        const r = btn.getBoundingClientRect();
        const x = e.clientX - r.left - r.width / 2;
        const y = e.clientY - r.top - r.height / 2;
        const strength = btn.classList.contains("btn") ? 0.25 : 0.4;
        btn.style.transform = `translate(${x * strength}px, ${y * strength}px)`;
        // radial gradient origin
        btn.style.setProperty("--mx", ((e.clientX - r.left) / r.width * 100) + "%");
        btn.style.setProperty("--my", ((e.clientY - r.top) / r.height * 100) + "%");
      });
      btn.addEventListener("mouseleave", () => {
        btn.style.transform = "";
      });
    });
  }

  /* ---------- Bento tilt ---------- */
  function initTilt() {
    $$(".bento__cell").forEach((card) => {
      card.addEventListener("mousemove", (e) => {
        if (!config.tilt || !config.fx) return;
        const r = card.getBoundingClientRect();
        const cx = (e.clientX - r.left) / r.width - 0.5;
        const cy = (e.clientY - r.top) / r.height - 0.5;
        card.style.setProperty("--tilt-x", (cy * -6) + "deg");
        card.style.setProperty("--tilt-y", (cx * 8) + "deg");
        card.style.setProperty("--mx", ((e.clientX - r.left) / r.width * 100) + "%");
        card.style.setProperty("--my", ((e.clientY - r.top) / r.height * 100) + "%");
      });
      card.addEventListener("mouseleave", () => {
        card.style.setProperty("--tilt-x", "0deg");
        card.style.setProperty("--tilt-y", "0deg");
      });
    });
  }

  /* ---------- Hero hub parallax + traveling packets ---------- */
  function initHeroHub() {
    const hero = $(".hero");
    const svg = $("#hub-network");
    if (!hero || !svg) return;

    hero.addEventListener("mousemove", (e) => {
      if (!config.heroHub || !config.fx) return;
      const r = hero.getBoundingClientRect();
      const cx = (e.clientX - r.left) / r.width - 0.5;
      const cy = (e.clientY - r.top) / r.height - 0.5;
      const visual = $(".hero__visual");
      if (visual) {
        visual.style.setProperty("--fx-rx", (cy * -8) + "deg");
        visual.style.setProperty("--fx-ry", (cx * 12) + "deg");
      }
    });
    hero.addEventListener("mouseleave", () => {
      const visual = $(".hero__visual");
      if (visual) {
        visual.style.setProperty("--fx-rx", "0deg");
        visual.style.setProperty("--fx-ry", "0deg");
      }
    });

    // Add animated packets traveling from center to outer nodes
    const outerNodes = [
      [260, 80], [388, 132], [440, 260], [388, 388],
      [260, 440], [132, 388], [80, 260], [132, 132]
    ];
    const svgNS = "http://www.w3.org/2000/svg";
    let i = 0;
    setInterval(() => {
      if (!config.heroHub || !config.fx) return;
      const target = outerNodes[i % outerNodes.length];
      i++;
      const pkt = document.createElementNS(svgNS, "circle");
      pkt.setAttribute("class", "packet");
      pkt.setAttribute("r", "3");
      pkt.setAttribute("cx", "260");
      pkt.setAttribute("cy", "260");
      svg.appendChild(pkt);
      const dur = 900;
      const start = performance.now();
      function tick(now) {
        const p = Math.min((now - start) / dur, 1);
        const ease = 1 - Math.pow(1 - p, 3);
        const x = 260 + (target[0] - 260) * ease;
        const y = 260 + (target[1] - 260) * ease;
        pkt.setAttribute("cx", x);
        pkt.setAttribute("cy", y);
        pkt.setAttribute("r", 3 * (1 - p * 0.5));
        pkt.style.opacity = 1 - p * 0.5;
        if (p < 1) requestAnimationFrame(tick);
        else pkt.remove();
      }
      requestAnimationFrame(tick);
    }, 400);
  }

  /* ---------- History scroll progress ---------- */
  function initHistoryProgress() {
    const content = $(".history-v3__content");
    if (!content) return;
    function update() {
      if (!config.historyDots || !config.fx) return;
      const r = content.getBoundingClientRect();
      const vh = window.innerHeight;
      const total = r.height;
      const visible = Math.max(0, Math.min(vh - r.top, total));
      const p = Math.min(1, Math.max(0, visible / total));
      content.style.setProperty("--history-progress", p);
    }
    window.addEventListener("scroll", update, { passive: true });
    window.addEventListener("resize", update);
    update();

    // Reveal rows with IntersectionObserver (add is-visible)
    const rows = $$(".history-v3__row", content);
    const io = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add("is-visible");
          io.unobserve(entry.target);
        }
      });
    }, { threshold: 0.3 });
    rows.forEach(r => io.observe(r));

    // Year-num mirror data attribute for glitch
    $$(".history-v3__year-num").forEach(el => {
      el.setAttribute("data-mirror", el.textContent.trim());
    });
  }

  /* ---------- History TREE — growing-root visualization ---------- */
  function initHistoryTree() {
    const tree = $("[data-history-tree]");
    if (!tree) return;

    const branches = $$(".tree-branch", tree);
    const total = branches.length;
    const countEl = $("[data-tree-count]", tree);
    const fillEl  = $("[data-tree-fill]", tree);

    // Reset initial count
    if (countEl) countEl.textContent = `0 / ${total}`;

    let grown = false;
    const io = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting || grown) return;
        grown = true;
        tree.classList.add("is-grown");

        // Count up animation (matches stagger timing ~0.8s → ~2.4s)
        if (countEl) {
          let n = 0;
          const stepDelay = 1600 / total; // ms per branch
          const startAt = 800;             // match first branch delay
          const runStep = () => {
            n++;
            countEl.textContent = `${String(n).padStart(2, "0")} / ${String(total).padStart(2, "0")}`;
            if (n < total) setTimeout(runStep, stepDelay);
          };
          setTimeout(runStep, startAt);
        }

        io.unobserve(tree);
      });
    }, { threshold: 0.15 });
    io.observe(tree);
  }

  /* ---------- Brands stagger reveal ---------- */
  function initBrandsReveal() {
    const cells = $$(".brand-cell");
    if (!cells.length) return;
    const io = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add("fx-in");
          io.unobserve(entry.target);
        }
      });
    }, { threshold: 0.2 });
    cells.forEach(c => io.observe(c));
  }

  /* ---------- Stats counter re-animate when in view ---------- */
  function initStatsCounters() {
    $$(".stats__num > span:first-child").forEach((span) => {
      const raw = span.textContent.trim();
      const target = parseFloat(raw.replace(/[^0-9.]/g, ""));
      if (isNaN(target) || target < 1) return;
      // store
      span.setAttribute("data-target", target);
      span.textContent = "0";
    });

    const io = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        const item = entry.target;
        item.classList.add("is-visible");
        $$("[data-target]", item).forEach((span) => {
          const target = parseFloat(span.getAttribute("data-target"));
          const dur = 1400;
          const start = performance.now();
          function tick(now) {
            const p = Math.min((now - start) / dur, 1);
            const ease = 1 - Math.pow(1 - p, 3);
            span.textContent = Math.floor(target * ease);
            if (p < 1) requestAnimationFrame(tick);
            else span.textContent = Math.floor(target);
          }
          requestAnimationFrame(tick);
        });
        io.unobserve(item);
      });
    }, { threshold: 0.4 });
    $$(".stats__item").forEach(i => io.observe(i));
  }

  /* ---------- CTA orbit dots ---------- */
  function initCtaOrbit() {
    const cta = $(".cta-block");
    if (!cta) return;
    const orbit = document.createElement("div");
    orbit.className = "fx-cta-orbit";
    for (let i = 0; i < 12; i++) {
      const d = document.createElement("div");
      d.className = "fx-cta-orbit__dot";
      const size = 3 + Math.random() * 6;
      d.style.width = size + "px";
      d.style.height = size + "px";
      d.style.left = Math.random() * 100 + "%";
      d.style.top = Math.random() * 100 + "%";
      d.style.opacity = 0.2 + Math.random() * 0.4;
      d.style.animation = `fx-cta-float-${i % 3} ${12 + Math.random() * 8}s ease-in-out infinite alternate`;
      orbit.appendChild(d);
    }
    cta.insertBefore(orbit, cta.firstChild);

    // Inject keyframes dynamically
    const style = document.createElement("style");
    style.textContent = `
      @keyframes fx-cta-float-0 { to { transform: translate(40px, -30px); } }
      @keyframes fx-cta-float-1 { to { transform: translate(-30px, 40px); } }
      @keyframes fx-cta-float-2 { to { transform: translate(20px, 20px); } }
    `;
    document.head.appendChild(style);
  }

  /* ---------- Hero scroll hint ---------- */
  function initScrollHint() {
    const hero = $(".hero");
    if (!hero) return;
    const hint = document.createElement("div");
    hint.className = "fx-scroll-hint fx-only";
    hint.innerHTML = `
      <span>SCROLL</span>
      <span class="fx-scroll-hint__bar"></span>
    `;
    hero.appendChild(hint);
    window.addEventListener("scroll", () => {
      hint.style.opacity = window.scrollY > 100 ? 0 : "";
    }, { passive: true });
  }

  /* ---------- Tweaks panel ---------- */
  function initTweaks() {
    const panel = document.createElement("div");
    panel.className = "fx-tweaks";
    panel.innerHTML = `
      <div class="fx-tweaks__head">
        <span class="fx-tweaks__title">Tweaks</span>
        <span style="display:flex;align-items:center;gap:6px;">
          <span class="fx-tweaks__hint">FX</span>
          <button class="fx-tweaks__close" aria-label="Close">×</button>
        </span>
      </div>
      ${[
        ["fx",         "FX 전체",      "Master on/off"],
        ["cursor",     "커스텀 커서",    "Red dot cursor"],
        ["rail",       "사이드 레일",    "Section dots"],
        ["progress",   "스크롤 바",     "Top progress"],
        ["tilt",       "카드 틸트",     "Bento 3D tilt"],
        ["magnetic",   "자석 버튼",     "Magnetic hover"],
        ["heroHub",    "허브 패킷",     "Hero network"],
        ["historyDots","히스토리 모션",  "Timeline pop"],
      ].map(([k, label, desc]) => `
        <div class="fx-tweaks__row">
          <span>
            <span class="fx-tweaks__label">${label}</span>
            <span class="fx-tweaks__desc">${desc}</span>
          </span>
          <button class="fx-switch ${config[k] ? 'is-on' : ''}" data-fx-key="${k}" aria-label="${label}"></button>
        </div>
      `).join("")}
    `;
    document.body.appendChild(panel);

    const btn = document.createElement("button");
    btn.className = "fx-tweaks__toggle-btn";
    btn.setAttribute("aria-label", "Open tweaks");
    btn.innerHTML = "✦";
    document.body.appendChild(btn);

    btn.addEventListener("click", () => {
      panel.classList.add("is-open");
      btn.classList.add("is-hidden");
    });
    panel.querySelector(".fx-tweaks__close").addEventListener("click", () => {
      panel.classList.remove("is-open");
      btn.classList.remove("is-hidden");
    });

    panel.addEventListener("click", (e) => {
      const sw = e.target.closest("[data-fx-key]");
      if (!sw) return;
      const key = sw.getAttribute("data-fx-key");
      config[key] = !config[key];
      sw.classList.toggle("is-on", config[key]);
      saveConfig();
      applyConfig();
    });
  }

  /* ---------- Boot ---------- */
  function boot() {
    applyConfig();
    initTweaks();
    initCursor();
    initProgress();
    initRail();
    initMagnetic();
    initTilt();
    initHeroHub();
    initHistoryProgress();
    initHistoryTree();
    initBrandsReveal();
    initStatsCounters();
    initCtaOrbit();
    initScrollHint();
    applyConfig(); // re-apply after elements exist
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }
})();
