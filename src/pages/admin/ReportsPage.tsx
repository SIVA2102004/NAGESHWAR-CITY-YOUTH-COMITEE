import React, { useEffect, useState } from 'react'
import { Download, Printer } from 'lucide-react'
import toast from 'react-hot-toast'
import { useFestival } from '../../context/FestivalContext'
import { getContributionsByFestival } from '../../services/contributionService'
import { getExpensesByFestival } from '../../services/expenseService'
import { getUsersByRole } from '../../services/userService'
import { getDepartmentsByFestival } from '../../services/departmentService'
import Card from '../../components/ui/Card'
import Button from '../../components/ui/Button'
import CollectionChart from '../../components/charts/CollectionChart'
import PaymentMethodChart from '../../components/charts/PaymentMethodChart'
import ExpenseCategoryChart from '../../components/charts/ExpenseCategoryChart'
import { formatCurrency, exportReportToCSV, printFinancialReport } from '../../utils/formatters'
import type { Contribution, Expense, AppUser, Department } from '../../types'
import { format } from 'date-fns'

export default function ReportsPage() {
  const { festival } = useFestival()

  const [contributions, setContributions] = useState<Contribution[]>([])
  const [expenses, setExpenses] = useState<Expense[]>([])
  const [volunteers, setVolunteers] = useState<AppUser[]>([])
  const [departments, setDepartments] = useState<Department[]>([])
  const [loading, setLoading] = useState(true)
  const [filterDept, setFilterDept] = useState('')

  useEffect(() => {
    if (!festival) return
    const load = async () => {
      setLoading(true)
      try {
        const [c, e, v, d] = await Promise.all([
          getContributionsByFestival(festival.id),
          getExpensesByFestival(festival.id),
          getUsersByRole(festival.id, 'volunteer'),
          getDepartmentsByFestival(festival.id),
        ])
        setContributions(c); setExpenses(e); setVolunteers(v); setDepartments(d)
      } finally { setLoading(false) }
    }
    load()
  }, [festival])

  const filteredContribs = filterDept
    ? contributions.filter(c => c.departmentId === filterDept)
    : contributions

  const totalCollected = filteredContribs.filter(c => c.paymentStatus === 'Paid').reduce((s,c) => s + c.amount, 0)
  const totalExpenses = expenses.reduce((s,e) => s + e.amount, 0)
  const balance = totalCollected - totalExpenses

  const deptBreakdown = departments.map(d => ({
    name: d.name,
    contributors: contributions.filter(c => c.departmentId === d.id).length,
    amount: contributions.filter(c => c.departmentId === d.id && c.paymentStatus==='Paid').reduce((s,c)=>s+c.amount,0),
  }))

  const volBreakdown = volunteers.map(v => ({
    name: v.name,
    dept: v.departmentName || '—',
    count: contributions.filter(c => c.collectedByUid === v.uid).length,
    amount: contributions.filter(c => c.collectedByUid === v.uid && c.paymentStatus==='Paid').reduce((s,c)=>s+c.amount,0),
  }))

  const paymentData = ['Cash','Online','UPI','Cheque'].map(m => ({
    name: m,
    value: filteredContribs.filter(c => c.paymentMethod === m && c.paymentStatus === 'Paid').reduce((s,c)=>s+c.amount,0)
  }))

  const expCatData = [...new Set(expenses.map(e=>e.category))].map(cat => ({
    name: cat,
    value: expenses.filter(e=>e.category===cat).reduce((s,e)=>s+e.amount,0)
  }))

  const dailyData = Array.from({ length: 14 }, (_, i) => {
    const d = new Date()
    d.setDate(d.getDate() - (13 - i))
    const label = format(d, 'dd MMM')
    const ds = format(d, 'yyyy-MM-dd')
    const amount = filteredContribs
      .filter(c => c.paymentStatus==='Paid' && format(c.createdAt,'yyyy-MM-dd')===ds)
      .reduce((s,c)=>s+c.amount,0)
    return { name: label, amount }
  })

  const handleExportCSV = () => {
    try {
      exportReportToCSV({
        festival,
        totalCollected,
        totalExpenses,
        balance,
        deptBreakdown,
        paymentData,
        expenses,
      })
      toast.success('Financial Report exported to CSV!')
    } catch (e: any) {
      toast.error(e.message || 'Export failed')
    }
  }

  const handlePrintReport = () => {
    try {
      printFinancialReport({
        festival,
        totalCollected,
        totalExpenses,
        balance,
        deptBreakdown,
        paymentData,
        expenses,
        contributionsCount: contributions.length,
      })
    } catch (e: any) {
      toast.error(e.message || 'Print report failed')
    }
  }

  if (loading) return <div className="text-center py-16 text-gray-400">Loading reports...</div>

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-extrabold text-gray-900">Reports &amp; Financials</h1>
          <p className="text-gray-500 text-sm">Sri Nageshwar Youth • Festival Overview</p>
        </div>
        <div className="flex items-center flex-wrap gap-2">
          <select
            value={filterDept}
            onChange={e => setFilterDept(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white"
          >
            <option value="">All Departments</option>
            {departments.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
          </select>
          <Button
            variant="outline"
            icon={<Download size={15} />}
            onClick={handleExportCSV}
          >
            Export Report (CSV)
          </Button>
          <Button
            variant="secondary"
            icon={<Printer size={15} />}
            onClick={handlePrintReport}
          >
            Print / PDF Report
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="!bg-green-50">
          <p className="text-sm text-green-700 font-medium">Total Collection</p>
          <p className="text-3xl font-bold text-green-800 mt-1">{formatCurrency(totalCollected)}</p>
          <div className="mt-3 space-y-1">
            {['Paid','Pending','Partial'].map(s => (
              <div key={s} className="flex justify-between text-sm">
                <span className="text-gray-500">{s}</span>
                <span className="font-semibold">
                  {formatCurrency(filteredContribs.filter(c=>c.paymentStatus===s).reduce((sum,c)=>sum+c.amount,0))}
                </span>
              </div>
            ))}
          </div>
        </Card>
        <Card className="!bg-red-50">
          <p className="text-sm text-red-700 font-medium">Total Expenses</p>
          <p className="text-3xl font-bold text-red-800 mt-1">{formatCurrency(totalExpenses)}</p>
        </Card>
        <Card className={balance >= 0 ? '!bg-blue-50' : '!bg-red-50'}>
          <p className="text-sm font-medium" style={{color: balance>=0?'#1d4ed8':'#dc2626'}}>Net Balance</p>
          <p className="text-3xl font-bold mt-1" style={{color: balance>=0?'#1e40af':'#b91c1c'}}>
            {formatCurrency(balance)}
          </p>
          <p className="text-xs text-gray-500 mt-2">
            {festival?.targetAmount ? `${Math.min(100,Math.round(totalCollected/festival.targetAmount*100))}% of target reached` : ''}
          </p>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <h3 className="font-bold text-gray-900 mb-4">Collection Trend (14 Days)</h3>
          <CollectionChart data={dailyData} />
        </Card>
        <Card>
          <h3 className="font-bold text-gray-900 mb-4">Payment Methods</h3>
          <PaymentMethodChart data={paymentData} />
        </Card>
      </div>

      <Card>
        <h3 className="font-bold text-gray-900 mb-4">Expense Categories</h3>
        <ExpenseCategoryChart data={expCatData} height={280} />
      </Card>

      <Card>
        <h3 className="font-bold text-gray-900 mb-4">Department-wise Collection</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead><tr className="border-b">
              {['Department','Contributors','Amount'].map(h=><th key={h} className="px-4 py-2 text-left text-xs font-semibold text-gray-500 uppercase">{h}</th>)}
            </tr></thead>
            <tbody>
              {deptBreakdown.map(d => (
                <tr key={d.name} className="border-b border-gray-50">
                  <td className="px-4 py-3 font-medium">{d.name}</td>
                  <td className="px-4 py-3 text-gray-600">{d.contributors}</td>
                  <td className="px-4 py-3 font-semibold text-green-700">{formatCurrency(d.amount)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      <Card>
        <h3 className="font-bold text-gray-900 mb-4">Volunteer-wise Collection</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead><tr className="border-b">
              {['Volunteer','Department','Contributions','Amount'].map(h=><th key={h} className="px-4 py-2 text-left text-xs font-semibold text-gray-500 uppercase">{h}</th>)}
            </tr></thead>
            <tbody>
              {volBreakdown.sort((a,b)=>b.amount-a.amount).map(v => (
                <tr key={v.name} className="border-b border-gray-50">
                  <td className="px-4 py-3 font-medium">{v.name}</td>
                  <td className="px-4 py-3 text-gray-600">{v.dept}</td>
                  <td className="px-4 py-3 text-gray-600">{v.count}</td>
                  <td className="px-4 py-3 font-semibold text-green-700">{formatCurrency(v.amount)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  )
}
