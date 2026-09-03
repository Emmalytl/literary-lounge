import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'

export default function AdminOverview() {
  const [counts, setCounts] = useState({ members: 0, books: 0, events: 0, fund: 0 })

  useEffect(() => {
    async function load() {
      const [{ count: members }, { count: books }, { count: events }, { data: fund }] = await Promise.all([
        supabase.from('profiles').select('id', { count: 'exact', head: true }),
        supabase.from('books').select('id', { count: 'exact', head: true }),
        supabase.from('events').select('id', { count: 'exact', head: true }).eq('status', 'scheduled'),
        supabase.rpc('fund_balance')
      ])
      setCounts({ members: members ?? 0, books: books ?? 0, events: events ?? 0, fund: (fund as number) ?? 0 })
    }
    load()
  }, [])

  return (
    <div>
      <h1 className="font-display text-3xl mb-6">Admin overview</h1>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card label="Members" value={counts.members} />
        <Card label="Books" value={counts.books} />
        <Card label="Upcoming events" value={counts.events} />
        <Card label="Lounge Fund balance" value={`GHS ${counts.fund.toFixed(2)}`} />
      </div>
      <p className="opacity-60 text-sm mt-8">
        Detailed monthly / six-month / annual reports and CSV exports are documented in
        docs/finance-reporting.md as a build-next item -- the schema and record_payment /
        record_expense functions they depend on are already in place.
      </p>
    </div>
  )
}

function Card({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="card">
      <p className="text-2xl font-display">{value}</p>
      <p className="text-xs opacity-60 mt-1">{label}</p>
    </div>
  )
}
