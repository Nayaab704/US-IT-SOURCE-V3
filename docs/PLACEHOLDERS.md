# Placeholders — living checklist

**Updated every phase.** Every image, video, screenshot and text slot on the site that is not yet
final. Tick a row when the owner's real file / text is in place. Stock entries are credited in
`docs/CREDITS.md`; size / format rules are also in each `public/media/**/README.txt`.

State: **owner** = supplied by the owner (final) · **stock** = temporary Unsplash/Pexels photo ·
**label** = visible `[PLACEHOLDER: …]` or nothing yet.

Last updated: phase F4 — final integration (2026-10-19).

## Global — site identity, SEO, menu
| ✓ | Slot | Expected file / value | Where it appears | Size / format | State | Search terms |
|---|---|---|---|---|---|---|
| [ ] | Logotype / wordmark | `public/media/logo.svg` (then used in PillNav, footer, favicon) | PillNav (text "US IT SOURCE"), footer (text), lab SiteNav | SVG, single colour | text / label | — (must be designed, never stock or AI) |
| [ ] | Favicon | `public/favicon.svg` + `public/favicon.ico` (+ optional `apple-touch-icon.png` 180×180) | browser tab | SVG + ICO 32×32 | **placeholder** (plain ink dot) | — |
| [ ] | Open Graph image | `public/og.jpg` | link previews (`og:image`, `twitter:image`) | 1200×630 JPEG ≤ 300 KB | **placeholder** (screenshot of the hero) | — |
| [ ] | Domain / canonical URL | e.g. `https://www.usitsource.com` → add `link rel="canonical"` + `og:url` in `app/pages/index.vue` | `<head>` | — | **not set** (no domain yet) | — |
| [x] | Page title | "US IT Source — Custom software built around the way you work" | `<title>`, og/twitter title | — | owner | — |
| [ ] | Meta description | "US IT Source designs and builds custom software, AI and computer vision around the way each business actually runs." | `<meta name="description">`, og/twitter | ≤ 160 chars | from approved copy — **confirm** | — |
| [ ] | Menu stills | `public/media/menu/{home,projects,services,contact}.webp` | menu card (hover / focus a link) | 720×1246 WebP ≤ 120 KB | generated screenshots of the site — **regenerate when sections change** (see `public/media/menu/README.txt`) | — |
| [ ] | About link target | route `/about` | lab SiteNav only | — | label | — |

## Opening · Hero
| ✓ | Slot | Expected file / value | Where it appears | Size / format | State | Search terms |
|---|---|---|---|---|---|---|
| [x] | Copy | — | `HeroSection`, `Opening` | — | owner (ART_DIRECTION §4.1–4.2) | — |

(No media: both are procedural.)

## Line & flexible frame (S1)
| ✓ | Slot | Expected file / value | Where it appears | Size / format | State | Search terms |
|---|---|---|---|---|---|---|
| [ ] | Card footage (real work at a client) | `public/video/ops.mp4` + `ops.webm` + `ops-poster.jpg` (path fixed in `FLEX_MEDIA`, `app/utils/flexframe/scene.ts`) | `FlexFrameSection` small card, `/` and `/lab/flexframe` | 1280 px wide, 6–10 s seamless loop, muted, H.264 ≤ 2 MB + VP9; poster 1280 JPEG | stock (Pexels 7568439) | "mechanic hands workbench", "workshop hands close up" |

## Step Inside (S3)
| ✓ | Slot | Expected file / value | Where it appears | Size / format | State | Search terms |
|---|---|---|---|---|---|---|
| [x] | Words, phrases, labels | — | `FlexFrameSection` (STEP / INSIDE, five phrases, four labels) | — | owner (S3 brief) | — |
| [ ] | Label timing / phrase heights | — | same | — | chosen by the implementer, awaiting owner confirmation | — |

(No media: the world is procedural.)

## View our projects (F1 — built)
Screens are **auto-detected**: drop `01.png`, `02.png` … (or `.jpg` / `.webp` / `.avif`) into the project's folder and they replace the placeholder frames (dev picks them up live; a build picks them up at build time). Portrait images get the phone frame automatically; `NN-mobile.png` forces it. Adding a project = one entry in `app/data/projects.ts` + its folder.

