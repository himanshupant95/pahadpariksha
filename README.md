# पहाड़ परीक्षा — pahadpariksha.in

Uttarakhand UKSSSC/UKPSC exam-prep site. Astro static site → GitHub Pages (auto-deploy on every push to `main`).

## Add a new article (from any device, via github.com)
1. Open `src/pages/gk/` → **Add file → Create new file**.
2. Name it like `uttarakhand-lakes.md` (URL becomes `/gk/uttarakhand-lakes/`).
3. Paste this header, then write in Markdown:

```md
---
layout: ../../layouts/Article.astro
title: "उत्तराखंड की प्रमुख झीलें"
description: "150–160 characters, includes the main keyword."
published: "2026-11-20"
updated: "2026-11-20"
breadcrumbs:
  - name: "उत्तराखंड GK"
    href: "/gk/"
faq:
  - q: "प्रश्न?"
    a: "उत्तर।"
---

## Heading
Content…
```
4. **Commit changes** → site rebuilds in ~1–2 min (Actions tab shows progress).
5. Add a card for it in `src/pages/gk/index.astro` and (optionally) the home page.

## Add a quiz
1. Copy `src/data/quizzes/districts-rivers.json` → new file. `answer` is the 0-based index of the correct option.
2. Copy `src/pages/quiz/uttarakhand-districts-rivers.astro`, change the import, title, description.
3. Add a card in `src/pages/quiz/index.astro`.

## Site settings
`src/data/site.ts` — name, contact email, Telegram link, nav menu.

## Built in
Canonical, OG tags, sitemap (`/sitemap-index.xml`), robots.txt, Article + Breadcrumb + FAQ + Quiz + WebSite schema, Pagefind search, Hindi font, legal pages for AdSense.
