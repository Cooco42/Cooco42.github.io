/** Black/white thumbnail of a nonogram solution (row-major 0/1). */
export function SolutionThumb({
  solution,
  size,
  className = '',
  ink = '#1a1a1a',
  paper = '#ffffff',
  stretch = false,
}: {
  solution: ReadonlyArray<number>
  size: number
  className?: string
  ink?: string
  paper?: string
  /** Fill the parent box completely (may stretch non-square). */
  stretch?: boolean
}) {
  const cells = solution.length >= size * size ? solution : []
  return (
    <svg
      className={`solution-thumb ${className}`.trim()}
      viewBox={`0 0 ${size} ${size}`}
      width="100%"
      height="100%"
      aria-hidden
      shapeRendering="crispEdges"
      preserveAspectRatio={stretch ? 'none' : 'xMidYMid meet'}
    >
      <rect width={size} height={size} fill={paper} />
      {cells.map((v, i) =>
        v === 1 ? (
          <rect
            key={i}
            x={i % size}
            y={Math.floor(i / size)}
            width={1}
            height={1}
            fill={ink}
          />
        ) : null,
      )}
    </svg>
  )
}
