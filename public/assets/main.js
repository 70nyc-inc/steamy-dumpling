/** Steamy Dumpling — site interactions */

(function () {
  const nav = document.querySelector(".site-nav");
  const toggle = document.querySelector(".nav-toggle");
  const links = document.querySelector(".nav-links");
  const heroVideo = document.querySelector(".hero-video");
  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const heroMobileMq = window.matchMedia("(max-width: 768px)");

  function syncHeroVideoOnResize() {
    if (!heroVideo || reducedMotion) return;
    heroVideo.load();
    heroVideo.play().catch(() => {});
  }

  if (heroVideo) {
    if (reducedMotion) {
      heroVideo.pause();
      heroVideo.removeAttribute("autoplay");
    } else {
      heroMobileMq.addEventListener("change", syncHeroVideoOnResize);
    }
  }

  function onScroll() {
    if (!nav) return;
    nav.classList.toggle("is-scrolled", window.scrollY > 60);
  }
  window.addEventListener("scroll", onScroll, { passive: true });
  onScroll();

  if (toggle && links) {
    const backdrop = document.querySelector(".nav-backdrop");

    function syncMobileNavOffset() {
      if (!nav || !heroMobileMq.matches) return;
      nav.style.setProperty("--mobile-nav-bar-h", `${nav.offsetHeight}px`);
    }

    function setMenuOpen(open) {
      if (open) syncMobileNavOffset();
      links.classList.toggle("is-open", open);
      nav?.classList.toggle("is-menu-open", open);
      toggle.classList.toggle("is-open", open);
      backdrop?.classList.toggle("is-visible", open);
      document.body.classList.toggle("nav-open", open);
      toggle.setAttribute("aria-expanded", String(open));
      toggle.setAttribute("aria-label", open ? "Close menu" : "Open menu");
    }

    toggle.addEventListener("click", () => {
      setMenuOpen(!links.classList.contains("is-open"));
    });

    backdrop?.addEventListener("click", () => setMenuOpen(false));

    links.querySelectorAll("a").forEach((a) => {
      a.addEventListener("click", () => setMenuOpen(false));
    });

    window.addEventListener("keydown", (e) => {
      if (e.key === "Escape" && links.classList.contains("is-open")) setMenuOpen(false);
    });

    heroMobileMq.addEventListener("change", () => {
      if (!heroMobileMq.matches && links.classList.contains("is-open")) setMenuOpen(false);
      syncMobileNavOffset();
    });

    window.addEventListener("resize", syncMobileNavOffset, { passive: true });
  }

  const heroContent = document.querySelector(".hero-content");
  const heroScroll = document.querySelector(".hero-scroll");

  function revealHeroContent() {
    if (!heroContent || heroContent.classList.contains("is-visible")) return;
    heroContent.classList.add("is-visible");
    heroScroll?.classList.add("is-visible");
  }

  if (heroContent) {
    revealHeroContent();
  }

  const revealEls = document.querySelectorAll(".reveal");
  if (revealEls.length) {
    if (reducedMotion) {
      revealEls.forEach((el) => el.classList.add("is-visible"));
    } else {
      const observer = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            if (!entry.isIntersecting) return;
            entry.target.classList.add("is-visible");
            observer.unobserve(entry.target);
          });
        },
        { threshold: 0.12, rootMargin: "0px 0px -40px 0px" },
      );
      revealEls.forEach((el) => observer.observe(el));
    }
  }

  // ── Lightbox ───────────────────────────────────────────────────────
  const dataEl = document.getElementById("lightbox-data");
  const lightbox = document.getElementById("lightbox");
  if (!dataEl || !lightbox) return;

  let items = [];
  try {
    items = JSON.parse(dataEl.textContent || "[]");
  } catch {
    return;
  }
  if (!items.length) return;

  const img = lightbox.querySelector(".lightbox-img");
  const title = lightbox.querySelector(".lightbox-title");
  const zh = lightbox.querySelector(".lightbox-zh");
  const desc = lightbox.querySelector(".lightbox-desc");
  const price = lightbox.querySelector(".lightbox-price");
  const counter = lightbox.querySelector(".lightbox-counter");
  const prevBtn = lightbox.querySelector(".lightbox-prev");
  const nextBtn = lightbox.querySelector(".lightbox-next");
  let index = 0;
  let lastFocus = null;

  function render(i) {
    const item = items[i];
    if (!item) return;
    index = i;
    img.src = item.image;
    img.alt = item.name;
    title.textContent = item.name;
    zh.textContent = item.nameZh || "";
    zh.hidden = !item.nameZh;
    desc.textContent = item.desc || "";
    desc.hidden = !item.desc;
    price.textContent = item.price || "";
    price.hidden = !item.price;
    counter.textContent = `${i + 1} / ${items.length}`;
    prevBtn.disabled = items.length <= 1;
    nextBtn.disabled = items.length <= 1;
    lightbox.setAttribute("aria-label", item.name);
  }

  function openAt(i) {
    if (i < 0 || i >= items.length) return;
    lastFocus = document.activeElement;
    render(i);
    lightbox.hidden = false;
    lightbox.setAttribute("aria-hidden", "false");
    document.body.classList.add("lightbox-open");
    lightbox.querySelector(".lightbox-close")?.focus();
  }

  function close() {
    lightbox.hidden = true;
    lightbox.setAttribute("aria-hidden", "true");
    document.body.classList.remove("lightbox-open");
    img.removeAttribute("src");
    if (lastFocus && typeof lastFocus.focus === "function") lastFocus.focus();
  }

  function step(delta) {
    const next = (index + delta + items.length) % items.length;
    render(next);
  }

  document.querySelectorAll(".js-lightbox-open").forEach((btn) => {
    btn.addEventListener("click", () => {
      const i = Number(btn.getAttribute("data-lightbox-index"));
      if (!Number.isNaN(i)) openAt(i);
    });
  });

  lightbox.querySelectorAll("[data-lightbox-close]").forEach((el) => {
    el.addEventListener("click", close);
  });

  prevBtn?.addEventListener("click", () => step(-1));
  nextBtn?.addEventListener("click", () => step(1));

  window.addEventListener("keydown", (e) => {
    if (lightbox.hidden) return;
    if (e.key === "Escape") close();
    if (e.key === "ArrowLeft") step(-1);
    if (e.key === "ArrowRight") step(1);
  });
})();

