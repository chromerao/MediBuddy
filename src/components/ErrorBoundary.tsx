import { Component, type PropsWithChildren } from 'react'

interface ErrorBoundaryState {
  error: Error | null
}

// 렌더링 중 예외가 나도 흰 화면 대신 안내와 새로고침 버튼을 보여준다.
export class ErrorBoundary extends Component<PropsWithChildren, ErrorBoundaryState> {
  state: ErrorBoundaryState = { error: null }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { error }
  }

  componentDidCatch(error: Error) {
    console.error('MediBuddy render error:', error)
  }

  render() {
    if (!this.state.error) return this.props.children
    return (
      <main style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 16, padding: 24, textAlign: 'center' }}>
        <h1 style={{ fontSize: 22 }}>화면을 표시하지 못했어요.</h1>
        <p style={{ color: '#5b635c' }}>일시적인 문제일 수 있어요. 아래 버튼으로 다시 시작해 주세요.</p>
        <p style={{ fontSize: 13, color: '#8a938b', maxWidth: 480, wordBreak: 'break-all' }}>{this.state.error.message}</p>
        <button
          type="button"
          style={{ padding: '14px 28px', borderRadius: 12, border: 'none', background: '#1f7a33', color: 'white', fontSize: 17, fontWeight: 700, cursor: 'pointer' }}
          onClick={() => window.location.reload()}
        >
          다시 시작하기
        </button>
      </main>
    )
  }
}
