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
  createdBy:     string
}): Promise<string> {
  const ref = await addDoc(collection(db, COLLECTION), {
    ...data,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  })
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
  await updateDoc(doc(db, COLLECTION, id), {
    ...data,
    updatedAt: serverTimestamp(),
  })
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
