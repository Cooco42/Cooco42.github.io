/** Offline Tips & Tricks — Black & White techniques (Katana-style curriculum). */

import explainingTerms from '@/assets/tips/explaining-terms.png'
import fourArrowsUi from '@/assets/tips/four-arrows-ui.png'
import forcing8 from '@/assets/tips/forcing-8.png'
import joining9 from '@/assets/tips/joining-9.png'
import overlapping5 from '@/assets/tips/overlapping-5.png'
import overlapping6 from '@/assets/tips/overlapping-6.png'
import simpleBoxes1 from '@/assets/tips/simple-boxes-1.png'
import simpleBoxes2 from '@/assets/tips/simple-boxes-2.png'
import simpleBoxes3 from '@/assets/tips/simple-boxes-3.png'
import simpleCrosses4 from '@/assets/tips/simple-crosses-4.png'
import splitting10 from '@/assets/tips/splitting-10.png'
import spreading7 from '@/assets/tips/spreading-7.png'

export interface TipFigure {
  src: string
  alt: string
  caption?: string
}

export interface TipSection {
  id: string
  title: string
  body: string
  figures?: TipFigure[]
  notes?: string[]
}

export const BLACK_WHITE_TIPS: TipSection[] = [
  {
    id: 'terms',
    title: 'Terms',
    body: 'Clues are the numbers beside each row and column. Boxes are filled cells. Crosses (✕) mark cells that must stay empty. Blocks of boxes need at least one ✕ between them when a line has more than one clue.',
    figures: [
      {
        src: explainingTerms,
        alt: 'Diagram explaining nonogram terms on a 10×10 line',
      },
    ],
  },
  {
    id: 'simple-boxes',
    title: 'Simple boxes',
    body: 'Used beside the border and beside crosses — and also for trivial full lines. Put boxes where there’s no other place they can go.',
    figures: [
      {
        src: simpleBoxes1,
        alt: 'Example 1: simple boxes — clue 10 fills the whole line',
        caption: 'Example 1 — clue 10 fills the whole 10-wide line.',
      },
      {
        src: simpleBoxes2,
        alt: 'Example 2: simple boxes — edge box forces a block of 3',
        caption:
          'Example 2 — clue 3-4 with a box on the 1st square: that box belongs to the 3, so fill squares 2 and 3.',
      },
      {
        src: simpleBoxes3,
        alt: 'Example 3: simple boxes — only one gap left for a 2',
        caption:
          'Example 3 — clue 2 with eight crosses: only one gap left, so the 2 is forced.',
      },
    ],
  },
  {
    id: 'simple-crosses',
    title: 'Simple crosses',
    body: 'Put crosses where boxes cannot possibly be.',
    figures: [
      {
        src: simpleCrosses4,
        alt: 'Example 4: simple crosses around placed boxes',
        caption:
          'Example 4 — clue 3-1 with boxes on the 4th and 9th squares: the right box is the 1 (cross both sides), then cross cells the 3 can never reach (1st, 7th, 8th, 10th).',
      },
    ],
  },
  {
    id: 'overlapping',
    title: 'Overlapping',
    body: 'If clues plus the gaps between them, plus the largest clue, is greater than the line length, overlap is forced. Slide each block fully left, then fully right — cells filled in both positions must be boxes. Great for opening a puzzle. With several clues, only mark overlaps for the same clue number — don’t paint where different clues merely land on the same cell.',
    figures: [
      {
        src: overlapping5,
        alt: 'Example 5: overlapping a clue of 8 on width 10',
        caption:
          'Example 5 — clue 8 on width 10. Math: 8 + 0 + 8 = 16 > 10, so every clue larger than 6 overlaps. Slack = 10 − 8 = 2 empty cells to place around that block.',
      },
      {
        src: overlapping6,
        alt: 'Example 6: overlapping clues 4-3 carefully',
        caption:
          'Example 6 — clue 4-3. Math: (4+3) + 1 + 4 = 12 > 10. Overlap only within the same number. Slack = 10 − 8 = 2.',
      },
      {
        src: fourArrowsUi,
        alt: 'Optional arrow marks for noting possible block spans',
        caption:
          'Optional: use arrow marks while you think about left/right extremes. Drag in a direction to place that arrow. (Our app focuses on Fill / Mark (✕) / Hint / Undo — arrows are a study aid from the classic diagrams.)',
      },
    ],
  },
  {
    id: 'spreading',
    title: 'Spreading',
    body: 'When a box sits near a border or a cross, spread it away from that wall according to the clue size.',
    figures: [
      {
        src: spreading7,
        alt: 'Example 7: spreading a block of 5 from an edge box',
        caption:
          'Example 7 — clue 5 with a box on the 2nd square: it can only shift one cell left, so fill 3rd–5th.',
      },
    ],
  },
  {
    id: 'forcing',
    title: 'Forcing',
    body: 'With crosses already in the line, try fitting each clue into the remaining gaps. Impossible gaps get crossed out.',
    figures: [
      {
        src: forcing8,
        alt: 'Example 8: forcing clue 1-3 around existing crosses',
        caption:
          'Example 8 — clue 1-3 with crosses on the 6th and 8th: the 3 can’t fit right of 8 or between 6 and 8, so cross 7, 9, and 10.',
      },
    ],
  },
  {
    id: 'joining-splitting',
    title: 'Joining and splitting',
    body: 'Join boxes that must belong to the same block. Split boxes that would illegally merge two blocks.',
    figures: [
      {
        src: joining9,
        alt: 'Example 9: joining two boxes into a block of 5',
        caption:
          'Example 9 — clue 5 with boxes on 2 and 4: both are part of the 5, so fill square 3.',
      },
      {
        src: splitting10,
        alt: 'Example 10: splitting so two 2-blocks stay separate',
        caption:
          'Example 10 — clue 2-2 with boxes on 4 and 6: filling 5 would make a run of 3, so instead complete two separate 2s (e.g. fill 3 and 7).',
      },
    ],
  },
  {
    id: 'contradictions',
    title: 'Contradictions',
    body: 'When pure forcing stalls, you may need a careful trial: place one tentative box, keep solving with the techniques above, and watch for a contradiction. If you hit one, that first guess must be a cross instead. Prefer guesses with only two realistic options, and pick cells that can fail quickly (big clues, crowded lines).',
    notes: [
      'In this app: use Undo freely, and tap Hint when you want a single correct cell filled for you.',
      'Edge solving: on the last row/column, try seating a large edge clue at one end; if it contradicts, cross that corner cell and slide one step inward. Especially useful for clues of 5+ beside other large numbers.',
      'Always re-check every row and column with the earlier techniques before guessing.',
    ],
  },
]

export const TIPS_SOURCE_URL =
  'https://nonograms-katana.fandom.com/wiki/Tips_for_solving'

/** Shown on the Tips screen — credit the wiki source for text/diagram teaching material. */
export const TIPS_SOURCE =
  'Tips text and example diagrams are adapted from the Nonograms Katana community wiki page “Tips for solving” (Fandom). That guide is fan documentation for the Nonograms Katana game by UAB Flighty Fish; this app is an independent project and is not affiliated with or endorsed by them. Images are bundled here for offline use. See the wiki for the original material.'
