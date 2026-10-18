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

### 4.3 Home — the break (Lusion moment)
On scroll the ribbon reveals precise cut seams (thin rim-blue light) and **parts into segments**; the camera flies **into the gap**, travelling along the ribbon's path between separating segments; warm daylight grows at the end; we emerge onto paper. Fully reversible.

### 4.4 Home — "The way you actually work" (day, quiet)
The same path as the ribbon, now a vermilion hand-drawn line on paper, looping between labels: customer calls · whiteboard · spreadsheet_v7_FINAL · text the vendor · paper PO (lost?) · "who has the keys?" · invoice. Headline (Newsreader): "Every business has its own way of working." Body: "Most software ignores it. We start by learning it." Cursor: hold & drag to draw fading ink. (Built in Phase 8; restyle to Newsreader.)

### 4.5 Home — "How we work" (day)
Steps: 1 Sit with the work · 2 Map the flow · 3 Build to the map · 4 Run it, then grow it. The hand line becomes an engineered line with the **same shape**; labels → interface chips; light pulse; new branch grows. Closing line: "You work A → D → B → F. Your software works A → D → B → F."

### 4.6 Home — inline-media sentence (day → night)
Newsreader statement with real images inside the text, e.g. "Software [garage screen] built around [workshop photo] the way you work." Images are real and supplied **[TBD]**.

### 4.7 What We Do (page + home teaser) — the service object (SIGNATURE)
Dark. Services list scrolls on the left; on the right a sticky object in the same lacquer reshapes per service:
- Software & Apps → ribbon folds into a clean grid
- AI Modeling → a tangle slowly unknots
- Computer Vision & ML → curls into a lens ring that focuses light
- Staff Augmentation → a second ribbon joins seamlessly
- Technical Training → rises in a guided spiral
Cursor ripples remain.

### 4.8 Work (page + home teaser)
Three rows of **real project screens** move sideways with scroll, each at its own speed/direction. Hover: row slows; cursor becomes "View". Click: the screen grows to become the case-study page. Projects: Garage Automation · Material Nesting Software · Project Assembly Track (must scale to N). Assets **[TBD]** — redacted/demo-data screens only.

### 4.9 Case study pages
Hero = the expanded screen. Inline-media sentences, sticky image + scrolling facts, workflow line of that project. Copy and assets **[TBD]**; nothing invented.

### 4.10 About (page)
Giant Newsreader line moving across with scroll: "From the shop floor to the dashboard." Staff Augmentation and Technical Training ("Your team, extended." / "Your team, trained.") live here and on the What We Do page. Further About copy **[TBD]**.

### 4.11 Contact (page + home footer bookend)
Night. The ribbon returns whole. "Tell us how your business works." / "We'll show you what software built around it could look like." / [Start a conversation]. As the cursor nears the button, the ribbon curls toward it. Footer: [EMAIL] · [LOCATION] · LinkedIn · © US IT Source.

### 4.12 The Map (menu) — SIGNATURE
- Press Menu anywhere → the live page **shrinks into its rounded rectangle**; the camera pulls out over a `--night-1` canvas revealing the whole map.
- Main tiles: Home · What We Do · Work · About · Contact, connected by a thin route line. Branches: the five services off What We Do; the case studies off Work.
- Tiles show a live/looping preview of their page. Labels in Newsreader (tile titles) and Geist Mono (indexes).
- Hover a tile: the route from the current page to that tile lights in `--rim`; the tile's preview plays.
- Click: the camera glides along the route; the target tile opens to full screen (§3).
- Close/Escape: the current tile opens back.
- Mobile: the map becomes a vertical route list of tiles; tap opens with the same rectangle motion.

---

## 5. Never
Generic AI-agency look · fog/glow/haze backgrounds · purple-blue gradient blobs · neural dots · floating cubes · random glassmorphism · fake dashboards · decorative devices · cybersecurity language · neon · stock-photo walls · card grids · PowerPoint transitions · WebGL for its own sake · invented clients, metrics, testimonials, awards · copying Metalab's or Lusion's shapes, colours or wording.
