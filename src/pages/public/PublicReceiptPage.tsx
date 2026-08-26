import React, { useEffect, useState, useRef } from 'react'
import { useParams, Link } from 'react-router-dom'
import { Printer, Download, Share2, ArrowLeft, CheckCircle2, ShieldCheck } from 'lucide-react'
import html2canvas from 'html2canvas'
import toast from 'react-hot-toast'
import { getContribution } from '../../services/contributionService'
import { getFestival } from '../../services/festivalService'
import { formatCurrency, formatDate, whatsappLink } from '../../utils/formatters'
import Button from '../../components/ui/Button'
import LoadingSpinner from '../../components/ui/LoadingSpinner'
import type { Contribution, Festival } from '../../types'

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

export default function PublicReceiptPage() {
  const { id } = useParams<{ id: string }>()
  const [contribution, setContribution] = useState<Contribution | null>(null)
  const [festival, setFestival] = useState<Festival | null>(null)
  const [loading, setLoading] = useState(true)
  const [downloading, setDownloading] = useState(false)
  const receiptCardRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    async function loadReceipt() {
      if (!id) return
      setLoading(true)
      try {
        const contrib = await getContribution(id)
        if (contrib) {
          setContribution(contrib)
          const fest = await getFestival(contrib.festivalId)
          setFestival(fest)
        }
      } catch (err) {
        console.error('Failed to load receipt:', err)
      } finally {
        setLoading(false)
      }
    }
    loadReceipt()
  }, [id])

  const handlePrint = () => {
    window.print()
  }

  const handleDownloadImage = async () => {
    if (!receiptCardRef.current || !contribution) return
    setDownloading(true)
    try {
      const canvas = await html2canvas(receiptCardRef.current, {
        scale: 2,
        useCORS: true,
        backgroundColor: '#fffdfa',
      })
      const link = document.createElement('a')
      link.download = `Receipt_${contribution.receiptNumber}_${contribution.contributorName.replace(/\s+/g, '_')}.png`
      link.href = canvas.toDataURL('image/png')
      link.click()
      toast.success('Official Receipt image downloaded! 🖼️')
    } catch (err) {
      console.error(err)
      toast.error('Failed to download image')
    } finally {
      setDownloading(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-amber-50 via-gold-50 to-orange-50 flex items-center justify-center p-4">
        <LoadingSpinner label="Loading Official Temple Receipt..." />
      </div>
    )
  }

  if (!contribution) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-amber-50 via-gold-50 to-orange-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-3xl p-8 max-w-md w-full text-center shadow-card space-y-4">
          <div className="text-4xl">🔍</div>
          <h2 className="text-xl font-bold text-gray-900">Receipt Not Found</h2>
          <p className="text-xs text-gray-500">
            The requested receipt could not be found or has been updated.
          </p>
          <Link to="/" className="inline-block">
            <Button variant="primary" icon={<ArrowLeft size={16} />}>
              Go to Home
            </Button>
          </Link>
        </div>
      </div>
    )
  }

  const committeeName = festival?.committeeName || 'Ganesh Committee'
  const festivalYear = festival?.festivalYear || '2026'
  const logo = festival?.logo || '/logo.jpg'

  const shareUrl = window.location.href
  const whatsappMsg = `🙏 *${committeeName.toUpperCase()}* 🙏
*Ganesh Festival ${festivalYear} Official Receipt*
----------------------------------------
🧾 *Receipt No:* ${contribution.receiptNumber}
👤 *Devotee:* ${contribution.contributorName}
💰 *Amount Paid:* ${formatCurrency(contribution.amount)}
💳 *Payment Mode:* ${contribution.paymentMethod} (${contribution.paymentStatus})
🏛️ *Department:* ${contribution.departmentName || 'General'}
🤝 *Collected By:* ${contribution.collectedBy}
----------------------------------------
👉 *View & Download Official Digital Receipt Card:*
${shareUrl}

🌸 *Ganpati Bappa Morya!* 🌸`

  const wLink = whatsappLink(contribution.mobile || '', whatsappMsg)

  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-50 via-gold-50 to-orange-50 py-8 px-4 flex flex-col items-center justify-center">
      <div className="w-full max-w-lg space-y-4">
        {/* Navigation & Brand Header */}
        <div className="flex items-center justify-between no-print px-2">
          <Link
            to="/"
            className="inline-flex items-center gap-1.5 text-xs font-bold text-amber-900 bg-white/80 hover:bg-white px-3 py-1.5 rounded-xl border border-amber-200 shadow-xs transition-all"
          >
            <ArrowLeft size={14} /> Back to Portal
          </Link>
          <div className="flex items-center gap-1 text-[11px] font-extrabold text-green-700 bg-green-100/90 border border-green-300 px-2.5 py-1 rounded-full">
            <ShieldCheck size={14} /> Digitally Verified Receipt
          </div>
        </div>

        {/* The Official Golden Temple Receipt Card */}
        <div
          ref={receiptCardRef}
          className="bg-gradient-to-b from-[#fffdfa] to-[#fff9f0] border-2 border-amber-300 rounded-3xl p-6 sm:p-8 shadow-card relative overflow-hidden ring-2 ring-amber-400/40"
        >
          {/* Subtle Watermark */}
          <div className="absolute -right-10 -bottom-10 opacity-5 pointer-events-none select-none">
            <img src={logo} alt="" className="w-64 h-64 rounded-full object-cover" />
          </div>

          {/* Header with Golden Logo */}
          <div className="text-center border-b-2 border-dashed border-amber-300 pb-5 mb-4">
            <div className="flex justify-center mb-3">
              <img
                src={logo}
                alt="Committee Logo"
                className="w-24 h-24 rounded-full object-cover shadow-lg ring-4 ring-amber-400/60 border-2 border-amber-500 bg-white"
              />
            </div>
            <p className="text-xs font-extrabold text-amber-800 tracking-widest uppercase mb-1">
              ॥ ॐ गं गणपतये नमः ॥
            </p>
            <h1 className="text-xl sm:text-2xl font-black text-amber-950 uppercase tracking-wide">
              {committeeName}
            </h1>
            <p className="text-xs font-bold text-amber-800 mt-0.5">
              Ganesh Mahotsav {festivalYear}
            </p>
            {festival?.address && (
              <p className="text-xs text-gray-500 mt-1">{festival.address}</p>
            )}
          </div>

          {/* Receipt ID & Date Bar */}
          <div className="flex items-center justify-between bg-amber-100/80 border border-amber-300 rounded-xl px-4 py-2.5 mb-4 text-xs">
            <div>
              <span className="text-amber-900/70 font-medium">Receipt No: </span>
              <span className="font-mono font-extrabold text-amber-950 text-base">
                {contribution.receiptNumber}
              </span>
            </div>
            <div className="text-right">
              <span className="text-amber-900/70 font-medium">Date: </span>
              <span className="font-bold text-gray-800">{formatDate(contribution.createdAt)}</span>
            </div>
          </div>

          {/* Amount Highlight Box */}
          <div className="bg-gradient-to-r from-orange-50 via-amber-50 to-yellow-50 border border-amber-400 rounded-2xl p-4 text-center my-4 shadow-inner">
            <p className="text-[11px] font-bold text-amber-800 uppercase tracking-wider">
              Contribution Amount Received
            </p>
            <p className="text-3xl sm:text-4xl font-black text-amber-950 mt-1">
              {formatCurrency(contribution.amount)}
            </p>
            <p className="text-xs text-amber-900 font-medium italic mt-1">
              {amountToWords(contribution.amount)}
            </p>
          </div>

          {/* Devotee Details Grid */}
          <div className="space-y-2.5 text-xs sm:text-sm py-2">
            <div className="flex justify-between py-1.5 border-b border-amber-100/80">
              <span className="text-gray-600 font-medium">Devotee / Contributor:</span>
              <span className="font-extrabold text-gray-900 text-right">{contribution.contributorName}</span>
            </div>

            <div className="flex justify-between py-1.5 border-b border-amber-100/80">
              <span className="text-gray-600 font-medium">Mobile Number:</span>
              <span className="font-semibold text-gray-800">{contribution.mobile}</span>
            </div>

            {contribution.houseNumber && (
              <div className="flex justify-between py-1.5 border-b border-amber-100/80">
                <span className="text-gray-600 font-medium">Room / Flat / Area:</span>
                <span className="font-semibold text-gray-800">{contribution.houseNumber}</span>
              </div>
            )}

            <div className="flex justify-between py-1.5 border-b border-amber-100/80">
              <span className="text-gray-600 font-medium">Payment Mode:</span>
              <span className="font-bold text-amber-800">{contribution.paymentMethod}</span>
            </div>

            <div className="flex justify-between py-1.5 border-b border-amber-100/80">
              <span className="text-gray-600 font-medium">Department / Category:</span>
              <span className="font-semibold text-gray-800">{contribution.departmentName || 'Festival'}</span>
            </div>

            <div className="flex justify-between py-1.5 border-b border-amber-100/80">
              <span className="text-gray-600 font-medium">Collected By:</span>
              <span className="font-semibold text-gray-800">{contribution.collectedBy}</span>
            </div>

            {contribution.notes && (
              <div className="flex justify-between py-1.5 border-b border-amber-100/80">
                <span className="text-gray-600 font-medium">Notes / Dedication:</span>
                <span className="font-medium text-gray-700 italic text-right max-w-[60%]">{contribution.notes}</span>
              </div>
            )}
          </div>

          {/* Verification & Signature Section */}
          <div className="flex items-end justify-between pt-5 mt-4 border-t border-dashed border-amber-300">
            <div className="flex items-center gap-1.5 px-3 py-1.5 bg-green-50 border border-green-300 rounded-xl text-green-800">
              <CheckCircle2 size={16} className="text-green-600" />
              <span className="text-[11px] font-extrabold tracking-wide uppercase">
                {contribution.paymentStatus === 'Paid' ? 'Verified & Received' : contribution.paymentStatus}
              </span>
            </div>

            <div className="text-right">
              <div className="w-36 border-b border-gray-400 mb-1 ml-auto"></div>
              <p className="text-[10px] font-bold text-gray-600 uppercase tracking-wider">
                Authorized Signatory
              </p>
              <p className="text-[9px] text-gray-500 font-semibold">{committeeName}</p>
            </div>
          </div>

          {/* Blessing Footer */}
          <div className="text-center mt-5 pt-3 border-t border-amber-100 text-xs text-amber-800 font-medium leading-relaxed">
            🙏 May Lord Ganesha bestow peace, prosperity, and success upon you and your family! 🙏
            <p className="font-bold mt-0.5 text-amber-900">🌸 Ganpati Bappa Morya! 🌸</p>
          </div>
        </div>

        {/* Action Buttons for Devotees / Volunteers */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 no-print pt-2">
          <Button
            variant="outline"
            icon={<Download size={16} />}
            onClick={handleDownloadImage}
            loading={downloading}
            className="bg-white hover:bg-amber-50 text-amber-900 border-amber-300 font-bold"
          >
            Save as Image
          </Button>

          <Button
            variant="secondary"
            icon={<Printer size={16} />}
            onClick={handlePrint}
            className="font-bold"
          >
            Print / PDF
          </Button>

          <a
            href={wLink}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-[#25D366] text-white font-bold rounded-xl hover:bg-[#20bd5a] transition-all shadow-md text-sm"
          >
            <Share2 size={16} /> Share WhatsApp
          </a>
        </div>
      </div>
    </div>
  )
}
