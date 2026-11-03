# Placeholders — living checklist

**Updated every phase.** Every image, video, screenshot and text slot on the site that is not yet
final. Tick a row when the owner's real file / text is in place. Stock entries are credited in
`docs/CREDITS.md`; size / format rules are also in each `public/media/**/README.txt`.

State: **owner** = supplied by the owner (final) · **stock** = temporary Unsplash/Pexels photo ·
**label** = visible `[PLACEHOLDER: …]` or nothing yet.

Last updated: fix pass — media pipeline, privacy, performance (2026-11-02).

**Media files (since 2026-11-02):** drop images in **any format and any size** (PNG / JPG / WebP / AVIF, even mislabelled) — the build reads the real format, resizes and re-encodes them (WebP + AVIF) into hashed copies served from `/_m/…` (`modules/media-manifest/`). Your originals are never changed. A replaced file always shows up (new hash = new URL, also on Vercel). Areas to hide in a published copy go in `public/media/redactions.json` (see "Redactions" below).

## Global — site identity, SEO, menu
| ✓ | Slot | Expected file / value | Where it appears | Size / format | State | Search terms |
|---|---|---|---|---|---|---|
| [ ] | Logotype / wordmark | `public/media/logo.svg` (then used in PillNav, footer, favicon) | PillNav (text "US IT SOURCE"), footer (text), lab SiteNav | SVG, single colour | text / label | — (must be designed, never stock or AI) |
| [ ] | Favicon | `public/favicon.svg` + `public/favicon.ico` (+ optional `apple-touch-icon.png` 180×180) | browser tab | SVG + ICO 32×32 | **placeholder** (plain ink dot) | — |
| [ ] | Open Graph image | `public/og.jpg` | link previews (`og:image`, `twitter:image`) | 1200×630 JPEG ≤ 300 KB | **placeholder** (screenshot of the hero) | — |
| [ ] | Domain / canonical URL | e.g. `https://www.usitsource.com` → add `link rel="canonical"` + `og:url` in `app/pages/index.vue` | `<head>` | — | **not set** (no domain yet) | — |
| [x] | Page title | "US IT Source — Custom software built around the way you work" | `<title>`, og/twitter title | — | owner | — |
| [ ] | Meta description | "US IT Source designs and builds custom software, AI and computer vision around the way each business actually runs." | `<meta name="description">`, og/twitter | ≤ 160 chars | from approved copy — **confirm** | — |
| [x] | Menu stills | `public/media/menu/{home,projects,services,about,contact}.webp` | menu card (hover / focus a link) | 720×1246 (any format) | generated screenshots of the site — **regenerated 2026-11-02 (About added)**; regenerate when sections change (see `public/media/menu/README.txt`) | — |
| [x] | About page | route `/about` | menu + footer (rectangle transition) | — | **built** — its own slots are listed under "About page" below | — |

## Opening · Hero
| ✓ | Slot | Expected file / value | Where it appears | Size / format | State | Search terms |
|---|---|---|---|---|---|---|
| [x] | Copy | — | `HeroSection`, `Opening` | — | owner (ART_DIRECTION §4.1–4.2) | — |

(No media: both are procedural.)

## Line & flexible frame (S1)
| ✓ | Slot | Expected file / value | Where it appears | Size / format | State | Search terms |
|---|---|---|---|---|---|---|
| [ ] | Card footage (real work at a client) | `public/video/ops.mp4` + `ops.webm` + `ops-poster.jpg` (names fixed; read by `FLEX_MEDIA`, `app/utils/flexframe/params.ts`; URLs content-hashed) | `FlexFrameSection` small card, `/` and `/lab/flexframe` | 1280 px wide, 6–10 s seamless loop, muted, H.264 ≤ 2 MB + VP9; poster 1280 JPEG | stock (Pexels 7568439) | "mechanic hands workbench", "workshop hands close up" |

## Step Inside (S3)
| ✓ | Slot | Expected file / value | Where it appears | Size / format | State | Search terms |
|---|---|---|---|---|---|---|
| [x] | Words, phrases, labels | — | `FlexFrameSection` (STEP / INSIDE, five phrases, four labels) | — | owner (S3 brief) | — |
| [ ] | Label timing / phrase heights | — | same | — | chosen by the implementer, awaiting owner confirmation | — |

(No media: the world is procedural.)

