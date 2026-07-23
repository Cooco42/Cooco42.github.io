import type { CSSProperties, ReactNode } from 'react'

export function BrandMark({ compact = false }: { compact?: boolean }) {
  return (
    <div className="brand-mark" aria-label="Nonogram">
      <span className="brand-mark__glyph" aria-hidden />
      {!compact && <span>Nonogram</span>}
    </div>
  )
}

export function Card({
  children,
  className = '',
  style,
}: {
  children: ReactNode
  className?: string
  style?: CSSProperties
}) {
  return (
    <div className={`card ${className}`.trim()} style={style}>
      {children}
    </div>
  )
}

export function CardButton({
  title,
  meta,
  onClick,
  to,
}: {
  title: string
  meta?: string
  onClick?: () => void
  to?: string
}) {
  const content = (
    <>
      <p className="card-button__title">{title}</p>
      {meta ? <p className="card-button__meta">{meta}</p> : null}
    </>
  )

  if (to) {
    return (
      <a className="card card-button" href={to} onClick={onClick}>
        {content}
      </a>
    )
  }

  return (
    <button type="button" className="card card-button" onClick={onClick}>
      {content}
    </button>
  )
}

export function Switch({
  on,
  onToggle,
  label,
}: {
  on: boolean
  onToggle: () => void
  label: string
}) {
  return (
    <button
      type="button"
      className="switch"
      data-on={on}
      aria-pressed={on}
      aria-label={label}
      onClick={onToggle}
    />
  )
}

export function ProgressBar({ value }: { value: number }) {
  const width = Math.max(0, Math.min(100, value))
  return (
    <div className="progress-bar" role="progressbar" aria-valuenow={width} aria-valuemin={0} aria-valuemax={100}>
      <span style={{ width: `${width}%` }} />
    </div>
  )
}

export function IconButton({
  label,
  onClick,
  disabled,
  active,
  children,
}: {
  label: string
  onClick?: () => void
  disabled?: boolean
  active?: boolean
  children: ReactNode
}) {
  return (
    <button
      type="button"
      className="btn-icon"
      aria-label={label}
      title={label}
      onClick={onClick}
      disabled={disabled}
      data-active={active ? 'true' : 'false'}
    >
      {children}
    </button>
  )
}
