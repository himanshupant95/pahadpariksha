# pahadpariksha.in — Handoff (as of 17 Nov 2026, 10:30 AM IST)

Paste this file into a new chat to continue. Owner: Himanshu (GitHub `himanshupant95`).

## 1. What the project is
- **pahadpariksha.in**: Hindi-first prep site for Uttarakhand government exams (UKSSSC/UKPSC: Lower PCS, PCS, Patwari/Lekhpal, VDO, JA etc.).
- **Stack:** Astro static site (trailingSlash `'always'`), Pagefind search, `@astrojs/sitemap` (rebuilt on every deploy; excludes /404 and /search/), GitHub Pages.
- **Repo:** `himanshupant95/pahadpariksha`, branch `main`.
  - `deploy.yml` runs on push to main and on workflow_dispatch.
  - Bot commits made with GITHUB_TOKEN don't trigger other workflows, so the bots run `gh workflow run deploy.yml`.
- **Commit identity:** `git -c user.name="Himanshu Pant" -c user.email="himanshupant95@users.noreply.github.com" commit …`, then `git pull --rebase origin main && git push origin main`.
- **In Claude Code sessions:**
  - `gh` GraphQL is blocked, so use REST, e.g. `gh api -X POST repos/himanshupant95/pahadpariksha/actions/workflows/news.yml/dispatches -f ref=main -f 'inputs[mode]=preview'`.
  - The secrets API path is blocked. The user adds secrets himself.

## 2. Accounts and services (all on blog.hypehive@gmail.com)
| Service | What | Notes |
|---|---|---|
| Gemini API (AI Studio) | GitHub secret `GEMINI_API_KEY` | Free tier. OpenAI-compatible endpoint `generativelanguage.googleapis.com/v1beta/openai/chat/completions`. The model is picked at run time from `/v1beta/models` (currently gemini-3.8 / 3.7 / 3.6-flash). **Google Search grounding is NOT available free** (returns 429), so we don't use it. |
| Groq (backup AI) | GitHub secret `GROQ_API_KEY` | Free tier, tested OK. Models are picked at run time; prefers `openai/gpt-oss-120b`, then `qwen/qwen3.8-27b`. Used only if every Gemini model fails. Groq's Cloudflare check fails inside the Claude built-in browser, so make keys in normal Chrome. |
| Google Form "Pahad Pariksha - Contact" | Site contact form | Edit id `1c6-wAayr_3FIT3TCc6VaSFRD8sDA3VpTSb1RJG6FK5Q`; email notifications on. **User to-do:** delete the TEST response; rename the Drive file "Untitled form". |
| Google Sheet "Pahad Pariksha - Uttarakhand Current Affairs Fact Sheet" | id `1u36mKoQWDuiPKnarvEgYfV140co3qY_mmyvDvNf9y-M` | Two tabs, described below. |

The sheet's two tabs:
- **All facts:** A1 = `=IMPORTDATA("https://pahadpariksha.in/current-affairs/facts.csv?v=2")`.
- **Month view:** B1 = `'2026-11`; A3 = `=QUERY('All facts'!A:I,"select A,C,D,E,F,G,H,I where B starts with '"&B1&"'",1)`.

Rules agreed with the user:
- Claude never types API keys or passwords. The user pastes them.
- The user accepts terms and age checks himself.
- Don't route around geo-blocks or scrape Google News internals. Decoding Google News article URLs was blocked as unauthorised access.

## 3. Site structure (key files)
**District series "देवभूमि दर्पण · 13 ज़िले, 13 कहानियाँ"**
- `src/data/districts.ts` lists SERIES and DISTRICTS, parts 1–13.
  - **Live:** all 13 (series complete 19 Nov 2026; parts 11–13 Rudraprayag, Bageshwar, Champawat).
  - Parts 11–13 heroes: Kedarnath (Naresh Balakrishnan, CC BY-SA 4.0), Baijnath (SAMARTH052000, CC BY-SA 4.0), Baleshwar panorama (Pranavspn, CC BY-SA 3.0); Champawat series card uses Baleshwarmahadev.jpg (PD).
  - Set `live: true` when a district page ships.
