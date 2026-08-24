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
  serverTimestamp,
} from 'firebase/firestore'
import { db } from '../firebase/config'
import type { Department } from '../types'
import { toDate } from '../utils/formatters'

const COLLECTION = 'departments'

function docToDept(d: any): Department {
  const data = d.data()
  return {
    id:          d.id,
    name:        data.name as string,
    description: data.description as string | undefined,
    status:      data.status as 'active' | 'inactive',
    festivalId:  data.festivalId as string,
    createdBy:   data.createdBy as string,
    createdAt:   toDate(data.createdAt),
    updatedAt:   toDate(data.updatedAt),
  }
}

export async function createDepartment(data: {
  name:         string
  description?: string
  festivalId:   string
  createdBy:    string
}): Promise<string> {
  const payload: Record<string, any> = {
    name:       data.name,
    status:     'active',
    festivalId: data.festivalId,
    createdBy:  data.createdBy,
    createdAt:  serverTimestamp(),
    updatedAt:  serverTimestamp(),
  }
  if (data.description) payload.description = data.description

  const ref = await addDoc(collection(db, COLLECTION), payload)
  return ref.id
}

export async function getDepartment(id: string): Promise<Department | null> {
  const snap = await getDoc(doc(db, COLLECTION, id))
  if (!snap.exists()) return null
  return docToDept(snap)
}

export async function getDepartmentsByFestival(festivalId: string): Promise<Department[]> {
  const q = query(
    collection(db, COLLECTION),
    where('festivalId', '==', festivalId)
  )
  const snap = await getDocs(q)
  return snap.docs
    .map(docToDept)
    .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime())
}

export async function updateDepartment(
  id: string,
  data: Partial<Omit<Department, 'id' | 'createdAt' | 'createdBy' | 'festivalId'>>
): Promise<void> {
  await updateDoc(doc(db, COLLECTION, id), {
    ...data,
    updatedAt: serverTimestamp(),
  })
}

export async function deleteDepartment(id: string): Promise<void> {
  await deleteDoc(doc(db, COLLECTION, id))
}
