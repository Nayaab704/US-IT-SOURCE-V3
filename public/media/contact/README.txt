Section: let's work together (contact)

What goes here
- Photos (.jpg / .webp / .avif) and 1-2 short muted video loops (.webm + .mp4) for the scattered
  portrait rectangles around the hand-written headline. They are picked up automatically, in file-name
  order: videos fill the "video" slots first, photos fill the rest (desktop shows 8, phones 5).
  Photos: photo-01.*, photo-02.* ... (any image format).
  Videos: NN.webm + NN.mp4 + NN-poster.jpg (same NN), e.g. 01.webm / 01.mp4 / 01-poster.jpg.
- Real, warm, calm photographs of the work and the people (workbench, hands, screens in use, the team
  at work). No AI images, no stock illustrations.

Recommended sizes / formats
- Portrait 4:5 or 3:4, about 1500 px tall.
Any format / size: PNG, JPG, WebP or AVIF (a wrong extension is fine too). The build reads each file,
resizes it and converts it to WebP (+ AVIF for photos) with a content hash in the name, so a replaced
file always shows up. Your originals are never changed — but they are deployed too, so keep each
source under about 3 MB (around 3000 px is plenty).
  Video files are served as they are (with a content hash in the URL): keep them small.
- Loops: portrait 3:4, 720x960, 4-8 s, seamless, muted, H.264 MP4 + VP9 WebM, <= 1.5 MB each.

Credits for the loops: docs/CREDITS.md.
