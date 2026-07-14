import type { PropsWithChildren } from 'react'
import { BookHeart, Home, LogIn, LogOut, MoreVertical, UserRound, Users } from 'lucide-react'
import type { AuthStatus, Tab, UserSettings } from '../types'
import { Brand } from './Brand'

interface AppShellProps extends PropsWithChildren {
  tab: Tab
  onTabChange: (tab: Tab) => void
  compactContent?: boolean
  onGoHome: () => void
  onOpenSettings: () => void
  onOpenProfile: () => void
  onOpenAccount: () => void
  onLogout: () => void
  authStatus: AuthStatus
  fontSize: UserSettings['fontSize']
}

const navigation = [
  { id: 'home' as const, label: '홈', icon: Home },
  { id: 'notebook' as const, label: '의료수첩', icon: BookHeart },
  { id: 'family' as const, label: '가족', icon: Users },
]

export function AppShell({ tab, onTabChange, compactContent = false, onGoHome, onOpenSettings, onOpenProfile, onOpenAccount, onLogout, authStatus, fontSize, children }: AppShellProps) {
  return (
    <div className={`app-shell font-size--${fontSize}`}>
      <header className="topbar">
        <Brand onClick={onGoHome} />
        <div className="topbar-actions">
          <button className="topbar-action" type="button" onClick={onOpenProfile}>
            <UserRound aria-hidden="true" /><span>내 정보</span>
          </button>
          {authStatus === 'authenticated' ? (
            <button className="topbar-action" type="button" onClick={onLogout}>
              <LogOut aria-hidden="true" /><span>로그아웃</span>
            </button>
          ) : (
            <button className="topbar-action topbar-action--accent" type="button" onClick={onOpenAccount}>
              <LogIn aria-hidden="true" /><span>로그인·가입</span>
            </button>
          )}
          <button className="icon-button" type="button" aria-label="설정 열기" onClick={onOpenSettings}>
            <MoreVertical aria-hidden="true" />
          </button>
        </div>
      </header>
      <main className={compactContent ? 'main main--flow' : 'main'}>{children}</main>
      <nav className="bottom-nav" aria-label="주요 메뉴">
        {navigation.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            type="button"
            className={tab === id ? 'bottom-nav__item is-active' : 'bottom-nav__item'}
            aria-current={tab === id ? 'page' : undefined}
            onClick={() => onTabChange(id)}
          >
            <Icon size={24} aria-hidden="true" />
            <span>{label}</span>
          </button>
        ))}
      </nav>
    </div>
  )
}
