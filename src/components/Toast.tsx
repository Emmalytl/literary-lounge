import { createContext, useCallback, useContext, useState, ReactNode } from 'react'
import { CheckCircle2, XCircle, Info, X } from 'lucide-react'

type Toast = { id: number; message: string; kind: 'success' | 'error' | 'info' }
type ToastCtx = { push: (message: string, kind?: Toast['kind']) => void }

const Ctx = createContext<ToastCtx | undefined>(undefined)

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([])

  const push = useCallback((message: string, kind: Toast['kind'] = 'info') => {
    const id = Date.now()
    setToasts((t) => [...t, { id, message, kind }])
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 4000)
  }, [])

  return (
    <Ctx.Provider value={{ push }}>
      {children}
      <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2 max-w-sm">
        {toasts.map((t) => (
          <div
            key={t.id}
            className="flex items-start gap-2 rounded-sm border bg-paper dark:bg-paper-dark p-3 shadow-lg text-sm"
          >
            {t.kind === 'success' && <CheckCircle2 size={18} className="text-green-600 shrink-0" />}
            {t.kind === 'error' && <XCircle size={18} className="text-clay shrink-0" />}
            {t.kind === 'info' && <Info size={18} className="text-gold shrink-0" />}
            <span className="flex-1">{t.message}</span>
            <button onClick={() => setToasts((ts) => ts.filter((x) => x.id !== t.id))} aria-label="Dismiss">
              <X size={14} />
            </button>
          </div>
        ))}
      </div>
    </Ctx.Provider>
  )
}

export function useToast() {
  const ctx = useContext(Ctx)
  if (!ctx) throw new Error('useToast must be used inside ToastProvider')
  return ctx
}