## View our projects (F1 — built)
Screens are **auto-detected**: drop `01.png`, `02.jpg`, `03.webp` … (any image format, any size — the build resizes to 1600 px desktop / 900 px phone WebP) into the project's folder and they replace the placeholder frames. `NN-mobile.*` or a portrait image gets the phone frame. Order = file number.

| ✓ | Slot | Expected file / value | Where it appears | Size / format | State | Search terms |
|---|---|---|---|---|---|---|
| [x] | Garage Automation — screens | `public/media/projects/garage-automation/01.webp`, `02.webp`, `03.webp`, `01-mobile.png`, `02-mobile.png` | stream, lightbox, case page, Software & Apps phone | any (resized at build) | **yours** — demo data ("Northstar Auto Group", "Hello, Jordan"): confirmed fictional, no redaction. (`02.webp` / `03.webp` are PNG files with a .webp name — fine, the build reads them as PNG.) | — |
| [ ] | Nester — screens | `public/media/projects/nester/01.png`, `02.png` | same + AI Modeling desktop frame | 2880×1800 | **yours, but small** (590 px / 1007 px wide — soft on large screens) and **02 is redacted** (client name, see Redactions) — supply full-size, clean captures | — |
| [ ] | Garage Automation — description | "A custom operations platform for an automotive business — intake, work orders, parts, vendors, purchase orders and labor in one place." | `app/data/projects.ts` | — | owner text, **editable** | — |
| [ ] | Garage Automation — chips | Vehicle intake · Work orders · Parts & vendors · Purchase orders · Labor | `app/data/projects.ts` | — | owner text, **editable** | — |
| [ ] | Nester — description | "Material nesting software that lays out parts on sheets to cut faster and waste less." | `app/data/projects.ts` | — | owner text, **editable** | — |
| [ ] | Nester — chips | Nesting · Sheet layouts · Cut planning | `app/data/projects.ts` | — | owner text, **editable** | — |
| [x] | Case-study links | `href: /work/<slug>` per project | "View case study →" (rectangle transition) | — | **done** — pages at `/work/garage-automation`, `/work/nester` | — |
| [ ] | Garage Automation — environment photo | `public/media/projects/garage-automation/environment.jpg` | not used by F1 (kept for case studies) | 2560×1440 JPEG ≤ 450 KB | stock (temporary, environment only) | "auto repair garage lift" |
| [ ] | Nester — environment photo | `public/media/projects/nester/environment.jpg` | not used by F1 (kept for case studies) | same | stock (temporary, environment only) | "laser cutter sheet metal" |
| [ ] | Project Assembly Track | new entry + `public/media/projects/assembly-track/` | Projects tabs (when added) | as above | not included yet | — |

## Five ways we build around you (F2 — built)
Backgrounds are auto-detected: `public/media/services/<slug>/bg.*` (any format; if several, the largest wins; resized to 1200 / 1600 / 2400 px WebP + AVIF at build). Missing → solid graphite #1A1B1E with fine grain. The Software & Apps phone and the AI Modeling desktop frame show the Garage Automation / Nester screens.

| ✓ | Slot | Expected file / value | Where it appears | Size / format | State | Search terms |
|---|---|---|---|---|---|---|
| [x] | Software & Apps — background | `public/media/services/software/bg.*` | chapter 1 | 2400×1600 | **yours** (re-encoded from the 6048 px original) — confirm licence | — |
| [ ] | AI Modeling — background | `.../services/ai/bg.webp` | chapter 2 | same | stock (Beatriz Cattel) | "hand drawing diagram whiteboard" |
| [x] | Computer Vision & ML — background | `public/media/services/vision/bg.*` | chapter 3 (no detection boxes any more) | 2400×1600 | **yours** (re-encoded from the 9536 px original) — confirm licence | — |
| [x] | Staff Augmentation — background | `public/media/services/staff/bg.*` | chapter 4 | 2400×1600 | **yours** (re-encoded) — confirm licence | — |
| [ ] | Technical Training — background | `.../services/training/bg.webp` | chapter 5 | same | stock (The Climate Reality Project) | "hands-on technical training session" |
| [ ] | Staff Augmentation — team cards | `public/media/team/*.jpg` (first three, alphabetical) | chapter 4 cards — **hidden until portraits exist** | 1200×1500 (4:5) ≤ 250 KB | none yet | — (real staff only, with consent) |
| [x] | Technical Training — media | `public/media/services/training/seq-01.jpg … seq-03.jpg` (a slow photo sequence; a `loop.webm/.mp4` would take priority) | chapter 5, 16:9 frame | 1600 wide ≤ 250 KB | **yours** (re-encoded) — confirm licence | — |
| [ ] | Lines (5) | Software & Apps — "Apps and systems that follow your exact steps." · AI Modeling — "Models trained on your data, for a job you actually have." · Computer Vision & ML — "Cameras and models that see what matters in your operation." · Staff Augmentation — "Engineers who join your team and work your way." · Technical Training — "Hands-on training that makes your team confident with the tools they use every day." | top-right of each chapter (`app/data/services.ts`) | — | owner text, **editable** | — |
| [ ] | Scope lines (5) | `scope:` per service in `app/data/services.ts` | bottom-right of each chapter | Geist 12px, one or two short lines | **not supplied — hidden until written** | — |
| [x] | Detection labels | — | — | — | removed (the vision chapter is the photo alone) | — |

