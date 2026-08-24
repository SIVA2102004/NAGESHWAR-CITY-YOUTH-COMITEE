import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  sendPasswordResetEmail,
  updateProfile,
  type UserCredential,
} from 'firebase/auth'
import { auth } from '../firebase/config'
import { createUserProfile, getUserProfile } from './userService'
import { festivalExists, getDefaultFestival } from './festivalService'
import { validateInviteCode, incrementCodeUsage } from './inviteCodeService'
import { logActivity } from './activityService'
import type { AppUser, UserRole } from '../types'

/**
 * Login with email and password. Returns the AppUser profile.
 */
export async function loginUser(
  email: string,
  password: string
): Promise<AppUser> {
  const cred: UserCredential = await signInWithEmailAndPassword(auth, email, password)
  const profile = await getUserProfile(cred.user.uid)
  if (!profile) throw new Error('User profile not found. Please contact admin.')
  if (profile.status === 'blocked') throw new Error('Your account has been blocked. Please contact admin.')
  if (profile.status === 'pending') throw new Error('Your account is pending approval.')
  return profile
}

/**
 * Register a new user via invite code.
 */
export async function registerWithInviteCode(params: {
  code:     string
  name:     string
  email:    string
  password: string
  mobile:   string
  address?: string
}): Promise<AppUser> {
  const festival = await getDefaultFestival()
  if (!festival) throw new Error('No festival found. Please contact admin.')

  const { valid, inviteCode, error } = await validateInviteCode(params.code, festival.id)
  if (!valid || !inviteCode) throw new Error(error || 'Invalid invite code.')

  // Determine role from code type
  let role: UserRole = 'member'
  if (inviteCode.type === 'ADMIN_INVITE')     role = 'admin'
  if (inviteCode.type === 'VOLUNTEER_INVITE') role = 'volunteer'

  // Create Firebase Auth account
  const cred = await createUserWithEmailAndPassword(auth, params.email, params.password)
  await updateProfile(cred.user, { displayName: params.name })

  // Create Firestore user profile
  const userProfile: Omit<AppUser, 'createdAt' | 'updatedAt'> = {
    uid:            cred.user.uid,
    name:           params.name,
    email:          params.email,
    mobile:         params.mobile,
    role,
    status:         'active',
    festivalId:     festival.id,
    departmentId:   inviteCode.departmentId,
    departmentName: inviteCode.departmentName,
    inviteCodeUsed: params.code,
    createdBy:      inviteCode.createdBy,
    address:        params.address,
  }

  await createUserProfile(userProfile)
  await incrementCodeUsage(inviteCode.id)

  await logActivity({
    festivalId:  festival.id,
    userId:      cred.user.uid,
    userName:    params.name,
    role,
    action:      'USER_REGISTERED',
    entityType:  'user',
    entityId:    cred.user.uid,
    description: `${params.name} registered as ${role}`,
  })

  return userProfile as AppUser
}

/**
 * Create the first admin during festival setup (no invite code required).
 */
export async function createFirstAdmin(params: {
  name:          string
  email:         string
  password:      string
  mobile:        string
  festivalId:    string
}): Promise<AppUser> {
  const hasExisting = await festivalExists()
  // Safety: only allow if no admin exists yet — enforced by Firestore rules too
  const cred = await createUserWithEmailAndPassword(auth, params.email, params.password)
  await updateProfile(cred.user, { displayName: params.name })

  const userProfile: Omit<AppUser, 'createdAt' | 'updatedAt'> = {
    uid:        cred.user.uid,
    name:       params.name,
    email:      params.email,
    mobile:     params.mobile,
    role:       'admin',
    status:     'active',
    festivalId: params.festivalId,
    createdBy:  cred.user.uid,
  }

  await createUserProfile(userProfile)
  return userProfile as AppUser
}

export async function logoutUser(): Promise<void> {
  await signOut(auth)
}

export async function resetPassword(email: string): Promise<void> {
  await sendPasswordResetEmail(auth, email)
}
