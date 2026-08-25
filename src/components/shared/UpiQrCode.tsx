import React from 'react'
import { QRCodeSVG } from 'qrcode.react'
import { ShieldCheck, Smartphone } from 'lucide-react'
import { formatCurrency } from '../../utils/formatters'

interface Props {
  upiId?: string
  payeeName?: string
  amount?: number | string
  note?: string
  size?: number
  showDetails?: boolean
  className?: string
}

export default function UpiQrCode({
  upiId = 'srinageshwaryouth@upi',
  payeeName = 'Sri Nageshwar Youth',
  amount,
  note = 'Ganesh Chanda Donation',
  size = 180,
  showDetails = true,
  className = '',
}: Props) {
  const numAmount = typeof amount === 'string' ? parseFloat(amount) : amount
  const validAmount = numAmount && !isNaN(numAmount) && numAmount > 0 ? numAmount.toFixed(2) : undefined

  const cleanUpiId = (upiId || 'srinageshwaryouth@upi').trim()
  const cleanPayee = (payeeName || 'Ganesh Committee').trim()
  const cleanNote  = (note || 'Ganesh Chanda').trim().replace(/[^a-zA-Z0-9_\- ]/g, '')

  // Construct NPCI standard UPI URI (Literal @ in pa, standard encoding for pn & tn)
  let upiUrl = `upi://pay?pa=${cleanUpiId}&pn=${encodeURIComponent(cleanPayee)}&cu=INR`
  if (validAmount) {
    upiUrl += `&am=${validAmount}`
  }
  if (cleanNote) {
    upiUrl += `&tn=${encodeURIComponent(cleanNote)}`
  }

  return (
    <div className={`flex flex-col items-center text-center ${className}`}>
      {/* QR Code Container with Ornate Golden Border */}
      <div className="bg-white p-3 rounded-2xl border-2 border-amber-400 shadow-md ring-4 ring-amber-100 relative inline-block">
        <QRCodeSVG
          value={upiUrl}
          size={size}
          level="H"
          includeMargin={false}
          imageSettings={{
            src: '/logo.jpg',
            x: undefined,
            y: undefined,
            height: Math.round(size * 0.22),
            width: Math.round(size * 0.22),
            excavate: true,
          }}
        />
      </div>

      {showDetails && (
        <div className="mt-2.5 w-full max-w-[260px]">
          {/* Amount Badge */}
          {validAmount ? (
            <div className="bg-orange-50 border border-orange-300 rounded-xl py-1.5 px-3 mb-2 shadow-sm">
              <p className="text-[11px] font-bold text-amber-800 uppercase tracking-wider">Scan &amp; Pay Exact</p>
              <p className="text-xl font-extrabold text-amber-950">{formatCurrency(parseFloat(validAmount))}</p>
            </div>
          ) : (
            <p className="text-xs text-gray-500 mb-2 font-medium">Enter amount to generate exact UPI QR</p>
          )}

          {/* Payee Details */}
          <div className="bg-gray-50 rounded-xl p-2 text-xs border border-gray-200/80 mb-1.5">
            <p className="font-bold text-gray-900 truncate">{payeeName}</p>
            <p className="font-mono text-[11px] text-amber-700 font-semibold truncate select-all">{upiId}</p>
          </div>

          {/* Supported Apps */}
          <div className="flex items-center justify-center gap-1.5 text-[11px] text-gray-500 font-medium">
            <Smartphone size={13} className="text-amber-600" />
            <span>Scan with GPay, PhonePe, Paytm</span>
          </div>

          {/* 0% Fee & Instant Verification Badge */}
          <div className="flex items-center justify-center gap-1 mt-1 text-[10px] text-green-700 font-bold">
            <ShieldCheck size={13} className="text-green-600" />
            <span>Direct Bank Transfer (₹0 Fee)</span>
          </div>
        </div>
      )}
    </div>
  )
}
