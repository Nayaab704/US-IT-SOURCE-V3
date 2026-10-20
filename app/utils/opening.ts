/**
 * The opening's drifting words (R2), shared by the client opening and its server-rendered first frame
 * (HeroSection's fallback), so the very first paint already shows them where the opening starts.
 * Positions are fractions of the viewport; speed in px/s (sign = direction); `mobile` = shown on phones.
 */
export interface OpeningItem {
  id: string
  text: string
  kind: 'word' | 'label'
  x: number
  y: number
  speed: number
  mobile: boolean
}

// Loose editorial scatter over five rows — hand-placed, deliberately not a grid, not centred.
export const OPENING_ITEMS: OpeningItem[] = [
  { id: 'built', text: 'Built', kind: 'word', x: 0.07, y: 0.12, speed: 26, mobile: true },
  { id: 'route', text: 'A → D → B → F', kind: 'label', x: 0.31, y: 0.29, speed: -60, mobile: true },
  { id: 'you', text: 'you work.', kind: 'word', x: 0.66, y: 0.33, speed: -20, mobile: true },
  { id: 'around', text: 'around', kind: 'word', x: 0.52, y: 0.5, speed: -38, mobile: true },
  { id: 'time', text: '', kind: 'label', x: 0.88, y: 0.58, speed: 18, mobile: true },
  { id: 'theway', text: 'the way', kind: 'word', x: 0.18, y: 0.66, speed: 52, mobile: true },
]
