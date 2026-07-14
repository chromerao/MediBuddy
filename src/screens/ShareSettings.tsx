import { Check, Clock3, ShieldCheck } from 'lucide-react'
import { PageHeader } from '../components/PageHeader'
import type { SharePreferences } from '../types'

interface ShareSettingsProps {
  preferences: SharePreferences
  patientName: string
  onChange: (preferences: SharePreferences) => void
  onSave: () => void
  onBack: () => void
}

const scopes = [
  { key: 'preparation' as const, title: '진료 준비 내용', description: '증상 정리와 질문 카드를 공유해요.' },
  { key: 'results' as const, title: '진료 결과', description: '기억 확인 결과와 진료 정리를 공유해요.' },
  { key: 'actions' as const, title: '실천 항목', description: '복약과 운동 체크 내용을 공유해요.' },
  { key: 'healthLogs' as const, title: '한마디 건강 기록', description: '혈당·혈압 등 직접 기록한 수치를 공유해요.' },
]

export function ShareSettings({ preferences, patientName, onChange, onSave, onBack }: ShareSettingsProps) {
  return (
    <div className="flow-page share-settings-page">
      <PageHeader title="기록 공유 설정" onBack={onBack} />
      <section className="flow-intro"><span className="round-icon round-icon--soft"><ShieldCheck /></span><h1>어떤 기록을<br />공유할까요?</h1><p>선택한 {patientName} 님의 기록만 연결된 가족에게 보여요.</p></section>
      <label className="master-share"><span><strong>가족 기록 공유</strong><small>끄면 모든 기록 공유가 즉시 중단돼요.</small></span><input type="checkbox" checked={preferences.enabled} onChange={(event) => onChange({ ...preferences, enabled: event.target.checked })} /></label>
      <section className={preferences.enabled ? 'scope-list' : 'scope-list is-disabled'} aria-disabled={!preferences.enabled}>
        {scopes.map((scope) => (
          <label key={scope.key} className="scope-option">
            <input type="checkbox" disabled={!preferences.enabled} checked={preferences[scope.key]} onChange={(event) => onChange({ ...preferences, [scope.key]: event.target.checked })} />
            <span><strong>{scope.title}</strong><small>{scope.description}</small></span>
            {preferences[scope.key] && preferences.enabled && <Check aria-hidden="true" />}
          </label>
        ))}
      </section>
      <fieldset className="duration-fieldset" disabled={!preferences.enabled}>
        <legend><Clock3 /> 공유 기간</legend>
        <label><input type="radio" name="duration" checked={preferences.duration === 'once'} onChange={() => onChange({ ...preferences, duration: 'once' })} /> 이번 진료까지만</label>
        <label><input type="radio" name="duration" checked={preferences.duration === '30days'} onChange={() => onChange({ ...preferences, duration: '30days' })} /> 30일 동안</label>
        <label><input type="radio" name="duration" checked={preferences.duration === 'always'} onChange={() => onChange({ ...preferences, duration: 'always' })} /> 연결을 해제할 때까지</label>
      </fieldset>
      <div className="sticky-actions"><button className="button button--primary button--large" type="button" onClick={onSave}>공유 설정 저장하기</button></div>
    </div>
  )
}
