/** Full-bleed 3×3 checker: black corners + center; yellow edge-centers. */
const BLACK_CELLS = new Set([0, 2, 4, 6, 8])

export function SudokuGlyph({
  className = '',
  size,
}: {
  className?: string
  size?: number
}) {
  return (
    <svg
      className={`sudoku-glyph ${className}`.trim()}
      viewBox="0 0 3 3"
      width={size}
      height={size}
      aria-hidden
      shapeRendering="crispEdges"
    >
      {Array.from({ length: 9 }, (_, i) => {
        const r = Math.floor(i / 3)
        const c = i % 3
        return (
          <rect
            key={i}
            x={c}
            y={r}
            width={1}
            height={1}
            className={
              BLACK_CELLS.has(i)
                ? 'sudoku-glyph__ink'
                : 'sudoku-glyph__deck'
            }
          />
        )
      })}
    </svg>
  )
}
