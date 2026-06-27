#!/usr/bin/env node
/** Build static site from content JSON → dist/ */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.dirname(fileURLToPath(import.meta.url));
const DIST = path.join(ROOT, "dist");
const PUBLIC = path.join(ROOT, "public");
const CONTENT = path.join(ROOT, "content");

const site = JSON.parse(fs.readFileSync(path.join(CONTENT, "site.json"), "utf8"));
const menu = JSON.parse(fs.readFileSync(path.join(CONTENT, "menu.json"), "utf8"));

function collectLightboxItems() {
  const items = [];
  for (const cat of menu.categories) {
    for (const item of cat.items) {
      if (item.image) {
        items.push({
          image: item.image,
          name: item.name,
          nameZh: item.nameZh || "",
          desc: item.desc || "",
          price: item.price || "",
        });
      }
    }
  }
  return items;
}

const LIGHTBOX_ITEMS = collectLightboxItems();
const LIGHTBOX_INDEX = new Map(LIGHTBOX_ITEMS.map((item, index) => [item.name, index]));

function lightboxIndexFor(item) {
  return LIGHTBOX_INDEX.get(item.name) ?? -1;
}

function firstCategoryLightboxIndex(cat) {
  for (const item of cat.items) {
    const index = lightboxIndexFor(item);
    if (index >= 0) return index;
  }
  return -1;
}

function lightboxTrigger(index, inner, className, ariaLabel) {
  if (index < 0) return inner;
  return `<button type="button" class="${className} js-lightbox-open" data-lightbox-index="${index}" aria-label="${esc(ariaLabel)}">${inner}</button>`;
}

const SITE = site.domain.replace(/\/$/, "");
const ADDR = `${site.address.street}, ${site.address.city}, ${site.address.state} ${site.address.zip}`;
const ADDR_LINE = `${site.address.city}, ${site.address.state}`;

const NAV = [
  ["menu", "Menu"],
  ["about", "About"],
  ["location", "Location"],
  ["contact", "Contact"],
];

const PAGES = [
  { slug: "", file: "index.html", title: `${site.name} | Shanghai Soup Dumplings in ${ADDR_LINE}`, desc: `Hand-folded Shanghai soup dumplings in ${site.address.city}. Pork xiaolongbao, crab roe dumplings & more. Dine in or takeout.` },
  { slug: "menu", file: "menu/index.html", title: `Menu | ${site.name}`, desc: `Explore our menu of Shanghai soup dumplings, pan-fried buns, sides and drinks at ${site.name} in ${ADDR_LINE}.` },
  { slug: "about", file: "about/index.html", title: `About | ${site.name}`, desc: `Learn how ${site.name} crafts authentic Shanghai soup dumplings by hand, steamed fresh to order in ${ADDR_LINE}.` },
  { slug: "location", file: "location/index.html", title: `Location & Hours | ${site.name}`, desc: `Visit ${site.name} at ${ADDR}. Hours, directions, parking and transit info.` },
  { slug: "contact", file: "contact/index.html", title: `Contact | ${site.name}`, desc: `Contact ${site.name} for questions, large orders, or catering inquiries. Call ${site.phoneDisplay}.` },
];

// ── helpers ──────────────────────────────────────────────────────────

