import { useEffect, useState, FormEvent } from 'react'
import { supabase } from '@/lib/supabase'
import { useToast } from '@/components/Toast'
import { downloadCsv, formatMoney } from '@/utils/csv'

const categories = ['Venue','Refreshments','Books','Author','Transport','Event','Equipment','Marketing','Other']

export default function AdminExpenses() {
  const { push } = useToast()
  const [category, setCategory] = useState(categories[0])
  const [description, setDescription] = useState('')
  const [amount, setAmount] = useState('')
  const [expenses, setExpenses] = useState<any[]>([])

  async function load() {
    const { data, error } = await supabase.from('expenses').select('*').order('expense_date', { ascending: false })
    if (error) { push(error.message, 'error'); return }
    setExpenses(data ?? [])
  }
  useEffect(() => { load() }, [])

  async function record(e: FormEvent) {
    e.preventDefault()
    const { error } = await supabase.rpc('record_expense', {
      p_category: category,
      p_description: description,
      p_amount: Number(amount),
      p_expense_date: new Date().toISOString().slice(0, 10),
      p_event_id: null,
      p_vendor: null,
      p_payment_method: null,
      p_receipt_reference: null,
      p_notes: null
    })
    if (error) { push(error.message, 'error'); return }
    push('Expense recorded.', 'success')
    setDescription(''); setAmount('')
    load()
  }

  function exportExpenses() {
    downloadCsv('literary-lounge-expenses.csv',
      ['Expense date', 'Category', 'Description', 'Amount', 'Currency', 'Vendor', 'Payment method', 'Receipt reference'],
      expenses.map((expense) => [expense.expense_date, expense.category, expense.description,
        Number(expense.amount).toFixed(2), expense.currency, expense.vendor, expense.payment_method, expense.receipt_reference]))
  }

  const expenseTotal = expenses.reduce((total, expense) => total + Number(expense.amount), 0)

  return (
    <div>
      <h1 className="font-display text-3xl mb-6">Expenses</h1>
      <form onSubmit={record} className="card mb-8 flex flex-col gap-3 max-w-lg">
        <p className="font-medium">Record an expense</p>
        <select value={category} onChange={(e) => setCategory(e.target.value)}
          className="border border-ink/20 dark:border-ink-dark/20 bg-transparent rounded-sm px-3 py-2">
          {categories.map((c) => <option key={c}>{c}</option>)}
        </select>
        <input required placeholder="Description" value={description} onChange={(e) => setDescription(e.target.value)}
          className="border border-ink/20 dark:border-ink-dark/20 bg-transparent rounded-sm px-3 py-2" />
        <input required type="number" step="0.01" placeholder="Amount (GHS)" value={amount} onChange={(e) => setAmount(e.target.value)}
          className="border border-ink/20 dark:border-ink-dark/20 bg-transparent rounded-sm px-3 py-2" />
        <button type="submit" className="btn-primary self-start">Record expense</button>
      </form>

      <div className="flex flex-wrap items-end justify-between gap-3 mb-3">
        <div>
          <h2 className="font-display text-xl">Expense ledger</h2>
          <p className="text-sm opacity-60">{expenses.length} recorded · Total {formatMoney(expenseTotal)}</p>
        </div>
        <button type="button" onClick={exportExpenses} className="btn-secondary">Export expenses CSV</button>
      </div>
      <div className="flex flex-col gap-2">
        {expenses.map((x) => (
          <div key={x.id} className="card flex justify-between">
            <div>
              <p className="font-medium">{x.description}</p>
              <p className="text-xs opacity-60">{x.category} · {new Date(x.expense_date).toLocaleDateString()}</p>
            </div>
            <p className="font-medium">{formatMoney(x.amount, x.currency)}</p>
          </div>
        ))}
      </div>
    </div>
  )
}
