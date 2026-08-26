import { format, formatDistanceToNow } from 'date-fns'

/**
 * Format a number as Indian Rupees without truncating decimals (e.g. 125.5 -> ₹125.50, 200 -> ₹200)
 */
export function formatCurrency(amount: number | string | undefined | null): string {
  if (amount === undefined || amount === null || amount === '') return '₹0'
  const num = typeof amount === 'string' ? parseFloat(amount) : amount
  if (isNaN(num)) return '₹0'
  
  const isInteger = Number.isInteger(num)
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: isInteger ? 0 : 1,
    maximumFractionDigits: 2,
  }).format(num)
}

/**
 * Format a Date for display
 */
export function formatDate(date: Date | undefined | null): string {
  if (!date) return '—'
  try {
    return format(date, 'dd MMM yyyy')
  } catch {
    return '—'
  }
}

/**
 * Format a Date with time
 */
export function formatDateTime(date: Date | undefined | null): string {
  if (!date) return '—'
  try {
    return format(date, 'dd MMM yyyy, hh:mm a')
  } catch {
    return '—'
  }
}

/**
 * Format relative time (e.g. "2 hours ago")
 */
export function formatRelative(date: Date | undefined | null): string {
  if (!date) return '—'
  try {
    return formatDistanceToNow(date, { addSuffix: true })
  } catch {
    return '—'
  }
}

/**
 * Convert Firestore Timestamp or Date to JS Date
 */
export function toDate(value: unknown): Date {
  if (!value) return new Date()
  if (value instanceof Date) return value
  // Firestore Timestamp
  if (typeof value === 'object' && value !== null && 'toDate' in value) {
    return (value as { toDate: () => Date }).toDate()
  }
  return new Date(value as string)
}

/**
 * Mask mobile number for privacy (e.g. +91-XXXXX-67890)
 */
export function maskMobile(mobile: string): string {
  if (!mobile || mobile.length < 5) return mobile
  const digits = mobile.replace(/\D/g, '')
  return digits.slice(0, -5).replace(/./g, 'X') + digits.slice(-5)
}

/**
 * Format mobile for WhatsApp deep link
 */
export function whatsappLink(mobile: string, message: string): string {
  const digits = mobile.replace(/\D/g, '')
  const num = digits.startsWith('91') ? digits : `91${digits}`
  return `https://wa.me/${num}?text=${encodeURIComponent(message)}`
}

/**
 * Capitalize first letter of each word
 */
export function titleCase(str: string): string {
  return str.replace(/\b\w/g, c => c.toUpperCase())
}

/**
 * Export contributions list to CSV format and trigger browser download
 */
export function exportContributionsToCSV(contributions: any[], festivalName = 'Sri Nageshwar Youth') {
  if (!contributions || contributions.length === 0) {
    throw new Error('No contribution data available to export')
  }

  const headers = [
    'Receipt Number',
    'Contributor Name',
    'Mobile Number',
    'House/Flat Number',
    'Amount (INR)',
    'Payment Method',
    'Payment Status',
    'Department',
    'Collected By',
    'Date',
    'Notes',
  ]

  const rows = contributions.map(c => [
    `"${c.receiptNumber || ''}"`,
    `"${(c.contributorName || '').replace(/"/g, '""')}"`,
    `"${c.mobile || ''}"`,
    `"${(c.houseNumber || '').replace(/"/g, '""')}"`,
    c.amount || 0,
    `"${c.paymentMethod || ''}"`,
    `"${c.paymentStatus || ''}"`,
    `"${(c.departmentName || '').replace(/"/g, '""')}"`,
    `"${(c.collectedBy || '').replace(/"/g, '""')}"`,
    `"${formatDate(c.createdAt)}"`,
    `"${(c.notes || '').replace(/"/g, '""')}"`,
  ])

  const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\r\n')
  const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  const dateStr = new Date().toISOString().split('T')[0]
  link.setAttribute('href', url)
  link.setAttribute('download', `${festivalName.replace(/\s+/g, '_')}_Contributors_${dateStr}.csv`)
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}

