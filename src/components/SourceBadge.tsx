interface SourceBadgeProps {
  children: string
  tone?: 'ai' | 'patient' | 'doctor' | 'family'
}

export function SourceBadge({ children, tone = 'ai' }: SourceBadgeProps) {
  return <span className={`source-badge source-badge--${tone}`}>{children}</span>
}
