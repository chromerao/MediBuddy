import { HeartPulse } from 'lucide-react'

interface BrandProps {
  onClick?: () => void
}

export function Brand({ onClick }: BrandProps) {
  const content = (
    <>
      <span className="brand__mark" aria-hidden="true"><HeartPulse size={22} /></span>
      <span>MediBuddy</span>
    </>
  )

  if (onClick) {
    return <button className="brand brand--button" type="button" aria-label="메디버디 홈으로 이동" onClick={onClick}>{content}</button>
  }

  return <div className="brand">{content}</div>
}
