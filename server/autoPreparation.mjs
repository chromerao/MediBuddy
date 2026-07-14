export function createAutomaticPreparationDraft(appointment, visitRecords, now = new Date()) {
  if (appointment.preparation || appointment.status !== 'scheduled') return null
  const records = [...visitRecords].sort((a, b) => String(b.createdAt ?? b.date).localeCompare(String(a.createdAt ?? a.date)))
  const previous = records.find((record) => record.department === appointment.department || record.hospital === appointment.hospital) ?? records[0]
  if (!previous?.summary) return null

  const questions = unique([
    ...(previous.unanswered ?? []),
    `지난 ${previous.date} 진료 이후 달라진 점을 어떻게 설명하면 될까요?`,
    '이번 진료에서 꼭 다시 확인해야 할 내용은 무엇인가요?',
    '다음 진료 전까지 어떤 내용을 기록하면 될까요?',
  ]).slice(0, 3)

  return {
    ...appointment,
    preparation: {
      symptomInput: `지난 진료 기록을 바탕으로 만든 초안: ${previous.summary.symptom}`,
      summary: {
        symptom: `지난 ${previous.date} 진료 기록: ${previous.summary.symptom}`,
        course: '지난 진료 이후 달라진 점은 아직 입력되지 않았어요. 현재 상태를 확인해 주세요.',
        measurement: '최근 측정 수치는 진료 준비 화면에서 직접 확인해 주세요.',
        questions,
        sources: previous.summary.sources ?? [],
      },
      status: 'draft',
      updatedAt: now.toISOString(),
    },
  }
}

function unique(values) {
  return [...new Set(values.map((value) => String(value).trim()).filter(Boolean))]
}
