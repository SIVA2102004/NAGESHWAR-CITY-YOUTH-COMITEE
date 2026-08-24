import {
  doc,
  runTransaction,
  getFirestore,
  serverTimestamp,
} from 'firebase/firestore'

/**
 * Generate a unique receipt number using a Firestore atomic counter.
 * Format: GC-YYYY-NNNN (e.g. GC-2026-0001)
 */
export async function generateReceiptNumber(festivalYear: string): Promise<string> {
  const db      = getFirestore()
  const year    = festivalYear || new Date().getFullYear().toString()
  const counterRef = doc(db, 'counters', `receipt_${year}`)

  const newCount = await runTransaction(db, async (transaction) => {
    const counterDoc = await transaction.get(counterRef)
    const current    = counterDoc.exists() ? (counterDoc.data().count as number) : 0
    const next       = current + 1
    transaction.set(counterRef, {
      count:     next,
      updatedAt: serverTimestamp(),
    })
    return next
  })

  return `GC-${year}-${String(newCount).padStart(4, '0')}`
}
