import { useEffect, useState } from 'react'
import { Download, Share, X } from 'lucide-react'

type InstallPromptEvent = Event & {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

export function PwaInstallPrompt() {
  const [promptEvent, setPromptEvent] = useState<InstallPromptEvent | null>(null)
  const [visible, setVisible] = useState(false)
  const [isIos, setIsIos] = useState(false)

  useEffect(() => {
    const standalone = window.matchMedia('(display-mode: standalone)').matches || (navigator as any).standalone
    if (standalone) return

    const ios = /iphone|ipad|ipod/i.test(navigator.userAgent)
    setIsIos(ios)

    const dismissed = sessionStorage.getItem('lounge-install-dismissed') === '1'
    if (ios && !dismissed) setVisible(true)

    const handler = (event: Event) => {
      event.preventDefault()
      setPromptEvent(event as InstallPromptEvent)
      if (!dismissed) setVisible(true)
    }
    window.addEventListener('beforeinstallprompt', handler)
    return () => window.removeEventListener('beforeinstallprompt', handler)
  }, [])

  if (!visible) return null

  const dismiss = () => {
    sessionStorage.setItem('lounge-install-dismissed', '1')
    setVisible(false)
  }

  const install = async () => {
    if (!promptEvent) return
    await promptEvent.prompt()
    const choice = await promptEvent.userChoice
    if (choice.outcome === 'accepted') setVisible(false)
  }

  return (
    <div className="pwa-install-card" role="dialog" aria-label="Install The Literary Lounge">
      <button type="button" onClick={dismiss} className="pwa-install-close" aria-label="Close install message"><X size={18} /></button>
      <img src="/icon-192.png" alt="" className="pwa-install-icon" />
      <div className="min-w-0 flex-1">
        <p className="font-display text-lg font-semibold">Keep the Lounge on your phone</p>
        <p className="mt-1 text-sm opacity-70">Open your library, events and reading dashboard like a mobile app.</p>
        {isIos && !promptEvent ? (
          <p className="mt-3 flex items-center gap-2 text-sm"><Share size={16} className="text-gold" /> Tap Share, then <strong>Add to Home Screen</strong>.</p>
        ) : (
          <button type="button" onClick={install} className="btn-primary mt-3 !py-2 text-sm"><Download size={16} /> Install app</button>
        )}
      </div>
    </div>
  )
}