function esc(s) {
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

const TAG_META = {
  Signature: { class: "signature", label: "★", title: "Signature" },
  Vegetarian: { class: "vegetarian", label: "V", title: "Vegetarian" },
  Spicy: { class: "spicy", label: "🌶", title: "Spicy" },
};

function itemTags(item) {
  if (Array.isArray(item.tags)) return item.tags;
  if (item.tag) return [item.tag];
  return [];
}

function renderTags(tags, baseClass = "menu-tag") {
  return (Array.isArray(tags) ? tags : itemTags({ tags }))
    .map((tag) => {
      const meta = TAG_META[tag] || { class: "default", label: tag, title: tag };
      return `<span class="${baseClass} ${baseClass}--${meta.class}" title="${esc(meta.title || tag)}" aria-label="${esc(meta.title || tag)}">${esc(meta.label)}</span>`;
    })
    .join("");
}

function renderItemTags(item, baseClass = "menu-tag") {
  const tags = itemTags(item);
  if (!tags.length) return "";
  return `<span class="menu-tags">${renderTags(tags, baseClass)}</span>`;
}

function itemImage(item, category) {
  return item.image || category?.image || "/assets/images/hero-poster.jpg";
}

function url(slug) {
  return slug ? `${SITE}/${slug}/` : `${SITE}/`;
}

function pathHref(slug) {
  return slug ? `/${slug}/` : "/";
}

function write(file, html) {
  const dest = path.join(DIST, file);
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  fs.writeFileSync(dest, html);
}

function copyDir(src, dest) {
  fs.mkdirSync(dest, { recursive: true });
  for (const entry of fs.readdirSync(src, { withFileTypes: true })) {
    const s = path.join(src, entry.name);
    const d = path.join(dest, entry.name);
    if (entry.isDirectory()) copyDir(s, d);
    else fs.copyFileSync(s, d);
  }
}

function logoLink(imgClass = "logo-img", isHome = false) {
  const scrolledLogo = site.logo || "/assets/images/logo_din_yun_feng_2.png";
  if (imgClass.includes("footer")) {
    const footerLogo = site.footerLogo || scrolledLogo;
    return `<a href="/" class="logo" aria-label="${esc(site.name)}">
          <img src="${esc(footerLogo)}" alt="" class="${esc(imgClass)}" width="733" height="482" decoding="async" />
        </a>`;
  }
  if (!isHome) {
    return `<a href="/" class="logo logo--inner" aria-label="${esc(site.name)}">
          <img src="${esc(scrolledLogo)}" alt="" class="logo-img logo-img--primary" width="733" height="82" decoding="async" />
        </a>`;
  }
  const topLogo = site.navLogo || scrolledLogo;
  const wordmark = site.navWordmark || site.name;
  return `<a href="/" class="logo" aria-label="${esc(site.name)}">
          <span class="logo-brand logo-brand--top">
            <img src="${esc(topLogo)}" alt="" class="logo-img logo-img--top" width="733" height="283" decoding="async" />
            <span class="logo-wordmark">${esc(wordmark)}</span>
          </span>
          <img src="${esc(scrolledLogo)}" alt="" class="logo-img logo-img--scrolled" width="733" height="482" decoding="async" />
        </a>`;
}

function nav(active) {
  const isHome = active === "" || active === "home";
  const links = NAV.map(([slug, label]) => {
    const cls = slug === active ? ' class="active"' : "";
    return `<li><a href="${pathHref(slug)}"${cls}>${label}</a></li>`;
  }).join("\n          ");
  return `
    <nav class="site-nav${isHome ? "" : " site-nav--inner"}" aria-label="Main navigation">
      <div class="container nav-inner">
        ${logoLink("logo-img", isHome)}
        <button class="nav-toggle" aria-label="Open menu" aria-expanded="false">
          <span></span><span></span><span></span>
        </button>
        <ul class="nav-links" role="list">
          ${links}
          <li class="nav-links-cta"><a href="tel:${site.phone.replace(/\D/g, "")}" class="nav-call-link">Call to Order</a></li>
        </ul>
        <a href="tel:${site.phone.replace(/\D/g, "")}" class="btn btn-nav">Call to Order</a>
      </div>
      <button type="button" class="nav-backdrop" aria-label="Close menu" tabindex="-1"></button>
    </nav>`;
}

function footer() {
  const navLinks = NAV.map(([slug, label]) =>
    `<a href="${pathHref(slug)}">${label}</a>`
  ).join("\n          ");
  return `
    <footer class="site-footer">
      <div class="container footer-grid">
        <div class="footer-brand">
          ${logoLink("logo-img logo-img--footer")}
          <p class="footer-tagline">${esc(site.tagline)}</p>
        </div>
        <div class="footer-nav">
          ${navLinks}
        </div>
        <div class="footer-contact">
          <p><a href="tel:${site.phone.replace(/\D/g, "")}">${esc(site.phoneDisplay)}</a></p>
          <p><a href="mailto:${esc(site.email)}">${esc(site.email)}</a></p>
          <p>${esc(ADDR)}</p>
        </div>
      </div>
      <div class="container footer-bottom">
        <p>&copy; ${new Date().getFullYear()} ${esc(site.name)}. All rights reserved.</p>
        <p class="footer-credit">Website by <a href="https://70nyc.com/" rel="noopener">70NYC</a></p>
      </div>
    </footer>
    <div class="mobile-bar" aria-label="Quick actions">
      <a href="tel:${site.phone.replace(/\D/g, "")}" class="mobile-bar-btn">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z"/></svg>
        Call
      </a>
      <a href="${esc(site.mapsUrl)}" class="mobile-bar-btn" target="_blank" rel="noopener noreferrer">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>
        Directions
      </a>
      <a href="/menu/" class="mobile-bar-btn">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true"><path d="M4 6h16M4 12h16M4 18h16"/></svg>
        Menu
      </a>
    </div>`;
}

function head({ title, desc, canonical, ogImage = "/assets/images/hero-poster.jpg" }) {
  const img = ogImage.startsWith("http") ? ogImage : `${SITE}${ogImage}`;
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${esc(title)}</title>
  <meta name="description" content="${esc(desc)}" />
  <link rel="canonical" href="${esc(canonical)}" />
  <link rel="icon" href="/favicon.svg" type="image/svg+xml" />
  <meta property="og:locale" content="en_US" />
  <meta property="og:title" content="${esc(title)}" />
  <meta property="og:description" content="${esc(desc)}" />
  <meta property="og:type" content="website" />
  <meta property="og:url" content="${esc(canonical)}" />
  <meta property="og:image" content="${esc(img)}" />
  <meta name="twitter:card" content="summary_large_image" />
  <meta name="twitter:image" content="${esc(img)}" />
  <link rel="preconnect" href="https://fonts.googleapis.com" />
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
  <link href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,400;0,500;0,600;0,700;1,400&family=Inter:wght@400;500;600&family=Noto+Serif+TC:wght@500;600&display=swap" rel="stylesheet" />
  <link rel="stylesheet" href="/assets/style.css" />
  ${schemaRestaurant()}
</head>`;
}

function schemaRestaurant() {
  const hours = site.hours.map((h) => ({
    "@type": "OpeningHoursSpecification",
    dayOfWeek: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"],
    opens: "11:00",
    closes: "21:00",
  }));
  const json = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Restaurant",
        "@id": `${SITE}/#restaurant`,
        name: site.name,
        url: `${SITE}/`,
        telephone: site.phone,
        email: site.email,
        image: `${SITE}/assets/images/hero-poster.jpg`,
        priceRange: "$$",
        servesCuisine: ["Shanghainese", "Chinese", "Soup Dumplings", "Dim Sum"],
        address: {
          "@type": "PostalAddress",
          streetAddress: site.address.street,
          addressLocality: site.address.city,
          addressRegion: site.address.state,
          postalCode: site.address.zip,
          addressCountry: site.address.country,
        },
        openingHoursSpecification: hours,
        menu: `${SITE}/menu/`,
        description: site.hero.subtitle,
      },
      {
        "@type": "WebSite",
        "@id": `${SITE}/#website`,
        url: `${SITE}/`,
        name: site.name,
      },
    ],
  };
  return `<script type="application/ld+json">${JSON.stringify(json)}</script>`;
}

