import React, { useEffect, useState } from 'react'
import { useLocation } from 'react-router-dom'
import { Download, X, Smartphone, Share } from 'lucide-react'

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

export default function PwaInstallPrompt() {
  const location = useLocation()
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null)
  const [isIos, setIsIos] = useState(false)
  const [isStandalone, setIsStandalone] = useState(false)
  const [dismissed, setDismissed] = useState(false)
  const [showIosGuide, setShowIosGuide] = useState(false)

  // Do not show install prompt on public devotee receipt pages
  if (location.pathname.startsWith('/receipt')) {
    return null
  }

  useEffect(() => {
    // Check if already installed / running in standalone mode
    const isRunningStandalone =
      window.matchMedia('(display-mode: standalone)').matches ||
      (window.navigator as unknown as { standalone?: boolean }).standalone === true

    if (isRunningStandalone) {
      setIsStandalone(true)
      return
    }

    // Check if user previously dismissed prompt in this session
    const wasDismissed = sessionStorage.getItem('pwa_prompt_dismissed')
    if (wasDismissed) {
      setDismissed(true)
    }

    // Detect iOS
    const userAgent = window.navigator.userAgent.toLowerCase()
    const isIosDevice = /iphone|ipad|ipod/.test(userAgent)
    setIsIos(isIosDevice)

    // Listen for BeforeInstallPrompt on Android / Chromium
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault()
      setDeferredPrompt(e as BeforeInstallPromptEvent)
    }

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt)

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt)
    }
  }, [])

  const handleInstallClick = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt()
      const { outcome } = await deferredPrompt.userChoice
      if (outcome === 'accepted') {
        setDeferredPrompt(null)
      }
    } else if (isIos) {
      setShowIosGuide(true)
    }
  }

  const handleDismiss = () => {
    setDismissed(true)
    sessionStorage.setItem('pwa_prompt_dismissed', 'true')
  }

  if (isStandalone || dismissed || (!deferredPrompt && !isIos)) {
    return null
  }

  return (
    <>
      {/* Floating Install Prompt Banner */}
      <div className="fixed bottom-4 left-4 right-4 sm:left-auto sm:right-6 sm:max-w-sm z-50 animate-bounce-short">
        <div className="bg-gradient-to-r from-amber-600 via-saffron-600 to-orange-600 text-white rounded-2xl p-4 shadow-2xl border border-amber-300/40 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <img
              src="/logo.jpg"
              alt="App Logo"
              className="w-11 h-11 rounded-xl object-cover ring-2 ring-white/60 shadow-sm flex-shrink-0"
            />
            <div className="min-w-0">
              <h4 className="font-extrabold text-sm leading-tight truncate">
                Install Ganesh App
              </h4>
              <p className="text-xs text-amber-100 mt-0.5 truncate">
                Fast 1-click access from your phone home screen
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5 flex-shrink-0">
            <button
              onClick={handleInstallClick}
              className="inline-flex items-center gap-1 bg-white text-saffron-700 hover:bg-amber-50 px-3 py-1.5 rounded-xl font-bold text-xs shadow-md transition-all active:scale-95"
            >
              <Download size={14} />
              <span>Install</span>
            </button>
            <button
              onClick={handleDismiss}
              className="p-1.5 rounded-lg text-white/80 hover:text-white hover:bg-white/10 transition-colors"
              title="Dismiss"
            >
              <X size={16} />
            </button>
          </div>
        </div>
      </div>

      {/* iOS Instructions Modal */}
      {showIosGuide && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs z-50 flex items-end sm:items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 max-w-sm w-full shadow-2xl space-y-4 text-center">
            <div className="w-14 h-14 bg-amber-100 text-saffron-600 rounded-2xl flex items-center justify-center mx-auto shadow-inner">
              <Smartphone size={28} />
            </div>
            <div>
              <h3 className="text-lg font-black text-gray-900">Install on iPhone / iPad</h3>
              <p className="text-xs text-gray-600 mt-1">
                Install the official <strong>Ganesh Committee</strong> app onto your iOS home screen:
              </p>
            </div>

            <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 text-left space-y-2.5 text-xs text-gray-800">
              <div className="flex items-start gap-2.5">
                <span className="font-bold bg-amber-200 text-amber-900 rounded-full w-5 h-5 flex items-center justify-center flex-shrink-0">
                  1
                </span>
                <span>
                  Tap the <Share size={14} className="inline text-blue-600 mx-0.5" /> <strong>Share</strong> button at the bottom of Safari.
                </span>
              </div>
              <div className="flex items-start gap-2.5">
                <span className="font-bold bg-amber-200 text-amber-900 rounded-full w-5 h-5 flex items-center justify-center flex-shrink-0">
                  2
                </span>
                <span>
                  Scroll down and tap <strong>"Add to Home Screen"</strong> (➕).
                </span>
              </div>
              <div className="flex items-start gap-2.5">
                <span className="font-bold bg-amber-200 text-amber-900 rounded-full w-5 h-5 flex items-center justify-center flex-shrink-0">
                  3
                </span>
                <span>
                  Tap <strong>"Add"</strong> in the top right corner.
                </span>
              </div>
            </div>

            <button
              onClick={() => setShowIosGuide(false)}
              className="w-full bg-saffron-600 hover:bg-saffron-700 text-white font-bold py-2.5 rounded-xl text-sm transition-all"
            >
              Got it!
            </button>
          </div>
        </div>
      )}
    </>
  )
}
