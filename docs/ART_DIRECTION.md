# US IT Source — Art Direction (source of truth, v2)

This document is decided by the project owner. The coding agent implements it and does not change it. Anything marked **[TBD]** must be asked about, not invented.

> **v2 replaces v1 entirely.** Retired concepts — do NOT use: stencil/constructed logotype, floating aluminium pieces, logotype assembly, seam sweep, the O-aperture exit, the services card deck, foggy/glowing night atmosphere behind objects.

---

## 1. The rule: "The Map"

US IT Source maps how a client's business works and builds software that follows that map. **The website itself is one large workflow map, and every page is a place on it.**

- Every page is a **tile** on the map, connected by **the line**.
- Every page opens from, and closes back into, a **rounded rectangle** (its tile).
- Moving between pages always means **travelling along the line** — never a fade, never a wipe.
- Pages have real URLs (SEO), but the experience feels like one continuous place.

**Formula: Metalab's frame, Lusion's matter.**
- The *frame* (structure, navigation, typography, pacing): calm, editorial, restrained.
- The *matter* (what you see and touch): physical, glossy, liquid, crafted.

### The one material: the line
The same line appears in every form:
- On paper → a vermilion **hand-drawn ink line** (human, the client's real workflow).
- In the dark → a **black-lacquer ribbon** sculpture (engineered, premium).
- On the map → the thin **route** connecting pages.
- Engineered → a crisp interface line with the **same shape** as the hand line.

---

## 2. Design tokens

### Color
| Token | Value | Use |
|---|---|---|
| `--void` | `#020306` | night background — near-pure black. No fog, no glow. |
| `--night-1` | `#0A0E18` | raised night surfaces (pill nav, map canvas) |
| `--rim` | `#3B5BFF` | electric ink-blue — the ONLY saturated light colour; appears as reflections/route light |
| `--warm-glint` | `#F0C58C` | tiny warm accent in reflections only |
| `--night-text` | `#F2F1EC` | primary text on night |
| `--night-muted` | `#8E95A4` | secondary text on night |
| `--paper` | `#F1EEE7` | day ground |
| `--paper-raised` | `#FBFAF6` | chips/cards on paper |
| `--ink` | `#16181D` | text on day |
| `--ink-muted` | `#5E5950` | secondary text on day |
| `--signal` | `#D9481F` | the hand-drawn line ONLY |

### Typography — "Engineered Classic" (approved)
- **Newsreader** (display optical size, weight 300; italic 300) — headlines, statements, project titles, inline-image sentences. Tight leading (0.94–1.0), letter-spacing −0.02em at large sizes.
- **Geist** (300–600) — body, paragraphs, UI, pills, nav.
- **Geist Mono** (400–500) — small technical labels and indexes, uppercase, tracked +0.14–0.16em.
- Self-host all fonts. No Inter / Roboto / Arial / Instrument Serif in the final site.
- Hero scale: Newsreader 300, ~104px at 1440w, two lines, second line indented 1.6em.

### Layout
- Desktop reference 1440×900. Gutter 56px desktop, 20px mobile.
- Generous black / paper space. Each page has ONE main move; everything else is quiet.

---

## 3. Motion system

- **Level 1 (always, almost invisible):** slow reflection drift on the ribbon, window light on paper, cursor dot lag, fine grain.
- **Level 2 (scroll choreography):** parallax rows, sticky lists, text rises, line drawing, inline-media sentences.
- **Level 3 (signature — only these):**
  1. **The Map** (menu + page travel)
  2. **The ribbon breaking open** and the camera flying inside it into daylight
  3. **The service object** reshaping for each service

### Feel
- Entrances `power3.out`; scrubbed transforms `power2.inOut`. No bounce, elastic or back easing.
- **Thick-fluid:** cursor lerp 0.08–0.12; reactions driven by pointer velocity; heavy damping; things settle, never bounce.

### Text exit: behind glass
Outgoing text rises into a frosted-glass horizon: progressive per-line blur (0 → 10px), slight vertical stretch, dims to 0. (GlassText component.)

### The rectangle
- **Opens:** a vertical line → narrow rounded portrait rectangle → taller → landscape card → full screen (corners → 0). The world behind is already in place; only the window moves. Camera inside settles back ~8% as it opens.
- **Closes:** the reverse — the live page shrinks into its rounded rectangle.

---

## 4. The journey

**Homepage order (owner, final):** Opening → Hero (lacquer ribbon) → Line & flexible frame → Step Inside → Projects → Five ways we build around you → Let's work together → Footer.

### 4.1 Opening (first visit)
1. Warm paper with fine grain. Faint pencil-like words (Newsreader italic 28px, --ink, max opacity 0.22) appear and dissolve in turn: *We listen.* → *We map how you work.* → *Then we build it.*
2. The ink line draws a short route across the paper (a hint of the map); its final stroke turns vertical at screen centre.
3. That vertical line **opens** as the rectangle (§3) into the Home hero.
Repeat visits in the same session: fast line → open only. Reduced motion: words static 1.2 s → crossfade.

### 4.2 Home — hero (night)
- **The ribbon:** one black-lacquer ribbon swept along a 3D version of the Scene-2 workflow path (loops + one backtrack). Thick, deeply bevelled (width:thickness ≈ 3:1, bevel ≈ 35–40% of thickness). Cropped huge; ≥ 40% of screen stays black; depth of field on far sections.
- **Light:** only reflections — procedural studio softboxes (two long electric-blue strips, one dim white overhead, one small warm kicker) in an otherwise black environment. Long saturated streaks slide slowly along the bevels.
- **Liquid surface:** cursor ripples the surface (≤ 2% thickness) and bends the streaks; damped ~1.2 s.
- **Type (Metalab-calm):** headline lower-left "Built around / the way you work." · top-right paragraph "US IT Source designs and builds custom software, AI and computer vision for businesses that don't fit off-the-shelf tools." · left column: five service pills (Software & Apps · AI Modeling · Computer Vision & ML · Staff Augmentation · Technical Training) · top-centre floating pill nav: Menu · US IT SOURCE · local time.

### 4.3 Home — Line & flexible frame (day) — built (S1)
Paper. Headline (Newsreader 300): "We start with / how you actually work." Body (Geist 15px): "US IT Source designs and builds custom software, AI and computer vision around the way each business actually runs." + pill "Our approach". A small card plays real footage of work (blue duotone #3B5BFF → #C9D0FF, fine grain). Pinned 3vh, scrubbed and reversible: the blue line snakes in above the headline, passes through it, loops round the card (behind on top, in front below) and leaves in an S-wave; the headline exits behind glass; the card flexes (turn, skew, curl, wave) into the large rounded frame (94% × 62% of the viewport, radius 14); a soft diagonal band sweeps it and the footage dissolves into the INSIDE world; the words STEP / INSIDE (Geist 300, 120px, white) land on it. Footage is temporary (`docs/PLACEHOLDERS.md`).

### 4.4 Home — Step Inside (dark → paper) — built (S3)
Continues the same pin. **Doors (1vh):** STEP slides left and INSIDE right off-screen while the frame grows to full screen (radius 14 → 0, power2.inOut). **World (4vh, q 0 → 1):** a procedural monochrome world (#07080A → #2A2D33 at the horizon; no colour): dune floor in height fog, a distant light beam with dust and a floor streak, thousands of dark-glass crystal shards with white glints (near ones as bokeh), and our thin white line on the floor leading to the beam's base.
- q 0–0.70: the camera glides along the line at eye height (sway ≤ 1° roll / ≤ 2° yaw; cursor look ±2°).
- Phrases (Newsreader 300 italic, 64px, white, real HTML), each drifting outward at 0.6–1.4× scroll: 0.05 "Every business has a structure" (left) · 0.15 "most software never finds." (right) · 0.32 "We go inside," (left) · 0.42 "find it," (right) · 0.52 "and build around it." (left). Geist Mono 11px labels at 50% white: SIT WITH THE WORK · MAP THE FLOW · BUILD TO THE MAP · RUN IT, GROW IT.
- q 0.60–0.85: the shards spiral into an ordered lattice around the beam; the line rises up the beam.
- q 0.85–1.00: the camera enters the beam; everything blooms white and settles to `--paper`.
Mobile: 1,500 shards, no bokeh / bloom / floor highlight, 2 + 0.8 + 2.5vh, text 36px. Reduced motion: no pin; a still world frame (camera mid-way, lattice formed) with the phrases stacked, then a gradient to paper.

### 4.5 Home — View our projects — built (F1)
Directly after Step Inside; its pin starts exactly where the white-out has settled into paper. Background: the day world's moving window light on paper (faded in after the white-out).
- **Emerging sentence:** "View our projects" (Newsreader 300, 120px at 1440w, --ink) travels toward the viewer from the centre: scale 0.35 → 1, blur 12px → 0, opacity 0 → 1, letter-spacing +0.08em → 0, words slightly staggered; scrubbed over ~80vh. Then it shrinks and moves to the top-left as the section title (56px) while the project area rises in (~40vh). Pinned ~150vh more for reading, then released.
- **Tabs** (Geist 14px pills, 1px border; selected = --ink fill, paper text; real buttons, arrow-key navigation): Garage Automation (default) · Nester. Data in `app/data/projects.ts` (a third project = one entry).
- **Left** (max 420px): name (Newsreader 300, 64px), one-line description, scope chips, "View case study →".
- **Right (~60%): the screen stream** — two staggered rows flowing right → left (≈ 28 px/s; bottom row 0.7×) on a plane tilted ≈ 8° (left side farther), soft shadows; desktop screens in a thin rounded frame (radius 10), phone screens in a minimal phone frame (radius 36, thin dark bezel, no notch / status bar). Scroll velocity adds up to +3× (easing back). Hover: stream 0.2×, the screen lifts (1.06), cursor "View". Click: lightbox (dark overlay, ← → through that project's screens, Esc closes).
- **Tab switch:** screens slide out left and fade (0.5s), new ones slide in from the right (0.6s, power3.out); text swaps with a short rise.
- Screens: `public/media/projects/<slug>/01.png …` (auto-detected). Until supplied: neutral grey frames labelled "[Garage Automation screen 01]" — never fake UI.
- **Mobile:** one row, native horizontal swipe; tabs scroll horizontally; title 40px. **Reduced motion:** no pin, no stream motion; a static horizontal scroller.

### 4.6 Home — Five ways we build around you — built (F2)
Dark (`data-world="night"`). Reference: Metalab's homepage list — but driven by scroll, not hover. Pinned 0.2vh intro + 5 × 100vh chapters + 0.2vh outro, scrubbed and reversible.
- **Intro:** "Five ways we build around you." (Newsreader 300, 72px, white) over graphite #1A1B1E with fine grain; it passes behind glass as the first chapter wipes in.
- **Pill menu (left, the whole time):** Software & Apps · AI Modeling · Computer Vision & ML · Staff Augmentation · Technical Training (Geist 13px). A white highlight slides between pills (active: white fill, ink text); click scrolls to that chapter.
- **Each chapter (full screen):** real full-bleed photograph (`public/media/services/<slug>/bg.*`) with a very slow Ken Burns (1.04 → 1.10), a per-service colour grade (software warm amber · ai deep graphite + cool blue · vision steel blue · staff soft daylight green · training sunny warm white) and legibility scrims (text ≥ 4.5:1, measured). Name: Newsreader 300 ~110px, white, lower-left. Line: Geist 15px, top-right. Scope: Geist 12px, bottom-right.
- **Side visuals (right ~35%):** Software & Apps — minimal phone crossfading Garage Automation screens (1.6 s) · AI Modeling — desktop frame crossfading Nester screens · Computer Vision & ML — thin white detection boxes with Geist Mono labels drawn on the photo, appearing one by one (generic labels, no numbers) · Staff Augmentation — three portrait cards fanning out (team photos only) · Technical Training — 16:9 frame with a muted loop or slow photo sequence.
- **Transitions:** next photo wipes up from the bottom (feathered 12%) while the old one shrinks slightly; old name passes behind glass, new one rises; side visual swaps with a 120 ms offset; the pill highlight slides.
- **Placeholders:** graphite + grain where no photo; labelled frames where no screens / portraits / media.
- **Mobile:** no pin; full-screen cards in sequence with a sticky pill row; visual below the name. **Reduced motion:** same pin, crossfades only, no Ken Burns.

### 4.7 Home — let's work together + contact — built (F3)
Reference: Metalab's About headline with small photo rectangles between the words. Ours: a warm, sunny scene.
- **Light:** warm white (#FBF7EF) with sunlight through leaves — a stage shader multiplied over the page (so it falls on the paper, the photos and the ink alike): soft leaf-cluster shadows (slightly cool) and warm sun gaps, gentle sway (periods ≥ 6 s), slow drift; fine grain. Never busy.
- **Rectangles:** 8 portrait rectangles (radius 4px, 9–15vw) in an editorial composition around the headline (5 on phones); photos and 1–2 muted loops from `public/media/contact/`; soft shadows; slight parallax by depth and ±1° cursor drift. Four sit in FRONT of the ink, each over part of one letter (the l's top, the k's arm, the g's descender, the r's end); the rest behind it.
- **Headline:** "let's work together", lowercase, free-hand — custom single-stroke pen centrelines drawn letter by letter (`handwriting.ts`, replaceable by traced real handwriting), rendered with perfect-freehand (pressure: thin ends, heavier down-strokes), #121212, tiny ink pools at stroke starts. ~78% of the width over two lines (three on phones). Pinned: rectangles rise in (staggered), then the pen writes stroke by stroke in writing order (scrubbed).
- **Contact:** Newsreader line "Tell us how your business works. We'll show you what software built around it could look like." · three rows (name · role · email with mailto + Copy) · "Start a conversation" (mailto) · optional mailto form (no backend).
- **Reduced motion:** headline fully written, static light, no pin.

### 4.8 Home — Footer — built (F3)
Dark `--void`, small: "US IT Source", Work · Services · Contact (smooth in-page links), [LOCATION], LinkedIn (placeholder), © 2026 US IT Source, Back to top.

### 4.9 Other pages (unchanged unless a later brief says otherwise)

#### What We Do (page) — the service object (SIGNATURE)
Dark. Services list scrolls on the left; on the right a sticky object in the same lacquer reshapes per service:
- Software & Apps → ribbon folds into a clean grid
- AI Modeling → a tangle slowly unknots
- Computer Vision & ML → curls into a lens ring that focuses light
- Staff Augmentation → a second ribbon joins seamlessly
- Technical Training → rises in a guided spiral
Cursor ripples remain.

#### Work (page)
Three rows of **real project screens** move sideways with scroll, each at its own speed/direction. Hover: row slows; cursor becomes "View". Click: the screen grows to become the case-study page. Projects: Garage Automation · Material Nesting Software · Project Assembly Track (must scale to N). Assets **[TBD]** — redacted/demo-data screens only.

#### Case study pages
Hero = the expanded screen. Inline-media sentences, sticky image + scrolling facts, workflow line of that project. Copy and assets **[TBD]**; nothing invented.

#### About (page)
Giant Newsreader line moving across with scroll: "From the shop floor to the dashboard." Staff Augmentation and Technical Training ("Your team, extended." / "Your team, trained.") live here and on the What We Do page. Further About copy **[TBD]**.

#### Contact (page)
Night. The ribbon returns whole. "Tell us how your business works." / "We'll show you what software built around it could look like." / [Start a conversation]. As the cursor nears the button, the ribbon curls toward it. Footer: [EMAIL] · [LOCATION] · LinkedIn · © US IT Source.

#### Menu — built (F4, Metalab-style)
Menu (pill nav, every section; its colours follow the world behind it, incl. the dark INSIDE world) → the live page shrinks into a rounded portrait card (0.7 s, power3.inOut) on warm white: a clip-path hole, the page itself stays live inside it. Left: Newsreader links Home · Projects · Services · Contact. Right: the three contact emails. Hovering / keyboard-focusing a link shows a still of that section in the card (`public/media/menu/*.webp`); clicking jumps the page there under the card and the card opens back to full screen onto the live section. Esc / Close reverses. Dialog semantics, focus trap, focus returns to Menu. Phones: a full-screen list. Reduced motion: a fade.

#### The Map (menu) — FUTURE version (not built)
- Press Menu anywhere → the live page **shrinks into its rounded rectangle**; the camera pulls out over a `--night-1` canvas revealing the whole map.
- Main tiles: Home · What We Do · Work · About · Contact, connected by a thin route line. Branches: the five services off What We Do; the case studies off Work.
- Tiles show a live/looping preview of their page. Labels in Newsreader (tile titles) and Geist Mono labels (words, no numbers).
- Hover a tile: the route from the current page to that tile lights in `--rim`; the tile's preview plays.
- Click: the camera glides along the route; the target tile opens to full screen (§3).
- Close/Escape: the current tile opens back.
- Mobile: the map becomes a vertical route list of tiles; tap opens with the same rectangle motion.

---

### 4.10 Retired (do not build)
- *Retired* — **The break (Lusion moment)**: ribbon parting into segments, flight into the gap. Replaced by the rectangle rule → Line & flexible frame (4.3).
- *Retired* — **"The way you actually work"** (vermilion hand-drawn line with labels, "Every business has its own way of working."). Replaced by Step Inside (4.4).
- *Retired* — **"How we work"** (four numbered steps, engineered line, "You work A → D → B → F…"). Its steps survive only as the four unnumbered labels in Step Inside.
- *Retired* — **Inline-media sentence on home**. Replaced by Projects (4.5).
- *Retired* — **What We Do home teaser** (and its "03 — What we do" placeholder). Replaced by Five ways (4.6).
- *Retired* — **Old footer / contact bookend on home** (night ribbon returning). Replaced by Let's work together (4.7) + Footer (4.8).
- *Retired* — **S2 live workflow** ("Try it" interactive workflow in the frame). Replaced by Step Inside.

---

## 5. Never
Generic AI-agency look · fog/glow/haze backgrounds · purple-blue gradient blobs · neural dots · floating cubes · random glassmorphism · fake dashboards · decorative devices · cybersecurity language · neon · stock-photo walls · card grids · PowerPoint transitions · WebGL for its own sake · invented clients, metrics, testimonials, awards · copying Metalab's or Lusion's shapes, colours or wording.


### Premium rules (all remaining phases)
- **Real photography only.** No AI-generated images, no stock illustrations, no icons used as decoration. Temporary stock photos come only from Unsplash / Pexels, are credited in `docs/CREDITS.md` and listed in `docs/PLACEHOLDERS.md`.
- **One accent per screen.** A single accent colour (or bright element) at a time.
- **Slow, physical motion.** Weight, inertia, damping; nothing snappy or bouncy.
- **Generous space.** Let sections breathe; never fill a screen for the sake of it.
- **No fake dashboards or invented data.** No made-up metrics, charts, clients, quotes or screens.
- **No section numbering.** No "01 / 08", "02 —" prefixes or decorative step letters/numbers anywhere. Section labels may stay as plain words in Geist Mono.