/**
 * Export full financial & audit report to CSV
 */
export function exportReportToCSV(params: {
  festival: any
  totalCollected: number
  totalExpenses: number
  balance: number
  deptBreakdown: { name: string; contributors: number; amount: number }[]
  paymentData: { name: string; value: number }[]
  expenses: any[]
}) {
  const { festival, totalCollected, totalExpenses, balance, deptBreakdown, paymentData, expenses } = params
  const dateStr = new Date().toISOString().split('T')[0]
  const committee = festival?.committeeName || 'Sri Nageshwar Youth'

  const lines: string[] = [
    `"FESTIVAL FINANCIAL REPORT - ${committee.toUpperCase()}"`,
    `"Generated On: ${new Date().toLocaleDateString('en-IN')}"`,
    `"Festival Year: ${festival?.festivalYear || '2026'}"`,
    '',
    '"1. FINANCIAL SUMMARY"',
    '"Metric","Amount (INR)"',
    `"Total Collection",${totalCollected}`,
    `"Total Expenses",${totalExpenses}`,
    `"Net Balance",${balance}`,
    `"Target Goal",${festival?.targetAmount || 0}`,
    '',
    '"2. PAYMENT METHOD BREAKDOWN"',
    '"Method","Amount (INR)"',
    ...paymentData.map(p => `"${p.name}",${p.value}`),
    '',
    '"3. DEPARTMENT-WISE BREAKDOWN"',
    '"Department","Contributors","Amount Collected (INR)"',
    ...deptBreakdown.map(d => `"${d.name.replace(/"/g, '""')}",${d.contributors},${d.amount}`),
    '',
    '"4. ITEMIZED EXPENSES"',
    '"Title","Category","Amount (INR)","Payment Method","Date","Added By"',
    ...expenses.map(e => [
      `"${(e.title || '').replace(/"/g, '""')}"`,
      `"${e.category || ''}"`,
      e.amount || 0,
      `"${e.paymentMethod || ''}"`,
      `"${formatDate(e.date)}"`,
      `"${(e.addedBy || '').replace(/"/g, '""')}"`,
    ].join(',')),
  ]

  const csvContent = lines.join('\r\n')
  const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.setAttribute('href', url)
  link.setAttribute('download', `${committee.replace(/\s+/g, '_')}_Financial_Report_${dateStr}.csv`)
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}

/**
 * Print / Export Official Financial Statement PDF
 */
