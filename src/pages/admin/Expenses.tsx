import { useEffect, useState, FormEvent } from 'react'
import { supabase } from '@/lib/supabase'
import { useToast } from '@/components/Toast'

const categories = ['Venue','Refreshments','Books','Author','Transport','Event','Equipment','Marketing','Other']

export default function AdminExpenses() {
  const { push } = useToast()
  const [category, setCategory] = useState(categories[0])
  const [description, setDescription] = useState('')
  const [amount, setAmount] = useState('')
  const [expenses, setExpenses] = useState<any[]>([])

  async function load() {
    const { data } = await supabase.from('expenses').select('*').order('expense_date', { ascending: false }).limit(20)
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

      <div className="flex flex-col gap-2">
        {expenses.map((x) => (
          <div key={x.id} className="card flex justify-between">
            <div>
              <p className="font-medium">{x.description}</p>
              <p className="text-xs opacity-60">{x.category} · {new Date(x.expense_date).toLocaleDateString()}</p>
            </div>
            <p className="font-medium">GHS {x.amount}</p>
          </div>
        ))}
      </div>
    </div>
  )
}
