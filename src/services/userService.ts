import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  serverTimestamp,
} from 'firebase/firestore'
import { db } from '../firebase/config'
import type { AppUser, UserRole, UserStatus } from '../types'
import { toDate } from '../utils/formatters'

const COLLECTION = 'users'

function docToUser(d: any): AppUser {
  const data = d.data()
  return {
    uid:            d.id,
    name:           data.name as string,
    email:          data.email as string,
    mobile:         data.mobile as string,
    role:           data.role as UserRole,
    status:         data.status as UserStatus,
    festivalId:     data.festivalId as string,
    departmentId:   data.departmentId as string | undefined,
    departmentName: data.departmentName as string | undefined,
    volunteerId:    data.volunteerId as string | undefined,
    volunteerName:  data.volunteerName as string | undefined,
    inviteCodeUsed: data.inviteCodeUsed as string | undefined,
    createdAt:      toDate(data.createdAt),
    updatedAt:      toDate(data.updatedAt),
    createdBy:      data.createdBy as string | undefined,
    address:        data.address as string | undefined,
  }
}

export async function createUserProfile(user: Omit<AppUser, 'createdAt' | 'updatedAt'>): Promise<void> {
  const cleanData: Record<string, unknown> = {
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  }
  for (const [key, value] of Object.entries(user)) {
    if (value !== undefined) {
      cleanData[key] = value
    }
  }
  await setDoc(doc(db, COLLECTION, user.uid), cleanData)
}

export async function getUserProfile(uid: string): Promise<AppUser | null> {
  const snap = await getDoc(doc(db, COLLECTION, uid))
  if (!snap.exists()) return null
  return docToUser(snap)
}

export async function updateUserProfile(
  uid: string,
  data: Partial<AppUser>
): Promise<void> {
  // Never allow role change from client — enforce in Firestore rules too
  const { role: _role, ...safeData } = data
  const cleanData: Record<string, unknown> = {
    updatedAt: serverTimestamp(),
  }
  for (const [key, value] of Object.entries(safeData)) {
    if (value !== undefined) {
      cleanData[key] = value
    }
  }
  await updateDoc(doc(db, COLLECTION, uid), cleanData)
}

export async function setUserRole(uid: string, role: UserRole): Promise<void> {
  // Admin-only operation — also enforced in Firestore rules
  await updateDoc(doc(db, COLLECTION, uid), {
    role,
    updatedAt: serverTimestamp(),
  })
}

export async function setUserStatus(uid: string, status: UserStatus): Promise<void> {
  await updateDoc(doc(db, COLLECTION, uid), {
    status,
    updatedAt: serverTimestamp(),
  })
}

export async function deleteUserProfile(uid: string): Promise<void> {
  await deleteDoc(doc(db, COLLECTION, uid))
}

export async function getUsersByFestival(festivalId: string): Promise<AppUser[]> {
  const q    = query(
    collection(db, COLLECTION),
    where('festivalId', '==', festivalId)
  )
  const snap = await getDocs(q)
  return snap.docs
    .map(docToUser)
    .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
}

export async function getUsersByRole(festivalId: string, role: UserRole): Promise<AppUser[]> {
  const q    = query(
    collection(db, COLLECTION),
    where('festivalId', '==', festivalId),
    where('role', '==', role)
  )
  const snap = await getDocs(q)
  return snap.docs
    .map(docToUser)
    .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
}

export async function getUsersByDepartment(departmentId: string): Promise<AppUser[]> {
  const q    = query(
    collection(db, COLLECTION),
    where('departmentId', '==', departmentId)
  )
  const snap = await getDocs(q)
  return snap.docs
    .map(docToUser)
    .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
}

export async function getUsersByVolunteer(volunteerId: string): Promise<AppUser[]> {
  const q    = query(
    collection(db, COLLECTION),
    where('volunteerId', '==', volunteerId),
    where('role', '==', 'member')
  )
  const snap = await getDocs(q)
  return snap.docs
    .map(docToUser)
    .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
}

export async function adminExists(festivalId: string): Promise<boolean> {
  const q    = query(
    collection(db, COLLECTION),
    where('festivalId', '==', festivalId),
    where('role', '==', 'admin')
  )
  const snap = await getDocs(q)
  return !snap.empty
}
