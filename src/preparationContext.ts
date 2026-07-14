import { getRecentAdherence } from './medications'
import { summarizeRecentMetrics } from './metrics'
import type { HealthLog, MedicalAppointment, Medication, MedicationIntake, Task, VisitRecord } from './types'

interface PreparationContextInput {
  appointment?: MedicalAppointment
  visitRecords: VisitRecord[]
  healthLogs: HealthLog[]
  tasks: Task[]
  medications: Medication[]
  medicationIntakes: MedicationIntake[]
}

export interface PreparationContext {
  prompt: string | null
  display: string | null
}

export function buildPreparationContext({ appointment, visitRecords, healthLogs, tasks, medications, medicationIntakes }: PreparationContextInput): PreparationContext {
  const sections: string[] = []
  const displayParts: string[] = []
  const metrics = summarizeRecentMetrics(healthLogs)

  if (metrics) {
    sections.push(`[최근 2주 직접 기록한 측정 수치]\n${metrics}`)
    displayParts.push('최근 건강 수치')
  }

  const sortedRecords = [...visitRecords].sort((left, right) => right.createdAt.localeCompare(left.createdAt))
  const relatedRecords = appointment
    ? sortedRecords.filter((record) => record.department === appointment.department || record.hospital === appointment.hospital)
    : sortedRecords
  const recentRecords = (relatedRecords.length > 0 ? relatedRecords : sortedRecords).slice(0, 2)

  if (recentRecords.length > 0) {
    const recordLines = recentRecords.map((record) => {
      const facts = [
        `${record.date} ${record.hospital} ${record.department}`,
        `당시 기록: ${record.summary.symptom}`,
        record.remembered.length > 0 ? `기억한 내용: ${record.remembered.join(' / ')}` : '',
        record.corrected.length > 0 ? `다시 확인한 내용: ${record.corrected.join(' / ')}` : '',
        record.unanswered.length > 0 ? `답을 확인하지 못한 질문: ${record.unanswered.join(' / ')}` : '',
        record.actions.length > 0 ? `진료에서 정한 실천: ${record.actions.join(' / ')}` : '',
      ].filter(Boolean)
      return `- ${facts.join(' · ')}`
    })
    sections.push(`[최근 관련 진료 기록]\n${recordLines.join('\n')}`)
    displayParts.push(`최근 진료 ${recentRecords.length}건`)
  }

  if (tasks.length > 0) {
    sections.push(`[현재 실천 현황]\n${tasks.map((task) => `- ${task.label}: ${task.completed ? '완료' : '아직 하지 않음'}`).join('\n')}`)
    displayParts.push(`실천 ${tasks.filter((task) => task.completed).length}/${tasks.length}`)
  }

  if (medications.length > 0) {
    const adherence = getRecentAdherence(medications, medicationIntakes)
    const taken = adherence.reduce((sum, day) => sum + day.taken, 0)
    const total = adherence.reduce((sum, day) => sum + day.total, 0)
    const medicationLines = medications.map((medication) => `- ${medication.name}${medication.memo ? ` (${medication.memo})` : ''}`)
    sections.push(`[사용자가 등록한 복약 기록]\n${medicationLines.join('\n')}\n최근 7일 체크: ${taken}/${total}`)
    displayParts.push(`복약 ${medications.length}개`)
  }

  if (sections.length === 0) return { prompt: null, display: null }

  return {
    prompt: sections.join('\n\n').slice(0, 2800),
    display: displayParts.join(' · '),
  }
}
