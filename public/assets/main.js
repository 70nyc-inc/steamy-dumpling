/** Steamy Dumpling — site interactions */

(function () {
  const nav = document.querySelector(".site-nav");
  const toggle = document.querySelector(".nav-toggle");
  const links = document.querySelector(".nav-links");
  const heroVideo = document.querySelector(".hero-video");
  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const heroMobileMq = window.matchMedia("(max-width: 768px)");

  function loadHeroVideo() {
    if (!heroVideo || reducedMotion) return;
    const src = heroMobileMq.matches
      ? heroVideo.dataset.srcMobile
      : heroVideo.dataset.srcDesktop;
    const poster = heroMobileMq.matches
      ? heroVideo.dataset.posterMobile
      : heroVideo.dataset.posterDesktop;
    if (!src) return;
    const needsSrc = heroVideo.dataset.activeSrc !== src;
    const needsPoster = poster && heroVideo.getAttribute("poster") !== poster;
    if (!needsSrc && !needsPoster) return;
    heroVideo.dataset.activeSrc = src;
    if (poster) heroVideo.setAttribute("poster", poster);
    const time = heroVideo.currentTime || 0;
    heroVideo.src = src;
    heroVideo.load();
    heroVideo.addEventListener(
      "loadedmetadata",
      () => {
        if (time > 0 && time < heroVideo.duration) heroVideo.currentTime = time;
        heroVideo.play().catch(() => {});
      },
      { once: true },
    );
  }

  if (heroVideo) {
    if (reducedMotion) {
      heroVideo.pause();
      heroVideo.removeAttribute("autoplay");
    } else {
      loadHeroVideo();
      heroMobileMq.addEventListener("change", loadHeroVideo);
    }
  }

  function onScroll() {
    if (!nav) return;
    nav.classList.toggle("is-scrolled", window.scrollY > 60);
  }
  window.addEventListener("scroll", onScroll, { passive: true });
  onScroll();

  if (toggle && links) {
    toggle.addEventListener("click", () => {
      const open = links.classList.toggle("is-open");
      toggle.setAttribute("aria-expanded", String(open));
    });
    links.querySelectorAll("a").forEach((a) => {
      a.addEventListener("click", () => {
        links.classList.remove("is-open");
        toggle.setAttribute("aria-expanded", "false");
      });
    });
  }

  const heroContent = document.querySelector(".hero-content");
  const heroScroll = document.querySelector(".hero-scroll");

  function revealHeroContent() {
    if (!heroContent || heroContent.classList.contains("is-visible")) return;
    heroContent.classList.add("is-visible");
    heroScroll?.classList.add("is-visible");
  }

  if (heroContent) {
    if (reducedMotion) {
      revealHeroContent();
    } else if (heroVideo) {
      const REVEAL_AT = 3;
      const onTimeUpdate = () => {
        if (heroVideo.currentTime < REVEAL_AT) return;
        heroVideo.removeEventListener("timeupdate", onTimeUpdate);
        revealHeroContent();
      };
      heroVideo.addEventListener("timeupdate", onTimeUpdate);
      setTimeout(revealHeroContent, REVEAL_AT * 1000 + 800);
    } else {
      setTimeout(revealHeroContent, 3000);
    }
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