function lightboxMarkup(items) {
  if (!items.length) return "";
  return `
  <script type="application/json" id="lightbox-data">${JSON.stringify(items)}</script>
  <div class="lightbox" id="lightbox" hidden aria-hidden="true" role="dialog" aria-modal="true" aria-label="Dish photo viewer">
    <div class="lightbox-backdrop" data-lightbox-close tabindex="-1"></div>
    <div class="lightbox-panel" role="document">
      <button type="button" class="lightbox-close" data-lightbox-close aria-label="Close">&times;</button>
      <button type="button" class="lightbox-nav lightbox-prev" aria-label="Previous dish">&lsaquo;</button>
      <button type="button" class="lightbox-nav lightbox-next" aria-label="Next dish">&rsaquo;</button>
      <figure class="lightbox-figure">
        <div class="lightbox-media">
          <img class="lightbox-img" src="" alt="" />
        </div>
        <figcaption class="lightbox-caption">
          <h3 class="lightbox-title"></h3>
          <p class="lightbox-zh"></p>
          <p class="lightbox-desc"></p>
          <p class="lightbox-price"></p>
          <p class="lightbox-counter" aria-live="polite"></p>
        </figcaption>
      </figure>
    </div>
  </div>`;
}

function pageShell(active, body, opts, extraLightbox = []) {
  const lightboxItems = [...LIGHTBOX_ITEMS, ...extraLightbox];
  return `${head(opts)}
<body class="page-${active || "home"}">
  ${nav(active)}
  <main id="main">
${body}
  </main>
  ${footer()}
  ${lightboxMarkup(lightboxItems)}
  <script src="/assets/main.js"></script>
</body>
</html>`;
}

