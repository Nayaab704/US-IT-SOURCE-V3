public/media — every image and video on the site that is not code.

projects/   real project screens + environment photos, one folder per project
services/   one photograph per service (software, ai, vision, staff, training)
contact/    photos + short loops for "Let's work together"
team/       real portraits of the US IT Source team
menu/       the menu card's stills (screenshots of the site)
redactions.json  areas to block out in the published copies (private data in a screenshot)

Any image format and size works: the build (modules/media-manifest/) reads the real format, resizes,
converts to WebP / AVIF and serves hashed copies from /_m/. The originals here are never changed.

Note: the footage in the flexible-frame card currently lives in public/video/ (ops.mp4,
ops.webm, ops-poster.jpg) (read by FLEX_MEDIA in
app/utils/flexframe/params.ts; URLs content-hashed). It is a temporary Pexels clip — see docs/PLACEHOLDERS.md.

Rules (all media): real photography / real screens only. No AI-generated images, no stock
illustrations, no icons as decoration. Record every third-party file in
docs/CREDITS.md and tick it off in docs/PLACEHOLDERS.md.
