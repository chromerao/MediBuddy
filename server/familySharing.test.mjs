import { describe, expect, it } from 'vitest'
import { buildSharedFamilyBundle } from './familySharing.mjs'

const baseState = {
  profile: { userName: '보호 대상', patientName: '보호 대상' },
  sharePreferences: { enabled: true, preparation: true, results: true, actions: false, healthLogs: false, duration: 'always' },
  tasks: [{ id: 'task-1', label: '비공개 실천', completed: false, icon: 'walk' }],
  medications: [{ id: 'med-1', name: '비공개 약', slots: ['morning'], memo: '', createdAt: '2026-01-01' }],
  medicationIntakes: [],
  healthLogs: [{ id: 'log-1', text: '비공개 수치', time: '', createdAt: '2026-07-01' }],
}

const visitRecord = {
  id: 'visit-1', date: '2026년 7월 1일', day: '01', month: '7월', hospital: '한마음병원', department: '내과', disease: '진료 기록',
  summary: { symptom: '어지러움', course: '', measurement: '', questions: [] }, remembered: [], corrected: [], unanswered: [], actions: ['비공개 실천'],
  transcript: '가족에게 전달하면 안 되는 전사 원문', transcriptionModel: 'transcribe-model', createdAt: '2026-07-01T00:00:00.000Z',
}

describe('buildSharedFamilyBundle', () => {
  it('소유자의 공유 범위를 적용하고 전사문은 항상 제거한다', () => {
    const bundle = buildSharedFamilyBundle({ ownerId: 'owner-1', ownerEmail: 'owner@example.com', relationship: '자녀', state: baseState, appointments: [], visitRecords: [visitRecord] })

    expect(bundle.ownerName).toBe('보호 대상')
    expect(bundle.visitRecords).toHaveLength(1)
    expect(bundle.visitRecords[0]).not.toHaveProperty('transcript')
    expect(bundle.visitRecords[0]).not.toHaveProperty('transcriptionModel')
    expect(bundle.visitRecords[0].actions).toEqual([])
    expect(bundle.tasks).toEqual([])
    expect(bundle.medications).toEqual([])
    expect(bundle.healthLogs).toEqual([])
  })

  it('공유가 꺼져 있으면 어떤 데이터도 반환하지 않는다', () => {
    const state = { ...baseState, sharePreferences: { ...baseState.sharePreferences, enabled: false } }
    expect(buildSharedFamilyBundle({ ownerId: 'owner-1', ownerEmail: 'owner@example.com', relationship: '자녀', state, appointments: [], visitRecords: [visitRecord] })).toBeNull()
  })
})
