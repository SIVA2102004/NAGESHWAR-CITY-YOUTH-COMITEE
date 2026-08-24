import {
  collection,
  doc,
  addDoc,
  getDoc,
  getDocs,
  updateDoc,
  query,
  where,
  orderBy,
  serverTimestamp,
  Timestamp,
  increment,
} from 'firebase/firestore'
import { db } from '../firebase/config'
import type { InviteCode, InviteCodeType, InviteCodeStatus } from '../types'
import { toDate } from '../utils/formatters'

const COLLECTION = 'inviteCodes'

/** Generate a random 6-character alphanumeric code (uppercase) */
function generateCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789' // Removed I, O, 0, 1 to avoid confusion
  let code    = ''
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  return code
}

function docToCode(d: any): InviteCode {
  const data = d.data()
  return {
    id:             d.id,
    code:           data.code as string,
    type:           data.type as InviteCodeType,
    festivalId:     data.festivalId as string,
    departmentId:   data.departmentId as string | undefined,
    departmentName: data.departmentName as string | undefined,
    createdBy:      data.createdBy as string,
    createdByName:  data.createdByName as string,
    createdAt:      toDate(data.createdAt),
    expiresAt:      data.expiresAt ? toDate(data.expiresAt) : undefined,
    maxUses:        (data.maxUses as number) || 0,
    usedCount:      (data.usedCount as number) || 0,
    status:         computeStatus(data),
  }
}

function computeStatus(data: Record<string, unknown>): InviteCodeStatus {
  if (data.status === 'disabled') return 'disabled'
  const maxUses    = (data.maxUses as number) || 0
  const usedCount  = (data.usedCount as number) || 0
  if (maxUses > 0 && usedCount >= maxUses) return 'exhausted'
  if (data.expiresAt) {
    const expiry = toDate(data.expiresAt)
    if (expiry < new Date()) return 'expired'
  }
  return 'active'
}

export async function createInviteCode(params: {
  type:           InviteCodeType
  festivalId:     string
  departmentId?:  string
  departmentName?: string
  createdBy:      string
  createdByName:  string
  maxUses?:       number
  expiresInDays?: number
}): Promise<InviteCode> {
  const code = generateCode()
  let expiresAt: Timestamp | undefined
  if (params.expiresInDays) {
    const d = new Date()
    d.setDate(d.getDate() + params.expiresInDays)
    expiresAt = Timestamp.fromDate(d)
  }

  const payload: Record<string, unknown> = {
    code,
    type:          params.type,
    festivalId:    params.festivalId,
    createdBy:     params.createdBy,
    createdByName: params.createdByName,
    maxUses:       params.maxUses ?? 0,
    usedCount:     0,
    status:        'active',
    createdAt:     serverTimestamp(),
  }
  if (params.departmentId)   payload.departmentId   = params.departmentId
  if (params.departmentName) payload.departmentName = params.departmentName
  if (expiresAt)             payload.expiresAt      = expiresAt

  const ref  = await addDoc(collection(db, COLLECTION), payload)
  const snap = await getDoc(ref)
  return docToCode(snap)
}

export async function validateInviteCode(
  code: string,
  festivalId: string
): Promise<{ valid: boolean; inviteCode?: InviteCode; error?: string }> {
  const q    = query(
    collection(db, COLLECTION),
    where('code', '==', code.toUpperCase()),
    where('festivalId', '==', festivalId)
  )
  const snap = await getDocs(q)
  if (snap.empty) return { valid: false, error: 'Invalid invite code.' }

  const ic = docToCode(snap.docs[0])
  if (ic.status === 'disabled')  return { valid: false, error: 'This invite code has been disabled.' }
  if (ic.status === 'expired')   return { valid: false, error: 'This invite code has expired.' }
  if (ic.status === 'exhausted') return { valid: false, error: 'This invite code has reached its maximum uses.' }

  return { valid: true, inviteCode: ic }
}

export async function incrementCodeUsage(codeId: string): Promise<void> {
  await updateDoc(doc(db, COLLECTION, codeId), {
    usedCount: increment(1),
  })
}

export async function disableCode(codeId: string): Promise<void> {
  await updateDoc(doc(db, COLLECTION, codeId), { status: 'disabled' })
}

export async function getInviteCodesByFestival(festivalId: string): Promise<InviteCode[]> {
  const q    = query(
    collection(db, COLLECTION),
    where('festivalId', '==', festivalId)
  )
  const snap = await getDocs(q)
  return snap.docs
    .map(docToCode)
    .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
}

export async function getInviteCodesByDepartment(departmentId: string): Promise<InviteCode[]> {
  const q    = query(
    collection(db, COLLECTION),
    where('departmentId', '==', departmentId)
  )
  const snap = await getDocs(q)
  return snap.docs
    .map(docToCode)
    .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
}
