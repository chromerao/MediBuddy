import type { AppState, UserProfile } from './types'

export const emptyProfile: UserProfile = {
  userName: '',
  patientName: '',
  relationship: '',
}

export function isProfileComplete(profile: UserProfile, role: AppState['role']) {
  if (!profile.userName.trim()) return false
  return role === 'self' || Boolean(profile.patientName.trim() && profile.relationship.trim())
}

export function normalizeProfile(profile: UserProfile, role: AppState['role']): UserProfile {
  const userName = profile.userName.trim()
  if (role === 'self') {
    return { userName, patientName: userName, relationship: '본인' }
  }
  return {
    userName,
    patientName: profile.patientName.trim(),
    relationship: profile.relationship.trim(),
  }
}
