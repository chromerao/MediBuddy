import { describe, expect, it } from 'vitest'
import { retrieveMedicalSources, sourceCitations } from './rag.mjs'

describe('retrieveMedicalSources', () => {
  it('사용자 입력과 관련된 질병관리청 문서만 검색한다', () => {
    const sources = retrieveMedicalSources('오늘 공복 혈당을 기록했고 당뇨 진료를 준비해요')

    expect(sources[0].id).toBe('kdca-diabetes-5305')
    expect(sources.every((source) => source.organization === '질병관리청 국가건강정보포털')).toBe(true)
  })

  it('근거를 찾지 못하면 빈 결과를 반환한다', () => {
    expect(retrieveMedicalSources('다음 진료에서 궁금한 점이 있어요')).toEqual([])
  })

  it('클라이언트에는 원문 링크와 출처 메타데이터만 전달한다', () => {
    const [citation] = sourceCitations(retrieveMedicalSources('혈압이 평소와 달라요'))
    expect(citation).toMatchObject({ id: 'kdca-hypertension-6765', organization: '질병관리청 국가건강정보포털' })
    expect(citation.url).toMatch(/^https:\/\/health\.kdca\.go\.kr\//)
    expect(citation).not.toHaveProperty('summary')
    expect(citation).not.toHaveProperty('keywords')
  })
})
