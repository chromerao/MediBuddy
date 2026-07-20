import type { LucideIcon } from 'lucide-react'

export interface FeatureHubItem {
  id: string
  label: string
  description: string
  icon: LucideIcon
  badge?: string
  onClick: () => void
}

interface FeatureHubProps {
  label: string
  items: FeatureHubItem[]
}

export function FeatureHub({ label, items }: FeatureHubProps) {
  return (
    <nav className="feature-hub" aria-label={label}>
      {items.map(({ id, label: itemLabel, description, icon: Icon, badge, onClick }) => (
        <button key={id} className="feature-hub__item" type="button" onClick={onClick}>
          <span className="feature-hub__icon"><Icon aria-hidden="true" /></span>
          <span className="feature-hub__text"><strong>{itemLabel}</strong><small>{description}</small></span>
          {badge && <span className="feature-hub__badge">{badge}</span>}
        </button>
      ))}
    </nav>
  )
}
