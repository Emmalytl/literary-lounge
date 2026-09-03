import { useEffect, useState } from 'react'
import { useAuth } from '@/features/auth/AuthContext'
import { supabase } from '@/lib/supabase'

export default function Membership() {
  const { profile } = useAuth()
  const [payments, setPayments] = useState<any[]>([])

  useEffect(() => {
    if (!profile) return
    supabase
      .from('membership_payments')
      .select('*')
      .eq('member_id', profile.id)
      .order('billing_month', { ascending: false })
      .then(({ data }) => setPayments(data ?? []))
  }, [profile])

  return (
    <div className="max-w-3xl mx-auto px-6 py-10">
      <h1 className="font-display text-3xl mb-2">Membership</h1>
      <p className="opacity-70 mb-8">
        Monthly dues are GHS 100, starting January 2027. Dues fund the Lounge — venue, refreshments, books, and events.
      </p>

      <div className="card mb-6">
        <p className="text-sm uppercase tracking-wide opacity-60 mb-1">Your status</p>
        <p className="font-display text-xl">
          {payments.length === 0 ? 'No payments recorded yet' : `${payments.filter((p) => p.status === 'paid').length} of ${payments.length} months paid`}
        </p>
      </div>

      <h2 className="font-display text-xl mb-3">Payment history</h2>
      {payments.length === 0 ? (
        <p className="opacity-60 text-sm">Nothing recorded yet — dues begin January 2027.</p>
      ) : (
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left border-b border-ink/10 dark:border-ink-dark/10">
              <th className="py-2">Month</th><th>Status</th><th>Amount</th><th>Method</th>
            </tr>
          </thead>
          <tbody>
            {payments.map((p) => (
              <tr key={p.id} className="border-b border-ink/5 dark:border-ink-dark/5">
                <td className="py-2">{new Date(p.billing_month).toLocaleDateString(undefined, { month: 'long', year: 'numeric' })}</td>
                <td className="capitalize">{p.status}</td>
                <td>{p.currency} {p.amount}</td>
                <td>{p.payment_method ?? '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  )
}
