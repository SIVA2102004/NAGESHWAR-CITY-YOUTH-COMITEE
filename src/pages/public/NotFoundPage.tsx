import React from 'react'
import { Link } from 'react-router-dom'
import { Home } from 'lucide-react'

export default function NotFoundPage() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-festival-light text-center p-4">
      <div className="text-8xl mb-4">🛕</div>
      <h1 className="text-6xl font-black text-saffron-600 mb-2">404</h1>
      <h2 className="text-2xl font-bold text-gray-900 mb-3">Page Not Found</h2>
      <p className="text-gray-500 mb-8 max-w-sm">
        Bappa could not find this page. It may have been moved or does not exist.
      </p>
      <Link
        to="/"
        className="inline-flex items-center gap-2 px-6 py-3 bg-saffron-600 text-white font-semibold rounded-xl hover:bg-saffron-700 transition-colors"
      >
        <Home size={18} /> Go Home
      </Link>
    </div>
  )
}