| ✓ | Slot | Expected file / value | Where it appears | Size / format | State | Search terms |
|---|---|---|---|---|---|---|
| [x] | Garage Automation — screens | `public/media/projects/garage-automation/01.webp`, `02.webp`, `03.webp` + `01-mobile.png`, `02-mobile.png` | stream, lightbox, case page | desktop WebP ≤ 400 KB, phone PNG/WebP | **yours** (desktop re-encoded to WebP). Check: screen 02 shows a user's name ("Hello, Raafay") and the client name — keep only if the client agrees | — |
| [ ] | Nester — screens | `public/media/projects/nester/01.png`, `02.png` | same | 2880×1800 | **yours, but small** (590 px / 1007 px wide — look soft on large screens; supply full-size captures) | — |
| [ ] | Garage Automation — description | "A custom operations platform for an automotive business — intake, work orders, parts, vendors, purchase orders and labor in one place." | `app/data/projects.ts` | — | owner text, **editable** | — |
| [ ] | Garage Automation — chips | Vehicle intake · Work orders · Parts & vendors · Purchase orders · Labor | `app/data/projects.ts` | — | owner text, **editable** | — |
| [ ] | Nester — description | "Material nesting software that lays out parts on sheets to cut faster and waste less." | `app/data/projects.ts` | — | owner text, **editable** | — |
| [ ] | Nester — chips | Nesting · Sheet layouts · Cut planning | `app/data/projects.ts` | — | owner text, **editable** | — |
| [x] | Case-study links | `href: /work/<slug>` per project | "View case study →" (rectangle transition) | — | **done** — pages at `/work/garage-automation`, `/work/nester` | — |
| [ ] | Garage Automation — environment photo | `public/media/projects/garage-automation/environment.jpg` | not used by F1 (kept for case studies) | 2560×1440 JPEG ≤ 450 KB | stock (temporary, environment only) | "auto repair garage lift" |
| [ ] | Nester — environment photo | `public/media/projects/nester/environment.jpg` | not used by F1 (kept for case studies) | same | stock (temporary, environment only) | "laser cutter sheet metal" |
| [ ] | Project Assembly Track | new entry + `public/media/projects/assembly-track/` | Projects tabs (when added) | as above | not included yet | — |

## Five ways we build around you (F2 — built)
Backgrounds are auto-detected: `public/media/services/<slug>/bg.avif|webp|jpg` (best format first). Missing → solid graphite #1A1B1E with fine grain.

| ✓ | Slot | Expected file / value | Where it appears | Size / format | State | Search terms |
|---|---|---|---|---|---|---|
| [x] | Software & Apps — background | `public/media/services/software/bg.webp` (+ `bg-1600.webp`, `bg.jpg`) | chapter 1 | 2400×1600 | **yours** (re-encoded from the 6048 px original) — confirm licence | — |
| [ ] | AI Modeling — background | `.../services/ai/bg.webp` | chapter 2 | same | stock (Beatriz Cattel) | "hand drawing diagram whiteboard" |
| [x] | Computer Vision & ML — background | `public/media/services/vision/bg.webp` (+ `bg-1600.webp`, `bg.jpg`) | chapter 3 (no detection boxes any more) | 2400×1600 | **yours** (re-encoded from the 9536 px original) — confirm licence | — |
| [x] | Staff Augmentation — background | `public/media/services/staff/bg.webp` (+ `bg-1600.webp`, `bg.jpg`) | chapter 4 | 2400×1600 | **yours** (re-encoded) — confirm licence | — |
| [ ] | Technical Training — background | `.../services/training/bg.webp` | chapter 5 | same | stock (The Climate Reality Project) | "hands-on technical training session" |
| [ ] | Software & Apps — phone screens | Garage Automation screens (`public/media/projects/garage-automation/NN-mobile.png` preferred, else any) | chapter 1 phone frame, crossfading every 1.6 s | phone 1170×2532 | label ("[Garage Automation screen NN]") | — (real screens only) |
| [ ] | AI Modeling — desktop screens | Nester screens (`public/media/projects/nester/NN.png`) | chapter 2 desktop frame | 2880×1800 | label | — (real screens only) |
| [ ] | Staff Augmentation — team cards | `public/media/team/*.jpg` (first three, alphabetical) | chapter 4 cards — **hidden until portraits exist** | 1200×1500 (4:5) ≤ 250 KB | none yet | — (real staff only, with consent) |
| [x] | Technical Training — media | `public/media/services/training/seq-01.jpg … seq-03.jpg` (a slow photo sequence; a `loop.webm/.mp4` would take priority) | chapter 5, 16:9 frame | 1600 wide ≤ 250 KB | **yours** (re-encoded) — confirm licence | — |
| [ ] | Lines (5) | Software & Apps — "Apps and systems that follow your exact steps." · AI Modeling — "Models trained on your data, for a job you actually have." · Computer Vision & ML — "Cameras and models that see what matters in your operation." · Staff Augmentation — "Engineers who join your team and work your way." · Technical Training — "Hands-on training that makes your team confident with the tools they use every day." | top-right of each chapter (`app/data/services.ts`) | — | owner text, **editable** | — |
| [ ] | Scope lines (5) | `scope:` per service in `app/data/services.ts` | bottom-right of each chapter | Geist 12px, one or two short lines | **not supplied — hidden until written** | — |
| [x] | Detection labels | — | — | — | removed (the vision chapter is the photo alone) | — |

