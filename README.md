# Steamy Dumpling

English-only static website for a Shanghai soup dumpling restaurant.

## Stack

- **Content:** `content/*.json` (site info, menu)
- **Build:** `node build.mjs` → outputs to `dist/`
- **Deploy:** Cloudflare Pages (GitHub sync)

## Local development

```bash
npm run build
npm run preview   # wrangler pages dev
```

## Cloudflare Pages settings

| Setting | Value |
|---------|-------|
| Build command | `npm run build` |
| Build output directory | `dist` |
| Framework preset | None |

## Edit content

- **Store info, hours, address:** `content/site.json`
- **Menu items & prices:** `content/menu.json`
- **Hero video:** replace `public/assets/video/hero.mp4`
- **Images:** add to `public/assets/images/`, then rebuild

After editing, run `npm run build` and push to GitHub.

## Pages

- `/` — Home (video hero)
- `/menu/` — Full menu
- `/about/` — Brand story
- `/gallery/` — Photos
- `/location/` — Address, hours, map
- `/contact/` — Phone & email