export function printFinancialReport(params: {
  festival: any
  totalCollected: number
  totalExpenses: number
  balance: number
  deptBreakdown: { name: string; contributors: number; amount: number }[]
  paymentData: { name: string; value: number }[]
  expenses: any[]
  contributionsCount: number
}) {
  const { festival, totalCollected, totalExpenses, balance, deptBreakdown, paymentData, expenses, contributionsCount } = params
  const win = window.open('', '_blank', 'width=850,height=1000')
  if (!win) return

  const committee = festival?.committeeName || 'Sri Nageshwar Youth'
  const year = festival?.festivalYear || '2026'

  win.document.write(`
    <!DOCTYPE html>
    <html>
    <head>
      <title>Financial_Report_${year}</title>
      <style>
        @page { size: A4; margin: 15mm; }
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #1a1a1a; margin: 0; padding: 20px; background: #fff; }
        .header { text-align: center; border-bottom: 2px solid #d97706; padding-bottom: 16px; margin-bottom: 20px; }
        .header img { width: 75px; height: 75px; border-radius: 50%; border: 2px solid #d97706; object-fit: cover; }
        .header h1 { margin: 6px 0 2px; font-size: 22px; color: #92400e; text-transform: uppercase; }
        .header p { margin: 2px 0; font-size: 13px; color: #78350f; font-weight: 600; }
        .grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; margin-bottom: 24px; }
        .card { border: 1px solid #fcd34d; border-radius: 10px; padding: 12px; text-align: center; background: #fffdfa; }
        .card .val { font-size: 20px; font-weight: 800; color: #92400e; margin-top: 4px; }
        .card .title { font-size: 12px; font-weight: 600; color: #78350f; text-transform: uppercase; }
        h2 { font-size: 14px; color: #92400e; text-transform: uppercase; border-bottom: 1px solid #e5e7eb; padding-bottom: 4px; margin-top: 20px; margin-bottom: 10px; }
        table { width: 100%; border-collapse: collapse; font-size: 12px; margin-bottom: 16px; }
        th, td { padding: 7px 10px; border-bottom: 1px solid #f3f4f6; text-align: left; }
        th { background: #fef3c7; color: #78350f; font-weight: 700; text-transform: uppercase; }
        .text-right { text-align: right; }
        .footer { margin-top: 30px; border-top: 1px dashed #d97706; padding-top: 14px; display: flex; justify-content: space-between; font-size: 11px; color: #78350f; }
      </style>
    </head>
    <body>
      <div class="header">
        <img src="/logo.jpg" alt="Logo" />
        <h1>${committee}</h1>
        <p>Marwadi University • Ganesh Mahotsav ${year}</p>
        <p style="font-size: 12px; color: #6b7280; font-weight: normal;">Official Financial Audit & Statement Report • Generated on ${new Date().toLocaleDateString('en-IN')}</p>
      </div>
      <div class="grid">
        <div class="card">
          <div class="title">Total Collection</div>
          <div class="val">${formatCurrency(totalCollected)}</div>
          <div style="font-size: 11px; color: #6b7280;">${contributionsCount} contributions</div>
        </div>
        <div class="card">
          <div class="title">Total Expenses</div>
          <div class="val" style="color: #dc2626;">${formatCurrency(totalExpenses)}</div>
          <div style="font-size: 11px; color: #6b7280;">${expenses.length} expenses</div>
        </div>
        <div class="card">
          <div class="title">Net Balance</div>
          <div class="val" style="color: ${balance >= 0 ? '#15803d' : '#dc2626'};">${formatCurrency(balance)}</div>
          <div style="font-size: 11px; color: #6b7280;">Available in treasury</div>
        </div>
      </div>

      <h2>Department-wise Collection Summary</h2>
      <table>
        <thead><tr><th>Department</th><th class="text-right">Contributors</th><th class="text-right">Amount Collected</th></tr></thead>
        <tbody>
          ${deptBreakdown.map(d => `<tr><td><strong>${d.name}</strong></td><td class="text-right">${d.contributors}</td><td class="text-right"><strong>${formatCurrency(d.amount)}</strong></td></tr>`).join('')}
        </tbody>
      </table>

      <h2>Payment Method Breakdown</h2>
      <table>
        <thead><tr><th>Payment Method</th><th class="text-right">Amount (INR)</th></tr></thead>
        <tbody>
          ${paymentData.map(p => `<tr><td>${p.name}</td><td class="text-right"><strong>${formatCurrency(p.value)}</strong></td></tr>`).join('')}
        </tbody>
      </table>

      <h2>Itemized Expenses</h2>
      <table>
        <thead><tr><th>Title</th><th>Category</th><th>Payment</th><th>Date</th><th class="text-right">Amount</th></tr></thead>
        <tbody>
          ${expenses.slice(0, 25).map(e => `<tr><td>${e.title}</td><td>${e.category}</td><td>${e.paymentMethod}</td><td>${formatDate(e.date)}</td><td class="text-right"><strong>${formatCurrency(e.amount)}</strong></td></tr>`).join('')}
        </tbody>
      </table>

      <div class="footer">
        <div>Official Verification: Sri Nageshwar Youth Audit Committee</div>
        <div>Authorized Signatory ___________________</div>
      </div>
    </body>
    </html>
  `)

  win.document.close()
  win.focus()
  setTimeout(() => { win.print() }, 400)
}