// ── page bodies ──────────────────────────────────────────────────────

function heroHighlightsHtml() {
  const items = site.hero.highlights?.length
    ? site.hero.highlights
    : site.hero.subtitle.split(/\s*·\s*/).filter(Boolean);
  return items.map((text) =>
    `<span class="hero-highlight"><span class="hero-highlight-mark" aria-hidden="true">✦</span>${esc(text)}</span>`,
  ).join("");
}

function homeBody() {
  const xlb = menu.categories[0];
  const signatures = xlb.items.slice(0, 3);
  const cards = signatures.map((item) => {
    const img = itemImage(item, xlb);
    const index = lightboxIndexFor(item);
    const imgBtn = lightboxTrigger(
      index,
      "",
      "dish-card-img",
      `View larger photo of ${item.name}`,
    );
    const imgStyle = ` style="background-image:url('${img}')"`;
    const cardImg = index >= 0
      ? imgBtn.replace('class="dish-card-img js-lightbox-open"', `class="dish-card-img js-lightbox-open"${imgStyle}`)
      : `<div class="dish-card-img"${imgStyle}></div>`;
    return `
        <article class="dish-card reveal">
          ${cardImg}
          <div class="dish-card-body">
            <h3>${esc(item.name)}</h3>
            <p class="dish-name-zh">${esc(item.nameZh)}${renderItemTags(item, "dish-tag")}</p>
            <p>${esc(item.desc)}</p>
            <p class="dish-price">${esc(item.price)}</p>
          </div>
        </article>`;
  }).join("\n");

  const reviews = site.reviews.map((r) => `
        <blockquote class="review-card">
          <div class="stars" aria-label="5 stars">★★★★★</div>
          <p>&ldquo;${esc(r.quote)}&rdquo;</p>
          <cite>${esc(r.source)}</cite>
        </blockquote>`).join("\n");

  const hoursRows = site.hours.map((h) => `
            <div class="hours-row">
              <dt>${esc(h.days)}</dt>
              <dd>${esc(h.open)} – ${esc(h.close)}</dd>
            </div>`).join("");

  return `
    <section class="hero" aria-label="Introduction">
      <link rel="preload" as="video" href="/assets/video/hero-mobile.mp4" type="video/mp4" media="(max-width: 768px)" />
      <link rel="preload" as="video" href="/assets/video/hero.mp4" type="video/mp4" media="(min-width: 769px)" />
      <video class="hero-video" autoplay muted loop playsinline>
        <script>
          document.currentScript.parentElement.poster = matchMedia("(max-width: 768px)").matches
            ? "/assets/images/hero-poster-mobile.jpg"
            : "/assets/images/hero-poster.jpg";
        </script>
        <source src="/assets/video/hero-mobile.mp4" type="video/mp4" media="(max-width: 768px)" />
        <source src="/assets/video/hero.mp4" type="video/mp4" media="(min-width: 769px)" />
      </video>
      <div class="hero-overlay"></div>
      <div class="hero-content container">
        <p class="hero-eyebrow hero-animate">${esc(site.hero.eyebrow || site.tagline)}</p>
        <div class="hero-logo hero-animate">
          <img src="${esc(site.heroLogo)}" alt="${esc(site.nameZh || site.name)}" class="hero-logo-img" width="733" height="283" loading="eager" />
        </div>
        <h1 class="hero-title-en hero-animate">${esc(site.hero.title)}</h1>
        <p class="hero-sub hero-animate">${heroHighlightsHtml()}</p>
        <div class="hero-cta hero-animate">
          <a href="/menu/" class="btn btn-primary">View Menu</a>
          <a href="tel:${site.phone.replace(/\D/g, "")}" class="btn btn-outline">Call to Order</a>
        </div>
      </div>
      <a href="#story" class="hero-scroll" aria-label="Scroll to our story">
        <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true">
          <path d="M10 14L4 8h12L10 14z" fill="currentColor"/>
        </svg>
      </a>
    </section>

    <section class="section story" id="story" aria-labelledby="story-title">
      <div class="container story-grid">
        <div class="story-text reveal">
          <h2 id="story-title">${esc(site.story.title)}</h2>
          ${site.story.paragraphs.map((p) => `<p>${esc(p)}</p>`).join("\n          ")}
          <a href="/about/" class="link-arrow">Our story</a>
        </div>
        <div class="story-media reveal">
          ${lightboxTrigger(
            0,
            `<img src="/assets/images/soup-dumpling.png" alt="Hand-folded Shanghai soup dumplings at ${esc(site.name)}" width="640" height="480" loading="lazy" />`,
            "story-media-btn",
            "View larger photo of soup dumplings",
          )}
        </div>
      </div>
    </section>

    <section class="section signatures" id="signatures" aria-labelledby="signatures-title">
      <div class="container">
        <div class="section-head reveal">
          <h2 id="signatures-title">From the Steamer</h2>
          <p>Our most-loved baskets, steamed fresh throughout the day.</p>
        </div>
        <div class="dish-grid">${cards}
        </div>
        <p class="section-cta reveal"><a href="/menu/" class="link-arrow">View full menu</a></p>
      </div>
    </section>

    <section class="section reviews" aria-labelledby="reviews-title">
      <div class="container">
        <h2 id="reviews-title" class="reveal">What Guests Say</h2>
        <div class="review-grid">${reviews.replace(/<blockquote class="review-card"/g, '<blockquote class="review-card reveal"')}
        </div>
      </div>
    </section>

    <section class="section visit visit-band" id="visit" aria-labelledby="visit-title">
      <div class="container">
        <div class="visit-band-head reveal">
          <h2 id="visit-title">Visit Us</h2>
          <p class="visit-band-lead">${esc(site.transit)}</p>
        </div>
        <div class="visit-band-grid reveal">
          <div class="visit-band-col">
            <h3>Location</h3>
            <address class="visit-addr">${esc(ADDR)}</address>
            <a href="${esc(site.mapsUrl)}" class="link-arrow link-arrow--light" target="_blank" rel="noopener noreferrer">Get directions</a>
          </div>
          <div class="visit-band-col">
            <h3>Hours</h3>
            <dl class="hours-list">${hoursRows}
            </dl>
          </div>
          <div class="visit-band-col">
            <h3>Contact</h3>
            <p class="visit-phone"><a href="tel:${site.phone.replace(/\D/g, "")}">${esc(site.phoneDisplay)}</a></p>
            <p class="visit-email"><a href="mailto:${esc(site.email)}">${esc(site.email)}</a></p>
            <a href="/location/" class="link-arrow link-arrow--light">Full hours &amp; parking</a>
          </div>
        </div>
        <div class="visit-band-map reveal">
          <iframe title="Map to ${esc(site.name)}" src="https://maps.google.com/maps?q=${encodeURIComponent(ADDR)}&amp;output=embed" loading="lazy" referrerpolicy="no-referrer-when-downgrade"></iframe>
        </div>
      </div>
    </section>`;
}

