import { Link } from 'react-router-dom'

export default function NotFound() {
  return (
    <div className="max-w-md mx-auto px-4 sm:px-6 py-20 sm:py-24 text-center">
      <h1 className="font-display text-4xl mb-3">Page not found</h1>
      <p className="opacity-70 mb-6">This shelf is empty. Let's get you back to the Lounge.</p>
      <Link to="/" className="btn-primary">Back home</Link>
    </div>
  )
}