## let's work together + contact (F3 — built)
| ✓ | Slot | Expected file / value | Where it appears | Size / format | State | Search terms |
|---|---|---|---|---|---|---|
| [x] | Scene rectangles (8 desktop / 5 mobile) | photos `public/media/contact/photo-01.webp` … `photo-06.*` + loops `01.webm/.mp4` + `02.webm/.mp4` with `-poster.jpg` (Pexels, credited) | `ContactSection` | photos any format (resized to 700 / 1400 px); loops 720×960, 6 s, ≤ 0.6 MB | filled — **confirm the licence / source of your photos 01–03, 05, 06**; photo-04 (Logitech logo) was replaced by an Unsplash photo (credited) | — |
| [ ] | People — names and roles | Mahwish Akhtar — President & CEO · Monis Aziz — COO · Lauren Peet — Sales & Business Development Leader | contact rows (`app/data/contact.ts`) | — | **names / capitalisation inferred from the emails — confirm** | — |
| [x] | Emails | Mahwish.akhtar@usitsource.com · Monis.aziz@usitsource.com · Lauren.peet@usitsource.com | contact rows, mailto + Copy | — | owner (exact) | — |
| [x] | Contact line | "Tell us how your business works. We'll show you what software built around it could look like." | below the headline | — | owner | — |
| [x] | Primary CTA | "Start a conversation" → `mailto:Lauren.peet@usitsource.com?subject=Project%20enquiry` | below the rows | — | owner | — |
| [ ] | Contact form | name · company · email · message → composes a mailto to Lauren.peet@usitsource.com (no backend) | below the CTA | — | **optional — keep or remove** | — |
| [ ] | Headline lettering | `app/components/scenes/contact/handwriting.ts` (hand-authored pen strokes) | the scene | — | implementer-drawn; replace with a traced scan of real handwriting if wanted | — |

## Footer (F3 — built)
| ✓ | Slot | Expected file / value | Where it appears | Size / format | State | Search terms |
|---|---|---|---|---|---|---|
| [ ] | Location | — | `SiteFooter` | — | **hidden** until supplied | — |
| [ ] | LinkedIn URL | `LINKEDIN_URL` in `app/components/scenes/contact/SiteFooter.vue` | `SiteFooter` | — | **hidden** until a URL is set | — |
| [ ] | Wordmark | "US IT Source" (text) | `SiteFooter` | — | text until the logotype exists | — |

## Redactions (published copies only — originals untouched)
Listed in `public/media/redactions.json` (fractions of the image). Remove an entry once a clean capture replaces the file.

| ✓ | File | What is blocked | Why | Replace with |
|---|---|---|---|---|
| [ ] | `public/media/projects/nester/02.png` | "CT&S" in the page title; "ex: ROGERDALE" in the Job Name field | client name; job name | a capture without the client name / with a neutral sample job |

Scanned 2026-11-02 with no redaction needed: Garage Automation `01`, `02`, `03`, `01-mobile`, `02-mobile` (demo data — "Northstar Auto Group", "Hello, Jordan", stock numbers and car models only; no VINs, emails, phone numbers or customer names); Nester `01`.

## About page (/about)
Photos are auto-detected: `public/media/about/hero/<slot>-<a|b|c>.*` (slot 1–3, 2–3 images each) and `public/media/about/steps/01.*` … `04.*`; portraits `public/media/team/firstname-lastname.*`. Until a file exists, the slot shows the stand-in below (your own photos already on the site — never stock).

