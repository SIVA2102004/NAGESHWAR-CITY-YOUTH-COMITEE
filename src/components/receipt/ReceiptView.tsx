import React, { useRef } from 'react'
import { Printer, Share2, CheckCircle2 } from 'lucide-react'
import { formatDate, formatCurrency, whatsappLink } from '../../utils/formatters'
import type { Contribution, Festival } from '../../types'
import Button from '../ui/Button'

interface Props {
  contribution: Contribution
  festival:     Festival
  onClose?:     () => void
}

function amountToWords(num: number): string {
  const a = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen']
  const b = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety']

  if (num === 0) return 'Zero Rupees Only'
  
  function convert(n: number): string {
    if (n < 20) return a[n]
    if (n < 100) return b[Math.floor(n / 10)] + (n % 10 !== 0 ? ' ' + a[n % 10] : '')
    if (n < 1000) return a[Math.floor(n / 100)] + ' Hundred' + (n % 100 !== 0 ? ' and ' + convert(n % 100) : '')
    if (n < 100000) return convert(Math.floor(n / 1000)) + ' Thousand' + (n % 1000 !== 0 ? ' ' + convert(n % 1000) : '')
    if (n < 10000000) return convert(Math.floor(n / 100000)) + ' Lakh' + (n % 100000 !== 0 ? ' ' + convert(n % 100000) : '')
    return convert(Math.floor(n / 10000000)) + ' Crore' + (n % 10000000 !== 0 ? ' ' + convert(n % 10000000) : '')
  }

  return convert(Math.floor(num)) + ' Rupees Only'
}