## let's work together + contact (F3 — built)
| ✓ | Slot | Expected file / value | Where it appears | Size / format | State | Search terms |
|---|---|---|---|---|---|---|
| [x] | Scene rectangles (8 desktop / 5 mobile) | photos `public/media/contact/photo-01.webp` … `photo-06.webp` (yours, compressed) + loops `01.webm/.mp4` + `02.webm/.mp4` with `-poster.jpg` (Pexels, credited) | `ContactSection` | photos ≤ 210 KB WebP; loops 720×960, 6 s, ≤ 0.6 MB | filled — **confirm the licence / source of your six photos** (one shows a Logitech logo on the mouse) | — |
| [ ] | People — names and roles | Mahwish Akhtar — President & CEO · Monis Aziz — COO · Lauren Peet — Sales & Business Development Leader | contact rows (`app/data/contact.ts`) | — | **names / capitalisation inferred from the emails — confirm** | — |
| [x] | Emails | Mahwish.akhtar@usitsource.com · Monis.aziz@usitsource.com · Lauren.peet@usitsource.com | contact rows, mailto + Copy | — | owner (exact) | — |
| [x] | Contact line | "Tell us how your business works. We'll show you what software built around it could look like." | below the headline | — | owner | — |
| [x] | Primary CTA | "Start a conversation" → `mailto:Lauren.peet@usitsource.com?subject=Project%20enquiry` | below the rows | — | owner | — |
| [ ] | Contact form | name · company · email · message → composes a mailto to Lauren.peet@usitsource.com (no backend) | below the CTA | — | **optional — keep or remove** | — |
| [ ] | Headline lettering | `app/components/scenes/contact/handwriting.ts` (hand-authored pen strokes) | the scene | — | implementer-drawn; replace with a traced scan of real handwriting if wanted | — |

## Footer (F3 — built)
| ✓ | Slot | Expected file / value | Where it appears | Size / format | State | Search terms |
|---|---|---|---|---|---|---|
| [ ] | Location | `[LOCATION]` | `SiteFooter` | — | label | — |
| [ ] | LinkedIn URL | `href="#"` | `SiteFooter` | — | label | — |
| [ ] | Wordmark | "US IT Source" (text) | `SiteFooter` | — | text until the logotype exists | — |

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
1. Real project screens → `public/media/projects/garage-automation/01.png …` and `public/media/projects/nester/01.png …` (phone screens: `NN-mobile.png`).
2. Card footage of real work → `public/video/ops.mp4` + `ops.webm` + `ops-poster.jpg`.
3. Service photos (optional, to replace the temporary stock) → `public/media/services/<slug>/bg.webp` (+ `bg-1600.webp`, `bg.jpg`).
4. Team portraits → `public/media/team/*.jpg` (real staff, with consent).
5. Training loop or photo sequence → `public/media/services/training/loop.webm` + `loop.mp4`, or `seq-01.jpg …`.
6. Contact scene photos / loops → `public/media/contact/*.jpg|webp|webm|mp4`.
7. Logotype → `public/media/logo.svg`; favicon → `public/favicon.svg` + `.ico`; OG image → `public/og.jpg`.

**Text**
1. Scope lines for the five services (`app/data/services.ts`, `scope:`).
2. Confirm names / roles of the three contacts (inferred from the emails).
3. Footer: location, LinkedIn URL.
4. Case-study links (`app/data/projects.ts`, `caseStudy:`), and whether Project Assembly Track joins the tabs.
5. Domain for the canonical URL; confirm the meta description.
6. Confirm the detection labels (sheet / part / edge / tool) and whether to keep the contact form.
