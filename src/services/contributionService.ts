import {
  collection,
  doc,
  addDoc,
  getDoc,
  getDocs,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  onSnapshot,
  serverTimestamp,
  limit,
  type Unsubscribe,
} from 'firebase/firestore'
import { db } from '../firebase/config'
import type { Contribution, PaymentMethod, PaymentStatus } from '../types'
import { toDate } from '../utils/formatters'
import { generateReceiptNumber } from '../utils/receiptNumber'

const COLLECTION = 'contributions'

function docToContribution(d: any): Contribution {
  const data = d.data()
  return {
    id:              d.id,
    festivalId:      data.festivalId as string,
    contributorName: data.contributorName as string,
    mobile:          data.mobile as string,
    houseNumber:     data.houseNumber as string | undefined,
    amount:          (data.amount as number) || 0,
    paymentMethod:   data.paymentMethod as PaymentMethod,
    paymentStatus:   data.paymentStatus as PaymentStatus,
    collectedBy:     data.collectedBy as string,
    collectedByUid:  data.collectedByUid as string,
    departmentId:    data.departmentId as string,
    departmentName:  data.departmentName as string,
    notes:           data.notes as string | undefined,
    receiptNumber:   data.receiptNumber as string,
    createdAt:       toDate(data.createdAt),
    updatedAt:       toDate(data.updatedAt),
    createdBy:       data.createdBy as string,
  }
}

export async function createContribution(data: {
  festivalId:      string
  festivalYear:    string
  contributorName: string
  mobile:          string
  houseNumber?:    string
  amount:          number
  paymentMethod:   PaymentMethod
  paymentStatus:   PaymentStatus
  collectedBy:     string
  collectedByUid:  string
  departmentId:    string
  departmentName:  string
  notes?:          string
  createdBy:       string
}): Promise<Contribution> {
  const receiptNumber = await generateReceiptNumber(data.festivalYear)
  const payload: Record<string, any> = {
    festivalId:      data.festivalId,
    contributorName: data.contributorName,
    mobile:          data.mobile,
    amount:          data.amount,
    paymentMethod:   data.paymentMethod,
    paymentStatus:   data.paymentStatus,
    collectedBy:     data.collectedBy,
    collectedByUid:  data.collectedByUid,
    departmentId:    data.departmentId,
    departmentName:  data.departmentName,
    receiptNumber,
    createdBy:       data.createdBy,
    createdAt:       serverTimestamp(),
    updatedAt:       serverTimestamp(),
  }
  if (data.houseNumber) payload.houseNumber = data.houseNumber
  if (data.notes)       payload.notes       = data.notes

  const ref  = await addDoc(collection(db, COLLECTION), payload)
  const snap = await getDoc(ref)
  return docToContribution(snap)
}

export async function getContribution(id: string): Promise<Contribution | null> {
  const snap = await getDoc(doc(db, COLLECTION, id))
  if (!snap.exists()) return null
  return docToContribution(snap)
}

export async function updateContribution(
  id: string,
  data: Partial<Omit<Contribution, 'id' | 'festivalId' | 'createdAt' | 'createdBy' | 'receiptNumber'>>
): Promise<void> {
  await updateDoc(doc(db, COLLECTION, id), {
    ...data,
    updatedAt: serverTimestamp(),
  })
}

export async function deleteContribution(id: string): Promise<void> {
  await deleteDoc(doc(db, COLLECTION, id))
}

export async function getContributionsByFestival(
  festivalId: string
): Promise<Contribution[]> {
  const q    = query(
    collection(db, COLLECTION),
    where('festivalId', '==', festivalId)
  )
  const snap = await getDocs(q)
  return snap.docs
    .map(docToContribution)
    .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
}

export async function getContributionsByDepartment(
  festivalId: string,
  departmentId: string
): Promise<Contribution[]> {
  const q    = query(
    collection(db, COLLECTION),
    where('festivalId', '==', festivalId),
    where('departmentId', '==', departmentId)
  )
  const snap = await getDocs(q)
  return snap.docs
    .map(docToContribution)
    .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
}

export async function getContributionsByCollector(
  festivalId: string,
  collectedByUid: string
): Promise<Contribution[]> {
  const q    = query(
    collection(db, COLLECTION),
    where('festivalId', '==', festivalId),
    where('collectedByUid', '==', collectedByUid)
  )
  const snap = await getDocs(q)
  return snap.docs
    .map(docToContribution)
    .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
}

export function subscribeToContributions(
  festivalId: string,
  callback: (contributions: Contribution[]) => void
): Unsubscribe {
  const q = query(
    collection(db, COLLECTION),
    where('festivalId', '==', festivalId)
  )
  return onSnapshot(q, (snap) => {
    const list = snap.docs
      .map(docToContribution)
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
    callback(list)
  })
}

export function subscribeToVolunteerContributions(
  festivalId: string,
  collectedByUid: string,
  callback: (contributions: Contribution[]) => void
): Unsubscribe {
  const q = query(
    collection(db, COLLECTION),
    where('festivalId', '==', festivalId),
    where('collectedByUid', '==', collectedByUid)
  )
  return onSnapshot(q, (snap) => {
    const list = snap.docs
      .map(docToContribution)
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
    callback(list)
  })
}