export default function ReceiptView({ contribution, festival, onClose }: Props) {
  const printRef = useRef<HTMLDivElement>(null)

  const handlePrint = () => {
    const printContent = printRef.current?.innerHTML || ''
    const win = window.open('', '_blank', 'width=750,height=950')
    if (!win) return
    win.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Receipt_${contribution.receiptNumber}</title>
        <style>
          @page { size: auto; margin: 12mm; }
          body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
            background: #fff;
            color: #1a1a1a;
            margin: 0;
            padding: 10px;
          }
          .print-container {
            max-width: 580px;
            margin: 0 auto;
            border: 3px double #d97706;
            border-radius: 16px;
            padding: 24px;
            background: #fffdfa;
          }
          .header-box {
            text-align: center;
            border-bottom: 2px dashed #f59e0b;
            padding-bottom: 16px;
            margin-bottom: 16px;
          }
          .logo-img {
            width: 80px;
            height: 80px;
            border-radius: 50%;
            object-fit: cover;
            border: 2px solid #f59e0b;
            margin-bottom: 8px;
          }
        </style>
      </head>
      <body>
        <div class="print-container">
          ${printContent}
        </div>
      </body>
      </html>
    `)
    win.document.close()
    win.focus()
    setTimeout(() => {
      win.print()
    }, 400)
  }

  const whatsappMsg = [
    `🙏 *${(festival.committeeName || 'GANESH COMMITTEE').toUpperCase()}* 🙏`,
    '✨ *॥ ॐ गं गणपतये नमः ॥* ✨',
    '',
    `Dear Devotee, thank you for your generous Chanda contribution for Ganesh Chaturthi ${festival.festivalYear || '2026'}!`,
    '',
    `🧾 *Receipt No:* ${contribution.receiptNumber}`,
    `👤 *Devotee Name:* ${contribution.contributorName}`,
    `💰 *Amount Paid:* ${formatCurrency(contribution.amount)}`,
    `💳 *Payment Method:* ${contribution.paymentMethod}`,
    `✅ *Status:* ${contribution.paymentStatus}`,
    `📅 *Date:* ${formatDate(contribution.createdAt)}`,
    `🚩 *Department:* ${contribution.departmentName || 'Festival Committee'}`,
    `🤝 *Collected By:* ${contribution.collectedBy}`,
    contribution.notes ? `📝 *Ref / Notes:* ${contribution.notes}` : '',
    '',
    '🙏 *May Lord Ganesha bless you and your family with health, wealth & wisdom!*',
    '🚩 *Ganpati Bappa Morya!*',
  ].filter(Boolean).join('\n')

  const wLink = whatsappLink(contribution.mobile, whatsappMsg)

  return (
    <div className="space-y-4">
      {/* Receipt Card */}
      <div
        ref={printRef}
        className="bg-gradient-to-b from-[#fffdfa] to-[#fff9f0] border-2 border-amber-300 rounded-2xl p-5 sm:p-6 shadow-card relative overflow-hidden ring-1 ring-amber-200"
      >
        {/* Subtle Watermark */}
        <div className="absolute -right-10 -bottom-10 opacity-5 pointer-events-none select-none">
          <img src="/logo.jpg" alt="" className="w-64 h-64 rounded-full object-cover" />
        </div>

        {/* Header with Golden Logo */}
        <div className="text-center border-b-2 border-dashed border-amber-300 pb-4 mb-4">
          <div className="flex justify-center mb-2.5">
            <img
              src="/logo.jpg"
              alt="Committee Logo"
              className="w-20 h-20 sm:w-24 sm:h-24 rounded-full object-cover shadow-md ring-4 ring-amber-400/60 border border-amber-500"
            />
          </div>
          <p className="text-xs font-bold text-amber-800 tracking-wider uppercase mb-0.5">
            ॥ ॐ गं गणपतये नमः ॥
          </p>
          <h2 className="text-lg sm:text-xl font-extrabold text-amber-950 uppercase tracking-wide">
            {festival.committeeName || 'Ganesh Committee'}
          </h2>
          <p className="text-xs font-bold text-amber-800">
            Ganesh Mahotsav {festival.festivalYear || '2026'}
          </p>
          {festival.address && (
            <p className="text-[11px] text-gray-500 mt-0.5">{festival.address}</p>
          )}
        </div>

        {/* Receipt ID & Date Bar */}
        <div className="flex items-center justify-between bg-amber-100/70 border border-amber-300/80 rounded-xl px-3.5 py-2 mb-4 text-xs">
          <div>
            <span className="text-amber-900/70 font-medium">Receipt: </span>
            <span className="font-mono font-extrabold text-amber-900 text-sm sm:text-base">
              {contribution.receiptNumber}
            </span>
          </div>
          <div className="text-right">
            <span className="text-amber-900/70 font-medium">Date: </span>
            <span className="font-bold text-gray-800">{formatDate(contribution.createdAt)}</span>
          </div>
        </div>

        {/* Amount Highlight Box */}
        <div className="bg-gradient-to-r from-orange-50 via-amber-50 to-yellow-50 border border-amber-400 rounded-xl p-3.5 text-center my-3 shadow-inner">
          <p className="text-[11px] font-bold text-amber-800 uppercase tracking-wider">
            Contribution Amount Received
          </p>
          <p className="text-2xl sm:text-3xl font-black text-amber-900 mt-0.5">
            {formatCurrency(contribution.amount)}
          </p>
          <p className="text-xs text-amber-900 font-medium italic mt-1">
            {amountToWords(contribution.amount)}
          </p>
        </div>

        {/* Details Grid */}
        <div className="space-y-2 text-xs sm:text-sm py-1">
          <div className="flex justify-between py-1 border-b border-amber-100">
            <span className="text-gray-600 font-medium">Devotee / Contributor:</span>
            <span className="font-bold text-gray-900 text-right">{contribution.contributorName}</span>
          </div>

          <div className="flex justify-between py-1 border-b border-amber-100">
            <span className="text-gray-600 font-medium">Mobile Number:</span>
            <span className="font-semibold text-gray-800">{contribution.mobile}</span>
          </div>

          {contribution.houseNumber && (
            <div className="flex justify-between py-1 border-b border-amber-100">
              <span className="text-gray-600 font-medium">House / Flat / Area:</span>
              <span className="font-semibold text-gray-800">{contribution.houseNumber}</span>
            </div>
          )}

          <div className="flex justify-between py-1 border-b border-amber-100">
            <span className="text-gray-600 font-medium">Payment Mode:</span>
            <span className="font-bold text-amber-800">{contribution.paymentMethod}</span>
          </div>

          <div className="flex justify-between py-1 border-b border-amber-100">
            <span className="text-gray-600 font-medium">Department / Category:</span>
            <span className="font-semibold text-gray-800">{contribution.departmentName || 'Festival'}</span>
          </div>

          <div className="flex justify-between py-1 border-b border-amber-100">
            <span className="text-gray-600 font-medium">Collected By:</span>
            <span className="font-semibold text-gray-800">{contribution.collectedBy}</span>
          </div>

          {contribution.notes && (
            <div className="flex justify-between py-1 border-b border-amber-100">
              <span className="text-gray-600 font-medium">Notes / Dedication:</span>
              <span className="font-medium text-gray-700 italic text-right max-w-[60%]">{contribution.notes}</span>
            </div>
          )}
        </div>

        {/* Verification & Signature Section */}
        <div className="flex items-end justify-between pt-4 mt-3 border-t border-dashed border-amber-300">
          <div className="flex items-center gap-1.5 px-2.5 py-1 bg-green-50 border border-green-300 rounded-lg text-green-800">
            <CheckCircle2 size={15} className="text-green-600" />
            <span className="text-[11px] font-extrabold tracking-wide uppercase">
              {contribution.paymentStatus === 'Paid' ? 'Verified & Received' : contribution.paymentStatus}
            </span>
          </div>

          <div className="text-right">
            <div className="w-32 border-b border-gray-400 mb-1 ml-auto"></div>
            <p className="text-[10px] font-bold text-gray-600 uppercase tracking-wider">
              Authorized Signatory
            </p>
            <p className="text-[9px] text-gray-500 font-semibold">{festival.committeeName || 'Ganesh Committee'}</p>
          </div>
        </div>

        {/* Blessing Note */}
        <div className="text-center mt-3 pt-2 text-[11px] text-amber-800 font-medium">
          🙏 May Lord Ganesha bestow peace, prosperity, and success upon you and your family! 🙏
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex flex-wrap items-center justify-between gap-2 no-print pt-2">
        <Button variant="secondary" icon={<Printer size={16} />} onClick={handlePrint}>
          Print Receipt
        </Button>

        <a
          href={wLink}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 px-4 py-2 bg-[#25D366] text-white font-bold rounded-xl hover:bg-[#20bd5a] transition-all shadow-md text-sm"
        >
          <Share2 size={16} /> Share on WhatsApp
        </a>
      </div>
    </div>
  )
}