- `src/layouts/District.astro` is the locked template:
  - series pill and prev/next navigation
  - grid timeline (`.yr` / `.ev`)
  - report-error button linking to `/contact/?topic=तथ्य में त्रुटि&page=…`
- District pages live in `src/pages/gk/districts/<slug>.astro`; quizzes in `src/data/quizzes/<slug>.json` (15 questions each); the series hub is `src/pages/gk/districts/index.astro`.
- `src/components/SeriesGrid.astro` shows Garhwal (7) and Kumaon (6), and becomes a swipe carousel on mobile.
- Each new district needs:
  - Wikimedia hero image (CC licence credited) and locator SVG
  - OSM iframe
  - about 19–20 sections
  - quiz JSON
  - entries in DailyQuestion `quizUrl`, homepage `districtPages` and `gk/uttarakhand-districts`

**Homepage (`src/pages/index.astro`)**
- Updates strip: open applications, notices, current affairs.
- Dark green series band, topics grid with DailyQuestion, latest content.

**Site-wide (`src/layouts/Base.astro`)**
- Mobile header: one swipeable nav row.
- Script turns tables with 3+ columns into stacked cards on phones (`numfirst` for a short first column).

**Contact**
- `src/components/ContactForm.astro` posts to Google Forms `formResponse` (no-cors). It has a honeypot and prefill from `?page=` / `?topic=`.
- `src/data/site.ts`: `contactEmail` is empty, because contact@pahadpariksha.in has no MX records.

## 4. Current-affairs pipeline (the main recent work)
**Workflow `.github/workflows/news.yml`** (permissions: contents write, actions write)

| Time (IST) | Cron | What it does |
|---|---|---|
| 12:11 PM | `41 6 * * *` | Collect headlines only, no AI |
| 12:05 AM | `35 18 * * *` | Daily edition, then deploy |
| 2:17 AM | `47 20 * * *` | Safety net, a no-op if the edition already ran |
| 4:53 AM | `23 23 * * *` | Second safety net, same |