function menuBody() {
  const cats = menu.categories.map((cat) => {
    const catLightboxIndex = firstCategoryLightboxIndex(cat);
    const items = cat.items.map((item) => {
      const index = lightboxIndexFor(item);
      const thumbInner = item.image
        ? `<img src="${item.image}" alt="${esc(item.name)}" width="88" height="88" loading="lazy" />`
        : "";
      const thumb = item.image
        ? lightboxTrigger(index, thumbInner, "menu-item-thumb", `View larger photo of ${item.name}`)
        : "";
      const tagsHtml = renderItemTags(item);
      return `
          <article class="menu-item${item.image ? " menu-item--with-thumb" : ""}">
            ${thumb}
            <div class="menu-item-body">
              <div class="menu-item-head">
                <div class="menu-item-names">
                  <div class="menu-title-row">
                    <h3 class="menu-name">${esc(item.name)}</h3>
                    ${tagsHtml}
                  </div>
                  ${item.nameZh ? `<p class="menu-meta"><span class="menu-zh">${esc(item.nameZh)}</span></p>` : ""}
                </div>
                <span class="menu-price">${esc(item.price)}</span>
              </div>
              <p class="menu-desc">${esc(item.desc)}</p>
            </div>
          </article>`;
    }).join("\n");
    const featureInner = cat.image
      ? `<img src="${cat.image}" alt="${esc(cat.name)}" width="480" height="360" loading="lazy" />`
      : "";
    const featureImg = cat.image
      ? lightboxTrigger(
          catLightboxIndex,
          featureInner,
          "menu-category-photo",
          `View ${cat.name} dishes`,
        )
      : "";
    return `
        <section class="menu-category${cat.image ? " menu-category--featured" : ""}" aria-labelledby="cat-${cat.name.replace(/\s/g, "-").toLowerCase()}">
          <div class="menu-category-top">
            <h2 id="cat-${cat.name.replace(/\s/g, "-").toLowerCase()}">${esc(cat.name)}${cat.nameZh ? ` <span class="menu-cat-zh">${esc(cat.nameZh)}</span>` : ""}</h2>
            ${featureImg}
          </div>
          <div class="menu-list">${items}
          </div>
        </section>`;
  }).join("\n");

  return `
    <section class="page-hero page-hero-sm">
      <div class="container">
        <h1>Menu</h1>
        <p>Shanghai soup dumplings and small plates, made fresh daily.</p>
        <ul class="menu-legend" aria-label="Menu icons">
          <li><span class="menu-tag menu-tag--signature" title="Signature">★</span> Signature</li>
          <li><span class="menu-tag menu-tag--vegetarian" title="Vegetarian">V</span> Vegetarian</li>
          <li><span class="menu-tag menu-tag--spicy" title="Spicy">🌶</span> Spicy</li>
        </ul>
      </div>
    </section>
    <section class="section menu-page">
      <div class="container">${cats}
        <p class="menu-note">Prices subject to change. Please inform staff of any allergies.</p>
      </div>
    </section>`;
}

