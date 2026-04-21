/* ============================================================
   RouteBy — Main interactions
   ============================================================ */
(function () {
  const $ = (s, p = document) => p.querySelector(s);
  const $$ = (s, p = document) => [...p.querySelectorAll(s)];

  /* -------- Splash screen (first visit per session) -------- */
  (function initSplash() {
    const splash = document.querySelector("[data-splash]");
    if (!splash) return;

    const SESSION_KEY   = "routeby_splashShown";
    const GIF_DURATION  = 3870;   // GIF full duration
    const HOLD_MS       = 200;    // brief pause on frozen final frame
    const MOVE_MS       = 1200;   // shrink+move + curtain lift
    const FINAL_FADE_MS = 500;    // final splash fade-out

    const reduceMotion =
      window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    if (reduceMotion || sessionStorage.getItem(SESSION_KEY) === "1") {
      splash.remove();
      return;
    }

    document.body.classList.add("splash-lock");

    const gif        = splash.querySelector("[data-splash-gif]");
    const skipBtn    = splash.querySelector("[data-splash-skip]");
    const frozenSrc  = gif ? gif.getAttribute("data-splash-frozen-src") : null;

    // Preload the static PNG so src swap is instantaneous (no flicker)
    if (frozenSrc) {
      const preload = new Image();
      preload.src = frozenSrc;
    }

    let state = "playing"; // playing → frozen → closing → done

    function getNavSymbolTarget() {
      const navLogos = document.querySelectorAll(".nav .brand__logo");
      let visibleLogo = null;
      for (const logo of navLogos) {
        const r = logo.getBoundingClientRect();
        if (r.width > 0 && r.height > 0) { visibleLogo = logo; break; }
      }
      if (!visibleLogo) return null;
      const rect = visibleLogo.getBoundingClientRect();
      return {
        x: rect.left + rect.height / 2,
        y: rect.top  + rect.height / 2,
        size: rect.height * 0.95,
      };
    }

    function freezeGif() {
      // Swap to static PNG — guarantees no animation during subsequent transform
      if (gif && frozenSrc) {
        gif.src = frozenSrc;
      }
    }

    function startClosing() {
      if (state !== "frozen") return;
      state = "closing";

      // Compute shrink+move on the (now frozen) image
      if (gif) {
        const target = getNavSymbolTarget();
        const gifRect = gif.getBoundingClientRect();
        if (target && gifRect.width > 0) {
          const vw = window.innerWidth;
          const vh = window.innerHeight;
          // Symbol fills ~97.5% of canvas in last frame, centered
          const currentSymbolSize = gifRect.width * 0.975;
          const scale = target.size / currentSymbolSize;
          const offsetX = target.x - vw / 2;
          const offsetY = target.y - vh / 2;
          gif.style.transform =
            `translate(${offsetX}px, ${offsetY}px) scale(${scale})`;
        }
      }
      splash.classList.add("splash--closing");

      setTimeout(() => {
        splash.classList.add("splash--done");
        document.body.classList.remove("splash-lock");
        try { sessionStorage.setItem(SESSION_KEY, "1"); } catch (e) {}
        setTimeout(() => {
          state = "done";
          splash.remove();
        }, FINAL_FADE_MS);
      }, MOVE_MS);
    }

    function onGifEnded() {
      if (state !== "playing") return;
      state = "frozen";
      freezeGif();  // ← swap src BEFORE starting movement
      // Brief hold showing the truly static image, then begin shrink+move
      setTimeout(startClosing, HOLD_MS);
    }

    setTimeout(onGifEnded, GIF_DURATION);

    const skip = (e) => {
      if (e) e.stopPropagation();
      if (state === "playing") {
        state = "frozen";
        freezeGif();
        startClosing();
      } else if (state === "frozen") {
        startClosing();
      }
    };
    if (skipBtn) skipBtn.addEventListener("click", skip);
    splash.addEventListener("click", skip);
    document.addEventListener("keydown", (e) => {
      if ((state === "playing" || state === "frozen") &&
          (e.key === "Escape" || e.key === "Enter")) skip();
    });
  })();


  /* -------- Scroll reveal -------- */
  const revealObserver = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add("is-visible");
          revealObserver.unobserve(entry.target);
        }
      });
    },
    { threshold: 0.12, rootMargin: "0px 0px -60px 0px" }
  );
  $$(".reveal").forEach((el) => revealObserver.observe(el));

  /* -------- Nav dark mode toggle on hero -------- */
  const nav = $(".nav");
  const darkTrigger = $("[data-nav-dark]");
  if (nav && darkTrigger) {
    const darkObs = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          nav.classList.toggle("is-dark", entry.isIntersecting);
        });
      },
      { threshold: 0, rootMargin: "-70px 0px 0px 0px" }
    );
    darkObs.observe(darkTrigger);
  } else if (nav) {
    // fallback: dark when scrolled past hero / page-header
    const hero = $(".hero, .page-header");
    if (hero) {
      const obs = new IntersectionObserver(
        (entries) =>
          entries.forEach((e) => nav.classList.toggle("is-dark", e.isIntersecting)),
        { threshold: 0, rootMargin: "-70px 0px -90% 0px" }
      );
      obs.observe(hero);
    }
  }

  /* -------- Mobile menu -------- */
  const toggle = $(".menu-toggle");
  const menu = $(".nav__menu");
  if (toggle && menu) {
    toggle.addEventListener("click", () => menu.classList.toggle("is-open"));
    $$(".nav__link", menu).forEach((l) =>
      l.addEventListener("click", () => menu.classList.remove("is-open"))
    );
  }

  /* -------- Counter animation (optional) -------- */
  const counterObserver = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        const el = entry.target;
        const target = parseFloat(el.dataset.count);
        if (isNaN(target)) return;
        const duration = 1400;
        const start = performance.now();
        const startVal = 0;
        const tick = (now) => {
          const p = Math.min((now - start) / duration, 1);
          const eased = 1 - Math.pow(1 - p, 3);
          const val = Math.floor(startVal + (target - startVal) * eased);
          el.textContent = val;
          if (p < 1) requestAnimationFrame(tick);
          else el.textContent = target;
        };
        requestAnimationFrame(tick);
        counterObserver.unobserve(el);
      });
    },
    { threshold: 0.3 }
  );
  $$("[data-count]").forEach((el) => counterObserver.observe(el));

  /* -------- Form: prevent default and show faux-success -------- */
  const form = $(".contact-form form");
  if (form) {
    form.addEventListener("submit", (e) => {
      e.preventDefault();
      const btn = form.querySelector("button[type=submit]");
      if (!btn) return;
      const orig = btn.textContent;
      btn.textContent = "✓ SENT";
      btn.disabled = true;
      setTimeout(() => {
        btn.textContent = orig;
        btn.disabled = false;
        form.reset();
      }, 2400);
    });
  }

  /* -------- Node network animation (hero visual) -------- */
  const hub = $("#hub-network");
  if (hub) {
    const ring1 = hub.querySelectorAll(".ring-1 .node");
    const ring2 = hub.querySelectorAll(".ring-2 .node");
    const lines = hub.querySelectorAll("line.pulse");
    let i = 0;
    setInterval(() => {
      lines.forEach((l) => l.classList.remove("is-on"));
      const a = lines[i % lines.length];
      const b = lines[(i + 3) % lines.length];
      if (a) a.classList.add("is-on");
      if (b) b.classList.add("is-on");
      i++;
    }, 900);
  }

  /* -------- Content protection: prevent right-click / drag / copy shortcuts -------- */
  document.addEventListener("contextmenu", (e) => {
    if (!e.target.closest("input, textarea, select")) {
      e.preventDefault();
    }
  });
  /* Prevent drag-saving images */
  document.addEventListener("dragstart", (e) => {
    if (e.target.tagName === "IMG") e.preventDefault();
  });
  /* Block common copy/save shortcuts (outside form fields) */
  document.addEventListener("keydown", (e) => {
    const inField = e.target.closest("input, textarea, select, [contenteditable]");
    if (inField) return;
    const k = e.key.toLowerCase();
    const ctrlOrCmd = e.ctrlKey || e.metaKey;
    // Ctrl/Cmd + S (save), Ctrl/Cmd + U (view source), Ctrl/Cmd + Shift + I/J/C (devtools)
    if (ctrlOrCmd && (k === "s" || k === "u")) {
      e.preventDefault();
    }
    if (ctrlOrCmd && e.shiftKey && (k === "i" || k === "j" || k === "c")) {
      e.preventDefault();
    }
    // F12 (devtools)
    if (k === "f12") {
      e.preventDefault();
    }
  });

  /* -------- Language dropdown switcher -------- */
  document.querySelectorAll("[data-lang-select]").forEach((select) => {
    const trigger = select.querySelector("[data-lang-trigger]");
    const menu = select.querySelector("[data-lang-menu]");
    if (!trigger || !menu) return;

    const close = () => {
      select.classList.remove("is-open");
      trigger.setAttribute("aria-expanded", "false");
    };
    const open = () => {
      // close any others first
      document.querySelectorAll("[data-lang-select].is-open").forEach((s) => {
        if (s !== select) s.classList.remove("is-open");
      });
      select.classList.add("is-open");
      trigger.setAttribute("aria-expanded", "true");
    };

    trigger.addEventListener("click", (e) => {
      e.stopPropagation();
      select.classList.contains("is-open") ? close() : open();
    });

    menu.addEventListener("click", (e) => {
      const opt = e.target.closest("[data-lang]");
      if (!opt) return;
      const lang = opt.getAttribute("data-lang");
      // update active state
      menu.querySelectorAll("[data-lang]").forEach((o) => o.classList.toggle("is-active", o === opt));
      // update trigger display
      const flag = opt.querySelector(".lang-flag")?.cloneNode(true);
      const code = opt.querySelector(".lang-code")?.textContent || "";
      const triggerFlag = trigger.querySelector(".lang-flag");
      const triggerCode = trigger.querySelector(".lang-code");
      if (flag && triggerFlag) triggerFlag.replaceWith(flag);
      if (triggerCode) triggerCode.textContent = code;
      close();
      // delegate actual i18n to RouteByI18n if available
      if (window.RouteByI18n?.applyLang) window.RouteByI18n.applyLang(lang);
    });

    // click outside closes
    document.addEventListener("click", (e) => {
      if (!select.contains(e.target)) close();
    });
    // escape closes
    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape") close();
    });
  });

  /* -------- Scroll-to-top button -------- */
  const scrollTopBtn = $("[data-scroll-top]");
  if (scrollTopBtn) {
    const SHOW_AT = 400; // px scrolled before button appears
    const onScroll = () => {
      if (window.pageYOffset > SHOW_AT) {
        scrollTopBtn.classList.add("is-visible");
      } else {
        scrollTopBtn.classList.remove("is-visible");
      }
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
    scrollTopBtn.addEventListener("click", () => {
      window.scrollTo({ top: 0, behavior: "smooth" });
    });
  }
})();