- The safety nets were added because GitHub ran the 12:05 AM job about 7 hours late on 17 Nov.
- Manual `mode` input: `edition` | `collect` | `preview` (dry run on today's headlines, prints points, saves nothing) | `backfill` (adds sub-points to older points that lack them).

**`scripts/fetch-news.mjs`** (collector)
- 11 Google News RSS searches (hi + en, `when:2d`).
- Filters: PLACE regex, RULES scoring, NOISE regex (politics, elections, crime etc.).
- Dedupe: token overlap coefficient ≥ 0.5 within 4 days. Normalise Devanagari with `[^\p{L}\p{M}\p{N} ]`; without `\p{M}` the matras get stripped.
- KEEP_DAYS 45. Writes `src/data/news.json`.

**`scripts/digest-news.mjs`** (AI editor, about 2–3 AI calls a night)
- **Stage 1:** one call per complete IST day (yesterday) with that day's headlines plus the points already published within ±7 days.
  - The prompt applies the "UKPSC/UKSSSC GK test" with KEEP/DROP lists. Awards count only if given by a government or a nationally recognised body (no memorial, sammelan or private-trust awards).
  - Each point: Hindi, max 30 words, imp 3 or 2, a category from CATS, a tag, plus `q`/`qen` search queries. Max 10 points a day.
- **Stage 2 (enrich):**
  - For each point, fetch up to 8 related titles each from hi and en Google News RSS (`q` + `after:/before:` date range).
  - One call returns up to 3 `details` `{k,v}` per point, with k ∈ कारण, विवरण, श्रेणी, संस्था, पृष्ठभूमि.
  - कारण/विवरण come only from headlines. पृष्ठभूमि is the model's own static GK about the same named entity; this is the riskiest part, so review it.
- **Fallbacks:** `ask()` tries 3 Gemini models with retries on 429/5xx (20/40/60s), then Groq. If enrich fails, the point is kept without details.
- **Output:** `src/data/digest.json` holds `{reviewed[], points[], updated}`. Each point is `{id,date,fact,cat,imp,tag,model,refs[],details?,added}`.

**Display**
- `src/lib/digest.ts`: Point and Detail types, weekOf/monthOf helpers.
- `src/components/PointList.astro`: shows `details` as `›` sub-bullets; uses `> li` selectors so the nested list doesn't break the numbering.
- `src/components/Compilation.astro`: weekly and monthly pages, print-to-PDF.
- Pages: `src/pages/current-affairs/` (index, `week/[w]`, `month/[m]`, `facts.csv.ts`).
- CSV columns: Date, Month, Category, Importance, Fact, **Details**, Keyword, Source, Link.

**State on 17 Nov morning**
- 17 points in total.
- The 17 Nov edition added 1 point (exports ₹13,000 crore, first among hill states) via gemini-3.6-flash. Its पृष्ठभूमि line (NITI Aayog export index) is off-topic padding; review it.
- Backfill gave 15 of 16 older points sub-points. The good ones: Tenzing Norgay award (MoYAS, since 1994), Jauljibi (Kali–Gori confluence, 1914), Gauchar (1943), Swachh Survekshan (MoHUA, 2016).
- About 6 sub-points just restate the main fact.

## 5. Next steps (in order)
1. **Duplicate-detail filter:** in `enrich()`, drop any detail whose token overlap with the fact is ≥ about 0.6 (reuse a `similar()`-style overlap). Then strip the existing restating details from digest.json: census, police colours, Hema Negi, Kedarnath, wildlife, Lakhpati Didi, Advaita Kala "संस्था: प्रसार भारती". Also review or remove the export-index पृष्ठभूमि line.
2. **Check visually** that sub-points render on `/current-affairs/` and a week page, on desktop and mobile, and that the sheet shows Details. The Claude built-in browser was disconnected this morning; to restore it, fully quit and reopen the desktop app, open the browser pane, and message from there.
3. **Google-safety items** (proposed, user hasn't approved yet):
   - `noindex` weekly and monthly pages with fewer than about 8 points.
   - A "हम करेंट अफेयर्स कैसे बनाते हैं" methodology page (AI-assisted, sourced, error-report).
   - Optionally a daily review summary of new points.
   - Never one page per fact (that pattern counts as scaled content abuse).
4. **Next district:** Almora (part 4), fully researched in the same template, then Pauri and Tehri.
5. **Deferred:** private preview page or nightly email of new points; ImprovMX email forwarding; history page from the user's book .md (don't reproduce the UOU book text); previous papers; Telegram/WhatsApp channel; AdSense; self-hosting Wikimedia images; sitemap lastmod; UKPSC notice tracker (paused).

## 6. Facts flagged earlier that still need checking on district pages
- Haridwar population: 18,90,422 (Census 2011 final) vs 19,27,029 (provisional).
- Nainital area: 4,251 vs 3,860 sq km.
- Gandhi's "Mahatma" title origin is disputed.
- Tagore at Ramgarh: 1903 or 1914.
- Tehsil lists may be out of date.

## Daily current-affairs page (19 Nov 2026)
- `/current-affairs/` is THE daily page (no per-day pages, by owner's choice): newest edition on top, fully open; earlier days below as `#18-november-2026`-style sections; rolling window `CA_WINDOW_DAYS = 30` (src/lib/digest.ts), older days live in weekly/monthly compilations.
- Title/description name the latest date daily. Schema: CollectionPage (+ItemList of days), BreadcrumbList, FAQPage. Sitemap `lastmod`/`changefreq: daily` for this URL (astro.config.mjs).
- Share/hero image: `scripts/og-current-affairs.mjs` runs before `astro build`, writes `public/og/current-affairs-<date>.jpg` (gitignored). Rendered by sharp/librsvg with the committed fonts in `scripts/fonts/` (fonts.conf) — falls back to og-default.jpg if rendering fails.
- Monthly PDF button removed (owner will publish a hand-made month-end PDF); weekly PDF stays.

## History series complete (19 Nov 2026)
- Chapters 6–8 live: /history/gorkha-rule/, /history/british-rule/, /history/freedom-struggle/ (quizzes history-gorkha/-british/-freedom.json, wired in DailyQuestion). Series tagline now "पाषाण युग से टिहरी के विलय (1949) तक".
- Source book = UOU "उत्तराखण्ड का राजनीतिक इतिहास" (OCR .md, chapters 4–9 + appendices) used as reference only; text is original. Cross-checked with Allahabad HC Kumaun justice history, dehradun.nic.in, India Code (Dehra Dun Act 1871), tehri.nic.in, gov.uk (Darwan Singh Negi), indianculture.gov.in.
- Book errors flagged on pages: Sri Dev Suman death 1945 (correct 25 Jul 1944); Deghat 18 Aug (common 19 Aug); "recruitment clause in Sugauli" (not in treaty text).
- Possible next: a chapter 9 on post-1949 / Uttarakhand state movement (1994 Rampur Tiraha, Khatima, Mussoorie; state 9 Nov 2000) to match "राज्य निर्माण तक".

## History chapter 9 live (19 Nov 2026)
- /history/statehood-movement/ — "राज्य आंदोलन और राज्य निर्माण" (1938–2026): early demands, UKD, Kaushik samiti, 1994 kands, Act 2000, capital question, CM/governor/election tables, laws 2000–2026, disasters, silver jubilee; quiz history-statehood.json (wired in DailyQuestion). Series tagline now "पाषाण युग से राज्य निर्माण (2000) और आज तक".
- Flagged conflicts on page: Act assent 25 Aug 2000 (India Code) vs 28 Aug; Sriyantra Tapu 10 Nov 1995 (enwiki says 1994); Kaushik samiti "Jan 1993" impossible (UP under President's rule); SRC 1955 did not recommend a hill state (Panikkar's note = "Agra State").
- Current as of Nov 2026: CM Dhami; Governor Dr. Dhal Singh Bisen (oath 19 Oct 2026). Update when these change.
- Commons long filenames (>~160 chars) use ".../500px-thumbnail.jpg" thumbs — Figure.astro can't build those; use inline <figure>.

## Geography series — hub + chapters 1–5 live (19 Nov 2026)
- Hub `/geography/` (src/pages/geography/index.astro): chapters grouped by UNITS, interactive Atlas, glossary, FAQ, CollectionPage/ItemList + Breadcrumb schema. Data: `src/data/geography.ts` (18 chapters; set `live: true` + `img` when a chapter ships).
- Chapters: location-extent-boundaries, himalaya-formation-geology, physiographic-divisions, rivers-drainage, glaciers. Layout `src/layouts/GeographyChapter.astro`; components in `src/components/geo/` (GeoMap, Atlas, ChapterEnd, MapPractice, diagrams/*). Styles `src/styles/geo.css`. Quizzes geo-*.json (10 each, wired in DailyQuestion) — all are self-written UKPSC-level PRACTICE questions, never claimed as PYQs.
- Maps are our own (scripts/maps/README.md). Commons photos licence-checked via the Commons API: Panchachuli (e/e0), Kamet (c/c6), Ranikhet panorama (2/20 — NOT 4/4d), terrace farming (6/64, CC BY-SA 3.0), Mana (b/b3), Devprayag (e/ee), Gaumukh (6/63), Neelkanth/Satopanth (4/4f), Valley of Flowers (7/7f).
- Flagged on pages: glacier count 968 (Raina & Srivastava 2008) vs 1,290 (WIHG, Jun 2025); seismic code IS 1893:2016 in force (2025 Zone VI code withdrawn 3 Mar 2026); collision ~50 Ma (range 55–45); Nanda Devi "2nd highest in India" only excluding K2; pass heights vary by source (omitted); Panch Prayag elevations are SRTM confluence minima, not town heights; Chamoli 2021 = rock-ice avalanche, not GLOF.
- Time-sensitive lines to refresh: Tehri complex 2,400 MW (PSP full Apr 2026); Lipulekh trade resumed 1 Aug 2026; Lakhwar/Kishau/Pancheshwar/Jamrani statuses.
- Next: chapters 6–18 (climate onward). Owner prefers staggered publishing.

## Geography Part III live — chapters 6–8 (20 Nov 2026)
- /geography/climate/, /geography/soils-vegetation/, /geography/biodiversity-protected-areas/ (quizzes geo-climate, geo-soils-vegetation, geo-biodiversity; wired in DailyQuestion).
- New maps (scripts/maps/geo_ch678.py): g06-district-rainfall (IMD district normals 1961–2010), g06-altitude-zones, g07-vegetation-belts (SRTM bands — "potential", not actual cover), g08-protected-areas (OSM polygons; Nandhaur + 4 conservation reserves as approximate points because OSM lacks them).
- New diagrams: MonsoonWD, Orographic, AltitudeTemp, VegZonation, FaunaZones.
- Key data: IMD "Climate of Uttarakhand" (annual normal 1,326.1 mm; monsoon ~78%; records 47.4°C Roorkee 22.5.1978, −15.1°C Joshimath 15.1.1974; 495.3 mm Haridwar 18.9.1880). ISFR 2023 forest cover 24,304 km², tree cover 1,231; RFA 38,000 (ISFR 2021). Tigers 560 (AITE 2022), snow leopard 124 (SPAI Jan 2024), elephants 1,792 (SAIEE Oct 2025, not comparable to 2,026).
- Flagged: 71% RFA vs 45.4% forest cover; Dharali 2025 "cloudburst" unconfirmed by IMD; monsoon share 78% vs 79%; PA areas vary by source.
- Refresh when new: ISFR 2025, AITE 2026, Ramsar count, new conservation reserves.

## Schemes page live (20 Nov 2026)
- /gk/uttarakhand-yojanayen/ — 38 entries (33 state schemes + 5 laws) from src/data/schemes.ts (fields: year, when, cm, dept, sector, aim, who, benefit, status, note, src[]). Client-side filters (sector chips, CM era, status, search), CM-era timeline, one-liners, eponyms table, 15-Q quiz (uttarakhand-yojanayen.json, wired in DailyQuestion), FAQ + ItemList/FAQ schema.
- Status meaning: active = cited 2025–26/2026–27 source; merged; historic = current status not verified; law.
- Flagged conflicts: Gaura Devi Kanyadhan 2006-07 vs 2015; Ghasyari 2019 (IMPRI) vs launch 30 Oct 2021 (PIB); Apple Mission 2016 (IMPRI) vs first apple policy 2023; homestay hill cap ₹10 lakh vs ₹15 lakh reports; women horizontal reservation % not primary-verified.
- Add new schemes by appending to SCHEMES; refresh "updated" date in the page.

### Schemes page — central programmes (20 Nov 2026)
- `src/data/schemes.ts` now also exports `CENTRAL` (14 entries, `scope: 'central'`, `ut` = Uttarakhand-specific exam facts) + `sortedCentral()`. New sectors `infra`, `water`; new status `build` (निर्माणाधीन).
- Cards rendered by `src/components/SchemeCard.astro` (card CSS lives there, scoped). Page has राज्य/केंद्र scope toggle, separate #kendra section with quick table, central one-liners; timeline stays state-only.
- Quiz now 25 Qs. Flagged conflicts: R–K rail cost/deadline (₹24.6k→₹37k cr; 2026→2028→2029), Silkyara cost ₹853 vs ₹1,384 cr, Char Dham 825/889/900+ km, D–D expressway corridor 12/14 km, JJM denominators, Jamrani central share ₹1,557.18 vs ₹1,730 cr, VVP-II district split sums to 41.

## Polity series — hub live (20 Nov 2026)
- Hub `/polity/` (src/pages/polity/index.astro), built to the owner's "Pahad Pariksha — Uttarakhand Polity Learning Hub" brief. Data: `src/data/polity.ts` (17 planned chapters in 6 units — none live yet; set `live: true` + `img` when one ships), `src/data/polity-articles.ts` (160 provisions for the Article Explorer). Components: `src/components/polity/ArticleExplorer.astro` + `diagrams/*` (StateFormation, GovCM, BillFlow, LocalTiers, AdminHierarchy, ThreeLists). Styles `src/styles/polity.css`. Quiz `polity-hub.json` (15, practice questions — never PYQs).
- Module 1 (history) is NOT duplicated: hub links to the history series chapters (HISTORY_LINKS).
- Levels: must/pre/adv/bg are exclusive; "मुख्य हेतु" is an overlay tag (`MAINS` set in polity-articles.ts).
- Every changeable fact carries kind + source; `VERIFIED_ON` and `OFFICE` (Governor, CM, Speaker, LoP, CJ, SEC, 6th SFC) must be refreshed when an office-holder changes. Open research gaps are listed on the page (`GAPS`): Services Tribunal parent act, Deputy Speaker vacancy, UCC assent date (11 vs 12 Mar 2024), 2008 delimitation table, real PYQs.
- Next: chapter 1 "राज्य निर्माण की संवैधानिक प्रक्रिया" (/polity/state-formation-constitutional-process/), then Governor, CM & CoM, Assembly… staggered.
- **Language rule for all polity pages (owner, 20 Nov 2026):** simple everyday Hindi in full sentences, written like a teacher explaining — not telegraphic notes. Keep a constitutional term (प्रसादपर्यंत, निरर्हता, गणपूर्ति, परंतुक, भारित व्यय…) only where the exam uses it, and explain it in brackets the first time. Write "अनुच्छेद" in prose ("अनु." only in tight table cells/badges); avoid →, ≠, ·, stacked semicolons. Hub text, all 160 explorer cards, diagrams and the quiz were rewritten to this standard.
- **Chapter 1 live (20 Nov 2026):** /polity/state-formation-constitutional-process/ — layout `src/layouts/PolityChapter.astro` (clone of GeographyChapter, polity series nav), reuses geo `ChapterEnd`. Interactive bits are inline in the page: "अनुच्छेद 2 या 3?" game, bill-journey stepper (9 steps), before/after seats tabs, Act's 10 parts accordion. Quiz `polity-state-formation.json` (12, practice). Hero = new Parliament photo (PIB, GODL-India, c/ca/…). Verified from primary records: Act 29/2000 arrangement (94 sections, 10 parts, 10 schedules), S.O. 950(E) 20-10-2000, LS 1-8-2000 / RS 10-8-2000 (RS amendments = schedule renumbering), 2000 LS seats incl. Hardwar (SC), RS seat lots (2002/2004/2006), Pradeep Chaudhary v UoI [2009] 8 SCR 112 (some copies date it 5-5-2008 — flagged on page), Name Act 52/2006 (LS intro 4-12-2006, assent 21-12-2006, GSR 779(E), in force 1-1-2007). Removed the unverified "LS agreed 11 Aug" from the hub diagram. Next: chapter 2 "राजाओं के शासन से लोकतंत्र तक" (also भाग 1), then Governor.
- **Chapter 2 live (20 Nov 2026):** /polity/political-evolution/ — "राजाओं के शासन से लोकतंत्र तक". Historical facts reused from the history series (source-checked there); new: revenue-police timeline (Oct 2022 cabinet, Jan 2023 ~1,800 villages, May 2024 HC one-year direction, Jul 2025 India Today: still ~half the area) — refresh when an official completion figure appears. Widgets: era "समय-यात्रा" tabs (6 eras × 6 questions), "किस काल का शब्द?" game, "पुरानी समस्या → संविधान" (Art. 23, 265, 50, 14/21, 326/164, 40/243). Quiz `polity-political-evolution.json` (12). Hero = Narendranagar palace (CC BY-SA 4.0). भाग 1 complete; next: chapter 3 Governor.

## PYQ coverage pass (21 Nov 2026)
- Owner uploaded a 356-page merged PDF (as .md) of 11 recent UKPSC papers (2025–26 + one older VPS paper; Hindi text is legacy-font garbled, English text usable). ~285 Uttarakhand questions were extracted and probed against the site: ~70% were already covered (history/geography/polity/districts/schemes/maps).
- New: `src/data/exam-facts.ts` (groups of source-checked facts) + `src/components/ExamFacts.astro` (`<ExamFacts group="…" />`, rendered before the quiz). Inserted on /history/chand-dynasty/, /history/freedom-struggle/, /geography/biodiversity-protected-areas/, /polity/; new page /gk/uttarakhand-pariksha-tathya/ (economy, people, trap questions), linked from /gk/.
- Left out because not verifiable from a reliable source in that pass: Puriya Naithani's court, Hukka Club year, Hewett Sanskrit Pathshala founder, Khumri/Pachavan/Maitri/Kuri (tribal terms), Dadwar, ISFR district-wise forest %, 2011 towns >1 lakh count, longest river, first Deputy Speaker of 1st Assembly, Vishal Kirti/Purusharth years, Kumaon Bhabar trust, several 2025 current-affairs items (youth festival theme, Surya Dev Bhoomi Challenge, CII summit venue). Add them to exam-facts.ts once sourced.
- Natural homes for future chapters: tribes & folk culture page (Khumri, Pachavan, Saraun, Bhumia, Gangnath, Aipan), geography ch. 9–11 (census ranks, land classes Talaun/Upraon, minerals, HMT Ranibagh, dams–rivers table).

## Comparison page (21 Nov 2026)
- New: /gk/uttarakhand-tulnatmak-talikayen/ (Census 2011 district table, ISFR 2023 district forest table, rank summary, match-lists, quiz `tulnatmak-talikayen`).
- Largest-district consistency: site now follows Census 2011 (Chamoli 8,030 > Uttarkashi 8,016; 13 districts sum to 53,483). Removed the unsourced "7,692 / pre-Rudraprayag" claim from chamoli/uttarkashi pages; districts.ts hook and districts-rivers quiz Q now use "lowest density" for Uttarkashi. Exam advice: both options present → Chamoli; only Uttarkashi → Uttarkashi.
- ISFR 2023 Pauri total printed as 3,560.55 is an FSI typo; class sum 3,360.55 used (state total then matches 24,303.83).

## Year in Review 2025–26 (21 Nov 2026)
- New: /gk/uttarakhand-varsh-2025-26/ — economy (Eco Survey 2025-26, NCAER), Budget 2026-27 (₹1,11,703.21 cr; suppl. 27 Oct 2026 → ₹1,19,547.39 cr), indices (SDG 2023-24, FHI 2026, full literacy 6th state), UCC + amendment 2026, Minority Education Act 2025, timeline Jan 2025–Nov 2026, Governor Dhal Singh Bisen (19 Oct 2026), Kumbh 2027 dates, Char Dham. Quiz `varsh-2025-26` (15 Qs). Linked from /gk/ and /current-affairs/.
- Refresh this page when: next Economic Survey / Budget (Feb–Mar 2027), Kumbh starts, assembly elections 2027, new SDG index.

## PYQ bank (21 Nov 2026)
- New: /pyq/ index + /pyq/[slug]/ (data: src/data/pyq/*.json, loader src/data/pyq.ts). 8 UKPSC papers from the user's uploaded merged PDF, Uttarakhand questions only (279). Every answer cross-checked programmatically against the official key (series A) — 0 mismatches.
- Code → exam: SDJ Upper PCS pre 2025 P-I (key 1385921111); XYA AG office RO/ARO 2024 (956306142); RGS SEC RO 2024 pre (736704039); GSI ACF/FRO 2025 (39397394); SDP DSO main 2025 P-I (8275244); HCA HC ARO 2025 (345848352, PROVISIONAL — swap to amended key when UKPSC publishes it); KOT SEC RO main 2024 (285809332); APK APS main 2024 (1072485139). All at psc.uk.gov.in/public/uploads/answerkey/<id>.pdf.
- Not included: GSP (PCS 2025 GAT, no UK content), VPS/LPS (PCS 2012, no key online).
- Question text is our Hindi rendering; explanations note where the commission's answer differs from common books (e.g. largest district, longest river = Kali per APK key).

## Interlinking (21 Nov 2026)
- `src/data/related.ts` + `src/components/RelatedLinks.astro` → "आगे पढ़ें" block injected in Base.astro for mapped paths. When adding a new page, add its label to `L` and a mapping in `M`.
- `src/data/quiz-index.ts` holds QUIZ_URL (used by DailyQuestion) and QUIZ_GROUPS (used by /quiz/ hub). New quiz → add to both.

## LSS-2026 syllabus gap chapters (21 Nov 2026)
- Home page section "पाठ्यक्रम के 7 नए अध्याय" (`syllabus` array in src/pages/index.astro). Add `links` to a card when its chapter ships.
- Live: 1 land-revenue-system (new polity part 14; later parts renumbered), 2 = legislative-assembly + judiciary + special-laws.
- Soon: 3 economy, 4 agriculture/horticulture, 5 disasters & environmental movements, 6 population & migration, 7 culture part 2.
- HC CJ in OFFICE now acting CJ Manoj Kumar Tiwari (from 9 Oct 2026). Update when a regular CJ is appointed.

## Cleanup (21 Nov 2026)
- Redirects in astro.config `redirects`: /gk/uttarakhand-rivers/ → /geography/rivers-drainage/, /gk/uttarakhand-districts/ and /quiz/uttarakhand-districts-rivers/ → /gk/districts/. The district table, borders, formation years and the mixed quiz now live on /gk/districts/ (#ek-nazar, #quiz).
- All meta descriptions ≤160 chars (pyq and current-affairs are templated; keep new ones short).
- About, Contact, Disclaimer, Exams rewritten. Exams has the LSS-2026 pattern from the official ad, with a date check that flips "आवेदन चालू" after 26 Nov 2026.

## Economy chapter (21 Nov 2026)
- /gk/uttarakhand-arthvyavastha/ (Article layout): ES 2025-26 + PRS budget 2026-27 numbers, industry, energy, tourism 2025, agri, minerals, institutes, Indo-Tibet trade, GI table (GI_LIST, 29 items).
- GI count is now 29 (Bedu + Badri cow ghee certificates 5 Nov 2025, GI Registry apps 1188/1390). Culture page and its quiz updated to match. Update GI_LIST when new GIs are registered.
- Home syllabus card 3 is live. Refresh numbers after the 2027-28 budget / ES 2026-27.

## Images and audit (21 Nov 2026)
- Wikimedia images are self-hosted at build time: scripts/localize-images.mjs (CI only; cache .cache/wm via actions/cache in deploy.yml). Rewrites dist HTML to https://pahadpariksha.in/img/wm/... Base.astro has a client fallback (retry smaller size, then hide broken img). Keep using Commons URLs in source; never hotlink-only.
- Titles trimmed to ~60 chars (+ " | पहाड़ परीक्षा"). Keep new titles short.
- Geography chapter 11 card points to the economy page until that chapter exists (GChapter.see). Remaining syllabus topics map to geography chapters 9, 10, 12–15.
- Style gap: district (≈60 semicolons/dashes per 1000 words), history (≈35–50) and geography (≈30–40) pages are in older note style; polity/new pages ≈3–7. Rewrite in batches, districts first.
