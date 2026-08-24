import {
  collection,
  addDoc,
  query,
  where,
  orderBy,
  limit,
  getDocs,
  onSnapshot,
  Timestamp,
  type Unsubscribe,
} from 'firebase/firestore'
import { db } from '../firebase/config'
import type { ActivityLog, UserRole } from '../types'
import { toDate } from '../utils/formatters'

const COLLECTION = 'activityLogs'

export async function logActivity(params: {
  festivalId:  string
  userId:      string
  userName:    string
  role:        UserRole
  action:      string
  entityType:  string
  entityId?:   string
  description: string
}): Promise<void> {
  try {
    await addDoc(collection(db, COLLECTION), {
      ...params,
      timestamp: Timestamp.now(),
    })
  } catch (err) {
    // Non-blocking — log failure should not break main flow
    console.error('Activity log failed:', err)
  }
}

export function subscribeToActivityLogs(
  festivalId: string,
  callback: (logs: ActivityLog[]) => void,
  limitCount = 50
): Unsubscribe {
  const q = query(
    collection(db, COLLECTION),
    where('festivalId', '==', festivalId)
  )
  return onSnapshot(q, (snap) => {
    const logs: ActivityLog[] = snap.docs
      .map((d) => ({
        id:          d.id,
        festivalId:  d.data().festivalId,
        userId:      d.data().userId,
        userName:    d.data().userName,
        role:        d.data().role,
        action:      d.data().action,
        entityType:  d.data().entityType,
        entityId:    d.data().entityId,
        description: d.data().description,
        timestamp:   toDate(d.data().timestamp),
      }))
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
      .slice(0, limitCount)
    callback(logs)
  })
}

export async function getActivityLogs(
  festivalId: string,
  limitCount = 100
): Promise<ActivityLog[]> {
  const q = query(
    collection(db, COLLECTION),
    where('festivalId', '==', festivalId)
  )
  const snap = await getDocs(q)
  return snap.docs
    .map((d) => ({
      id:          d.id,
      festivalId:  d.data().festivalId,
      userId:      d.data().userId,
      userName:    d.data().userName,
      role:        d.data().role,
      action:      d.data().action,
      entityType:  d.data().entityType,
      entityId:    d.data().entityId,
      description: d.data().description,
      timestamp:   toDate(d.data().timestamp),
    }))
    .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
    .slice(0, limitCount)
}
