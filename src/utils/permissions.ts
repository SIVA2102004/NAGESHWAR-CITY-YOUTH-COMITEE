import type { UserRole } from '../types'

/**
 * Centralized permission system for Ganesh Chanda Pro.
 * Frontend permissions improve UX — Firebase Rules provide actual security.
 */

export function canViewAllContributions(role: UserRole): boolean {
  return role === 'admin'
}

export function canCreateContribution(role: UserRole): boolean {
  return role === 'admin' || role === 'volunteer'
}

export function canEditContribution(role: UserRole): boolean {
  return role === 'admin'
}

export function canDeleteContribution(role: UserRole): boolean {
  return role === 'admin'
}

export function canManageExpenses(role: UserRole): boolean {
  return role === 'admin'
}

export function canViewExpenses(role: UserRole): boolean {
  return role === 'admin' || role === 'volunteer'
}

export function canManageUsers(role: UserRole): boolean {
  return role === 'admin'
}

export function canManageDepartments(role: UserRole): boolean {
  return role === 'admin'
}

export function canManageInviteCodes(role: UserRole): boolean {
  return role === 'admin'
}

export function canViewReports(role: UserRole): boolean {
  return role === 'admin'
}

export function canViewActivityLog(role: UserRole): boolean {
  return role === 'admin'
}

export function canManageAnnouncements(role: UserRole): boolean {
  return role === 'admin'
}

export function canViewAnnouncements(_role: UserRole): boolean {
  return true // All roles can view announcements
}

export function canAccessAdminPanel(role: UserRole): boolean {
  return role === 'admin'
}

export function canAccessVolunteerPanel(role: UserRole): boolean {
  return role === 'admin' || role === 'volunteer'
}

export function getHomeRoute(role: UserRole): string {
  switch (role) {
    case 'admin':     return '/admin'
    case 'volunteer': return '/volunteer'
    case 'member':    return '/member'
    default:          return '/login'
  }
}