function aboutBody() {
  return `
    <section class="page-hero page-hero-sm">
      <div class="container">
        <h1>About</h1>
        <p>${esc(site.tagline)}</p>
      </div>
    </section>
    <section class="section">
      <div class="container prose">
        <h2>${esc(site.story.title)}</h2>
        ${site.story.paragraphs.map((p) => `<p>${esc(p)}</p>`).join("\n        ")}
        <p>We welcome you to dine in, take out, or call ahead for larger orders. Every basket is steamed to order — because soup dumplings are best enjoyed the moment they leave the steamer.</p>
      </div>
    </section>`;
}

function galleryBody() {
  const galleryItems = [
    {
      image: "/assets/images/soup-dumpling.png",
      name: "Steamed Soup Dumplings",
      nameZh: "小笼汤包",
      desc: "Hand-folded Shanghai xiaolongbao, steamed to order in bamboo baskets.",
      price: "",
    },
    ...[2, 3, 4, 5, 6].map((n) => ({
      image: "/assets/images/hero-poster.jpg",
      name: `Gallery photo ${n}`,
      nameZh: "",
      desc: "",
      price: "",
    })),
  ];
  const offset = LIGHTBOX_ITEMS.length;
  const imgs = galleryItems.map((item, i) => `
        <figure class="gallery-item">
          ${lightboxTrigger(
            offset + i,
            `<img src="${item.image}" alt="${esc(item.name)}" width="480" height="360" loading="lazy" />`,
            "gallery-item-btn",
            `View larger photo: ${item.name}`,
          )}
        </figure>`).join("\n");

  return {
    extraLightbox: galleryItems,
    html: `
    <section class="page-hero page-hero-sm">
      <div class="container">
        <h1>Gallery</h1>
        <p>A glimpse into our kitchen and dining room.</p>
      </div>
    </section>
    <section class="section">
      <div class="container gallery-grid">${imgs}
      </div>
    </section>`,
  };
}

