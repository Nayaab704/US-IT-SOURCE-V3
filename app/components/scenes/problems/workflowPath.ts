/**
 * PLACEHOLDER until Scene 2 ("The way you actually work", ART_DIRECTION v2 §4.4) defines the real
 * route of the hand-drawn line. Everything that follows the workflow shape (the ribbon, later the
 * ink line and the engineered line) reads ONLY this module, so the real path drops in here without
 * changes elsewhere.
 *
 * Normalised 2D control points (0–1, origin bottom-left, y up), in travel order. Bold and simple:
 * ONE big loop and ONE backtrack (the ribbon refine brief) — no small wiggles.
 */
export interface WorkflowPoint {
  x: number
  y: number
}

export const WORKFLOW_PATH: readonly WorkflowPoint[] = [
  { x: 0.0, y: 0.4 },
  { x: 0.18, y: 0.48 },
  { x: 0.38, y: 0.58 },
  { x: 0.5, y: 0.45 }, // the big loop: down, round and back up across the first leg
  { x: 0.46, y: 0.22 },
  { x: 0.3, y: 0.14 },
  { x: 0.17, y: 0.28 },
  { x: 0.24, y: 0.58 },
  { x: 0.38, y: 0.8 },
  { x: 0.62, y: 0.82 },
  { x: 0.84, y: 0.7 },
  { x: 0.86, y: 0.48 }, // backtrack: a hairpin back toward the start before carrying on
  { x: 0.7, y: 0.38 },
  { x: 0.68, y: 0.2 },
  { x: 0.84, y: 0.12 },
  { x: 1.0, y: 0.18 },
]
