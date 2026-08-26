import React, { useState } from 'react'
import { CheckCircle, Share2, Check, ExternalLink, Send, ArrowRight, User } from 'lucide-react'
import Modal from '../ui/Modal'
import Button from '../ui/Button'
import { formatCurrency } from '../../utils/formatters'
import type { Contribution, Festival } from '../../types'

interface GroupReceiptModalProps {
  open: boolean
  onClose: () => void
  contributions: Contribution[]
  festival: Festival | null
  roomNumber?: string
  totalAmount: number
}

export default function GroupReceiptModal({
  open,
  onClose,
  contributions,
  festival,
  roomNumber,
  totalAmount,
}: GroupReceiptModalProps) {
  const [sentMap, setSentMap] = useState<Record<string, boolean>>({})

  if (!open || contributions.length === 0) return null

  const committeeName = festival?.committeeName || 'Ganesh Committee'
  const festivalYear = festival?.festivalYear || '2026'

  // Send STRICTLY INDIVIDUAL message containing ONLY this member's details
  const sendIndividualWhatsApp = (c: Contribution) => {
    const digitalReceiptUrl = `${window.location.origin}/receipt/${c.id}`
    const message = `🙏 *${committeeName.toUpperCase()}* 🙏
*Ganesh Festival ${festivalYear} Official Receipt*
----------------------------------------
🧾 *Receipt No:* ${c.receiptNumber}
👤 *Devotee Name:* ${c.contributorName}
📱 *Mobile:* ${c.mobile}
${c.houseNumber ? `🏠 *Room / Flat:* ${c.houseNumber}\n` : ''}💰 *Amount Paid:* ${formatCurrency(c.amount)}
💳 *Payment Mode:* ${c.paymentMethod} (${c.paymentStatus})
🏛️ *Department:* ${c.departmentName || 'General'}
🙏 *Collected By:* ${c.collectedBy}
${c.notes ? `📝 *Ref / Details:* ${c.notes}\n` : ''}----------------------------------------
👉 *View & Download Official Digital Receipt Card:*
${digitalReceiptUrl}

*May Lord Ganesha bestow good health, wisdom, and prosperity upon you and your family!*
🌸 *Ganpati Bappa Morya!* 🌸`

    const digits = c.mobile.replace(/\D/g, '')
    const phone = digits.startsWith('91') ? digits : `91${digits}`
    const url = `https://wa.me/${phone}?text=${encodeURIComponent(message)}`
    
    // Mark as sent
    setSentMap((prev) => ({ ...prev, [c.id || c.receiptNumber]: true }))
    window.open(url, '_blank')
  }

  // Find next unsent member to send quickly
  const unsentList = contributions.filter((c) => !sentMap[c.id || c.receiptNumber])
  const allSent = contributions.length > 0 && unsentList.length === 0

  const handleSendNext = () => {
    if (unsentList.length > 0) {
      sendIndividualWhatsApp(unsentList[0])
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Individual Devotee WhatsApp Receipts"
      maxWidth="max-w-xl"
      footer={
        <div className="flex items-center justify-between w-full">
          <Button variant="outline" onClick={onClose}>
            Done / Close
          </Button>

          {unsentList.length > 0 ? (
            <Button
              onClick={handleSendNext}
              className="bg-green-600 hover:bg-green-700 text-white font-bold"
              icon={<Send size={16} />}
            >
              Send Next ({unsentList[0].contributorName})
            </Button>
          ) : (
            <div className="flex items-center gap-1.5 text-xs font-bold text-green-700 bg-green-100 px-3 py-2 rounded-xl">
              <Check size={16} className="text-green-600" />
              All {contributions.length} Devotees Sent!
            </div>
          )}
        </div>
      }
    >
      <div className="space-y-4">
        {/* Banner */}
        <div className="bg-gradient-to-r from-green-500 to-emerald-600 rounded-2xl p-4 text-white text-center shadow-md">
          <CheckCircle className="mx-auto mb-1 text-white" size={32} />
          <h3 className="font-extrabold text-base sm:text-lg">
            {contributions.length} Individual Receipts Ready!
          </h3>
          <p className="text-xs text-green-100 mt-0.5">
            Total Collection: <strong>{formatCurrency(totalAmount)}</strong> {roomNumber ? `• Room: ${roomNumber}` : ''}
          </p>
        </div>

        {/* Member-by-Member Send List */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs font-bold text-gray-700 uppercase tracking-wider">
              Send Each Member Their Separate Receipt:
            </p>
            <span className="text-xs font-extrabold text-saffron-800">
              {Object.keys(sentMap).length} of {contributions.length} Sent
            </span>
          </div>

          <div className="space-y-2.5 max-h-72 overflow-y-auto pr-1">
            {contributions.map((c, index) => {
              const isSent = sentMap[c.id || c.receiptNumber]
              return (
                <div
                  key={c.id || index}
                  className={`flex items-center justify-between p-3.5 rounded-2xl border transition-all ${
                    isSent
                      ? 'bg-green-50/70 border-green-300'
                      : 'bg-white hover:bg-amber-50/60 border-gray-200 shadow-xs'
                  }`}
                >
                  <div className="min-w-0 pr-2">
                    <div className="flex items-center gap-2">
                      <span className={`w-5 h-5 rounded-full text-xs font-bold flex items-center justify-center flex-shrink-0 ${
                        isSent ? 'bg-green-200 text-green-800' : 'bg-saffron-100 text-saffron-800'
                      }`}>
                        {index + 1}
                      </span>
                      <p className="font-extrabold text-gray-900 text-sm truncate">
                        {c.contributorName}
                      </p>
                    </div>

                    <div className="flex items-center gap-3 text-xs text-gray-500 mt-1 pl-7 flex-wrap">
                      <span>📱 {c.mobile}</span>
                      <span className="font-mono text-saffron-700 font-bold">
                        {c.receiptNumber}
                      </span>
                      <span className="text-green-700 font-black">
                        {formatCurrency(c.amount)} only
                      </span>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => sendIndividualWhatsApp(c)}
                    className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold shadow-xs transition-all flex-shrink-0 ${
                      isSent
                        ? 'bg-green-100 text-green-800 border border-green-300 hover:bg-green-200'
                        : 'bg-green-600 hover:bg-green-700 text-white animate-pulse'
                    }`}
                    title={`Send individual receipt to ${c.contributorName}`}
                  >
                    {isSent ? (
                      <>
                        <Check size={14} className="text-green-700" />
                        <span>Sent (Resend)</span>
                      </>
                    ) : (
                      <>
                        <Send size={14} />
                        <span>Send to {c.contributorName.split(' ')[0]}</span>
                      </>
                    )}
                  </button>
                </div>
              )
            })}
          </div>
        </div>

        {/* Info Note */}
        <div className="p-3 bg-amber-50 rounded-xl border border-amber-200 text-xs text-amber-900 flex items-start gap-2">
          <span className="text-base">🔒</span>
          <p>
            Each WhatsApp message contains <strong>only that member's name and exact amount paid</strong>. Other members' amounts are never shared with anyone else.
          </p>
        </div>
      </div>
    </Modal>
  )
}
