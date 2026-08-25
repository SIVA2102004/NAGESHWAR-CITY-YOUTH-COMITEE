import React from 'react'
import { CheckCircle, Share2, Receipt, Building, Users, User, ArrowRight, ExternalLink } from 'lucide-react'
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
  if (!open || contributions.length === 0) return null

  const committeeName = festival?.committeeName || 'Ganesh Committee'
  const festivalYear = festival?.festivalYear || '2026'

  const sendMemberWhatsApp = (c: Contribution) => {
    const message = `🙏 *${committeeName.toUpperCase()}* 🙏
*Ganesh Festival ${festivalYear} Official Receipt*
----------------------------------------
🧾 *Receipt No:* ${c.receiptNumber}
👤 *Devotee Name:* ${c.contributorName}
📱 *Mobile:* ${c.mobile}
🏠 *Room / House:* ${c.houseNumber || 'N/A'}
💰 *Amount Paid:* ${formatCurrency(c.amount)}
💳 *Payment Mode:* ${c.paymentMethod} (${c.paymentStatus})
🏛️ *Department:* ${c.departmentName || 'General'}
🙏 *Collected By:* ${c.collectedBy}
----------------------------------------
*May Lord Ganesha bestow good health, wisdom, and prosperity upon you and your family!*
🌸 *Ganpati Bappa Morya!* 🌸`

    const digits = c.mobile.replace(/\D/g, '')
    const phone = digits.startsWith('91') ? digits : `91${digits}`
    const url = `https://wa.me/${phone}?text=${encodeURIComponent(message)}`
    window.open(url, '_blank')
  }

  const sendCombinedWhatsApp = () => {
    let memberListText = ''
    contributions.forEach((c, i) => {
      memberListText += `${i + 1}. *${c.contributorName}* - ${formatCurrency(c.amount)} (Receipt: ${c.receiptNumber})\n`
    })

    const message = `🙏 *${committeeName.toUpperCase()}* 🙏
*Group / Room Combined Receipt - ${roomNumber ? `Room ${roomNumber}` : 'Group'}*
*Ganesh Festival ${festivalYear}*
----------------------------------------
👥 *Total Members:* ${contributions.length}
💰 *Total Room Collection:* ${formatCurrency(totalAmount)}
💳 *Payment Mode:* ${contributions[0]?.paymentMethod || 'UPI'} (${contributions[0]?.paymentStatus || 'Paid'})
----------------------------------------
*Individual Member Breakdown:*
${memberListText}----------------------------------------
*May Lord Ganesha bless all of you with happiness and prosperity!*
🌸 *Ganpati Bappa Morya!* 🌸`

    // Open WhatsApp with first member's number or general share
    const firstMobile = contributions[0]?.mobile ? contributions[0].mobile.replace(/\D/g, '') : ''
    const phone = firstMobile.startsWith('91') ? firstMobile : `91${firstMobile}`
    const url = `https://wa.me/${phone}?text=${encodeURIComponent(message)}`
    window.open(url, '_blank')
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Group Contribution Recorded Successfully!"
      maxWidth="max-w-xl"
      footer={
        <div className="flex items-center justify-between w-full">
          <Button variant="outline" onClick={onClose}>
            Done
          </Button>
          <Button
            onClick={sendCombinedWhatsApp}
            className="bg-green-600 hover:bg-green-700 text-white font-bold"
            icon={<Share2 size={16} />}
          >
            Share Room Summary
          </Button>
        </div>
      }
    >
      <div className="space-y-4">
        {/* Success Banner */}
        <div className="bg-gradient-to-r from-green-500 to-emerald-600 rounded-2xl p-4 text-white text-center shadow-md">
          <CheckCircle className="mx-auto mb-1 text-white" size={36} />
          <h3 className="font-extrabold text-lg">
            {contributions.length} Receipts Generated!
          </h3>
          <p className="text-xs text-green-100 mt-0.5">
            {roomNumber ? `Room / Flat: ${roomNumber} • ` : ''} Total Collection: <strong>{formatCurrency(totalAmount)}</strong>
          </p>
        </div>

        {/* Member Receipts List */}
        <div>
          <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2 flex items-center justify-between">
            <span>Individual Devotee Receipts</span>
            <span className="text-saffron-700">Click to Send WhatsApp</span>
          </p>

          <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
            {contributions.map((c, index) => (
              <div
                key={c.id || index}
                className="flex items-center justify-between p-3 bg-gray-50 hover:bg-amber-50/60 rounded-2xl border border-gray-200/80 transition-colors"
              >
                <div className="min-w-0 pr-3">
                  <div className="flex items-center gap-2">
                    <span className="w-5 h-5 rounded-full bg-saffron-100 text-saffron-800 text-xs font-bold flex items-center justify-center flex-shrink-0">
                      {index + 1}
                    </span>
                    <p className="font-extrabold text-gray-900 text-sm truncate">
                      {c.contributorName}
                    </p>
                  </div>
                  <div className="flex items-center gap-3 text-xs text-gray-500 mt-1 pl-7">
                    <span>📱 {c.mobile}</span>
                    <span className="font-mono text-saffron-700 font-bold">
                      {c.receiptNumber}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2 flex-shrink-0">
                  <span className="text-sm font-black text-green-700">
                    {formatCurrency(c.amount)}
                  </span>
                  <button
                    onClick={() => sendMemberWhatsApp(c)}
                    className="flex items-center gap-1 bg-green-500 hover:bg-green-600 text-white px-2.5 py-1.5 rounded-xl text-xs font-bold shadow-xs transition-colors"
                    title={`Send receipt to ${c.contributorName}`}
                  >
                    <Share2 size={13} />
                    <span>WhatsApp</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Instructions footer */}
        <div className="p-3 bg-amber-50 rounded-xl border border-amber-200/70 text-xs text-amber-900 flex items-start gap-2">
          <span className="text-base">💡</span>
          <p>
            Each devotee above has their own separate receipt number in the database. Click <strong>"WhatsApp"</strong> next to each person to send them their personal receipt link!
          </p>
        </div>
      </div>
    </Modal>
  )
}
