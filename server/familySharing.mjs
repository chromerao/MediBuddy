export function buildSharedFamilyBundle({ ownerId, ownerEmail, relationship, state, appointments, visitRecords, now = new Date() }) {
  const preferences = state?.sharePreferences
  if (!preferences?.enabled) return null

  const cutoff = preferences.duration === '30days' ? new Date(now.getTime() - 30 * 86_400_000).getTime() : null
  const isInRange = (value) => cutoff === null || (value && new Date(value).getTime() >= cutoff)
  const limitForDuration = (items) => preferences.duration === 'once' ? items.slice(0, 1) : items

  const preparations = preferences.preparation
    ? limitForDuration(appointments
        .filter((appointment) => appointment.preparation?.status === 'ready' && isInRange(appointment.preparation.updatedAt))
        .sort((left, right) => right.preparation.updatedAt.localeCompare(left.preparation.updatedAt))
        .map((appointment) => ({
          appointmentId: appointment.id,
          date: appointment.date,
          time: appointment.time,
          hospital: appointment.hospital,
          department: appointment.department,
          type: appointment.type,
          summary: appointment.preparation.summary,
          updatedAt: appointment.preparation.updatedAt,
        })))
    : []

  const records = preferences.results
    ? limitForDuration(visitRecords
        .filter((record) => isInRange(record.createdAt))
        .sort((left, right) => right.createdAt.localeCompare(left.createdAt))
        .map(({ transcript: _transcript, transcriptionModel: _transcriptionModel, ...record }) => ({
          ...record,
          actions: preferences.actions ? record.actions ?? [] : [],
        })))
    : []

  const tasks = preferences.actions ? state.tasks ?? [] : []
  const medications = preferences.actions ? state.medications ?? [] : []
  const medicationIntakes = preferences.actions
    ? (state.medicationIntakes ?? []).filter((intake) => isInRange(intake.takenAt))
    : []
  const healthLogs = preferences.healthLogs
    ? limitForDuration((state.healthLogs ?? []).filter((log) => isInRange(log.createdAt)).sort((left, right) => String(right.createdAt).localeCompare(String(left.createdAt))))
    : []

  return {
    ownerId,
    ownerName: state.profile?.patientName || state.profile?.userName || ownerEmail.split('@')[0] || '연결된 가족',
    relationship,
    duration: preferences.duration,
    preparations,
    visitRecords: records,
    tasks,
    healthLogs,
    medications,
    medicationIntakes,
  }
}
