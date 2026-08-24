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
  Timestamp,
  limit,
  type Unsubscribe,
} from 'firebase/firestore'
import { db } from '../firebase/config'
import type { Expense, ExpenseCategory, PaymentMethod } from '../types'
import { toDate } from '../utils/formatters'

const COLLECTION = 'expenses'

function docToExpense(d: any): Expense {
  const data = d.data()
  return {
    id:            d.id,
    festivalId:    data.festivalId as string,
    title:         data.title as string,
    category:      data.category as ExpenseCategory,
    amount:        (data.amount as number) || 0,
    description:   data.description as string | undefined,
    paymentMethod: data.paymentMethod as PaymentMethod,
    date:          toDate(data.date),
    addedBy:       data.addedBy as string,
    addedByUid:    data.addedByUid as string,
    billUrl:       data.billUrl as string | undefined,
    billName:      data.billName as string | undefined,
    createdAt:     toDate(data.createdAt),
    updatedAt:     toDate(data.updatedAt),
  }
}

export async function createExpense(data: {
  festivalId:    string
  title:         string
  category:      ExpenseCategory
  amount:        number
  description?:  string
  paymentMethod: PaymentMethod
  date:          Date
  addedBy:       string
  addedByUid:    string
  billUrl?:      string
  billName?:     string
}): Promise<Expense> {
  const payload: Record<string, any> = {
    festivalId:    data.festivalId,
    title:         data.title,
    category:      data.category,
    amount:        data.amount,
    paymentMethod: data.paymentMethod,
    addedBy:       data.addedBy,
    addedByUid:    data.addedByUid,
    date:          Timestamp.fromDate(data.date),
    createdAt:     serverTimestamp(),
    updatedAt:     serverTimestamp(),
  }
  if (data.description) payload.description = data.description
  if (data.billUrl)     payload.billUrl     = data.billUrl
  if (data.billName)    payload.billName    = data.billName

  const ref  = await addDoc(collection(db, COLLECTION), payload)
  const snap = await getDoc(ref)
  return docToExpense(snap)
}

export async function updateExpense(
  id: string,
  data: Partial<Omit<Expense, 'id' | 'festivalId' | 'createdAt' | 'addedByUid'>>
): Promise<void> {
  const payload: Record<string, unknown> = { ...data, updatedAt: serverTimestamp() }
  if (data.date) payload.date = Timestamp.fromDate(data.date)
  await updateDoc(doc(db, COLLECTION, id), payload)
}

export async function deleteExpense(id: string): Promise<void> {
  await deleteDoc(doc(db, COLLECTION, id))
}

export async function getExpensesByFestival(festivalId: string): Promise<Expense[]> {
  const q    = query(
    collection(db, COLLECTION),
    where('festivalId', '==', festivalId)
  )
  const snap = await getDocs(q)
  return snap.docs
    .map(docToExpense)
    .sort((a, b) => b.date.getTime() - a.date.getTime())
}

export function subscribeToExpenses(
  festivalId: string,
  callback: (expenses: Expense[]) => void
): Unsubscribe {
  const q = query(
    collection(db, COLLECTION),
    where('festivalId', '==', festivalId)
  )
  return onSnapshot(q, (snap) => {
    const list = snap.docs
      .map(docToExpense)
      .sort((a, b) => b.date.getTime() - a.date.getTime())
    callback(list)
  })
}
