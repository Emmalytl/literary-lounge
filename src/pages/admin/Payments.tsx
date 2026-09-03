import { useEffect, useState, FormEvent } from 'react'
import { supabase } from '@/lib/supabase'
import { useToast } from '@/components/Toast'

export default function AdminPayments() {
  const { push } = useToast()
  const [members, setMembers] = useState<any[]>([])
  const [memberId, setMemberId] = useState('')
  const [amount, setAmount] = useState('100')
  const [billingMonth, setBillingMonth] = useState('')
  const [method, setMethod] = useState('Mobile Money')
  const [reference, setReference] = useState('')
  const [recent, setRecent] = useState<any[]>([])

  async function loadRecent() {
    const { data } = await supabase
      .from('membership_payments')
      .select('*, profiles(full_name)')
      .order('created_at', { ascending: false })
      .limit(20)
    setRecent(data ?? [])
  }

  useEffect(() => {
    supabase.from('profiles').select('id, full_name').order('full_name').then(({ data }) => setMembers(data ?? []))
    loadRecent()
  }, [])

  async function recordPayment(e: FormEvent) {
    e.preventDefault()
    if (!memberId || !billingMonth) return
    // Uses the record_payment() SECURITY DEFINER function so the Lounge
    // Fund ledger and audit log stay in sync automatically.
    const { error } = await supabase.rpc('record_payment', {
      p_member_id: memberId,
      p_amount: Number(amount),
      p_billing_month: billingMonth,
      p_payment_method: method,
      p_reference_number: reference,
      p_notes: null
    })
    if (error) { push(error.message, 'error'); return }
    push('Payment recorded.', 'success')
    setReference('')
    loadRecent()
  }

  return (
    <div>
      <h1 className="font-display text-3xl mb-6">Dues & Payments</h1>

      <form onSubmit={recordPayment} className="card mb-8 flex flex-col gap-3 max-w-lg">
        <p className="font-medium">Record a payment</p>
        <select required value={memberId} onChange={(e) => setMemberId(e.target.value)}
          className="border border-ink/20 dark:border-ink-dark/20 bg-transparent rounded-sm px-3 py-2">
          <option value="">Select member…</option>
          {members.map((m) => <option key={m.id} value={m.id}>{m.full_name}</option>)}
        </select>
        <input required type="month" value={billingMonth ? billingMonth.slice(0, 7) : ''}
          onChange={(e) => setBillingMonth(`${e.target.value}-01`)}
          className="border border-ink/20 dark:border-ink-dark/20 bg-transparent rounded-sm px-3 py-2" />
        <input required type="number" step="0.01" value={amount} onChange={(e) => setAmount(e.target.value)}
          className="border border-ink/20 dark:border-ink-dark/20 bg-transparent rounded-sm px-3 py-2" />
        <select value={method} onChange={(e) => setMethod(e.target.value)}
          className="border border-ink/20 dark:border-ink-dark/20 bg-transparent rounded-sm px-3 py-2">
          {['Mobile Money','Bank Transfer','Cash','Card','Other'].map((m) => <option key={m}>{m}</option>)}
        </select>
        <input placeholder="Reference / transaction number" value={reference} onChange={(e) => setReference(e.target.value)}
          className="border border-ink/20 dark:border-ink-dark/20 bg-transparent rounded-sm px-3 py-2" />
        <button type="submit" className="btn-primary self-start">Record payment</button>
      </form>

      <h2 className="font-display text-xl mb-3">Recent payments</h2>
      <div className="overflow-x-auto">
        <table className="w-full text-sm min-w-[600px]">
          <thead>
            <tr className="text-left border-b border-ink/10 dark:border-ink-dark/10">
              <th className="py-2">Member</th><th>Month</th><th>Amount</th><th>Status</th>
            </tr>
          </thead>
          <tbody>
            {recent.map((p) => (
              <tr key={p.id} className="border-b border-ink/5 dark:border-ink-dark/5">
                <td className="py-2">{p.profiles?.full_name}</td>
                <td>{new Date(p.billing_month).toLocaleDateString(undefined, { month: 'short', year: 'numeric' })}</td>
                <td>{p.currency} {p.amount}</td>
                <td className="capitalize">{p.status}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
