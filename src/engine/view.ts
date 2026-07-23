/** Pinch / button zoom limits for the puzzle board. */
export const MIN_BOARD_SCALE = 0.35

/** Larger grids need higher max zoom so cells stay finger-sized. */
export function maxBoardScale(size: number): number {
  if (size >= 30) return 9
  if (size >= 25) return 8
  if (size >= 20) return 6.5
  if (size >= 15) return 5
  return 4
}

export function clampBoardScale(scale: number, size: number): number {
  return Math.min(maxBoardScale(size), Math.max(MIN_BOARD_SCALE, scale))
}
