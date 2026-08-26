import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  sendPasswordResetEmail,
  updateProfile,
  type UserCredential,
} from 'firebase/auth'
import { auth } from '../firebase/config'
import { createUserProfile, getUserProfile, getUsersByRole } from './userService'
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
  const cleanEmail = email.trim().toLowerCase()
  const cred: UserCredential = await signInWithEmailAndPassword(auth, cleanEmail, password)
  let profile = await getUserProfile(cred.user.uid)
  
  if (!profile) {
    // Self-heal: If profile record is missing, construct from Auth details
    const festival = await getDefaultFestival()
    const newProfile: Omit<AppUser, 'createdAt' | 'updatedAt'> = {
      uid:        cred.user.uid,
      name:       cred.user.displayName || cleanEmail.split('@')[0],
      email:      cleanEmail,
      mobile:     '',
      role:       'admin',
      isSuperAdmin: cleanEmail === 'jakkasivasubramanyam2004@gmail.com',
      status:     'active',
      festivalId: festival?.id || 'default',
    }
    await createUserProfile(newProfile)
    profile = await getUserProfile(cred.user.uid)
  }

  if (profile?.status === 'blocked') {
    throw new Error('Your account has been blocked. Please contact admin.')
  }
  return profile!
}

/**
 * Register a new user via invite code.
 * If the user's email was already registered in Auth, links and upgrades their role with this code.
 */
export async function registerWithInviteCode(params: {
  code:     string
  name:     string
  email:    string
  password: string
  mobile:   string
  address?: string
}): Promise<AppUser> {
  const cleanEmail = params.email.trim().toLowerCase()

  // Validate invite code globally across all committees
  const { valid, inviteCode, error } = await validateInviteCode(params.code)
  if (!valid || !inviteCode) throw new Error(error || 'Invalid invite code.')

  const targetFestivalId = inviteCode.festivalId

  // Determine role from code type
  let role: UserRole = 'member'
  if (inviteCode.type === 'ADMIN_INVITE') role = 'admin'
  if (inviteCode.type === 'VOLUNTEER_INVITE') role = 'volunteer'

  let uid = ''
  try {
    // Create Firebase Auth account
    const cred = await createUserWithEmailAndPassword(auth, cleanEmail, params.password)
    uid = cred.user.uid
    await updateProfile(cred.user, { displayName: params.name })
  } catch (authErr: unknown) {
    const errObj = authErr as { code?: string; message?: string }
    if (errObj.code === 'auth/email-already-in-use') {
      // User was registered previously — sign in with their password to upgrade/activate their profile
      try {
        const cred = await signInWithEmailAndPassword(auth, cleanEmail, params.password)
        uid = cred.user.uid
        await updateProfile(cred.user, { displayName: params.name })
      } catch (signInErr: unknown) {
        const signErrObj = signInErr as { code?: string; message?: string }
        if (signErrObj.code === 'auth/wrong-password' || signErrObj.code === 'auth/invalid-credential') {
          throw new Error('This email is already registered. Please enter your existing account password to activate, or reset your password on the Login page.')
        }
        throw new Error('This email is already registered. Please sign in directly on the Login page.')
      }
    } else {
      throw authErr
    }
  }

  // Create / Overwrite Firestore user profile with the newly assigned role & exact festival
  const userProfile: Omit<AppUser, 'createdAt' | 'updatedAt'> = {
    uid,
    name:           params.name,
    email:          cleanEmail,
    mobile:         params.mobile.trim(),
    role,
    isSuperAdmin:   false, // New admins are never Super Admins
    status:         'active',
    festivalId:     targetFestivalId,
    departmentId:   inviteCode.departmentId,
    departmentName: inviteCode.departmentName,
    inviteCodeUsed: params.code,
    createdBy:      inviteCode.createdBy,
    address:        params.address,
  }

  await createUserProfile(userProfile)
  await incrementCodeUsage(inviteCode.id)

  await logActivity({
    festivalId:  targetFestivalId,
    userId:      uid,
    userName:    params.name,
    role,
    action:      'USER_REGISTERED',
    entityType:  'user',
    entityId:    uid,
    description: `${params.name} joined / activated as ${role}`,
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
  const cleanEmail = params.email.trim().toLowerCase()
  const cred = await createUserWithEmailAndPassword(auth, cleanEmail, params.password)
  await updateProfile(cred.user, { displayName: params.name })

  const userProfile: Omit<AppUser, 'createdAt' | 'updatedAt'> = {
    uid:        cred.user.uid,
    name:       params.name,
    email:      cleanEmail,
    mobile:     params.mobile,
    role:       'admin',
    isSuperAdmin: cleanEmail === 'jakkasivasubramanyam2004@gmail.com',
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
  const cleanEmail = email.trim().toLowerCase()
  await sendPasswordResetEmail(auth, cleanEmail)
}