function locationBody() {
  return `
    <section class="page-hero page-hero-sm">
      <div class="container">
        <h1>Location &amp; Hours</h1>
        <p>Find us in the heart of ${esc(site.address.city)}.</p>
      </div>
    </section>
    <section class="section">
      <div class="container visit-grid">
        <div class="visit-info">
          <h2>Address</h2>
          <address><p>${esc(ADDR)}</p></address>
          <h2>Hours</h2>
          <dl class="hours-list">
            ${site.hours.map((h) => `
            <div class="hours-row">
              <dt>${esc(h.days)}</dt>
              <dd>${esc(h.open)} – ${esc(h.close)}</dd>
            </div>`).join("")}
          </dl>
          <h2>Getting Here</h2>
          <p><strong>Transit:</strong> ${esc(site.transit)}</p>
          <p><strong>Parking:</strong> ${esc(site.parking)}</p>
          <a href="${esc(site.mapsUrl)}" class="btn btn-primary" target="_blank" rel="noopener noreferrer">Open in Google Maps</a>
        </div>
        <div class="visit-map visit-map-tall">
          <iframe title="Map to ${esc(site.name)}" src="https://maps.google.com/maps?q=${encodeURIComponent(ADDR)}&amp;output=embed" loading="lazy" referrerpolicy="no-referrer-when-downgrade"></iframe>
        </div>
      </div>
    </section>`;
}

function contactBody() {
  return `
    <section class="page-hero page-hero-sm">
      <div class="container">
        <h1>Contact</h1>
        <p>Questions, large orders, or catering inquiries.</p>
      </div>
    </section>
    <section class="section">
      <div class="container contact-grid">
        <div class="contact-card">
          <h2>Call</h2>
          <p><a href="tel:${site.phone.replace(/\D/g, "")}" class="contact-big">${esc(site.phoneDisplay)}</a></p>
          <p>Best for takeout and same-day orders.</p>
        </div>
        <div class="contact-card">
          <h2>Email</h2>
          <p><a href="mailto:${esc(site.email)}">${esc(site.email)}</a></p>
          <p>For catering and general inquiries.</p>
        </div>
        <div class="contact-card">
          <h2>Visit</h2>
          <p>${esc(ADDR)}</p>
          <a href="/location/" class="link-arrow">Hours &amp; directions</a>
        </div>
      </div>
    </section>`;
}

function notFoundBody() {
  return `
    <section class="section not-found">
      <div class="container">
        <h1>Page not found</h1>
        <p>The page you&rsquo;re looking for doesn&rsquo;t exist.</p>
        <a href="/" class="btn btn-primary">Back to home</a>
      </div>
    </section>`;
}

const BODY = {
  "": homeBody,
  menu: menuBody,
  about: aboutBody,
  location: locationBody,
  contact: contactBody,
};

// ── build ────────────────────────────────────────────────────────────

if (fs.existsSync(DIST)) fs.rmSync(DIST, { recursive: true });
fs.mkdirSync(DIST, { recursive: true });
copyDir(PUBLIC, DIST);

for (const p of PAGES) {
  const fn = BODY[p.slug] || (() => "");
  const result = fn();
  const extraLightbox = result?.extraLightbox || [];
  const body = result?.html ?? result ?? "";
  write(p.file, pageShell(p.slug, body, {
    title: p.title,
    desc: p.desc,
    canonical: url(p.slug),
  }, extraLightbox));
}

write("404.html", pageShell("404", notFoundBody(), {
  title: `Page Not Found | ${site.name}`,
  desc: `Page not found at ${site.name}.`,
  canonical: `${SITE}/404.html`,
}));

// sitemap
const urls = PAGES.map((p) => `  <url>\n    <loc>${url(p.slug)}</loc>\n    <changefreq>weekly</changefreq>\n  </url>`).join("\n");
write("sitemap.xml", `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls}
</urlset>
`);

write("robots.txt", `User-agent: *
Allow: /

Sitemap: ${SITE}/sitemap.xml
`);

write("llms.txt", `# ${site.name} — Shanghai Soup Dumplings

> ${site.tagline} Hand-folded xiaolongbao and Shanghai-style dumplings in ${ADDR_LINE}.

## Contact

- Website: ${SITE}/
- Phone: ${site.phone}
- Email: ${site.email}
- Address: ${ADDR}

## Pages

- Menu: ${SITE}/menu/
- About: ${SITE}/about/
- Gallery: ${SITE}/gallery/
- Location: ${SITE}/location/
- Contact: ${SITE}/contact/
`);

console.log(`Built ${PAGES.length + 1} pages → dist/`);
