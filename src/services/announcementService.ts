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
import type { Announcement } from '../types'
import { toDate } from '../utils/formatters'

const COLLECTION = 'announcements'

function docToAnnouncement(d: any): Announcement {
  const data = d.data()
  return {
    id:            d.id,
    festivalId:    data.festivalId as string,
    title:         data.title as string,
    content:       data.content as string,
    status:        data.status as 'published' | 'draft',
    createdBy:     data.createdBy as string,
    createdByName: data.createdByName as string,
    createdAt:     toDate(data.createdAt),
    updatedAt:     toDate(data.updatedAt),
  }
}

export async function createAnnouncement(data: {
  festivalId:    string
  title:         string
  content:       string
  status:        'published' | 'draft'
  createdBy:     string
  createdByName: string
}): Promise<Announcement> {
  const ref  = await addDoc(collection(db, COLLECTION), {
    ...data,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  })
  const snap = await getDoc(ref)
  return docToAnnouncement(snap)
}

export async function updateAnnouncement(
  id: string,
  data: Partial<Pick<Announcement, 'title' | 'content' | 'status'>>
): Promise<void> {
  await updateDoc(doc(db, COLLECTION, id), {
    ...data,
    updatedAt: serverTimestamp(),
  })
}

export async function deleteAnnouncement(id: string): Promise<void> {
  await deleteDoc(doc(db, COLLECTION, id))
}

export async function getPublishedAnnouncements(festivalId: string): Promise<Announcement[]> {
  const q    = query(
    collection(db, COLLECTION),
    where('festivalId', '==', festivalId),
    where('status', '==', 'published')
  )
  const snap = await getDocs(q)
  return snap.docs
    .map(docToAnnouncement)
    .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
}

export async function getAllAnnouncements(festivalId: string): Promise<Announcement[]> {
  const q    = query(
    collection(db, COLLECTION),
    where('festivalId', '==', festivalId)
  )
  const snap = await getDocs(q)
  return snap.docs
    .map(docToAnnouncement)
    .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
}

export function subscribeToPublishedAnnouncements(
  festivalId: string,
  callback: (announcements: Announcement[]) => void
): Unsubscribe {
  const q = query(
    collection(db, COLLECTION),
    where('festivalId', '==', festivalId),
    where('status', '==', 'published')
  )
  return onSnapshot(q, (snap) => {
    const list = snap.docs
      .map(docToAnnouncement)
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
    callback(list)
  })
}
