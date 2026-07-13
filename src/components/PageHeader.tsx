import { ArrowLeft } from 'lucide-react'

interface PageHeaderProps {
  title: string
  onBack: () => void
}

export function PageHeader({ title, onBack }: PageHeaderProps) {
  return (
    <header className="flow-header">
      <button className="icon-button" type="button" onClick={onBack} aria-label="이전 화면"><ArrowLeft /></button>
      <strong>{title}</strong>
      <span aria-hidden="true" />
    </header>
  )
}