// ── View Transitions ─────────────────────────────────
// ── Menu category nav highlight ──────────────────────
const catNav = document.querySelector(".menu-cat-nav");
if (catNav) {
  const catSections = Array.from(document.querySelectorAll(".menu-category[id], [id^='cat-']"));
  const catLinks = Array.from(catNav.querySelectorAll(".menu-cat-nav-link"));
  const navOffset = 120;

  function updateActiveLink() {
    let current = catSections[0];
    for (const sec of catSections) {
      if (sec.getBoundingClientRect().top <= navOffset) current = sec;
    }
    catLinks.forEach((l) => {
      const target = l.getAttribute("href").slice(1);
      l.classList.toggle("is-active", current && current.id === target);
    });
    // scroll active link into view within nav
    const active = catNav.querySelector(".is-active");
    if (active) active.scrollIntoView({ inline: "nearest", block: "nearest" });
  }

  window.addEventListener("scroll", updateActiveLink, { passive: true });
  updateActiveLink();
}

if (document.startViewTransition) {
  document.addEventListener("click", (e) => {
    const a = e.target.closest("a[href]");
    if (!a) return;
    const href = a.getAttribute("href");
    if (
      !href ||
      href.startsWith("#") ||
      href.startsWith("tel:") ||
      href.startsWith("mailto:") ||
      a.target === "_blank" ||
      e.metaKey || e.ctrlKey || e.shiftKey || e.altKey
    ) return;
    const url = new URL(href, location.href);
    if (url.origin !== location.origin) return;
    e.preventDefault();
    document.startViewTransition(() => {
      location.href = href;
    });
  });
}