| ✓ | Slot | Expected file / value | Where it appears | Size / format | State | Search terms |
|---|---|---|---|---|---|---|
| [ ] | Hero photo 1 — "We sit with …" | `about/hero/1-a.*`, `1-b.*` (, `1-c.*`) | inline in the headline, crossfading | landscape ~3:2, any format | **stand-in**: contact photo-02 + photo-01 | — (real client sessions) |
| [ ] | Hero photo 2 — "learn …" | `about/hero/2-a.*`, `2-b.*` | same | same | **stand-in**: contact photo-03 + training seq-01 | — |
| [ ] | Hero photo 3 — "and build …" | `about/hero/3-a.*`, `3-b.*` | same | same | **stand-in**: vision bg + software bg | — |
| [ ] | Step photo — Sit with the work | `about/steps/01.*` | "How we work" | 4:3, any format | **stand-in**: contact photo-02 | — |
| [ ] | Step photo — Map the flow | `about/steps/02.*` | same | same | **stand-in**: contact photo-05 | — |
| [ ] | Step photo — Build to the map | `about/steps/03.*` | same | same | **stand-in**: software bg | — |
| [ ] | Step photo — Run it, then grow it | `about/steps/04.*` | same | same | **stand-in**: training seq-02 | — |
| [ ] | Leadership portraits (3) | `public/media/team/mahwish-akhtar.*`, `monis-aziz.*`, `lauren-peet.*` | Leadership, tall frames | 3:4, ~1500 px tall, real people with consent | **label**: `[PORTRAIT: Name]` frames | — (never stock or generated faces) |
| [ ] | Bios (3) | 1–2 lines per person (`app/data/about.ts`, `bio`) | Leadership, on hover / focus (always on touch) | — | **label**: `[PLACEHOLDER: 1–2 line bio]` (shown, as asked) | — |
| [ ] | Company facts | founded year · location · what we're known for (`app/data/about.ts`, `facts`) | night row above the closing | — | **label**: `[FOUNDED YEAR] · [LOCATION] · [WHAT WE'RE KNOWN FOR]` (shown, as asked) | — |
| [ ] | Meta description | "We sit with your team, learn how you work, and build software around it — custom apps, AI and computer vision from US IT Source." | `/about` `<meta name="description">` | ≤ 160 chars | written from your hero sentence — **confirm** | — |
| [x] | Copy | hero sentence, giant line, four steps, statements, closing | /about | — | owner (verbatim); "extended / trained" lines from the services section | — |

## Team
| ✓ | Slot | Expected file / value | Where it appears | Size / format | State | Search terms |
|---|---|---|---|---|---|---|
| [ ] | Portraits | `public/media/team/firstname-lastname.jpg` | About / wherever a brief places them | 1200×1500 (4:5) JPEG ≤ 250 KB, real staff with consent | label | — (never stock or generated faces) |

## Lab only
| ✓ | Slot | Expected file / value | Where it appears | Size / format | State | Search terms |
|---|---|---|---|---|---|---|
| [ ] | "next section" block | — | `/lab/flexframe` | — | label (lab only, never shipped) | — |

---

## What I still need from you (summary)
**Files**
1. Nester screens → full-size captures in `public/media/projects/nester/` (01 is 590 px, 02 is 1007 px wide), and a clean `02` without the client name (it is redacted for now).
2. Card footage of real work → `public/video/ops.mp4` + `ops.webm` + `ops-poster.jpg`.
3. Service photos (optional, to replace the temporary stock) → AI Modeling and Technical Training `public/media/services/<slug>/bg.*`.
4. Team portraits → `public/media/team/*.jpg` (real staff, with consent).
5. Logotype → `public/media/logo.svg`; favicon → `public/favicon.svg` + `.ico`; OG image → `public/og.jpg`.
6. Licence / source confirmation for your own photos: service backgrounds (software, vision, staff), training sequence, contact photos 01–03, 05, 06.

**Text**
1. Scope lines for the five services (`app/data/services.ts`, `scope:`).
2. Confirm names / roles of the three contacts (inferred from the emails).
3. Footer: location, LinkedIn URL.
4. Nester case-study text (`docs/case-studies/nester.md`); whether Project Assembly Track joins the tabs.
5. Domain for the canonical URL; confirm the meta description.
6. Whether to keep the contact form.
7. About page: three short bios, the company facts (founded year, location, what you're known for), confirm its meta description.

**About page files** — hero photos `public/media/about/hero/1-a.*` … `3-b.*`, step photos `public/media/about/steps/01.*` … `04.*`, leadership portraits `public/media/team/firstname-lastname.*` (until then: your own site photos stand in; portraits show labelled frames).
