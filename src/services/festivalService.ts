import {
  collection,
  doc,
  addDoc,
  getDoc,
  getDocs,
  updateDoc,
  deleteDoc,
  serverTimestamp,
  Timestamp,
  query,
  limit,
} from 'firebase/firestore'
import { db } from '../firebase/config'
import type { Festival } from '../types'
import { toDate } from '../utils/formatters'

const COLLECTION = 'festivals'

function docToFestival(d: any): Festival {
  const data = d.data()
  return {
    id:            d.id,
    name:          data.name as string,
    committeeName: data.committeeName as string,
    festivalYear:  data.festivalYear as string,
    address:       data.address as string | undefined,
    contactNumber: data.contactNumber as string | undefined,
    email:         data.email as string | undefined,
    targetAmount:  (data.targetAmount as number) || 0,
    logo:          data.logo as string | undefined,
    upiId:         data.upiId as string | undefined,
    upiPayeeName:  data.upiPayeeName as string | undefined,
    createdAt:     toDate(data.createdAt),
    createdBy:     data.createdBy as string,
  }
}

export async function createFestival(data: {
  name:          string
  committeeName: string
  festivalYear:  string
  address?:      string
  contactNumber?: string
  email?:        string
  targetAmount:  number
  logo?:         string
  upiId?:        string
  upiPayeeName?: string
  createdBy:     string
}): Promise<string> {
  const cleanData: Record<string, unknown> = {
    name:          data.name,
    committeeName: data.committeeName,
    festivalYear:  data.festivalYear,
    targetAmount:  data.targetAmount || 0,
    createdBy:     data.createdBy,
    createdAt:     serverTimestamp(),
    updatedAt:     serverTimestamp(),
  }

  if (data.address?.trim())       cleanData.address       = data.address.trim()
  if (data.contactNumber?.trim()) cleanData.contactNumber = data.contactNumber.trim()
  if (data.email?.trim())         cleanData.email         = data.email.trim()
  if (data.logo?.trim())          cleanData.logo          = data.logo.trim()
  if (data.upiId?.trim())         cleanData.upiId         = data.upiId.trim()
  if (data.upiPayeeName?.trim())  cleanData.upiPayeeName  = data.upiPayeeName.trim()

  const ref = await addDoc(collection(db, COLLECTION), cleanData)
  return ref.id
}

export async function getDefaultFestival(): Promise<Festival | null> {
  const q    = query(collection(db, COLLECTION), limit(1))
  const snap = await getDocs(q)
  if (snap.empty) return null
  return docToFestival(snap.docs[0])
}

export async function getFestival(id: string): Promise<Festival | null> {
  const snap = await getDoc(doc(db, COLLECTION, id))
  if (!snap.exists()) return null
  return docToFestival(snap)
}

export async function updateFestival(
  id: string,
  data: Partial<Omit<Festival, 'id' | 'createdAt' | 'createdBy'>>
): Promise<void> {
  const cleanData: Record<string, unknown> = {
    updatedAt: serverTimestamp(),
  }
  for (const [key, value] of Object.entries(data)) {
    if (value !== undefined) {
      cleanData[key] = value
    }
  }
  await updateDoc(doc(db, COLLECTION, id), cleanData)
}

export async function getAllFestivals(): Promise<Festival[]> {
  const q = query(collection(db, COLLECTION))
  const snap = await getDocs(q)
  return snap.docs
    .map(docToFestival)
    .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
}

export async function deleteFestival(id: string): Promise<void> {
  await deleteDoc(doc(db, COLLECTION, id))
}

export async function festivalExists(): Promise<boolean> {
  const q    = query(collection(db, COLLECTION), limit(1))
  const snap = await getDocs(q)
  return !snap.empty
}
