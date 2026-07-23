const ADJECTIVES = [
  'Quiet', 'Silver', 'Amber', 'Coral', 'Misty', 'Hidden', 'Gentle', 'Bright',
  'Soft', 'Clear', 'Calm', 'Faint', 'Bold', 'Pale', 'Deep', 'Light',
  'Still', 'Swift', 'Warm', 'Cool', 'Open', 'Closed', 'Early', 'Late',
  'Northern', 'Southern', 'Tiny', 'Grand', 'Simple', 'Clever', 'Neat', 'Sharp',
]

const NOUNS = [
  'Harbor', 'Lattice', 'Garden', 'Bridge', 'Lantern', 'Meadow', 'Anchor',
  'Compass', 'Window', 'River', 'Forest', 'Temple', 'Castle', 'Market', 'Studio',
  'Orchard', 'Beacon', 'Canvas', 'Mirror', 'Pavilion', 'Gallery', 'Atlas',
  'Crest', 'Valley', 'Summit', 'Shore', 'Grove', 'Plaza', 'Tower', 'Arcade',
  'Courtyard', 'Passage', 'Spire', 'Quay', 'Cove', 'Bluff', 'Ridge', 'Delta',
  'Isle', 'Bay', 'Nest', 'Loom', 'Kiln', 'Mill', 'Forge', 'Atelier',
  'Conservatory', 'Observatory',
]

const TRAILS = [
  'Path', 'Walk', 'Line', 'Grid', 'Mark', 'Tone', 'Shade', 'Form',
  'Shape', 'Edge', 'Gate', 'Arch', 'Bend', 'Rise', 'Fall', 'View',
]

function hashString(input: string): number {
  let h = 2166136261
  for (let i = 0; i < input.length; i += 1) {
    h ^= input.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  return h >>> 0
}

/** Friendly, non-numeric puzzle title derived from a stable id. */
export function friendlyPuzzleName(seed: string): string {
  const h = hashString(seed)
  const adj = ADJECTIVES[h % ADJECTIVES.length]!
  const noun = NOUNS[Math.floor(h / ADJECTIVES.length) % NOUNS.length]!
  const trail =
    TRAILS[Math.floor(h / (ADJECTIVES.length * NOUNS.length)) % TRAILS.length]!
  return `${adj} ${noun} ${trail}`
}
